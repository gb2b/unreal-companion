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
    # Langue par défaut pour les nouveaux documents
    default_language: fr

    # Override par type
    overrides:
      technical: en      # Architecture, specs en anglais
      code_comments: en  # Commentaires code en anglais
      briefs: fr         # Briefs en français
      gdd: fr            # GDD en français
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

## 2. Architecture des Agents

### 2.1 Agents vs Skills

| Concept | Description | Usage |
|---------|-------------|-------|
| **Agent** | Personnalité, point de vue, style de communication | *"Qui me parle ?"* |
| **Skill** | Procédure réutilisable, savoir-faire | *"Comment faire X ?"* |

### 2.2 Agents disponibles

| Agent | STUDIO | EDITOR | Spécialité |
|-------|--------|--------|------------|
| **Game Designer** | ✅ | ❌ | Mécaniques, GDD, gameplay |
| **Game Architect** | ✅ | ✅ | Systèmes, Blueprints, architecture |
| **Level Designer** | ✅ | ✅ | Niveaux, lighting, flow |
| **3D Artist** | ✅ | ✅ | Matériaux, assets, direction artistique |
| **Game Dev** | ✅ | ❌ | Implémentation générale |
| **Unreal Agent** | ❌ | ✅ (défaut) | Généraliste EDITOR, tous les tools |

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

### 6.3 Compatibilité CLI

Les workflows YAML sont lisibles par tout client :

**Claude Code / Cursor :**
1. Lit le workflow YAML
2. Pose les questions séquentiellement
3. Écrit les réponses dans l'artifact
4. Peut créer des tasks

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

### Phase 2 : STUDIO Mode

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

- [ ] **P2.7** Moteur de Workflow Dynamique
  - Questions générées par LLM (pas juste scriptées)
  - Injection du contexte (réponses précédentes) dans chaque prompt
  - Réactions de l'agent générées dynamiquement
  - Suggestions adaptatives (genre → références pertinentes)

- [ ] **P2.8** Party Mode (Multi-Agents)
  - Orchestration multi-agents sur un sujet
  - Chaque agent intervient selon sa spécialité
  - Débat naturel, rebonds entre agents
  - Synthèse des décisions prises
  - Auto-update des artifacts concernés

- [ ] **P2.9** Document Live (Remplissage Progressif)
  - Split view : chat + document en construction
  - Mise à jour en temps réel pendant la conversation
  - Versioning automatique (changelog)
  - Historique consultable
  - Possibilité de "reprendre" un doc pour en rediscuter

- [ ] **P2.10** Avatars et Personnalités Agents
  - Système d'avatars (emoji, image, pixel-art)
  - Expressions selon l'état (thinking, excited, celebrating...)
  - Animations UI (bounce, confettis, particules)
  - Phrases signatures personnalisables
  - Sons optionnels pour les événements

- [ ] **P2.11** UI Personnalisation Agents
  - Éditeur visuel (pas YAML brut)
  - Nom, avatar, ton, verbosité
  - Phrases signatures (greeting, excited, milestone)
  - Aperçu en direct
  - Import/Export pour partage

- [ ] **P2.12** UI Personnalisation Workflows
  - Éditeur visuel drag & drop
  - Ajout/suppression d'étapes
  - Configuration des questions (type, options)
  - Messages agent par étape
  - Célébrations et milestones
  - Mode test avant publication

- [ ] **P2.13** Input Vocal (Whisper)
  - Intégration Whisper (ou alternative)
  - Bouton micro dans l'input
  - Transcription en temps réel
  - Support multi-langue (fr/en)
  - Édition avant envoi

- [ ] **P2.14** Input Multimodal
  - Upload images avec description
  - Upload vidéos (extraction frames)
  - Upload documents (PDF, txt, md)
  - Analyse par le LLM (vision)
  - Attachments dans les conversations

- [ ] **P2.15** Studio Home Page
  - Dashboard "Que fait-on aujourd'hui ?"
  - Reprise dernière conversation
  - Suggestions intelligentes
  - Aperçu du Board (tasks prêtes)
  - Accès rapide équipe
  - Onboarding première visite

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

### Phase 4 : Génération Assets (Images & 3D)

- [ ] **P4.1** Génération d'Images
  - Intégration Replicate (SDXL)
  - Intégration OpenAI (DALL-E)
  - Intégration Stability AI
  - Configuration clés API dans settings

- [ ] **P4.2** Context-aware generation
  - Injection style guide dans prompts
  - Injection mood board refs
  - UI génération dans boards
  - Ajout auto aux artifacts

- [ ] **P4.3** Meshy API (Génération 3D)
  - Text → 3D generation
  - Image → 3D generation
  - Preview 3D dans l'UI
  - Download FBX/OBJ
  - Import direct dans Unreal
  - Placement dans level

- [ ] **P4.4** UI Services Externes
  - Settings page pour API keys
  - Status de connexion par service
  - Usage/quotas si disponible

### Phase 5 : CLI Compatibility

- [ ] **P5.1** Workflows CLI-ready
  - Parser YAML workflows
  - Exécution séquentielle questions
  - Écriture artifacts
  - Support input vocal (optionnel)

- [ ] **P5.2** Documentation MCP
  - Instructions pour Claude Code
  - Instructions pour Cursor
  - Instructions pour VS Code
  - Exemples d'usage

- [ ] **P5.3** Prompts/Instructions pour CLI
  - CLAUDE.md template avec context
  - Instructions agents exportables
  - Workflows exécutables en CLI

### Phase 6 : Polish & Extras

- [ ] **P6.0** Internationalisation (i18n)
  - Interface multilingue (en/fr)
  - Détection auto langue utilisateur
  - Switch intelligent par le LLM
  - Suggestion de changement d'interface
  - Config langue documents par type
  - Traductions workflows (messages, questions)
  - Option bilingue pour documents

- [ ] **P6.1** Onboarding complet
  - Studio : présentation équipe + quick start
  - Editor : exemples testables + liste tools
  - Tooltips et guides contextuels

- [ ] **P6.2** Thèmes et Customisation UI
  - Dark/Light mode
  - Couleurs personnalisables
  - Layouts alternatifs

- [ ] **P6.3** Export/Partage
  - Export agents (YAML)
  - Export workflows (YAML)
  - Partage entre utilisateurs
  - Marketplace communautaire (future)

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
├── phase-2-studio-core/           # 6 tasks
├── phase-3-editor-core/           # 3 tasks
├── phase-4-cli/                   # 3 tasks (priorité haute)
├── phase-5-studio-advanced/       # 5 tasks
├── phase-6-assets/                # 4 tasks
└── phase-7-polish/                # 6 tasks
```

**Total : 30 tasks**

Chaque fichier contient : Objectif, Prérequis, Spécifications, Critères d'acceptation, Tests à écrire.

---

## Changelog

- **2024-01-22** — Revue architecturale et création tasks
  - Décisions post-review documentées
  - 30 fichiers de tasks créés dans `.tasks/`
  - Modèle "Fast-Food Workflow" pour les tasks
  - Clarifications sur workflows, Party Mode, transitions
  - Réorganisation des phases

- **2024-01-22** — Création initiale du document
  - Vision STUDIO/EDITOR
  - Architecture agents + skills
  - Structure fichiers global/projet
  - Système tasks avec queues
  - Format artifacts et boards
  - Workflows catalogue
  - Génération images
  - Tâches d'implémentation
