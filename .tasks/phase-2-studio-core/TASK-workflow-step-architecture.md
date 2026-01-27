# TASK: Workflow Step-Based Architecture

## Objectif

Refactoriser le système de workflows pour passer d'une approche conversationnelle (chat) à une approche step-based (Typeform-like) où le LLM retourne du JSON structuré que le frontend rend en composants natifs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LLM Provider                            │
│              (Anthropic, OpenAI, Ollama, etc.)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Structured JSON Response                      │
│                    (format toujours identique)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Parser                             │
│            (parse + valide + adapte selon output)               │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
        ┌─────────────┐                ┌─────────────┐
        │   Web UI    │                │    CLI      │
        │  (React)    │                │  (Terminal) │
        └─────────────┘                └─────────────┘
```

## Décisions techniques

### 1. Contexte envoyé au LLM

Chaque appel au LLM contient :
- **Identité** : Agent persona, workflow info, step actuel
- **Contexte** : Documents existants (brief, GDD), réponses utilisateur des steps précédents
- **Demande** : Ce qu'on veut + format JSON obligatoire

### 2. Gestion des erreurs

- LLM indisponible → Erreur claire avec suggestion de changer de provider
- JSON invalide → Redemander au LLM de reformuler (1 retry max)
- Validation échoue → Erreur retournée au frontend

### 3. Multi-providers

- Seulement si l'utilisateur a activé le mode "auto"
- Sinon, utilise le provider/model configuré

### 4. Validation

**Côté LLM** : Déclare ce qu'il attend dans `expected_response`
**Côté Backend** : Valide les types et formate pour le prochain appel LLM

## Structure des fichiers

```
server/services/
├── prompt_builders/
│   ├── __init__.py
│   ├── base.py              # Helpers communs (language, agent persona)
│   ├── workflow.py          # Prompts pour workflows step-based
│   ├── chat.py              # Prompts pour chat conversationnel (existant)
│   └── schemas.py           # Dataclasses de réponse LLM
│
├── workflow/
│   ├── __init__.py
│   ├── engine.py            # Orchestrateur (existant, à adapter)
│   ├── step_renderer.py     # Appelle LLM et parse la réponse
│   ├── response_parser.py   # Parse JSON du LLM
│   ├── response_validator.py # Valide schéma et réponses user
│   └── session.py           # Gestion état session (existant)
```

## Schémas de données

### StepRenderData (ce que le LLM retourne)

```python
@dataclass
class StepRenderData:
    # Contenu à afficher
    intro_text: str                      # Texte d'intro de l'agent
    questions: list[QuestionBlock]       # Questions du step
    suggestions: list[Suggestion]        # Suggestions contextuelles
    prefilled: dict[str, str]            # Valeurs pré-remplies

    # Metadata
    can_skip: bool = False
    skip_reason: str = ""

    # Ce que le LLM attend en retour
    expected_response: ExpectedResponse = None
```

### QuestionBlock

```python
@dataclass
class QuestionBlock:
    id: str
    type: Literal["text", "textarea", "choice", "multi_choice", "choice_cards", "gauge", "emoji_scale"]
    label: str
    required: bool = False
    placeholder: str = ""
    options: list[Option] = None        # Pour choice/choice_cards
    suggestions: list[str] = None       # Suggestions pour ce champ
    validation: dict = None             # min_length, max_length, pattern
```

### ExpectedResponse

```python
@dataclass
class ExpectedResponse:
    type: Literal["single_field", "multi_field", "choice", "free_text"]
    fields: list[ExpectedField]

@dataclass
class ExpectedField:
    id: str
    type: Literal["text", "number", "choice", "multi_choice", "rating"]
    required: bool = True
    validation: dict = None
```

## Flow d'exécution

```
1. User démarre workflow
   │
   ▼
2. Backend charge step YAML + context (brief, réponses précédentes)
   │
   ▼
3. prompt_builders/workflow.py construit le prompt
   │
   ▼
4. LLM retourne JSON structuré (StepRenderData)
   │
   ▼
5. response_parser.py parse le JSON
   │
   ▼
6. response_validator.py valide le schéma
   │  (si invalide → retry 1x ou erreur)
   ▼
7. API retourne StepRenderData au frontend
   │
   ▼
8. WorkflowStepView rend les composants natifs
   │
   ▼
9. User remplit et soumet
   │
   ▼
10. Backend valide avec expected_response
    │  (si invalide → erreur affichée)
    ▼
11. Formate réponse pour contexte du prochain step
    │
    ▼
12. Retour à l'étape 2 pour le step suivant
```

## Critères d'acceptation

- [ ] Les workflows affichent des composants natifs (pas du texte LLM brut)
- [ ] Le LLM retourne toujours du JSON valide parsable
- [ ] Les suggestions sont dynamiques selon le contexte
- [ ] La langue de l'interface est respectée dans toutes les réponses
- [ ] Le fallback fonctionne si le LLM est indisponible
- [ ] La validation côté serveur fonctionne
- [ ] Le CLI peut consommer la même API avec un rendu différent

## Fichiers à créer/modifier

### Nouveaux fichiers
- `server/services/prompt_builders/__init__.py`
- `server/services/prompt_builders/base.py`
- `server/services/prompt_builders/workflow.py`
- `server/services/prompt_builders/schemas.py`
- `server/services/workflow/response_parser.py`
- `server/services/workflow/response_validator.py`
- `web-ui/src/components/workflow/WorkflowStepView.tsx`

### Fichiers à modifier
- `server/services/workflow/engine.py` - Utiliser le nouveau step_renderer
- `server/api/workflows.py` - Nouvel endpoint `/step`
- `web-ui/src/stores/workflowStore.ts` - Gérer le mode step-based
