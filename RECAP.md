# RECAP - Refonte Architecture Frameworks

**Date:** 27 janvier 2026  
**Status:** Plan validé, implémentation à faire

---

## Vue d'ensemble

Refonte complète du dossier `/frameworks/` pour :
1. Organiser les workflows par phase de développement
2. Adopter le standard **Agent Skills** (Cursor + Claude)
3. Supporter plusieurs IDE (Cursor, Claude Code, Windsurf, VS Code Copilot)
4. Unifier le format des agents (YAML frontmatter + Markdown)
5. Permettre plusieurs templates par workflow

---

## Structure finale validée

```
/frameworks/
├── README.md
│
├── skills/                            # AGENT SKILLS (format standard)
│   ├── balance-testing/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── progression-design/
│   │   └── SKILL.md
│   ├── performance-testing/
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── code-review/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── blueprint-patterns/
│   │   └── SKILL.md
│   ├── mcp-core-tools/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── mcp-blueprint-tools/
│   │   └── SKILL.md
│   ├── mcp-world-tools/
│   │   └── SKILL.md
│   └── ...
│
├── agents/
│   ├── game-designer/
│   │   └── agent.md
│   ├── game-architect/
│   │   └── agent.md
│   ├── game-dev/
│   │   └── agent.md
│   ├── solo-dev/
│   │   └── agent.md
│   ├── 3d-artist/
│   │   └── agent.md
│   ├── level-designer/
│   │   └── agent.md
│   └── unreal-agent/
│       └── agent.md
│
├── workflows/
│   ├── 1-preproduction/
│   │   ├── brainstorming/
│   │   ├── quick-brainstorming/
│   │   └── game-brief/
│   ├── 2-design/
│   │   ├── gdd/
│   │   ├── narrative/
│   │   ├── mvp-narrative/
│   │   ├── art-direction/
│   │   ├── audio-design/
│   │   └── level-design/
│   ├── 3-technical/
│   │   ├── game-architecture/
│   │   ├── project-context/
│   │   └── diagram/
│   ├── 4-production/
│   │   ├── sprint-planning/
│   │   ├── sprint-status/
│   │   ├── create-story/
│   │   ├── dev-story/
│   │   ├── code-review/
│   │   └── retrospective/
│   ├── quick-flow/
│   │   ├── quick-prototype/
│   │   ├── quick-dev/
│   │   └── get-started/
│   └── tools/
│       ├── mind-map/
│       ├── mood-board/
│       ├── gametest/
│       └── workflow-status/
│
├── teams/
│   └── team-gamedev/
│       └── team.md
│
├── rules-templates/
│   ├── cursor/
│   │   ├── companion.mdc.template      # Rule principale
│   │   ├── memories.mdc.template       # 🆕 Gestion memories
│   │   └── workflow.mdc.template       # Auto-généré par workflow
│   ├── claude-code/
│   │   ├── CLAUDE.md.template
│   │   └── memories.md.template        # 🆕 Instructions memories
│   ├── windsurf/
│   │   └── rules.md.template
│   ├── vscode-copilot/
│   │   └── instructions.md.template
│   └── generic/
│       └── AGENTS.md.template
│
├── project/
│   ├── config.yaml
│   ├── project-context.md
│   └── workflow-status.yaml
│
└── suggestions.yaml
```

---

## Formats de fichiers

### 1. Skill (format standard Agent Skills)

**Emplacement:** `skills/{skill-name}/SKILL.md`

```markdown
---
name: skill-name
description: What this skill does and when to use it. Include trigger words.
---

# Skill Name

## When to Use
- Trigger scenarios

## Instructions
- Step-by-step guidance

## Additional Resources
See [references/details.md](references/details.md) for more.
```

**Structure optionnelle:**
```
skill-name/
├── SKILL.md              # Requis
├── scripts/              # Code exécutable (optionnel)
├── references/           # Docs additionnelles (optionnel)
└── assets/               # Templates, données (optionnel)
```

### 2. Agent (YAML frontmatter + Markdown)

**Emplacement:** `agents/{agent-name}/agent.md`

```markdown
---
id: game-designer
name: Zelda
title: Lead Game Designer
icon: gamepad-2
skills:
  - balance-testing
  - progression-design
triggers:
  - "game design"
  - "mechanics"
  - "GDD"
---

# Game Designer

## Persona

**Role:** Lead Game Designer + Creative Vision Architect
**Tone:** Enthusiastic
**Avatar:** 🎲

## Activation

1. Load config from `{project}/.unreal-companion/config.yaml`
2. Store: {user_name}, {communication_language}, {output_folder}
3. Load project-context.md if exists
4. Greet user, show menu, WAIT for input

## Greeting

Hey {user_name}! Let's explore new adventures! 🎲

## Menu

| Cmd | Label | Action |
|-----|-------|--------|
| BG | Brainstorm | workflow:brainstorming |
| GB | Game Brief | workflow:game-brief |
| GDD | GDD | workflow:gdd |
| CH | Chat | action:chat |
| PM | Party Mode | action:party |
| DA | Dismiss | action:exit |

## Elicitation

| Trigger | Response |
|---------|----------|
| "I don't know" | "Think of a game you love - what makes it special?" |
| "maybe" | "Let's explore both paths - which excites you more?" |
```

### 3. Workflow (YAML + fichiers annexes)

**Emplacement:** `workflows/{phase}/{workflow-name}/`

```
workflow-name/
├── workflow.yaml          # Metadata + config
├── instructions.md        # Instructions LLM
├── context.md             # Contexte supplémentaire (optionnel)
├── templates/             # Templates de sortie (optionnel, plusieurs possibles)
│   ├── full.md
│   └── lite.md
├── checklists/            # Validation (optionnel)
│   └── validation.md
└── steps/                 # Étapes individuelles (optionnel)
    ├── step-01-init.md
    └── step-02-vision.md
```

**workflow.yaml:**
```yaml
id: game-brief
version: "2.0"
name: "Game Brief"
description: "Define your game's vision"
category: "1-preproduction"

# Variables
config_source: "{project-root}/.unreal-companion/config.yaml"
output_folder: "{config_source}:output_folder"

# Paths
installed_path: "{project-root}/.unreal-companion/workflows/game-brief"
instructions: "{installed_path}/instructions.md"

# Templates (plusieurs possibles)
templates:
  - id: full
    file: templates/full.md
    description: "Complete game brief"
  - id: lite
    file: templates/lite.md
    description: "Quick game brief"

# Metadata
agent: "game-designer"
behavior: "one-shot"
ui_visible: true
icon: "target"
suggested_after: ["brainstorming"]

# Steps
steps:
  - id: "init"
    file: "steps/step-01-init.md"
    title: "Initialize"
  - id: "vision"
    file: "steps/step-02-vision.md"
    title: "Vision Statement"
```

### 4. Team (YAML frontmatter + Markdown)

**Emplacement:** `teams/{team-name}/team.md`

```markdown
---
id: team-gamedev
name: Game Development Team
icon: 🎮
agents:
  - game-designer
  - game-architect
  - game-dev
  - solo-dev
workflows:
  - brainstorming
  - game-brief
  - gdd
  - sprint-planning
---

# Game Development Team

Specialized team for game projects across all scales.

## Roles

- **Game Designer**: Creative vision, mechanics, GDD
- **Game Architect**: Technical systems, architecture
- **Game Dev**: Implementation, code
- **Solo Dev**: Quick prototyping, full-stack

## Recommended Flow

1. Brainstorming → Game Brief → GDD
2. Architecture → Sprint Planning → Dev Stories
```

---

## IDE supportés

| IDE | Dossier config | Format rules | Skills |
|-----|----------------|--------------|--------|
| **Cursor** | `.cursor/rules/` | `*.mdc` | `.cursor/skills/` |
| **Claude Code** | `.claude/` | `CLAUDE.md` + settings | `.claude/skills/` |
| **Windsurf** | `.windsurf/rules/` | `*.md` | N/A |
| **VS Code Copilot** | `.github/instructions/` | `*.instructions.md` | N/A |
| **Générique** | racine | `AGENTS.md` | N/A |

---

## Installation

### Flow d'installation globale

```bash
npx unreal-companion install

? Sélectionnez vos IDE (multi-select):
  ◉ Cursor
  ◉ Claude Code
  ◯ Windsurf
  ◯ VS Code Copilot
  ◉ Générique (AGENTS.md)
```

**Ce qui est installé:**

```bash
~/.unreal-companion/
├── config.yaml
├── workflows/
│   └── defaults/              # Copie de frameworks/workflows/
├── agents/
│   └── defaults/              # Copie de frameworks/agents/
└── core/
    └── workflow-engine.md

# Si Cursor sélectionné:
~/.cursor/
├── rules/
│   └── companion/
│       └── *.mdc              # Auto-générés depuis workflows
└── skills/
    └── balance-testing/       # Copie de frameworks/skills/
    └── ...

# Si Claude Code sélectionné:
~/.claude/
├── CLAUDE.md
└── skills/
    └── balance-testing/
    └── ...
```

### Flow d'initialisation projet

```bash
cd my-game-project
npx unreal-companion init

? Nom du projet: My Awesome Game
? IDE principal: Cursor
```

**Ce qui est créé:**

```bash
my-game-project/
├── .unreal-companion/
│   ├── config.yaml
│   ├── project-context.md
│   └── workflow-status.yaml
│
├── .cursor/                   # Si Cursor
│   ├── rules/
│   │   └── companion/
│   │       └── project.mdc
│   └── skills/                # Skills copiés si pertinent
│
└── .claude/                   # Si Claude Code
    └── CLAUDE.md
```

---

## Modifications à faire

### 1. CLI (`cli/src/utils/`)

#### `installer.js`

- [ ] Ajouter prompt de sélection IDE
- [ ] Implémenter copie skills vers `~/.cursor/skills/` ou `~/.claude/skills/`
- [ ] Générer rules depuis templates (`rules-templates/`)
- [ ] Supporter plusieurs IDE simultanément

#### `workflow-loader.js`

- [ ] Mettre à jour chemins pour nouvelle structure par phases
- [ ] Charger agents depuis `agent.md` (parser frontmatter)
- [ ] Charger teams depuis `team.md`

### 2. Web UI Backend (`web-ui/server/`)

#### `services/unified_loader.py`

- [ ] Mettre à jour chemins workflows par phases
- [ ] Parser `agent.md` avec frontmatter YAML
- [ ] Charger skills et les associer aux agents

#### `services/workflow/engine.py`

- [ ] Supporter plusieurs templates par workflow
- [ ] Charger checklists de validation
- [ ] Gérer les phases de workflows

#### `api/workflows.py`

- [ ] Retourner la catégorie/phase dans la liste
- [ ] Supporter filtre par phase

### 3. Frameworks (`frameworks/`)

#### Restructuration

- [ ] Créer structure `skills/` avec format standard
- [ ] Déplacer workflows dans sous-dossiers par phase
- [ ] Convertir agents YAML → `agent.md`
- [ ] Convertir teams YAML → `team.md`
- [ ] Créer `rules-templates/` pour chaque IDE
- [ ] Supprimer `global/` (remplacé par rules-templates)

#### Skills à créer

- [ ] `balance-testing` - Game balance methods
- [ ] `progression-design` - XP curves, unlocks
- [ ] `performance-testing` - FPS, profiling
- [ ] `code-review` - Review checklist
- [ ] `mcp-core-tools` - core_query, core_save, etc.
- [ ] `mcp-blueprint-tools` - blueprint_create, graph_batch, etc.
- [ ] `mcp-world-tools` - world_spawn_batch, etc.
- [ ] `mcp-material-tools` - material_create, etc.

---

## Workflow d'utilisation

### CLI/IDE (Cursor, Claude Code)

```
1. User: "Start game-brief workflow"
2. LLM: Charge ~/.unreal-companion/core/workflow-engine.md
3. LLM: Charge workflow.yaml depuis la bonne phase
4. LLM: Résout variables depuis config
5. LLM: Charge instructions.md
6. LLM: Exécute step par step (charge step-*.md à la demande)
7. LLM: Sauvegarde output avec template sélectionné
8. LLM: Met à jour workflow-status.yaml
```

### Web UI

```
1. User: Sélectionne workflow dans l'interface
2. Backend: Charge workflow.yaml
3. Backend: Crée session, retourne premier step
4. Frontend: Affiche step avec inputs
5. User: Répond aux questions
6. Backend: Génère contenu via LLM
7. Backend: Sauvegarde dans output/
8. Loop: Steps suivants...
9. Backend: Met à jour workflow-status.yaml
```

---

## Priorités d'implémentation

### Phase 1 - Structure de base
1. Réorganiser workflows par phases
2. Créer `rules-templates/`
3. Mettre à jour loaders (chemins)

### Phase 2 - Format agents
1. Convertir agents YAML → agent.md
2. Mettre à jour parsers (frontmatter)
3. Créer teams/team-gamedev/team.md

### Phase 3 - Skills
1. Créer skills/ avec format standard
2. Implémenter copie vers ~/.cursor/skills/ etc.
3. Créer skills MCP pour unreal-agent

### Phase 4 - Multi-IDE
1. Implémenter prompt sélection IDE
2. Générer rules depuis templates
3. Tester sur chaque IDE

---

## Notes techniques

### Parser frontmatter YAML + Markdown

**JavaScript:**
```javascript
import matter from 'gray-matter';
const { data, content } = matter(fileContent);
// data = YAML frontmatter
// content = Markdown body
```

**Python:**
```python
import frontmatter
post = frontmatter.load('agent.md')
# post.metadata = YAML frontmatter
# post.content = Markdown body
```

### Auto-découverte (pas de manifest)

Les workflows et agents sont découverts en parcourant les dossiers :
- `frameworks/workflows/**/workflow.yaml`
- `frameworks/agents/*/agent.md`
- `frameworks/skills/*/SKILL.md`

Pas besoin de fichiers index/manifest séparés.

---

## Bonnes idées de BMAD à intégrer

### 1. Customization Layer

**Emplacement:** `{project}/.unreal-companion/_config/agents/*.customize.yaml`

Permet de personnaliser les agents par projet sans modifier les originaux.

```yaml
# game-designer.customize.yaml
agent:
  metadata:
    name: "Mon Designer"  # Override le nom

# Ajouter des memories (contexte persistant)
memories:
  - "User prefers detailed explanations"
  - "Project uses Unreal Engine 5.4"
  - "Focus on mobile performance"

# Ajouter des menu items custom
menu:
  - trigger: my-workflow
    workflow: "custom/my.yaml"
    description: My custom workflow

# Prompts custom pour handlers
prompts:
  - id: my-prompt
    content: |
      Custom prompt instructions here
```

### 2. Manifest d'installation

**Emplacement:** `{project}/.unreal-companion/_config/manifest.yaml`

Track la configuration de l'installation.

```yaml
installation:
  version: 1.0.0
  installDate: 2026-01-27
  lastUpdated: 2026-01-27
ides:
  - cursor
  - claude-code    # Plusieurs IDE possibles
modules:
  - core
  - bmgd
```

### 3. Memories System (évolutif)

**Concept:** Les agents "se souviennent" du projet et des préférences utilisateur.

**Fichier:** `{project}/.unreal-companion/memories.yaml`

```yaml
version: "1.0"
last_updated: "2026-01-27"

# Memories globales (tous les agents)
project:
  - id: "m1"
    content: "Le jeu est un roguelike deck-builder"
    source: "game-brief workflow"
    created: "2026-01-27"

# Memories par agent
agents:
  game-designer:
    - id: "m2"
      content: "User préfère mécaniques inspirées de Slay the Spire"
      source: "brainstorming"
      created: "2026-01-27"
```

**Flow semi-automatique:**
1. Pendant conversation, agent détecte info importante
2. Agent propose : "💾 Retenir: 'X' ?" [Oui/Non/Modifier]
3. Si validé, sauvegardé dans memories.yaml
4. Tous les agents y ont accès aux prochaines sessions

**Web UI:**
- Voir toutes les memories
- Ajouter/Modifier/Supprimer
- Filtrer par agent

**CLI:**
```bash
npx unreal-companion memories list
npx unreal-companion memories add "Focus mobile 60fps"
npx unreal-companion memories remove m1
```

**CLI/IDE (via LLM chat):**

Les rules incluent des instructions pour que le LLM puisse gérer les memories :

| Commande chat | Action |
|---------------|--------|
| `/memories` | Lister toutes les memories |
| `/memory add "..."` | Ajouter une memory |
| `/memory remove m1` | Supprimer une memory |
| `/memory clear` | Tout effacer (avec confirmation) |

L'agent peut aussi **proposer automatiquement** de sauvegarder une info importante :

```
💾 **Retenir ?** "Le jeu cible mobile avec 60fps minimum"
→ [y] Oui  [n] Non  [e] Modifier
```

### 4. Agent Customization (global + projet)

**Deux niveaux:**
- **Global** (`~/.unreal-companion/agents/*.customize.yaml`) - S'applique partout
- **Projet** (`{project}/.unreal-companion/agents/*.customize.yaml`) - Override pour ce projet

**Ce qu'on peut customiser:**
- Nom de l'agent
- Avatar/Emoji
- Style de communication
- Menu items additionnels

**Web UI:**
- Interface de customization par agent
- Preview du style
- Save Global / Save Project

**CLI:**
```bash
npx unreal-companion agent customize game-designer --name "Zelda" --style "professional"
npx unreal-companion agent show game-designer
npx unreal-companion agent reset game-designer
```

### 5. Advanced Elicitation Skill

**50 techniques** pour "challenger" le LLM et obtenir de meilleures réponses.

**Emplacement:** `skills/advanced-elicitation/`

```
advanced-elicitation/
├── SKILL.md
└── references/
    └── methods.csv    # 50 techniques catégorisées
```

**Catégories:**
- **collaboration** : Stakeholder Round Table, Expert Panel, Debate Club
- **advanced** : Tree of Thoughts, Graph of Thoughts, Self-Consistency
- **competitive** : Red Team vs Blue Team, Shark Tank Pitch
- **creative** : SCAMPER, What If Scenarios, Genre Mashup
- **risk** : Pre-mortem Analysis, Chaos Monkey, Devil's Advocate
- **core** : First Principles, 5 Whys, Socratic Questioning

**Usage:** Appelé pendant un workflow pour améliorer une section générée.

---

## Structure finale avec ajouts BMAD

```
/frameworks/
├── README.md
│
├── skills/
│   ├── advanced-elicitation/          # 🆕 50 techniques
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── methods.csv
│   ├── balance-testing/
│   ├── progression-design/
│   ├── mcp-core-tools/
│   └── ...
│
├── agents/
│   └── ...
│
├── workflows/
│   └── ...
│
├── teams/
│   └── ...
│
├── rules-templates/
│   └── ...
│
├── project/                           # Template projet
│   ├── _config/                       # 🆕 Config et customization
│   │   ├── manifest.yaml              # Version, modules, IDE
│   │   └── agents/                    # Customization par agent
│   │       └── .gitkeep
│   ├── config.yaml
│   ├── project-context.md
│   └── workflow-status.yaml
│
└── suggestions.yaml
```

---

## Installation multi-IDE

L'utilisateur peut sélectionner plusieurs IDE simultanément :

```bash
npx unreal-companion install

? Sélectionnez vos IDE (multi-select):
  ◉ Cursor
  ◉ Claude Code
  ◯ Windsurf
  ◯ VS Code Copilot
  ◉ Générique (AGENTS.md)
```

**Résultat pour Cursor + Claude Code :**

```bash
# Cursor
~/.cursor/
├── rules/companion/
│   └── *.mdc
└── skills/
    └── (copie des skills)

# Claude Code
~/.claude/
├── CLAUDE.md
└── skills/
    └── (copie des skills)

# Web UI (toujours présent)
~/.unreal-companion/
├── config.yaml
├── workflows/
└── agents/
```

---

## Questions ouvertes

### ✅ Décidées

1. **Party Mode** - ✅ **D+E validé**
   - CLI/IDE : Les agents se mentionnent entre eux (`@game-designer`)
   - Web UI : Interface "Party Mode" dédiée avec visualisation multi-agents

2. **Skills MCP** - ✅ **Par module Python validé**
   - Un skill par module Python (~12 skills)
   - Correspond aux catégories existantes (core, blueprint, graph, world, etc.)

3. **Validation** - ✅ **Progressive validée**
   - Validation à chaque step (pas seulement à la fin)
   - Permet de sauvegarder la progression
   - L'agent propose : "✅ Step validé ? [y/n]"

4. **Migration** - ✅ **Aucune migration**
   - Projet trop récent, encore en réflexion
   - Supprimer `.unreal-companion/` suffit pour "reset"

5. **Branches/Boucles dans workflows** - ✅ **Mix YAML + Markdown + XML validé**
   
   Adopte le pattern BMAD :
   
   | Fichier | Format | Contenu |
   |---------|--------|---------|
   | `workflow.yaml` | YAML | Métadonnées, config, paths |
   | `workflow.md` | Markdown | Vue d'ensemble, rôle agent |
   | `instructions.xml` | XML | Logique complexe (optionnel) |
   | `steps/*.md` | Markdown | Contenu détaillé des steps |
   
   **Règle simple :**
   - Workflow linéaire → **Markdown only** (pas de XML)
   - Workflow avec branches/boucles → **XML pour la logique**
   
   **Tags XML supportés :**
   | Tag | Usage |
   |-----|-------|
   | `<flow>` | Container du workflow |
   | `<step n="X">` | Étape numérotée |
   | `<action>` | Action à exécuter |
   | `<check if="...">` | Condition |
   | `<goto anchor="..."/>` | Saut vers un point |
   | `<case n="...">` | Branche de switch |
   | `<halt>` | Point d'arrêt |
   | `<critical>` | Règle obligatoire |
   | `<ask>` | Prompt utilisateur |
   | `<output>` | Message à afficher |
   
   **Branches simples via nommage :**
   ```
   steps/
   ├── step-01-init.md
   ├── step-01b-continue.md      # Branche alternative
   ├── step-02a-option-a.md      # Choix utilisateur A
   ├── step-02b-option-b.md      # Choix utilisateur B
   └── step-03-complete.md
   ```

---

## Skills à créer

### Game Design
- [ ] `balance-testing` - Méthodes de test d'équilibrage
- [ ] `progression-design` - Courbes XP, unlocks
- [ ] `core-loop-design` - Design de boucle de gameplay
- [ ] `player-psychology` - Motivation, engagement

### QA & Testing
- [ ] `performance-testing` - FPS, profiling
- [ ] `playtesting` - Méthodes de playtest
- [ ] `regression-testing` - Tests de régression
- [ ] `certification` - TRC/XR requirements

### Development
- [ ] `code-review` - Checklist de review
- [ ] `story-writing` - Rédaction de user stories
- [ ] `sprint-planning` - Planning de sprint

### Unreal MCP
- [ ] `mcp-core-tools` - core_query, core_save, core_get_info
- [ ] `mcp-blueprint-tools` - blueprint_create, graph_batch
- [ ] `mcp-world-tools` - world_spawn_batch, world_set_batch
- [ ] `mcp-material-tools` - material_create
- [ ] `mcp-viewport-tools` - viewport_screenshot, navigation

### Meta
- [ ] `advanced-elicitation` - 50 techniques de réflexion

---

*Document généré le 27 janvier 2026 - Mis à jour avec idées BMAD*
