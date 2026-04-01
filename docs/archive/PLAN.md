# Unreal Companion - Plan de Refonte

> Document de référence pour l'évolution du projet. Récapitule la vision, l'architecture et les tâches à implémenter.

**Dernière mise à jour:** 2024-01-22

---

## 1. Vision Globale

### 1.1 Deux Modes Distincts

| Mode | Rôle | Outils |
|------|------|--------|
| **STUDIO** | Conception — équipe virtuelle pour réfléchir au jeu | Conversationnel, génération de documents, brainstorming |
| **EDITOR** | Exécution — contrôle d'Unreal Engine | MCP Tools, actions dans l'éditeur |

**Flux de travail :**
```
STUDIO (Conception)              EDITOR (Exécution)
─────────────────────            ──────────────────────
│ Équipe virtuelle    │          │ Unreal Agent        │
│ - Game Designer     │   ───►   │ + Skills MCP        │
│ - Architect         │  docs    │                     │
│ - 3D Artist         │  tasks   │ Contexte enrichi    │
│ - Level Designer    │          │ depuis STUDIO       │
│                     │          │                     │
│ Méthode BMAD/BMGD   │          │ Suggestions         │
│ Artefacts visuels   │          │ pertinentes         │
└─────────────────────┘          └─────────────────────┘
```

### 1.2 Philosophie

- **Ludique** — Expérience gamifiée, pas des formulaires ennuyeux
- **Contextuel** — Le LLM utilise les réponses précédentes pour suggérer
- **Visuel** — Mood boards, mind maps, pas juste du texte
- **Portable** — Fonctionne en Web UI ET en CLI (Claude Code, Cursor, etc.)
- **Solo dev friendly** — Une équipe virtuelle pour ne plus être seul

### 1.3 Expérience Ludique des Workflows

> **Objectif :** Les workflows doivent ressembler à une conversation avec un collègue passionné, pas à un formulaire administratif.

#### Ce qu'on veut éviter (Boring)

```
❌ Formulaire classique :
┌─────────────────────────────────────┐
│ Question 1 de 47                    │
│ ━━━━━━━━━░░░░░░░░░░░░ 12%          │
│                                     │
│ Quel est le genre de votre jeu ?    │
│ [ ] Action                          │
│ [ ] RPG                             │
│ [ ] Puzzle                          │
│                                     │
│            [Suivant →]              │
└─────────────────────────────────────┘
```

#### Ce qu'on veut (Ludique)

```
✅ Conversation dynamique :
┌─────────────────────────────────────┐
│ 🎲 Game Designer                    │
├─────────────────────────────────────┤
│                                     │
│ "Un jeu d'exploration mystérieux,   │
│ j'adore ! Ça me rappelle Outer      │
│ Wilds. D'ailleurs, puisque tu       │
│ mentionnes la découverte de         │
│ secrets, est-ce que le joueur       │
│ aura un journal ou carnet ?"        │
│                                     │
│   💡 Suggestions basées sur ta      │
│      réponse précédente :           │
│                                     │
│   [Carnet mystère]  [Codex]         │
│   [Carte annotée]   [Autre...]      │
│                                     │
│ ✨ Vision définie ! Plus que        │
│    2 étapes pour ton Game Brief     │
└─────────────────────────────────────┘
```

#### Principes d'expérience ludique

| Principe | Implementation |
|----------|----------------|
| **Agent réactif** | Commente chaque réponse, fait des liens, montre qu'il écoute |
| **Suggestions contextuelles** | Propose des options basées sur les réponses précédentes |
| **Mémoire visible** | "Tu as mentionné X tout à l'heure, ça pourrait..." |
| **Célébrations** | Milestones avec messages enthousiastes |
| **Sessions courtes** | Découpage en étapes de 5-10 min max |
| **Reprise facile** | Résumé au retour "On en était à..." |

#### Agent Réactif : Exemples

```yaml
# Réaction dynamique (pas scriptée)
user_says: "Je veux un jeu d'exploration spatiale"

agent_reacts:
  acknowledgment: "L'espace ! Vaste sujet 🚀"
  connection: "Tu parlais d'ambiance mystérieuse, je vois bien
               un vaisseau abandonné à explorer..."
  follow_up: "Plutôt réaliste façon Alien Isolation, ou
              poétique comme Outer Wilds ?"
  suggestions:
    - "Réaliste/Survival"
    - "Poétique/Contemplatif"
    - "Arcade/Action"
```

```yaml
# Mémoire et callbacks
previous_answers:
  genre: "exploration"
  mood: "mystérieux"
  reference: "Outer Wilds"

current_question: "Quel type de progression ?"

agent_context_injection: |
  Vu que tu t'inspires d'Outer Wilds et que tu veux
  du mystère, je pense direct à la progression par
  la connaissance plutôt que par l'XP. Qu'en dis-tu ?

  [Connaissance/Découverte]  ← Recommandé
  [XP/Niveaux classique]
  [Hybrid]
```

#### Types de Réponses Interactives

Au-delà du texte libre et des suggestions cliquables, l'interface propose des modes de réponse variés :

| Type | Usage | Exemple |
| ---- | ----- | ------- |
| **Spectrum/Jauge** | Préférences entre deux extrêmes | "Linéaire ←●→ Non-linéaire" |
| **Échelle émotionnelle** | Capturer une intention | 😰 😐 🤔 😮 🤩 |
| **Choix A/B visuel** | Décision rapide avec références | "⚔️ Dark Souls" vs "🧠 XCOM" |
| **Jauge d'appréciation** | Feedback sur propositions | 👎 😐 👍 ❤️ 🔥 |

```
Exemple Jauge de Préférence :
┌────────────────────────────────────────────┐
│  Entre ces deux extrêmes ?                 │
│                                            │
│  Linéaire ●━━━━━━━●━━━━━━○ Non-linéaire   │
│                                            │
│  "Un peu d'exploration libre,              │
│   mais avec une trame"                     │
└────────────────────────────────────────────┘
```

#### Exemples Dynamiques du LLM

Le LLM ne pose pas que des questions — il propose des **exemples concrets** basés sur sa compréhension :

```
┌────────────────────────────────────────────┐
│ 💡 Voici comment je vois ton système :     │
│                                            │
│ "Le joueur commence dans le village.       │
│  Il apprend le mot 'OUVRIR' en observant   │
│  un marchand. Plus tard, il l'utilise      │
│  sur une porte scellée..."                 │
│                                            │
│ Cet exemple te parle ?                     │
│                                            │
│ [👍 Exactement !] [🔄 Pas mal...] [❌ Non] │
│                                            │
│ [Ou décris ta propre vision...]            │
└────────────────────────────────────────────┘
```

L'utilisateur peut noter l'exemple, et le LLM **adapte** ses propositions suivantes.

#### Discussions Réflexives

Les workflows ne sont pas des interrogatoires — ce sont des **conversations créatives** :

```yaml
# Le LLM adopte un mode discussion
agent_behavior:
  - RÉFLÉCHIR à voix haute ("Je me demande si...")
  - PROPOSER des pistes ("Et si on faisait...")
  - CHALLENGER gentiment ("Mais du coup, comment...")
  - CONNECTER les idées ("Ça rejoint ce que tu disais...")
```

#### Gestion du Contexte LLM (Optimisation Tokens)

> **Problème :** Sans stratégie, chaque appel envoie tout (GDD, historique, etc.) = ~12000+ tokens par appel, coût élevé et risque d'hallucination.

##### Contexte Hiérarchique

| Niveau | Contenu | Tokens | Quand |
| ------ | ------- | ------ | ----- |
| **CORE** | Projet (nom, pitch), agent, état actuel | ~500 | Toujours |
| **RELEVANT** | Facts extraits, décisions clés, réponses liées | ~1000 | Selon l'étape |
| **DÉTAILS** | GDD section, historique résumé | ~variable | À la demande |

Résultat : ~2000-3000 tokens par appel (vs 12000+)

##### Techniques clés

```yaml
# 1. Extraction de Facts (pas le texte brut)
facts:
  vision.pitch: "Explorer un monde figé..."    # 50 chars
  genre.primary: "exploration"                  # vs 500+ chars de texte
  mechanics.core_loop: "Observer → Déduire"

# 2. Injection sélective par étape
steps:
  - id: mechanics
    context_needs:
      facts: [vision.pitch, genre.primary]  # Seulement ce qu'il faut
      documents: [gdd.mechanics]            # Pas tout le GDD

# 3. Résumé progressif (après 10+ messages)
# 4. Prompt caching (parties stables)
```

**Config utilisateur :**

```yaml
context:
  max_tokens: 4000          # Budget par appel
  auto_extract_facts: true  # Extraction auto
  summarize_threshold: 10   # Résumer après N messages
```

#### Sauvegarde et Reprise

```yaml
# .unreal-companion/workflows/sessions/game-brief-2024-01-22.yaml
workflow_id: game-brief
started_at: 2024-01-22T10:00:00
last_activity: 2024-01-22T10:35:00
status: in_progress

# État actuel
current_step: 3
current_question: "core_mechanics"

# Réponses collectées (contexte pour le LLM)
responses:
  - step: 1
    question: elevator_pitch
    answer: "Explorer un monde figé dans le temps pour découvrir pourquoi"
    agent_reaction: "Mystérieux à souhait ! Le temps figé, ça ouvre plein de possibilités..."

  - step: 2
    question: genre
    answer: "exploration"
    agent_reaction: "Exploration pure, sans combat ? Courageux et rafraîchissant !"
    suggestions_shown: ["Outer Wilds", "Firewatch", "Gone Home"]
    suggestion_selected: "Outer Wilds"

# Pour la reprise
resume_summary: |
  On définissait ton jeu d'exploration mystérieux inspiré
  d'Outer Wilds. Tu veux un monde figé dans le temps à
  explorer. On allait parler des mécaniques de découverte.
```

#### Reprise de session (UI)

```
┌─────────────────────────────────────┐
│ 🎲 Game Designer                    │
├─────────────────────────────────────┤
│                                     │
│ "Re ! On s'était arrêtés sur ton    │
│ jeu d'exploration — le monde figé   │
│ dans le temps, très Outer Wilds.    │
│                                     │
│ On allait définir comment le        │
│ joueur découvre les secrets.        │
│ Prêt à continuer ?"                 │
│                                     │
│  [▶ Continuer]   [📋 Voir résumé]  │
│                                     │
│  ────────────────────────────────   │
│  📊 Game Brief : 2/5 étapes         │
│  ⏱️ ~10 min restantes               │
└─────────────────────────────────────┘
```

#### Célébrations et Milestones

```yaml
# Dans la définition du workflow
milestones:
  - after_step: 2
    name: "Vision Définie"
    celebration: |
      🎉 Boom ! Ta vision est posée. On sait déjà que c'est
      un jeu de {{genre}} inspiré de {{references}}.
      C'est le plus dur, bravo !
    unlock_message: "Tu débloques : Pitch Deck Preview"

  - after_step: 4
    name: "Core Loop Clair"
    celebration: |
      ✨ Le cœur du jeu est défini ! {{player_action}} →
      {{reward}}. Simple et efficace.

  - on_complete:
    name: "Game Brief Complet"
    celebration: |
      🏆 Game Brief terminé ! Tu as une base solide pour
      ton {{project_name}}.

      Prochaine étape suggérée : [Créer le GDD] ou
      [Brainstormer les mécaniques]
```

#### Party Mode (Multi-Agents)

> Inspiré de BMAD — Plusieurs agents discutent ensemble sur un sujet, chacun apportant sa perspective.

```
┌────────────────────────────────────────────────────────────┐
│  🎉 Party Mode : "Comment gérer la progression ?"          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎲 Game Designer :                                        │
│  "Je vois bien une progression par la connaissance,        │
│   pas d'XP. Le joueur apprend le langage, c'est ça         │
│   qui débloque les zones."                                 │
│                                                            │
│  🏛️ Architect :                                            │
│  "Techniquement ça veut dire un système de flags           │
│   persistants. On peut faire un DataAsset pour             │
│   tracker les mots appris."                                │
│                                                            │
│  🎨 3D Artist :                                            │
│  "Et visuellement, les zones 'débloquées' pourraient       │
│   changer d'ambiance ? Plus de lumière, de couleur ?"      │
│                                                            │
│  🗺️ Level Designer :                                       │
│  "Attention au pacing ! Si tout se débloque d'un coup,     │
│   le joueur sera perdu. Je suggère des hubs progressifs."  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  💬 Toi : "J'aime l'idée des hubs progressifs..."          │
│                                                            │
│  [Envoyer]  [🎤]  [Demander à un agent spécifique]        │
└────────────────────────────────────────────────────────────┘
```

**Fonctionnement :**
- L'user pose une question/problème
- Chaque agent intervient selon sa spécialité
- Débat naturel, rebonds entre agents
- L'user peut répondre, orienter, ou demander à un agent spécifique
- À la fin : synthèse des décisions prises

```yaml
# Session Party Mode
party_session:
  topic: "Comment gérer la progression du joueur ?"
  participants: [game-designer, architect, 3d-artist, level-designer]

  exchanges:
    - agent: game-designer
      message: "Je vois bien une progression par la connaissance..."
      sentiment: enthusiastic

    - agent: architect
      message: "Techniquement ça veut dire..."
      sentiment: analytical
      references_previous: true

    - agent: 3d-artist
      message: "Et visuellement..."
      sentiment: curious
      builds_on: architect

    - user:
      message: "J'aime l'idée des hubs progressifs"

  decisions:
    - "Progression par connaissance (pas XP)"
    - "DataAsset pour tracker mots appris"
    - "Hubs progressifs pour le pacing"

  # Auto-ajouté aux artifacts concernés
  updates_artifacts:
    - path: "artifacts/design/gdd.md"
      section: "progression"
```

#### Document Live (Remplissage Progressif)

> Le document se construit **pendant** la conversation, pas à la fin.

```
┌────────────────────────────────────────────────────────────┐
│  Chat                          │  📄 Game Brief (live)     │
│                                │                           │
│  🎲 "Quel est ton pitch ?"    │  # Mon Jeu                │
│                                │                           │
│  Toi: "Explorer un monde      │  ## Vision                │
│  figé pour découvrir          │  > Explorer un monde figé │
│  pourquoi"                     │  > pour découvrir pourquoi│
│                                │  ✨ (ajouté il y a 2s)   │
│  🎲 "J'adore ! Et le         │                           │
│  genre ?"                      │  ## Genre                 │
│                                │  _En attente..._          │
│  Toi: "Exploration"           │                           │
│                                │  ## Genre                 │
│  🎲 "Comme Outer Wilds ?"    │  Exploration              │
│                                │  Références: Outer Wilds  │
│                                │  ✨ (ajouté il y a 1s)   │
├────────────────────────────────┴───────────────────────────┤
│  📊 v1.3 • 12 modifications • Dernière: il y a 5s         │
│  [Voir historique]  [Exporter]  [Partager]                │
└────────────────────────────────────────────────────────────┘
```

**Versioning du document :**
```yaml
# artifacts/briefs/game-brief.md.history.yaml
versions:
  - version: 1.0
    date: 2024-01-22T10:00:00
    changes:
      - section: vision
        action: created
        content: "Explorer un monde figé..."
        from_session: "workflow-abc123"

  - version: 1.1
    date: 2024-01-22T10:05:00
    changes:
      - section: genre
        action: created
        content: "Exploration"
      - section: references
        action: created
        content: "Outer Wilds"

  - version: 1.2
    date: 2024-01-22T14:30:00
    changes:
      - section: mechanics
        action: updated
        previous: "Système de scan"
        content: "Système de résonance avec diapason"
        reason: "Décision Party Mode"
        from_session: "party-def456"
```

#### Avatars et Personnalités

> Chaque agent a un nom, un avatar, et des animations/réactions.

```yaml
# agents/custom/maya-designer.yaml
id: maya-designer
base: game-designer  # Hérite du game-designer par défaut

# Personnalisation
persona:
  name: "Maya"
  avatar: "🎲"  # Ou chemin vers image custom
  avatar_style: "pixel-art"  # pixel-art | cartoon | realistic | emoji

  # Animations/États
  expressions:
    thinking: "🤔"      # Quand il réfléchit
    excited: "🤩"       # Quand il trouve ça cool
    celebrating: "🎉"   # Milestones
    concerned: "😬"     # Quand il voit un problème
    neutral: "🎲"       # Par défaut

  # Phrases signature
  catchphrases:
    greeting: "Salut chef ! Prêt à designer ?"
    thinking: ["Hmm, laisse-moi réfléchir...", "Intéressant...", "Oh !"]
    excited: ["J'adore !", "Ça c'est une idée !", "On tient quelque chose !"]
    milestone: ["Boom ! 💥", "Yes ! On avance bien !", "Étape franchie !"]

  # Style de communication
  tone: casual  # formal | casual | enthusiastic | analytical
  uses_emojis: true
  verbosity: medium  # brief | medium | verbose
```

**Rendu UI avec animations :**

```
┌─────────────────────────────────────┐
│                                     │
│     ╭───────╮                       │
│     │ 🤩   │  ← Expression animée  │
│     │ Maya  │                       │
│     ╰───────╯                       │
│        ↓ bulle qui apparaît         │
│  ┌─────────────────────────────┐   │
│  │ "J'adore l'idée du monde    │   │
│  │ figé ! Ça me rappelle       │   │
│  │ Outer Wilds, tu connais ?"  │   │
│  └─────────────────────────────┘   │
│                                     │
│  💭 Maya réfléchit...              │  ← État loading
│     ╭───────╮                       │
│     │ 🤔   │  ← Animation thinking │
│     ╰───────╯                       │
│                                     │
└─────────────────────────────────────┘
```

**Animations suggérées :**
| État | Animation |
|------|-----------|
| Idle | Léger mouvement (breathing) |
| Thinking | Points de suspension animés + expression 🤔 |
| Typing | Avatar qui "tape" ou bulle en construction |
| Excited | Petit bounce + expression 🤩 + particules |
| Celebrating | Confettis + expression 🎉 + sound effect |
| Concerned | Légère secousse + expression 😬 |

#### Réflexions Visibles des Agents

> **Concept :** Pendant que l'agent "réfléchit" (attente LLM), afficher de petites phrases qui reflètent sa personnalité ET son rôle. Pas un simple "..." mais une vraie fenêtre sur sa façon de penser.

**Exemples par agent :**

| Agent | Réflexions (apparaissent aléatoirement pendant le loading) |
| ----- | ---------------------------------------------------------- |
| 🎲 Maya (Game Designer) | "Hmm, comment rendre ça fun..." / "Outer Wilds faisait un truc cool pour ça..." / "Et si on inversait la perspective ?" |
| 🏛️ Alex (Architect) | "Ça sent le pattern Observer..." / "Blueprint ou C++ pour ça..." / "Faut penser à la scalabilité..." |
| 🎨 Sam (3D Artist) | "Je vois bien un style cell-shading..." / "Le contraste est important ici..." / "Ça me rappelle Ghibli..." |
| 🗺️ Jordan (Level Designer) | "Comment guider le joueur sans marker..." / "Le pacing serait mieux si..." / "Flow first, details later..." |
| 🤖 Unreal Agent | "Checking available tools..." / "BP_Player... got it..." / "Let me compile that..." |

**Dans l'UI :**

```
┌─────────────────────────────────────┐
│     ╭───────╮                       │
│     │ 🤔   │  Maya                 │
│     ╰───────╯                       │
│                                     │
│  💭 "Et si on inversait la          │
│      perspective du joueur ?"       │
│     ●●●                             │
│                                     │
└─────────────────────────────────────┘
```

**Configuration dans le persona :**

```yaml
persona:
  thinking_phrases:
    # Réflexions liées au RÔLE
    role_specific:
      - "Hmm, côté game design..."
      - "Le joueur va se demander..."
      - "C'est une question de feedback loop..."

    # Réflexions liées à la PERSONNALITÉ
    personality:
      - "Ça me rappelle un jeu que j'adorais..."
      - "Oh, idée folle mais..."
      - "Attends, je réfléchis..."

    # Réflexions CONTEXTUELLES (injectées par le LLM)
    contextual: true  # Le LLM génère des pensées basées sur le contexte
```

**Règles :**

- Phrases courtes (< 50 caractères)
- Changent toutes les 2-3 secondes pendant l'attente
- Mix de phrases pré-définies + générées par LLM
- Toujours cohérentes avec le contexte de la conversation
- Optionnel : désactivable dans les settings pour les users pressés

#### Quick Interactions (Mini-Jeux Créatifs)

> Des exercices rapides pour débloquer les idées ou accélérer les décisions.

| Type | Description | Usage |
| ---- | ----------- | ----- |
| **Speed Round** | 5 mots en temps limité (15s) | Capturer l'essence rapidement |
| **This or That** | Série de choix binaires rapides | Définir des préférences |
| **Word Association** | L'agent dit un mot, user répond | Révéler des connexions inconscientes |
| **Wild Card** | Question créative random | Déclencher des associations inattendues |

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ SPEED ROUND — 5 mots pour décrire ton jeu, GO !        │
│                                                             │
│  [mystère] [exploration] [langage] [_______] [_______]     │
│                                                             │
│  ⏱️ 0:08                                    [Terminé !]    │
└─────────────────────────────────────────────────────────────┘
```

**Configuration :**

```yaml
quick_interactions:
  timer_enabled: true   # Désactivable pour users stressés
  default_timer: 15     # Secondes
```

#### Tips & Conseils du Jour

> L'agent partage des tips contextuels basés sur le projet et l'avancement.

| Type | Déclencheur | Exemple |
| ---- | ----------- | ------- |
| **Contextuel** | Basé sur le projet | "Pour un jeu d'exploration, pense à la Règle des 3 Curiosités..." |
| **Technique** | Basé sur la plateforme | "Dans Unreal, tu peux utiliser les Data Assets pour..." |
| **Inspiration** | Random/Daily | "Outer Wilds a innové en rendant la mort utile..." |
| **Warning** | Détection de pattern | "Attention au scope creep ! Tu as déjà 15 mécaniques..." |

```
┌─────────────────────────────────────────────────────────────┐
│  💡 TIP DU JOUR — par Maya                                  │
│                                                             │
│  "Tu travailles sur un jeu d'exploration ?                 │
│   Pense à la 'Règle des 3 Curiosités' :                    │
│   À chaque endroit, le joueur devrait voir                 │
│   au moins 3 choses qui l'intriguent."                     │
│                                                             │
│  📚 En savoir plus   [👍 Utile]   [👎 Pas pour moi]        │
└─────────────────────────────────────────────────────────────┘
```

**Configuration :**

```yaml
tips:
  enabled: true
  frequency: daily        # daily | per_session | on_milestone
  categories:
    - game_design
    - technical
    - inspiration
    - warnings
```

#### UI de Personnalisation (pas de YAML brut)

> Éditeur visuel convivial pour créer/modifier agents et workflows.

**Éditeur d'Agent :**
```
┌────────────────────────────────────────────────────────────┐
│  ✏️ Personnaliser : Maya (Game Designer)                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ╭─────────────────────────────────────────────────────╮  │
│  │  Identité                                            │  │
│  │  ┌──────────┐                                       │  │
│  │  │   🎲    │  [Changer avatar]                     │  │
│  │  └──────────┘                                       │  │
│  │  Nom: [Maya_____________]                           │  │
│  │  Titre: [Game Designer extraordinaire___]           │  │
│  ╰─────────────────────────────────────────────────────╯  │
│                                                            │
│  ╭─────────────────────────────────────────────────────╮  │
│  │  Personnalité                                        │  │
│  │                                                      │  │
│  │  Ton:  ◉ Casual  ○ Formel  ○ Enthousiaste          │  │
│  │  Emojis: [✓] Utilise des emojis                     │  │
│  │  Verbosité: [━━━━●━━━] Medium                       │  │
│  ╰─────────────────────────────────────────────────────╯  │
│                                                            │
│  ╭─────────────────────────────────────────────────────╮  │
│  │  Phrases signatures                                  │  │
│  │                                                      │  │
│  │  Salutation:                                         │  │
│  │  [Salut chef ! Prêt à designer ?___________]        │  │
│  │                                                      │  │
│  │  Quand excité: (cliquer pour éditer)                │  │
│  │  • "J'adore !"  [✕]                                 │  │
│  │  • "Ça c'est une idée !"  [✕]                       │  │
│  │  [+ Ajouter]                                         │  │
│  ╰─────────────────────────────────────────────────────╯  │
│                                                            │
│  ╭─────────────────────────────────────────────────────╮  │
│  │  Aperçu en direct                                    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  🎲 Maya                                      │   │  │
│  │  │  "Salut chef ! Prêt à designer ? J'adore     │   │  │
│  │  │   ton concept de monde figé ! 🤩"            │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  ╰─────────────────────────────────────────────────────╯  │
│                                                            │
│              [Annuler]  [Sauvegarder]                     │
└────────────────────────────────────────────────────────────┘
```

**Éditeur de Workflow (simplifié) :**
```
┌────────────────────────────────────────────────────────────┐
│  ✏️ Créer un Workflow                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Nom: [Mon Brainstorm Mécanique_____]                     │
│  Agent: [▼ Maya - Game Designer]                          │
│  Durée estimée: [▼ 10-15 min]                             │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│  📋 Étapes                                                │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  ┌─ Étape 1: Introduction ──────────────────────────┐    │
│  │  Message agent:                                    │    │
│  │  [Parlons de ta mécanique principale !___]        │    │
│  │                                                    │    │
│  │  Questions:                                        │    │
│  │  ├─ "Décris la mécanique" [Texte libre]  [≡]     │    │
│  │  └─ "Genre associé" [Choix multiples]    [≡]     │    │
│  │                                        [+ Question]│    │
│  └────────────────────────────────────────────────────┘    │
│                                    [+ Ajouter étape]       │
│                                                            │
│  ┌─ Étape 2: Approfondissement ─────────────────────┐    │
│  │  ...                                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│  🎉 Célébration finale                                    │
│  [Tu as défini ta mécanique ! 🎮________________]         │
│                                                            │
│              [Tester]  [Annuler]  [Sauvegarder]          │
└────────────────────────────────────────────────────────────┘
```

#### Input Vocal et Multimodal

> L'utilisateur peut parler, envoyer des images, vidéos — le LLM interprète tout.

**Voice Input (Whisper) :**
```
┌─────────────────────────────────────┐
│  🎲 Maya                            │
├─────────────────────────────────────┤
│  "Comment vois-tu le système        │
│   de combat ?"                      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [Écrire...]          [🎤]  │   │ ← Bouton micro
│  └─────────────────────────────┘   │
│                                     │
│      🎤 Écoute en cours...         │ ← Mode écoute actif
│      ━━━━━━━━━━━━━━━━━ 0:03        │
│      [⏹ Arrêter]                   │
│                                     │
│  💬 Transcription :                │
│  "Je voudrais un système basé      │
│   sur la résonance, où le joueur   │
│   utilise son diapason pour..."    │
│                                     │
│      [✓ Envoyer]  [✏️ Modifier]    │
└─────────────────────────────────────┘
```

**Multimodal Context :**
```
┌─────────────────────────────────────────────────────────┐
│  Ajouter du contexte à la conversation                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │  📝    │ │  🖼️    │ │  🎬    │ │  📄    │      │
│  │ Texte  │ │ Image  │ │ Vidéo  │ │  PDF   │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│  Fichiers attachés :                                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 🖼️ concept-art-temple.png                       │  │
│  │    "Voici l'ambiance que je veux pour le temple" │  │
│  │                                          [✕]    │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ 🎬 reference-gameplay.mp4                       │  │
│  │    "Ce genre de feeling pour l'exploration"     │  │
│  │                                          [✕]    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  L'agent analysera ces fichiers pour mieux comprendre  │
│  ta vision et faire des suggestions pertinentes.       │
└─────────────────────────────────────────────────────────┘
```

```yaml
# Support multimodal
multimodal_input:
  voice:
    provider: whisper  # whisper | google | azure
    languages: [fr, en]
    auto_detect: true

  vision:
    supported_formats: [png, jpg, gif, webp]
    max_size: 10MB
    analysis: true  # LLM décrit et analyse

  video:
    supported_formats: [mp4, webm, mov]
    max_duration: 60s
    extract_frames: true  # Extrait des frames clés

  documents:
    supported_formats: [pdf, txt, md]
    extract_text: true
```

---

### 1.4 Internationalisation (i18n)

#### Langues supportées

- **Anglais** (en) — par défaut
- **Français** (fr)
- *(extensible à d'autres langues)*

#### Comportement du LLM

```yaml
language_behavior:
  # Langue de départ = langue de l'interface
  initial_language: from_interface  # "en" ou "fr"

  # Détection automatique si l'user parle autrement
  auto_detect: true

  # Switch intelligent
  on_language_change:
    - detect: "L'utilisateur parle en français"
    - action: switch_conversation_language
    - suggest: "Je vois que tu préfères le français ! Veux-tu que je change aussi l'interface ?"
```

**Exemple de flow :**
```
Interface: English
User: "Crée un Blueprint pour le joueur"

Agent: "Pas de problème ! Je crée BP_Player.
        💡 I noticed you're speaking French.
        Would you like to switch the interface to French?
        [Oui, passer en français]  [No, keep English]"
```

#### Documents et Outputs

| Type | Langue par défaut | Configurable |
|------|-------------------|--------------|
| **Conversations** | Langue de l'interface | Auto-switch |
| **Game Brief** | Langue de l'interface | ✅ Oui |
| **GDD** | Langue de l'interface | ✅ Oui |
| **Technical docs** | Anglais (recommandé) | ✅ Oui |
| **Code comments** | Anglais | ✅ Oui |
| **Tasks** | Langue de l'interface | ✅ Oui |

**Configuration utilisateur :**

```yaml
# ~/.unreal-companion/config.yaml
preferences:
  interface_language: fr

  documents:
    default_language: fr
    overrides:
      technical: en
      code_comments: en
      briefs: fr
      gdd: fr

# Expérience ludique
ludic:
  tips:
    enabled: true
    frequency: daily  # daily | per_session | on_milestone
    categories: [game_design, technical, inspiration, warnings]
  quick_interactions:
    timer_enabled: true
    default_timer: 15
  celebrations:
    confetti: true
    sounds: false

# Gestion du contexte LLM
context:
  max_tokens: 4000
  auto_extract_facts: true
  summarize_threshold: 10
  use_prompt_caching: true
```

**UI Settings :**
```
┌────────────────────────────────────────────────────────────┐
│  🌐 Langue / Language                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Interface :  ◉ Français  ○ English                       │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│  📄 Documents                                              │
│  ─────────────────────────────────────────────────────    │
│                                                            │
│  Langue par défaut : [▼ Français]                         │
│                                                            │
│  Exceptions :                                              │
│  • Documents techniques : [▼ English] ← Recommandé        │
│  • Commentaires code : [▼ English] ← Recommandé           │
│  • Game Brief : [▼ Français]                              │
│  • GDD : [▼ Français]                                     │
│                                                            │
│  💡 Tip: L'anglais est recommandé pour les docs           │
│     techniques car le LLM les comprend mieux et           │
│     c'est standard dans l'industrie.                      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Dans les workflows :**
```yaml
# Le workflow peut avoir des traductions
workflow:
  id: game-brief
  name:
    en: "Game Brief"
    fr: "Brief de Jeu"

  steps:
    - id: vision
      agent_message:
        en: "Let's capture your game's core vision!"
        fr: "Définissons la vision de ton jeu !"
      questions:
        - prompt:
            en: "Describe your game in one sentence"
            fr: "Décris ton jeu en une phrase"
```

**Bilingual output (option avancée) :**
```
┌────────────────────────────────────────────────────────────┐
│  📄 Game Brief — The Last Shard                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ## Vision                                                 │
│  🇫🇷 Explorer un monde figé dans le temps pour            │
│     découvrir pourquoi la civilisation s'est arrêtée.     │
│                                                            │
│  🇬🇧 Explore a world frozen in time to discover           │
│     why civilization came to a halt.                      │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│  [Mode: Bilingue ▼]  [Exporter FR]  [Exporter EN]        │
└────────────────────────────────────────────────────────────┘
```

---

### 1.5 Pages d'Accueil (Studio & Editor)

#### Studio Home — "Que fait-on aujourd'hui ?"

```
┌────────────────────────────────────────────────────────────────┐
│  🌅 Bonjour Guillaume !                                        │
│  Prêt à avancer sur The Last Shard ?                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ╭─ 💬 Reprendre ─────────────────────────────────────────╮   │
│  │                                                         │   │
│  │  🎲 Maya (hier, 18:32)                                 │   │
│  │  "On définissait le système de progression..."          │   │
│  │                                                         │   │
│  │  📊 Game Brief : 3/5 étapes                            │   │
│  │                                                         │   │
│  │  [▶ Continuer]                                         │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
│  ╭─ 💡 Suggestions ───────────────────────────────────────╮   │
│  │                                                         │   │
│  │  • Finir le Game Brief (encore ~10 min)                │   │
│  │  • Brainstormer sur le système de langage              │   │
│  │  • Party Mode : discuter du pacing avec l'équipe       │   │
│  │                                                         │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
│  ╭─ 📋 Aperçu du Board ───────────────────────────────────╮   │
│  │                                                         │   │
│  │  🎯 Concept (2)  💻 Dev (5)  🎨 Art (3)  🗺️ Levels (4) │   │
│  │                                                         │   │
│  │  Prochaine task prête :                                │   │
│  │  → "Définir le core loop" (Concept)                    │   │
│  │                                                         │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
│  ╭─ 🎉 Équipe ────────────────────────────────────────────╮   │
│  │                                                         │   │
│  │  🎲 Maya   🏛️ Alex   🎨 Sam   🗺️ Jordan               │   │
│  │  Designer  Architect  Artist  Level Designer           │   │
│  │                                                         │   │
│  │  [Discuter avec...]  [Party Mode]                      │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Première visite (Onboarding Studio) :**
```
┌────────────────────────────────────────────────────────────────┐
│  🎮 Bienvenue dans ton Studio !                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  C'est ici que tu vas concevoir ton jeu avec ton équipe       │
│  d'agents IA. Chacun a sa spécialité :                        │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  🎲 Game Designer  — Vision, mécaniques, gameplay      │   │
│  │  🏛️ Architect     — Systèmes, architecture technique  │   │
│  │  🎨 3D Artist     — Direction artistique, assets      │   │
│  │  🗺️ Level Designer — Niveaux, pacing, exploration    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Par où commencer ?                                           │
│                                                                │
│  [🚀 Quick Start (2 min)]     ← Recommandé                    │
│  [📋 Game Brief complet]                                       │
│  [💬 Juste discuter]                                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Editor Home — Prêt à construire

```
┌────────────────────────────────────────────────────────────────┐
│  🔧 Editor — The Last Shard                                   │
│  Connecté à Unreal Engine ✅                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ╭─ 💬 Dernière session ──────────────────────────────────╮   │
│  │                                                         │   │
│  │  🤖 Unreal Agent (hier, 20:15)                         │   │
│  │  "On a créé BP_PlayerController avec le movement..."    │   │
│  │                                                         │   │
│  │  [▶ Continuer]  [📋 Nouvelle conversation]             │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
│  ╭─ 📋 Tasks prêtes (depuis le Board) ────────────────────╮   │
│  │                                                         │   │
│  │  💻 Dev                                                │   │
│  │  ▶ "Créer le système de sauvegarde"                    │   │
│  │    Dépendances OK • Contexte: GDD section Save         │   │
│  │    [Lancer cette task]                                 │   │
│  │                                                         │   │
│  │  🎨 Art                                                │   │
│  │  ▶ "Material hologramme pour le Codex"                 │   │
│  │    [Lancer]                                            │   │
│  │                                                         │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
│  ╭─ 🛠️ Outils rapides ────────────────────────────────────╮   │
│  │                                                         │   │
│  │  [+ Blueprint]  [+ Material]  [+ Widget]  [+ Level]    │   │
│  │                                                         │   │
│  │  💡 "Crée un BP_Eclos avec un mesh et un audio..."    │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
│  ╭─ 📜 Historique ────────────────────────────────────────╮   │
│  │                                                         │   │
│  │  • BP_PlayerController créé (hier)                     │   │
│  │  • Material M_Hologram créé (avant-hier)               │   │
│  │  • Level L_Temple structure (il y a 3 jours)           │   │
│  │                                                         │   │
│  │  [Voir tout l'historique]                              │   │
│  ╰─────────────────────────────────────────────────────────╯   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Première visite (Onboarding Editor) :**
```
┌────────────────────────────────────────────────────────────────┐
│  🔧 Bienvenue dans l'Editor !                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  C'est ici que tu contrôles Unreal Engine par la voix ou     │
│  le texte. L'agent peut créer, modifier, organiser...         │
│                                                                │
│  🎯 Essaie quelque chose de simple pour voir :               │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  💬 "Crée un Blueprint vide nommé BP_Test"             │   │
│  │     → Crée un Blueprint Actor                          │   │
│  │                                                         │   │
│  │  💬 "Spawn un cube au centre du level"                 │   │
│  │     → Place un StaticMeshActor                         │   │
│  │                                                         │   │
│  │  💬 "Liste tous les Blueprints du projet"              │   │
│  │     → Explore les assets                               │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  [🧪 Essayer un exemple]  [📖 Voir tous les tools]           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Liste des Tools (accessible depuis Editor)

```
┌────────────────────────────────────────────────────────────────┐
│  🛠️ Outils disponibles (67 tools)                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  🔍 Rechercher...                                             │
│                                                                │
│  ▼ blueprint_* (13 tools)                                     │
│  ├── blueprint_create — Créer un nouveau Blueprint            │
│  │   💬 "Crée un BP_Enemy qui hérite de Character"           │
│  ├── blueprint_variable_batch — Ajouter des variables         │
│  │   💬 "Ajoute Health (float) et IsAlive (bool) à BP_Enemy" │
│  ├── blueprint_component_batch — Ajouter des composants       │
│  │   💬 "Ajoute un SkeletalMesh et un CapsuleCollision"      │
│  └── ...                                                      │
│                                                                │
│  ▼ graph_* (9 tools)                                          │
│  ├── graph_batch — Ajouter des nodes et connexions            │
│  │   💬 "Ajoute un Event BeginPlay qui print Hello"          │
│  └── ...                                                      │
│                                                                │
│  ▼ material_* (3 tools)                                       │
│  ▼ widget_* (6 tools)                                         │
│  ▼ world_* (6 tools)                                          │
│  ▼ 🎨 meshy_* (3 tools) — Génération 3D                      │
│  │   ⚠️ Requiert clé API Meshy                               │
│  └── ...                                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### Sidebar Historique & Logs

```
┌─────────────────────────────────┐
│  📜 Conversations               │
├─────────────────────────────────┤
│                                 │
│  Aujourd'hui                   │
│  └─ BP_Eclos creation          │ ← Titre auto-généré
│                                 │
│  Hier                          │
│  ├─ Player movement system     │
│  └─ Save system discussion     │
│                                 │
│  Cette semaine                 │
│  ├─ Material hologram          │
│  ├─ Temple level structure     │
│  └─ ...                        │
│                                 │
├─────────────────────────────────┤
│  📊 Logs (cette session)       │
├─────────────────────────────────┤
│                                 │
│  ✅ blueprint_create           │
│     BP_Eclos créé              │
│                                 │
│  ✅ blueprint_component_batch  │
│     3 composants ajoutés       │
│                                 │
│  ❌ graph_batch                │
│     Pin "execute" not found    │
│     [Voir détails]             │
│                                 │
│  ⏳ material_create            │
│     En cours...                │
│                                 │
└─────────────────────────────────┘
```

---

### 1.5 Intégrations Externes

#### Meshy API (Génération 3D)

> Génère des assets 3D depuis du texte ou des images, puis importe dans Unreal.

```
┌────────────────────────────────────────────────────────────────┐
│  🎨 Générer un asset 3D (Meshy)                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Mode: ◉ Texte → 3D   ○ Image → 3D                           │
│                                                                │
│  Prompt:                                                      │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Ancient stone altar with glowing blue runes,           │   │
│  │ mystical atmosphere, game-ready asset                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Style: [▼ Realistic]   Poly: [▼ Medium (~10k)]              │
│                                                                │
│  [🎨 Générer]                                                 │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│                                                                │
│  Résultat :                                                   │
│  ┌──────────────────────────────────────────┐                │
│  │                                          │                │
│  │     [Preview 3D rotatif]                 │                │
│  │                                          │                │
│  └──────────────────────────────────────────┘                │
│                                                                │
│  [⬇️ Télécharger FBX]  [📥 Importer dans Unreal]             │
│                                                                │
│  Import options:                                              │
│  • Dossier: /Game/Meshes/Generated/                          │
│  • Créer Material: [✓]                                       │
│  • Placer dans le level: [✓]                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Workflow intégré :**
```yaml
# Conversation naturelle
user: "Génère un autel ancien avec des runes bleues et place-le dans le Temple"

agent_actions:
  1. meshy_generate:
       prompt: "Ancient stone altar with glowing blue runes..."
       style: realistic

  2. meshy_download:
       format: fbx

  3. asset_import:
       path: "/Game/Meshes/Generated/SM_Altar"
       create_material: true

  4. world_spawn:
       asset: "/Game/Meshes/Generated/SM_Altar"
       level: "L_Temple"
       location: [0, 0, 100]
```

**Services supportés :**
| Service | Type | Configuration |
|---------|------|---------------|
| **Meshy** | Text/Image → 3D | API Key dans settings |
| **Replicate** | Image generation | API Key dans settings |
| **OpenAI DALL-E** | Image generation | Inclus si clé OpenAI |
| **Stability AI** | Image generation | API Key dans settings |

---

#### Flow d'un workflow ludique

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  START                                                   │
│    │                                                     │
│    ▼                                                     │
│  ┌─────────────┐     ┌─────────────────────────────┐    │
│  │ Load State  │────►│ Nouvelle session OU Reprise │    │
│  └─────────────┘     └─────────────────────────────┘    │
│                                │                         │
│                                ▼                         │
│                      ┌─────────────────┐                │
│                      │  Affiche Step   │                │
│                      │  + Agent Intro  │                │
│                      └────────┬────────┘                │
│                               │                         │
│                               ▼                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                 QUESTION LOOP                      │  │
│  │                                                    │  │
│  │   ┌──────────────────┐                            │  │
│  │   │ Génère Question  │◄─────────────────┐        │  │
│  │   │ + Suggestions    │                  │        │  │
│  │   │ (context-aware)  │                  │        │  │
│  │   └────────┬─────────┘                  │        │  │
│  │            │                            │        │  │
│  │            ▼                            │        │  │
│  │   ┌──────────────────┐                  │        │  │
│  │   │  User Responds   │                  │        │  │
│  │   └────────┬─────────┘                  │        │  │
│  │            │                            │        │  │
│  │            ▼                            │        │  │
│  │   ┌──────────────────┐     ┌──────────────────┐  │  │
│  │   │ Agent Reacts     │────►│ Save to State    │  │  │
│  │   │ (acknowledges,   │     │ (responses +     │  │  │
│  │   │  connects,       │     │  reactions)      │  │  │
│  │   │  suggests)       │     └──────────────────┘  │  │
│  │   └────────┬─────────┘                  │        │  │
│  │            │                            │        │  │
│  │            ▼                            │        │  │
│  │   ┌──────────────────┐                  │        │  │
│  │   │ More questions?  │──── Yes ─────────┘        │  │
│  │   └────────┬─────────┘                           │  │
│  │            │ No                                   │  │
│  └────────────┼──────────────────────────────────────┘  │
│               ▼                                         │
│      ┌─────────────────┐                               │
│      │ Step Complete   │                               │
│      │ → Milestone?    │                               │
│      │ → Celebration!  │                               │
│      └────────┬────────┘                               │
│               │                                         │
│               ▼                                         │
│      ┌─────────────────┐                               │
│      │ More steps?     │──── Yes ───► Next Step        │
│      └────────┬────────┘                               │
│               │ No                                      │
│               ▼                                         │
│      ┌─────────────────┐                               │
│      │ WORKFLOW DONE   │                               │
│      │ → Final celeb   │                               │
│      │ → Generate doc  │                               │
│      │ → Suggest next  │                               │
│      └─────────────────┘                               │
│                                                         │
└──────────────────────────────────────────────────────────┘
```

---

### 1.6 Web-UI Existant (À Réutiliser)

> **IMPORTANT :** Ces fonctionnalités existent déjà et ne doivent PAS être recréées !

#### Lancement unifié

**Script :** `web-ui/start.sh` (ou `npm run start`)

```bash
# Lance tout sur le port 3179 :
# - Backend FastAPI (/api/*)
# - Frontend React (/)
# - MCP Bridge intégré
./start.sh
```

#### Onboarding (À étendre - 7 étapes)

**Fichier existant :** `src/components/onboarding/OnboardingFlow.tsx`

**Étapes actuelles (5) + nouvelles (2) :**

| Étape | Contenu | Status |
|-------|---------|--------|
| 1. Welcome | "Bienvenue dans ton studio virtuel !" | À améliorer |
| 2. Project | Création/liaison projet Unreal (auto-discovery) | ✅ Existe |
| 3. Providers | Config API keys (Anthropic/OpenAI/Google) | ✅ Existe |
| 4. **Team** | "Rencontre ton équipe" - présentation 3 agents clés | 🆕 À créer |
| 5. Theme | Choix du thème UI | ✅ Existe |
| 6. **Quick Start** | Lancer quick-start workflow ou explorer | 🆕 À créer |
| 7. Ready | "Ton studio est prêt !" + rappel BMGD | À améliorer |

**Nouvelle étape "Team" :**
```
┌────────────────────────────────────────────────────────┐
│ 👥 Ton équipe virtuelle                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Tu n'es plus seul ! Voici ton équipe de studio :      │
│                                                        │
│ 🎮 Zelda - Game Designer                              │
│    "Je t'aide à définir ta vision et tes mécaniques"  │
│                                                        │
│ 🏗️ Solid - Architecte                                 │
│    "Je structure tes systèmes et Blueprints"          │
│                                                        │
│ 🗺️ Lara - Level Designer                              │
│    "Je conçois tes niveaux et le flow joueur"         │
│                                                        │
│ ... et d'autres spécialistes disponibles !            │
│                                                        │
│ 💡 Notre méthode s'inspire de BMGD                    │
│    (Breakthrough Method for Game Development)         │
│                                                        │
│                              [Suivant →]              │
└────────────────────────────────────────────────────────┘
```

Déclenché si : `!hasAnyApiKey && projects.length === 0`

#### MCP Bridge

**Fichier :** `server/services/mcp_bridge.py`

- Import auto des tools depuis `Python/tools/`
- Singleton avec `list_tools()` et `call_tool()`
- Utilisé dans `chat.py` pour l'exécution des tools

#### Stores Zustand (9 existants)

| Store | Rôle |
|-------|------|
| chatStore | Messages, conversation |
| projectStore | Projets, persistence |
| workflowStore | Sessions workflow, WebSocket |
| llmStore | Config LLM, providers |
| connectionStore | Status Unreal/MCP |
| studioStore | Tasks, sectors |
| + 3 autres | Theme, logs, toasts |

---

## 2. Architecture des Agents

### 2.1 Agents vs Skills

| Concept | Description | Usage |
|---------|-------------|-------|
| **Agent** | Personnalité, point de vue, style de communication | *"Qui me parle ?"* |
| **Skill** | Procédure réutilisable, savoir-faire | *"Comment faire X ?"* |

### 2.2 Méthodologie BMGD/BMAD

> **Crédit :** Notre approche s'inspire de la méthodologie **BMGD** (Breakthrough Method for Game Development).
> Repo officiel : [bmad-code-org/bmad-module-game-dev-studio](https://github.com/bmad-code-org/bmad-module-game-dev-studio)
>
> Nous adaptons leurs patterns (step-file, agents personas, workflows structurés) avec notre vision ludique et interactive.

### 2.3 Agents disponibles

Les agents ont des **personas distinctes** inspirées de la culture vidéoludique.

| Agent | Persona | Référence | Style | STUDIO | EDITOR |
|-------|---------|-----------|-------|--------|--------|
| **Game Designer** | "Zelda" | Nintendo | Enthousiaste, "Let's explore!" | ✅ | ❌ |
| **Game Architect** | "Solid" | Metal Gear | Stratège calme, pense systèmes | ✅ | ✅ |
| **Level Designer** | "Lara" | Tomb Raider | Exploratrice, pense en "flow" | ✅ | ✅ |
| **3D Artist** | "Navi" | Zelda | Créatif, guide visuel | ✅ | ✅ |
| **Game Dev** | "Ada" | RE4 + Lovelace | Direct, code-focused | ✅ | ❌ |
| **Solo Dev** | "Indie" | Culture indie | Pragmatique, "ship it!" | ✅ | ❌ |
| **Unreal Agent** | "Epic" | Unreal Engine | Technique, tous les MCP tools | ❌ | ✅ (défaut) |

#### Structure Agent YAML

```yaml
# ~/.unreal-companion/agents/defaults/game-designer.agent.yaml
id: game-designer
name: "Zelda"
title: "Lead Game Designer"
icon: "🎮"
reference: "Nintendo - exploratrice de game design"

persona: |
  Lead Game Designer passionnée par les systèmes interconnectés.
  Croit que chaque mécanique doit servir l'expérience joueur.
  "Un bon design, c'est quand enlever quelque chose casserait tout."

communication_style: |
  Enthousiaste mais structurée. Utilise des références de jeux.
  Célèbre les idées ("Oh, comme dans Breath of the Wild!")
  Challenge avec bienveillance ("Et si on poussait plus loin?")

core_principles:
  - Le fun first, la technique après
  - Prototyper avant de documenter
  - Une mécanique = une émotion
  - Itérer jusqu'à ce que ça "click"

workflows:
  - game-brief
  - gdd
  - brainstorm
  - narrative-design
```

### 2.3 Unreal Agent (EDITOR)

Agent par défaut du mode EDITOR :
- Connaît tous les MCP tools
- Peut déléguer aux spécialistes (Architect, Level Designer, 3D Artist)
- Optimisé pour l'exécution, pas la réflexion
- Suggère : *"Cette tâche serait mieux gérée par le Level Designer, je switch ?"*

### 2.4 Skills (EDITOR)

```
Unreal Agent
├── Skill: Blueprint Creation
├── Skill: Material Setup
├── Skill: Level Building
├── Skill: Graph Nodes
├── Skill: Widget Creation
└── Skill: [Custom...]
```

---

## 3. Structure des Fichiers

### 3.1 Hiérarchie Global → Projet

```
~/.unreal-companion/                    # GLOBAL (user)
├── config.yaml                         # Préférences globales
├── agents/
│   ├── defaults/                       # Agents de base (read-only)
│   └── custom/                         # Agents créés par l'user
├── workflows/
│   ├── defaults/                       # Workflows BMGD + lite
│   └── custom/                         # Workflows créés par l'user
└── projects.json                       # Registry des projets


MonProjet/.unreal-companion/            # PROJET (overrides)
├── config.yaml                         # Config projet spécifique
├── context.md                          # Contexte IA (généré/enrichi)
│
├── agents/
│   └── overrides/                      # Overrides locaux (rare)
│
├── workflows/
│   └── overrides/                      # Overrides locaux (rare)
│
├── artifacts/
│   ├── briefs/                         # Game briefs
│   │   └── game-brief.md
│   ├── design/                         # GDD, mechanics
│   │   └── gdd.md
│   ├── sessions/                       # Sessions brainstorming
│   │   └── 2024-01-22-brainstorm-combat.md
│   ├── boards/                         # Visuels structurés (JSON)
│   │   ├── mood-main-style.json
│   │   └── mindmap-mechanics.json
│   └── index.yaml                      # Registre artifacts
│
├── tasks/
│   ├── queues.yaml                     # Définition des secteurs
│   ├── active/                         # Tasks par file
│   │   ├── concept/
│   │   ├── dev/
│   │   ├── art/
│   │   └── levels/
│   ├── archive/                        # Historique (jamais supprimé)
│   │   └── 2024-01/
│   └── index.yaml                      # Vue globale + dépendances
│
├── assets/
│   └── references/                     # Images, concept art
│
└── .state/                             # Runtime (pas versionné)
    └── current-session.json
```

### 3.2 Résolution des ressources

```
Ressource demandée
    │
    ├── Projet/.unreal-companion/overrides/ ?
    │   └── Oui → Utiliser
    │
    ├── ~/.unreal-companion/custom/ ?
    │   └── Oui → Utiliser
    │
    └── ~/.unreal-companion/defaults/
        └── Utiliser (fallback)
```

---

## 4. Système de Tasks (Production Board)

### 4.1 Concept : Files par Secteur

Pas un Kanban classique (todo/in_progress/done), mais des **files d'attente par discipline** :

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  🎯 CONCEPT │  │  💻 DEV     │  │  🎨 ART     │  │  🗺️ LEVELS  │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│ ▶ Core loop │  │ 🔒 Player   │  │ ▶ Style     │  │ 🔒 Temple   │
│   [READY]   │  │   needs: ↑  │  │   guide     │  │   needs: ↑  │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│   Economy   │  │   Save sys  │  │   UI Kit    │  │   Hub area  │
├─────────────┤  ├─────────────┤  ├─────────────┤  ├─────────────┤
│   Narrative │  │   Audio mgr │  │   VFX lib   │  │   Tutorial  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

- **Premier = Next up** — Toujours visible, prêt à lancer
- **🔒 Locked** — Dépendances non satisfaites
- **▶ Ready** — Peut être lancé dans l'Editor
- **Vue dépendances** — Comme un "tech tree" de jeu de stratégie

### 4.2 Format Task

```yaml
# tasks/active/dev/player-controller.yaml
id: task-player-ctrl
title: "Player Controller"
description: "Create BP_PlayerController with movement"
sector: dev
agent: game-architect
priority: high

# Dépendances
requires:
  - task-core-loop

# État
status: ready  # locked | ready | in_progress | done

# Historique (jamais supprimé, append-only)
history:
  - date: 2024-01-20T10:00:00
    action: created
    by: user
  - date: 2024-01-21T14:30:00
    action: started
    by: editor
    session: "conv-abc123"
  - date: 2024-01-21T16:00:00
    action: done
    by: editor
    notes: "BP_PlayerController created"
  - date: 2024-01-22T09:00:00
    action: reopened
    by: user
    reason: "Need to add crouch"

# Compteur d'itérations
iteration: 2

# Métadonnées
created_at: 2024-01-20T10:00:00
updated_at: 2024-01-22T09:00:00
```

### 4.3 Définition des Queues

```yaml
# tasks/queues.yaml
queues:
  - id: concept
    name: "Concept"
    icon: "🎯"
    color: "blue"
    description: "Game design, mechanics, vision"
    default_agent: game-designer

  - id: dev
    name: "Development"
    icon: "💻"
    color: "green"
    description: "Blueprints, systems, code"
    default_agent: game-architect

  - id: art
    name: "Art"
    icon: "🎨"
    color: "pink"
    description: "Materials, assets, visuals"
    default_agent: 3d-artist

  - id: levels
    name: "Level Design"
    icon: "🗺️"
    color: "orange"
    description: "Levels, lighting, world building"
    default_agent: level-designer
```

---

## 5. Artifacts et Documents

### 5.1 Types d'artifacts

| Type | Format | Rendu Web UI |
|------|--------|--------------|
| **Brief** | Markdown | Document formaté |
| **GDD** | Markdown | Document formaté + TOC |
| **Session** | Markdown | Timeline/conversation |
| **Mood Board** | JSON | Canvas visuel (Milanote-like) |
| **Mind Map** | JSON | Graphe interactif |
| **Diagram** | JSON | Flowchart/architecture |

### 5.2 Format Board (JSON)

```json
{
  "type": "moodboard",
  "title": "Main Visual Style",
  "created_at": "2024-01-20",
  "updated_at": "2024-01-22",
  "layout": "freeform",

  "nodes": [
    {
      "id": "n1",
      "type": "image",
      "position": { "x": 100, "y": 100 },
      "size": { "w": 200, "h": 150 },
      "data": {
        "src": "../assets/references/ref-01.png",
        "caption": "Color palette inspiration"
      },
      "tags": ["colors", "atmosphere"]
    },
    {
      "id": "n2",
      "type": "note",
      "position": { "x": 350, "y": 120 },
      "data": {
        "content": "Ethereal, mystical, ancient",
        "color": "blue"
      }
    }
  ],

  "connections": [
    { "from": "n1", "to": "n2", "label": "evokes" }
  ],

  "ai_suggestions": [
    {
      "type": "new_node",
      "suggested_content": "Bioluminescence theme",
      "relates_to": "n1",
      "confidence": 0.85,
      "reasoning": "Based on project ethereal aesthetic"
    }
  ]
}
```

### 5.3 Fonctionnalités Boards (Web UI)

**Interactions utilisateur :**
- Drag & drop nodes
- Connexions visuelles (lignes)
- Zoom/pan canvas
- Double-click pour éditer
- Upload images

**Suggestions IA :**
| Action | Trigger | Résultat |
|--------|---------|----------|
| Suggest nodes | Auto / bouton | Propose nouveaux éléments |
| Summarize | Bouton | Crée un noeud "résumé" |
| Find connections | Bouton | Suggère des liens |
| Expand | Click sur noeud | Génère sous-noeuds |
| Generate image | Click sur noeud texte | Crée un visuel |

---

## 6. Workflows

### 6.1 Catalogue de base

| Catégorie | Workflow | Durée | Description |
|-----------|----------|-------|-------------|
| **Onboarding** | `quick-start` | 2 min | Nom, genre, pitch — c'est parti |
| | `project-setup` | 5 min | Config technique + vision rapide |
| **BMGD Core** | `game-brief` | 15-30 min | Vision complète, références, scope |
| | `gdd` | 1h+ | Design document complet |
| | `narrative` | 30 min | Story, personnages, monde |
| | `technical-arch` | 30 min | Architecture systèmes |
| **Brainstorm** | `idea-storm` | 10 min | Génération d'idées libre |
| | `mechanic-deep-dive` | 15 min | Approfondir une mécanique |
| | `problem-solving` | 10 min | Débloquer un problème |
| **Production** | `sprint-planning` | 15 min | Définir les prochaines tasks |
| | `review` | 10 min | Bilan de ce qui a été fait |

### 6.2 Format Workflow (YAML)

```yaml
# workflows/defaults/game-brief.yaml
id: game-brief
name: "Game Brief"
description: "Define your game vision"
icon: "🎯"
color: "blue"
agent: game-designer
estimated_duration: "15-30 min"

# Output configuration
output:
  type: markdown
  path: "artifacts/briefs/game-brief.md"
  template: |
    # {{project_name}} - Game Brief

    ## Vision
    {{vision}}

    ## Genre & References
    {{genre_references}}
    ...

# Steps (BMAD-style)
steps:
  - id: vision
    title: "Core Vision"
    agent_message: "Let's capture the essence of your game. What's the one-sentence pitch?"
    questions:
      - id: elevator_pitch
        type: text
        prompt: "Describe your game in one sentence"
        required: true
      - id: core_fantasy
        type: text
        prompt: "What fantasy does the player live?"

  - id: genre
    title: "Genre & Inspirations"
    agent_message: "Great vision! Now let's position it."
    questions:
      - id: primary_genre
        type: single
        prompt: "Primary genre?"
        options:
          - { id: action, label: "Action" }
          - { id: rpg, label: "RPG" }
          - { id: puzzle, label: "Puzzle" }
          # ...
      - id: references
        type: multiple
        prompt: "Games that inspire you?"
        suggestions_from_context: true  # LLM suggests based on genre

  # ... more steps
```

### 6.3 Architecture Step-File (BMGD)

> Pattern crucial pour guider le LLM dans les workflows complexes.
> Source : [bmad-module-game-dev-studio](https://github.com/bmad-code-org/bmad-module-game-dev-studio)

#### Structure dossier workflow

```
workflows/defaults/game-brief/
├── workflow.yaml              # Config principale
├── instructions.md            # Guidance LLM
├── checklist.md               # Critères de validation
├── steps/
│   ├── step-01-init.md        # Détection état + init
│   ├── step-01b-continue.md   # Reprise session existante
│   ├── step-02-vision.md      # Étape vision
│   ├── step-03-genre.md       # Étape genre
│   └── step-NN-complete.md    # Finalisation
└── templates/
    └── game-brief-template.md  # Template avec {{variables}}
```

#### Règles LLM obligatoires (en haut de chaque step)

```markdown
## MANDATORY EXECUTION RULES
- Ne pas skip, ne pas optimiser la séquence
- JAMAIS générer de contenu sans input utilisateur
- TOUJOURS lire le fichier step ENTIER avant exécution
- JAMAIS charger plusieurs step files en même temps
```

#### Menu-driven progression

```markdown
## OPTIONS UTILISATEUR
[A] Accepter l'output actuel
[P] Donner du feedback / Party Mode
[C] Continuer vers l'étape suivante
[AE] Advanced Elicitation (questions approfondies)

SEUL [C] Continue sauvegarde l'état et avance
```

#### Frontmatter pour state tracking

```yaml
---
workflowId: game-brief
workflowName: Game Brief
stepsCompleted: [1, 2, 3]    # Étapes terminées
currentStep: 4
workflowStatus: in-progress   # in-progress | paused | complete
inputDocuments:
  - type: brainstorming
    name: Ideas.md
lastUpdated: 2024-01-22T14:32:00Z
---
```

### 6.4 Approche Hybride : Menu + Ludique

> L'objectif est de combiner la **structure BMGD** (fiable, CLI-compatible) avec notre **vision ludique** (engageante, fun).

#### Menu-driven avec personnalité

```
# CLI (structure préservée, ton adapté)
┌────────────────────────────────────────────────────────┐
│ 🎮 Zelda (Game Designer)                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│ "Oh, un jeu d'exploration ! Ça me rappelle mes        │
│ aventures dans Hyrule. J'adore ce pitch !"            │
│                                                        │
│ Que veux-tu faire ?                                   │
│                                                        │
│   [A] ✓ Parfait, on continue                          │
│   [P] 🔄 Je veux modifier quelque chose               │
│   [C] → Passer à l'étape suivante                     │
│   [Q] 🎲 Quick interaction (5 mots en 30s!)           │
│                                                        │
│ 💡 Tip: Tu peux aussi taper directement ta réponse    │
└────────────────────────────────────────────────────────┘
```

#### Éléments ludiques intégrés

| Élément | CLI | Web UI |
|---------|-----|--------|
| **Réactions agent** | Texte émotif + émoji | Avatar animé + particules |
| **Célébrations** | ASCII art + message | Confettis + animation |
| **Quick interactions** | `[Q]` option | Bouton dédié |
| **Suggestions** | Liste numérotée | Cards visuelles |
| **Progression** | `[██████░░░░] 60%` | Barre animée |

#### Quick interactions en CLI

```
# Speed Round (compatible CLI)
┌────────────────────────────────────────────────────────┐
│ 🎲 SPEED ROUND - 5 mots en 30 secondes !              │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Décris ton jeu avec 5 mots :                          │
│                                                        │
│ > mystère exploration puzzle langage découverte_      │
│                                                        │
│ ⏱️  [████████░░] 12s restantes                        │
│                                                        │
│ (Entrée pour valider, ou attends la fin du timer)     │
└────────────────────────────────────────────────────────┘
```

### 6.5 Compatibilité CLI Complète

Les workflows fonctionnent identiquement en CLI et Web UI :

**Claude Code / Cursor :**
1. Lit le workflow YAML + step file courant
2. Applique les mandatory rules (même rigueur)
3. Affiche le menu avec personnalité agent
4. Supporte les quick interactions `[Q]`
5. Sauvegarde via frontmatter
6. Célébrations en ASCII/émoji

**Principe : CLI-first, Web-enhanced**
- Tout ce qui marche en CLI marche en Web UI
- Web UI ajoute du visuel, pas de la logique

---

## 7. Génération d'Images (Artist Agent)

### 7.1 Configuration

```yaml
# agents/defaults/3d-artist.yaml
capabilities:
  - concept_art_generation
  - style_guide_creation
  - reference_search

image_generation:
  providers:
    - name: replicate
      models:
        concept_art: "stability-ai/sdxl"
        style_transfer: "..."
    - name: openai
      models:
        concept_art: "dall-e-3"

  default_provider: replicate

  # Contexte auto-injecté dans les prompts
  context_injection:
    - project_style_guide
    - mood_boards
    - color_palette
```

### 7.2 Flux de génération

```
User: "Génère un concept art du Temple principal"
          │
          ▼
    ┌─────────────────┐
    │ 3D Artist Agent │
    └────────┬────────┘
             │
    1. Lit le contexte projet
       - GDD (description du Temple)
       - Mood boards (style visuel)
       - Style guide (couleurs, ambiance)
             │
    2. Construit le prompt enrichi
       "Ancient mystical temple, ethereal blue glow,
        bioluminescent plants, stone architecture,
        in the style of [mood board references]..."
             │
    3. Génère l'image
             │
    4. Propose actions :
       - Ajouter au mood board ?
       - Sauver dans references ?
       - Générer variations ?
```

---

## 8. Compatibilité Multi-Client

### 8.1 Principe

```
.unreal-companion/ = Source de vérité unique
                   │
        ┌──────────┴──────────┐
        │                     │
    Web UI               MCP Clients
  (rendu visuel)      (Claude Code, Cursor,
  (boards interactifs)  VS Code, Antigravity...)
        │                     │
        └──────────┬──────────┘
                   │
            Mêmes fichiers
            Mêmes workflows
            Mêmes agents
            Mêmes tasks
```

### 8.2 Ce que chaque client peut faire

| Fonctionnalité | Web UI | CLI (MCP) |
|----------------|--------|-----------|
| Lire/exécuter workflows | ✅ Visuel step-by-step | ✅ Questions textuelles |
| Créer artifacts Markdown | ✅ | ✅ |
| Créer/modifier boards JSON | ✅ Drag & drop | ✅ Édition JSON |
| Voir boards visuellement | ✅ Rendu canvas | ❌ JSON brut |
| Gérer tasks | ✅ Vue queues | ✅ YAML files |
| Exécuter MCP tools | ✅ Via backend | ✅ Direct |
| Générer images | ✅ | ✅ (si provider configuré) |

---

## 9. Tâches d'Implémentation

### Phase 1 : Fondations

- [ ] **P1.1** Restructurer `~/.unreal-companion/` (global)
  - Créer structure defaults/custom pour agents et workflows
  - Migrer agents existants
  - Créer workflows de base YAML

- [ ] **P1.2** Mettre à jour `project_init.py`
  - Nouvelle structure projet
  - Lien avec global
  - Résolution agents/workflows

- [ ] **P1.3** Système de Tasks
  - Format YAML tasks
  - Queues par secteur
  - Index avec dépendances
  - API CRUD tasks

- [x] **P1.4** CLI Setup & Open Source Infrastructure ✅
  - CLI npm-style (`npx unreal-companion install/upgrade/start/init/status/doctor`)
  - Installation interactive (langue, thème, détection projets)
  - Système de migrations pour les upgrades
  - Doctor command pour diagnostiquer les problèmes
  - Tips aléatoires des agents au lancement
  - Fichiers open-source (CODE_OF_CONDUCT, CHANGELOG, FUNDING)
  - CI/CD pour CLI, Web UI lint/build
  - Documentation GitHub setup (branch protection, labels)

### Phase 2 : STUDIO Mode

- [ ] **P2.0** Refactoring Structurel Web-UI
  - Documenter modifications backend/frontend pour nouvelles features
  - Nouveaux services : context_manager, fact_extractor, tips_service
  - Nouveaux composants input (Spectrum, Emoji, ChoiceCards, Appreciation)
  - Nouveaux composants quick interactions (SpeedRound, ThisOrThat, etc.)
  - Nouveaux stores Zustand (context, tips)
  - Extension QuestionRenderer pour nouveaux types
  - Migration progressive sans casser l'existant

- [ ] **P2.1** Refonte Production Board
  - Vue queues (pas Kanban)
  - Visualisation dépendances
  - Drag & drop réorganisation
  - Lancement task → EDITOR

- [ ] **P2.2** Boards visuels (Mood/Mind)
  - Composant canvas React
  - Rendu JSON → visuel
  - Interactions (drag, connect, edit)
  - Sauvegarde auto

- [ ] **P2.3** Suggestions IA sur Boards
  - Endpoint suggestions
  - UI intégration
  - Actions (add node, summarize, expand)

- [ ] **P2.4** Workflows BMGD (définitions)
  - Implémenter game-brief complet
  - Implémenter GDD
  - Workflows lite (quick-start, brainstorm)

- [ ] **P2.5** Expérience Ludique Workflows
  - Agent réactif : réactions dynamiques aux réponses (LLM)
  - Suggestions contextuelles basées sur réponses précédentes
  - Mémoire visible : callbacks aux réponses antérieures
  - Système de milestones et célébrations
  - Sessions courtes avec découpage intelligent

- [ ] **P2.6** Gestion Sessions Workflow
  - Format YAML session state
  - Sauvegarde auto après chaque réponse
  - API reprise de session
  - UI résumé au retour ("On en était à...")
  - Historique des sessions terminées

- [ ] **P2.7** Gestion du Contexte LLM (Optimisation Tokens)
  - Contexte hiérarchique (CORE / RELEVANT / DÉTAILS)
  - Extraction automatique de facts (pas texte brut)
  - Injection sélective par étape workflow
  - Résumé progressif des longues conversations
  - Prompt caching pour les parties stables

- [ ] **P2.8** Party Mode (Multi-Agents)
  - Orchestration multi-agents sur un sujet
  - Chaque agent intervient selon sa spécialité
  - Débat naturel, rebonds entre agents
  - Synthèse des décisions prises
  - Auto-update des artifacts concernés

- [ ] **P2.9** Document Desk (Bureau Virtuel)
  - Navigation par dossiers (briefs/, design/, narrative/, etc.)
  - Visualisation documents avec chat contextuel à côté
  - Sélection de texte pour ajouter au contexte chat
  - Édition WYSIWYG → sauvegarde en .md
  - Suggestions LLM (workflows, party mode) pour approfondir
  - Types: briefs, design, narrative, art, audio, sessions, boards, reports, references

- [ ] **P2.10** LLM Performance & Architecture Refactoring
  - Instrumentation TTFT/TTC/tokens (baseline)
  - Nettoyage dual workflow (chat vs step-based)
  - Single call au démarrage workflow
  - Streaming + thinking UI (SSE)
  - Contexte compact (facts + résumé, cache)
  - i18n complète

### Phase 3 : EDITOR Mode

- [ ] **P3.0** Editor Home Page
  - Reprise dernière conversation
  - Suggestions depuis les queues de tasks
  - Outils rapides (+ Blueprint, + Material...)
  - Historique des conversations (titres)
  - Logs de la session (tools, erreurs)
  - Onboarding avec exemples testables
  - Liste des tools avec suggestions d'usage

- [ ] **P3.1** Unreal Agent
  - Créer agent dédié
  - Système de skills
  - Auto-routing vers spécialistes

- [ ] **P3.2** Contexte STUDIO → EDITOR
  - Injection artifacts dans prompts
  - Suggestions basées sur tasks
  - Lien task active → conversation

### Phase 4 : CLI

- [ ] **P4.1** Workflows CLI-ready
  - Parser YAML workflows
  - Exécution séquentielle questions
  - Écriture artifacts
  - Support input vocal (optionnel)

- [ ] **P4.2** Documentation MCP
  - Instructions pour Claude Code
  - Instructions pour Cursor
  - Instructions pour VS Code
  - Exemples d'usage

- [ ] **P4.3** Prompts/Instructions pour CLI
  - CLAUDE.md template avec context
  - Instructions agents exportables
  - Workflows exécutables en CLI

### Phase 5 : Studio Avancé

- [ ] **P5.1** Suggestions IA
- [ ] **P5.2** Workflow Dynamique
- [ ] **P5.3** Document Live
- [ ] **P5.4** Avatars & Personnalités
- [ ] **P5.5** UI Customization

### Phase 6 : Assets

- [ ] **P6.1** Génération d'Images
  - Intégration Replicate (SDXL)
  - Intégration OpenAI (DALL-E)
  - Intégration Stability AI
  - Configuration clés API dans settings

- [ ] **P6.2** Context-aware generation
  - Injection style guide dans prompts
  - Injection mood board refs
  - UI génération dans boards
  - Ajout auto aux artifacts

- [ ] **P6.3** Meshy API (Génération 3D)
  - Text → 3D generation
  - Image → 3D generation
  - Preview 3D dans l'UI
  - Download FBX/OBJ
  - Import direct dans Unreal
  - Placement dans level

- [ ] **P6.4** UI Services Externes
  - Settings page pour API keys
  - Status de connexion par service
  - Usage/quotas si disponible

### Phase 7 : Polish

- [ ] **P7.1** Party Mode Complet
- [ ] **P7.2** Input Vocal
- [ ] **P7.3** Input Multimodal
- [ ] **P7.4** i18n
- [ ] **P7.5** Polish final

### Tasks techniques transverses

- [ ] **TASK-workflow-step-architecture** — Architecture step-based (JSON structuré, parsing/validation)
- [ ] **TASK-llm-speed-remediation** — Remédiation vitesse LLM (streaming, single-call, métriques, contexte)

---

## 10. Décisions Architecturales (Post-Review)

Suite à la revue architecturale, voici les décisions clés :

### Tasks : Modèle "Fast-Food Workflow"

Tasks Parent + Sous-tasks qui progressent entre secteurs :

```
[Parent: Créer ennemi "Golem"]
    │
    ├── [Concept] Définir comportement    ✅ Done
    │       ↓ (progression)
    ├── [Dev] Blueprint BP_Golem          🔄 In Progress
    │       ↓
    ├── [Art] Mesh + Material             🔒 Waiting
    │       ↓
    └── [Levels] Placer dans L_Temple     🔒 Waiting
```

### Workflows : Dynamique + Skip

- Étapes = infos à collecter pour un document final
- User peut **skip** des étapes
- LLM toujours **dynamique** (suggestions, réponses existantes, contexte)
- Si info existe déjà → proposer de confirmer, pas redemander

### Party Mode : 2-3 Agents Max

- Sessions courtes sur sujets spécifiques
- Plus d'agents = redondant et coûteux
- Version lite d'abord, full ensuite

### Transitions Bidirectionnelles

- **STUDIO → EDITOR** : Lancer une task injecte le contexte
- **EDITOR → STUDIO** : Unreal Agent propose des discussions conception

### Création de Tasks

- **STUDIO** : source primaire (manuel + via workflow "planning")
- **EDITOR** : tasks dynamiques si quelque chose manque

### Contexte Perdu

- LLM connaît l'historique + date dernière session
- Résumé adapté selon le temps écoulé
- Option "recap complet" disponible

### Gestion Erreurs

- **LLM quota** → bandeau feedback visible
- **Tool fail** → dans les logs de conversation
- **Erreurs techniques** → affichage clair

### Boards en CLI

- Pas une priorité (c'est visuel)
- Le LLM traduit en JSON si besoin
- Alternative : rediriger vers Web UI

### Onboarding

- Léger, quelques étapes
- Pas de jargon BMAD
- Philosophie "studio de dev virtuel"

### Cohérence Architecturale (Post-Revue)

> **Principe : ÉTENDRE, ne pas RECRÉER**

**Stores existants à réutiliser :**
- `studioStore.ts` — Tasks, sectors (pas créer tasksStore)
- `workflowStore.ts` — Sessions workflow (pas créer sessionStore)

**Services existants à étendre :**
- `context_discovery.py` → ajouter contexte hiérarchique
- `workflow/state_manager.py` → ajouter détection reprise
- `workflow/prompt_builder.py` → ajouter injection sélective

**Pattern routes : toujours `server/api/`** (pas `server/routes/`)

**Secteurs (10 par défaut, personnalisables) :**

| Catégorie | Secteurs |
|-----------|----------|
| **Core** | `concept`, `dev`, `art`, `levels` |
| **Creative** | `narrative`, `audio`, `animation` |
| **Production** | `ui`, `qa`, `marketing` |

L'utilisateur peut désactiver/réordonner. Le LLM peut suggérer d'autres secteurs.

---

## 11. Questions Ouvertes

1. **Sync multi-device** — Si l'user travaille sur 2 machines, comment sync `~/.unreal-companion/` ?

2. **Collaboration** — Un jour, plusieurs users sur un projet ?

3. **Versioning artifacts** — Git integration pour les artifacts ?

4. **Offline mode** — Fonctionnement sans connexion LLM ?

---

## 12. Fichiers de Tasks

Les tâches détaillées sont dans le dossier `.tasks/` :

```
.tasks/
├── README.md                      # Vue d'ensemble
├── phase-1-foundations/           # 3 tasks
├── phase-2-studio-core/           # 9 tasks
├── phase-3-editor-core/           # 3 tasks
├── phase-4-cli/                   # 3 tasks (priorité haute)
├── phase-5-studio-advanced/       # 5 tasks
├── phase-6-assets/                # 4 tasks
└── phase-7-polish/                # 5 tasks
```

**Total : 34 tasks (+ 2 tasks techniques transverses)**

Chaque fichier contient : Objectif, Prérequis, Spécifications, Critères d'acceptation, Tests à écrire.

---

## Changelog

- **2024-01-22** — Approche Hybride & Personas Gaming
  - **Crédit BMGD/BMAD** : Ajout mention méthodologie + lien repo (section 2.2)
  - **Personas gaming** : Noms courts inspirés de la culture vidéoludique
    - Zelda (Designer), Solid (Architect), Lara (Level), Navi (Artist), Ada (Dev), Indie (Solo), Epic (Unreal)
  - **Approche hybride Menu + Ludique** (section 6.4) :
    - Structure BMGD préservée pour fiabilité CLI
    - Personnalité agent dans les menus
    - Quick interactions accessibles via `[Q]`
    - Célébrations en ASCII/émoji pour CLI
    - Principe "CLI-first, Web-enhanced"
  - **Onboarding amélioré** (section 1.6) :
    - 7 étapes (vs 5 avant)
    - Nouvelle étape "Team" : présentation équipe virtuelle
    - Nouvelle étape "Quick Start" : lancer un workflow ou explorer
    - Mention de la méthodologie BMGD

- **2024-01-22** — Intégration BMGD & Web-UI Existant
  - Documentation des features web-ui existantes (section 1.6) :
    - `start.sh` : lance backend + frontend sur port 3179
    - Onboarding 5 étapes (OnboardingFlow.tsx)
    - MCP Bridge intégré (mcp_bridge.py)
    - 9 stores Zustand existants
  - Agents avec personas BMGD (section 2.2) :
    - Structure YAML avec persona, communication_style, core_principles
    - 7 agents : Game Designer, Architect, Level Designer, 3D Artist, Dev, Solo Dev, Unreal Agent
  - Architecture Step-File pour workflows (section 6.3) :
    - Mandatory rules pour guider le LLM
    - Menu-driven progression ([A]ccept [P]rovide [C]ontinue)
    - Frontmatter state tracking pour resume sessions
    - Structure dossier avec steps/, templates/, checklist.md

- **2024-01-22** — Document Desk (Bureau Virtuel)
  - Nouvelle task P2.9 : espace de gestion et visualisation des documents
  - Navigation par dossiers/catégories (briefs, design, narrative, art, audio, sessions, boards, reports)
  - Visualisation avec chat contextuel à côté
  - Édition WYSIWYG (TipTap recommandé) → sauvegarde .md
  - Suggestions LLM pour workflows/party mode pertinents
  - Sélection de texte pour enrichir le contexte chat
  - Total tasks : 32

- **2024-01-22** — Revue Architecturale & Cohérence
  - Audit complet de l'existant web-ui vs tasks proposées
  - Corrections P1.3, P2.0, P2.6, P2.7 : référencer l'existant, étendre au lieu de recréer
  - Harmonisation secteurs : `concept → dev → art → levels` (remplace anciens)
  - Pattern unifié : routes dans `server/api/`, pas `server/routes/`
  - Ajout section "Cohérence Architecturale" dans PLAN.md

- **2024-01-22** — Refactoring Structurel Web-UI
  - Nouvelle task P2.0 : documentation des modifications backend/frontend
  - Analyse de l'existant (SQLite sessions, WebSocket streaming, multi-provider LLM, Zustand stores)
  - Nouveaux services backend : context_manager, fact_extractor, tips_service
  - Nouvelles routes API : /context/hierarchy, /context/facts, /tips
  - Nouveaux modèles DB : Fact, Tip, TipDismissal
  - Nouveaux composants frontend : input interactifs, quick interactions, tips, agent thinking
  - Nouveaux stores Zustand : contextStore, tipsStore
  - Stratégie migration progressive (ajouter sans casser)

- **2024-01-22** — Gestion du Contexte LLM
  - Nouvelle task P2.7 : optimisation tokens pour réduire coûts et hallucinations
  - Contexte hiérarchique en 3 niveaux (CORE / RELEVANT / DÉTAILS)
  - Extraction automatique de facts (données structurées vs texte brut)
  - Résumé progressif des longues conversations
  - Prompt caching pour les parties stables
  - Budget ~2000-3000 tokens par appel (vs 12000+ sans optimisation)

- **2024-01-22** — Quick Interactions & Tips
  - Speed Round (5 mots en temps limité)
  - This or That (choix binaires rapides)
  - Word Association (associations libres)
  - Wild Card (questions créatives random)
  - Tips du jour contextuels par agent
  - Analyse structure BMAD/BMGD

- **2024-01-22** — Enrichissement expérience ludique
  - Types de réponses interactives (jauges, échelles émotionnelles, choix A/B)
  - Exemples dynamiques du LLM avec feedback utilisateur
  - Discussions réflexives (pas un interrogatoire)
  - Réflexions visibles des agents (pensées pendant le loading)
  - Mise à jour P2.5-ludic-experience.md avec specs détaillées

- **2024-01-22** — Revue architecturale et création tasks
  - Décisions post-review documentées
  - 30 fichiers de tasks créés dans `.tasks/`
  - Modèle "Fast-Food Workflow" pour les tasks
  - Clarifications sur workflows, Party Mode, transitions
  - Réorganisation des phases

- **2026-01-26** — Mise à jour Plan & Tasks
  - Alignement des phases avec `.tasks/` (CLI en Phase 4, Studio Avancé en Phase 5, Assets en Phase 6, Polish en Phase 7)
  - P2.10 = LLM Performance & Architecture Refactoring
  - Ajout des tasks techniques transverses (step-based + speed remediation)

- **2024-01-22** — Création initiale du document
  - Vision STUDIO/EDITOR
  - Architecture agents + skills
  - Structure fichiers global/projet
  - Système tasks avec queues
  - Format artifacts et boards
  - Workflows catalogue
  - Génération images
  - Tâches d'implémentation
