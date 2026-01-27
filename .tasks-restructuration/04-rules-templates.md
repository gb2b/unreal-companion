# Phase 4 - Rules Templates

**Objectif:** Créer les templates de rules pour chaque IDE supporté.

---

## 4.1 Structure rules-templates

```
frameworks/rules-templates/
├── cursor/
│   ├── companion.mdc.template
│   ├── memories.mdc.template
│   └── workflow.mdc.template
├── claude-code/
│   ├── CLAUDE.md.template
│   └── memories.md.template
├── windsurf/
│   └── rules.md.template
├── vscode-copilot/
│   └── instructions.md.template
└── generic/
    └── AGENTS.md.template
```

---

## 4.2 Cursor Templates

### companion.mdc.template

**Destination:** `frameworks/rules-templates/cursor/companion.mdc.template`

- [ ] Créer template avec :
  - [ ] Frontmatter MDC (description, globs, alwaysApply)
  - [ ] Instructions générales Unreal Companion
  - [ ] Référence aux agents disponibles
  - [ ] Commandes disponibles
  - [ ] Variables à substituer: `{{project_name}}`, `{{version}}`

```markdown
---
description: Unreal Companion - {{project_name}}
globs:
alwaysApply: true
---

# Unreal Companion

Version: {{version}}

## Agents disponibles

{{#each agents}}
- **{{name}}** ({{id}}) - {{title}}
{{/each}}

## Commandes

| Commande | Description |
|----------|-------------|
| `/agent <name>` | Activer un agent |
| `/workflow <name>` | Lancer un workflow |
| `/status` | Voir le status du projet |
| `/memories` | Voir les memories |

## Configuration

Projet: `{{project_path}}/.unreal-companion/`
```

### memories.mdc.template

**Destination:** `frameworks/rules-templates/cursor/memories.mdc.template`

- [ ] Créer template avec :
  - [ ] Instructions pour gérer les memories
  - [ ] Commandes `/memory add`, `/memory remove`, etc.
  - [ ] Format du fichier memories.yaml
  - [ ] Instruction de proposition automatique

```markdown
---
description: Unreal Companion - Memory Management
globs:
alwaysApply: true
---

# Memory System

## Loading Memories

At session start, read `{{project_path}}/.unreal-companion/memories.yaml`.
Use these memories as context for all responses.

## Commands

| Command | Action |
|---------|--------|
| `/memories` | List all memories |
| `/memory add "..."` | Add a new memory |
| `/memory remove <id>` | Remove memory by ID |
| `/memory clear` | Clear all (with confirmation) |

## Auto-Propose

When detecting important information, propose:

```
💾 **Retenir ?** "info détectée"
→ [y] Oui  [n] Non  [e] Modifier
```

If confirmed, append to memories.yaml:

```yaml
project:
  - id: "m{{timestamp}}"
    content: "info détectée"
    source: "conversation"
    created: "{{date}}"
```

## Important Info to Remember

- Project preferences (platforms, performance targets)
- Game concept and genre
- User communication preferences
- Key technical decisions
- Recurring patterns or preferences
```

### workflow.mdc.template

**Destination:** `frameworks/rules-templates/cursor/workflow.mdc.template`

- [ ] Créer template pour générer une rule par workflow
- [ ] Variables: `{{workflow_id}}`, `{{workflow_name}}`, `{{workflow_description}}`

```markdown
---
description: "Workflow: {{workflow_name}}"
globs:
alwaysApply: false
---

# {{workflow_name}}

{{workflow_description}}

## Activation

Pour lancer ce workflow:
- Commande: `/workflow {{workflow_id}}`
- Ou dire: "Lance le workflow {{workflow_name}}"

## Instructions

Charger et suivre: `{{workflow_path}}/workflow.md`
```

---

## 4.3 Claude Code Templates

### CLAUDE.md.template

**Destination:** `frameworks/rules-templates/claude-code/CLAUDE.md.template`

- [ ] Créer template avec :
  - [ ] Format Claude Code standard
  - [ ] Instructions Unreal Companion
  - [ ] Liste des agents et workflows
  - [ ] Références aux skills

```markdown
# Unreal Companion - Claude Instructions

## Project: {{project_name}}

### Agents

{{#each agents}}
- `{{id}}`: {{title}} - {{description}}
{{/each}}

### Workflows

{{#each workflows}}
- `{{id}}`: {{name}}
{{/each}}

### Commands

- `/agent <name>` - Activate agent
- `/workflow <name>` - Start workflow
- `/memories` - View memories
- `/status` - Project status

### Configuration

- Config: `{{project_path}}/.unreal-companion/config.yaml`
- Memories: `{{project_path}}/.unreal-companion/memories.yaml`
- Context: `{{project_path}}/.unreal-companion/project-context.md`

### Skills

Skills are available in `~/.claude/skills/`:
{{#each skills}}
- {{name}}: {{description}}
{{/each}}
```

### memories.md.template

**Destination:** `frameworks/rules-templates/claude-code/memories.md.template`

- [ ] Créer template similaire à Cursor mais format Claude Code

---

## 4.4 Windsurf Templates

### rules.md.template

**Destination:** `frameworks/rules-templates/windsurf/rules.md.template`

- [ ] Créer template format Windsurf
- [ ] Adapter instructions pour Windsurf

---

## 4.5 VS Code Copilot Templates

### instructions.md.template

**Destination:** `frameworks/rules-templates/vscode-copilot/instructions.md.template`

- [ ] Créer template format `.instructions.md`
- [ ] Adapter pour GitHub Copilot

---

## 4.6 Generic Template

### AGENTS.md.template

**Destination:** `frameworks/rules-templates/generic/AGENTS.md.template`

- [ ] Créer template AGENTS.md générique
- [ ] Compatible avec la plupart des LLMs
- [ ] Format simple et universel

```markdown
# AGENTS.md - Unreal Companion

## Project: {{project_name}}

## Available Agents

{{#each agents}}
### {{name}} ({{id}})

{{description}}

**Expertise:** {{expertise}}
**Triggers:** {{triggers}}

{{/each}}

## Workflows

{{#each workflows}}
### {{name}}

{{description}}

**Category:** {{category}}
**Agent:** {{agent}}

{{/each}}

## Commands

- Activate agent: "I want to work with [agent name]"
- Start workflow: "Start [workflow name]"
- View memories: "Show memories"
- Add memory: "Remember: [info]"

## Configuration Files

- `.unreal-companion/config.yaml` - Project config
- `.unreal-companion/memories.yaml` - Persistent memories
- `.unreal-companion/project-context.md` - Project context
```

---

## 4.7 Supprimer ancien dossier global

- [ ] Supprimer `frameworks/global/` (contenu migré vers rules-templates)
- [ ] Vérifier qu'aucune référence ne pointe vers `global/`

---

## Critères de validation

- [ ] Tous les templates créés
- [ ] Variables de substitution documentées
- [ ] Templates testés avec données exemple
- [ ] `global/` supprimé

---

## Notes

- Les templates utilisent une syntaxe de substitution simple (`{{variable}}`)
- Le CLI `installer.js` devra implémenter la substitution
- Les templates peuvent inclure des boucles (`{{#each}}`) pour les listes
