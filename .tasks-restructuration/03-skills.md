# Phase 3 - Skills

**Objectif:** Créer les skills au format standard Agent Skills.

---

## 3.1 Structure standard d'un skill

```
skill-name/
├── SKILL.md              # Requis - Instructions principales
├── scripts/              # Optionnel - Code exécutable
├── references/           # Optionnel - Docs additionnelles
└── assets/               # Optionnel - Templates, données
```

### Format SKILL.md

```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.
  Include trigger words and scenarios.
---

# Skill Name

## When to Use

- Scenario 1
- Scenario 2
- Trigger: "keyword"

## Instructions

### Step 1: ...
...

### Step 2: ...
...

## Examples

### Example 1
...

## Additional Resources

See [references/details.md](references/details.md) for more.
```

---

## 3.2 Skills Game Design

### balance-testing

**Destination:** `frameworks/skills/balance-testing/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Méthodologies de test d'équilibrage
  - [ ] Métriques à surveiller
  - [ ] Outils de simulation
  - [ ] Red flags et anti-patterns

### progression-design

**Destination:** `frameworks/skills/progression-design/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Courbes de progression (XP, niveau, difficulté)
  - [ ] Systèmes d'unlock
  - [ ] Reward schedules
  - [ ] Exemples de jeux référence

### core-loop-design

**Destination:** `frameworks/skills/core-loop-design/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Structure Action → Feedback → Reward
  - [ ] Loops primaires, secondaires, tertiaires
  - [ ] Exemples par genre

### player-psychology

**Destination:** `frameworks/skills/player-psychology/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Motivation (intrinsic/extrinsic)
  - [ ] Flow state
  - [ ] Bartle player types
  - [ ] Engagement patterns

---

## 3.3 Skills QA & Testing

### performance-testing

**Destination:** `frameworks/skills/performance-testing/`

- [ ] Créer `SKILL.md` avec :
  - [ ] FPS monitoring
  - [ ] Memory profiling
  - [ ] GPU profiling
  - [ ] Bottleneck identification
- [ ] Créer `scripts/` avec snippets UE5 (optionnel)

### playtesting

**Destination:** `frameworks/skills/playtesting/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Méthodologies de playtest
  - [ ] Questions à poser
  - [ ] Observation patterns
  - [ ] Analyse de feedback

### regression-testing

**Destination:** `frameworks/skills/regression-testing/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Test case management
  - [ ] Automation strategies
  - [ ] CI/CD integration

---

## 3.4 Skills Development

### code-review

**Destination:** `frameworks/skills/code-review/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Checklist de review
  - [ ] Best practices UE5/Blueprint
  - [ ] Common issues
  - [ ] Performance patterns

### story-writing

**Destination:** `frameworks/skills/story-writing/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Format user story
  - [ ] Acceptance criteria
  - [ ] Definition of Done
  - [ ] Story splitting

### sprint-planning

**Destination:** `frameworks/skills/sprint-planning/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Estimation techniques
  - [ ] Velocity tracking
  - [ ] Sprint backlog management

---

## 3.5 Skills MCP (Unreal)

### mcp-core-tools

**Destination:** `frameworks/skills/mcp-core-tools/`

- [ ] Créer `SKILL.md` avec :
  - [ ] `core_query` - Recherche assets, actors, nodes
  - [ ] `core_get_info` - Informations détaillées
  - [ ] `core_save` - Sauvegarde assets/levels
  - [ ] Exemples d'utilisation
  - [ ] Patterns courants
- [ ] Créer `references/tools-reference.md` avec documentation complète

### mcp-blueprint-tools

**Destination:** `frameworks/skills/mcp-blueprint-tools/`

- [ ] Créer `SKILL.md` avec :
  - [ ] `blueprint_create` - Créer un Blueprint
  - [ ] `blueprint_variable_batch` - Variables
  - [ ] `blueprint_component_batch` - Components
  - [ ] `blueprint_function_batch` - Functions
  - [ ] Workflow recommandé
  - [ ] Erreurs courantes

### mcp-graph-tools

**Destination:** `frameworks/skills/mcp-graph-tools/`

- [ ] Créer `SKILL.md` avec :
  - [ ] `graph_batch` - Nodes, connections, pin values
  - [ ] `graph_node_info` - Info sur les nodes
  - [ ] `node_search_available` - Recherche de nodes
  - [ ] Ordre d'exécution graph_batch
  - [ ] Patterns Blueprint courants (Event → Action, Branch, Loop)

### mcp-world-tools

**Destination:** `frameworks/skills/mcp-world-tools/`

- [ ] Créer `SKILL.md` avec :
  - [ ] `world_spawn_batch` - Spawn actors
  - [ ] `world_set_batch` - Modifier actors
  - [ ] `world_delete_batch` - Supprimer actors
  - [ ] Système de coordonnées UE5
  - [ ] Patterns de placement

### mcp-asset-tools

**Destination:** `frameworks/skills/mcp-asset-tools/`

- [ ] Créer `SKILL.md` avec :
  - [ ] `material_create` - Matériaux
  - [ ] `widget_*` - UMG Widgets
  - [ ] `level_*` - Niveaux
  - [ ] `light_*` - Éclairage
  - [ ] Paths standards UE5

### mcp-editor-tools

**Destination:** `frameworks/skills/mcp-editor-tools/`

- [ ] Créer `SKILL.md` avec :
  - [ ] `viewport_screenshot` - Captures
  - [ ] `editor_focus_*` - Focus fenêtres
  - [ ] `python_execute` - Scripts Python (CRITICAL)
  - [ ] `console` - Commandes console
  - [ ] Règles de sécurité

---

## 3.6 Skill Meta

### advanced-elicitation

**Destination:** `frameworks/skills/advanced-elicitation/`

- [ ] Créer `SKILL.md` avec :
  - [ ] Description des 50 techniques
  - [ ] Quand utiliser chaque catégorie
  - [ ] Instructions d'intégration workflow
- [ ] Créer `references/methods.csv` avec :
  - [ ] Colonnes: category, method_name, description, output_pattern
  - [ ] 50+ techniques catégorisées

### Catégories de techniques

```csv
category,method_name,description,output_pattern
core,First Principles,"Break down to fundamental truths","assumption → truth → implication"
core,5 Whys,"Drill down to root cause","why → why → why → root"
core,Socratic Questioning,"Guided discovery through questions","question → answer → deeper question"
collaboration,Stakeholder Round Table,"Multiple viewpoints on topic","perspective → insight → synthesis"
collaboration,Expert Panel,"Domain expert opinions","expert → opinion → consensus"
creative,SCAMPER,"Systematic creativity technique","substitute → combine → adapt → modify"
creative,What If Scenarios,"Explore alternatives","what if → consequence → opportunity"
risk,Pre-mortem Analysis,"Imagine failure to prevent it","failure → cause → prevention"
risk,Devils Advocate,"Challenge assumptions","claim → challenge → defense"
advanced,Tree of Thoughts,"Branching reasoning paths","branch → evaluate → prune → select"
```

---

## 3.7 Créer README.md skills

**Destination:** `frameworks/skills/README.md`

- [ ] Créer avec :
  - [ ] Description du format standard
  - [ ] Liste des skills disponibles
  - [ ] Comment créer un nouveau skill
  - [ ] Comment référencer un skill depuis un agent

---

## Critères de validation

- [ ] Tous les skills créés avec SKILL.md valide
- [ ] Frontmatter YAML parsable
- [ ] Skills MCP documentent tous les outils du module correspondant
- [ ] advanced-elicitation contient methods.csv
- [ ] README.md liste tous les skills

---

## Notes

- Les skills sont copiés vers `~/.cursor/skills/` ou `~/.claude/skills/` lors de l'installation
- Un skill peut être référencé par plusieurs agents
- Le frontmatter `description` est utilisé pour l'auto-découverte
