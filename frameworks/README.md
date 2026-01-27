# Unreal Companion - Frameworks

This directory contains the BMGD (Blueprint-driven Multiplayer Game Development) framework for Unreal Companion.

## Structure

```
frameworks/
├── workflows/              # Workflows organized by phase
│   ├── 1-preproduction/    # Brainstorming, game brief
│   ├── 2-design/           # GDD, narrative, art direction
│   ├── 3-technical/        # Architecture, project context
│   ├── 4-production/       # Sprints, stories, code review
│   ├── quick-flow/         # Quick prototype, quick dev
│   └── tools/              # Mind map, mood board, gametest
│
├── agents/                 # Agent definitions (agent.md format)
│   ├── game-designer/
│   ├── game-architect/
│   ├── game-dev/
│   ├── solo-dev/
│   ├── unreal-agent/
│   └── ...
│
├── skills/                 # Agent skills (SKILL.md format)
│   ├── mcp-core-tools/
│   ├── mcp-blueprint-tools/
│   ├── balance-testing/
│   ├── advanced-elicitation/
│   └── ...
│
├── teams/                  # Team definitions (team.md format)
│   └── team-gamedev/
│
├── rules-templates/        # IDE-specific rule templates
│   ├── cursor/
│   ├── claude-code/
│   ├── windsurf/
│   ├── vscode-copilot/
│   └── generic/
│
└── project/                # Project initialization templates
    ├── config.yaml
    ├── memories.yaml
    ├── project-context.md
    └── workflow-status.yaml
```

## File Formats

### Workflow (`workflow.yaml`)

```yaml
id: game-brief
version: "2.0"
name: "Game Brief"
description: "Define your game's vision"
category: "1-preproduction"

# Steps
steps:
  - id: "init"
    file: "steps/step-01-init.md"
    title: "Initialize"

# Output
templates:
  - id: full
    file: templates/full.md
```

### Agent (`agent.md`)

YAML frontmatter + Markdown content:

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
---

# Game Designer

## Persona
...

## Menu
...
```

### Skill (`SKILL.md`)

```markdown
---
name: balance-testing
description: |
  Game balance testing methodologies.
---

# Balance Testing

## When to Use
...

## Instructions
...
```

### Team (`team.md`)

```markdown
---
id: team-gamedev
name: Game Development Team
agents:
  - game-designer
  - game-architect
workflows:
  - brainstorming
  - gdd
---

# Game Development Team
...
```

## Workflow Phases

| Phase | Description | Workflows |
|-------|-------------|-----------|
| `1-preproduction` | Initial concept phase | brainstorming, game-brief |
| `2-design` | Design documentation | gdd, narrative, art-direction |
| `3-technical` | Technical planning | game-architecture, project-context |
| `4-production` | Development sprints | sprint-planning, dev-story, code-review |
| `quick-flow` | Rapid iterations | quick-prototype, quick-dev |
| `tools` | Utility workflows | mind-map, mood-board, gametest |

## Supported IDEs

| IDE | Config Location | Format |
|-----|-----------------|--------|
| Cursor | `.cursor/rules/` | `.mdc` |
| Claude Code | `.claude/` | `CLAUDE.md` |
| Windsurf | `.windsurf/rules/` | `.md` |
| VS Code Copilot | `.github/instructions/` | `.instructions.md` |
| Generic | Project root | `AGENTS.md` |

## Installation

```bash
# Global installation
npx unreal-companion install

# Project setup
cd my-project
npx unreal-companion init
```

## Adding Content

### New Workflow

1. Create folder in appropriate phase: `workflows/{phase}/{workflow-name}/`
2. Add `workflow.yaml` with metadata
3. Add `instructions.md` or `steps/*.md`
4. Optionally add `templates/` for output templates

### New Agent

1. Create folder: `agents/{agent-name}/`
2. Add `agent.md` with frontmatter + content

### New Skill

1. Create folder: `skills/{skill-name}/`
2. Add `SKILL.md` with frontmatter + instructions
3. Optionally add `references/` or `scripts/`

## Memory System

Memories persist context between sessions:

```yaml
# memories.yaml
project:
  - id: "m1"
    content: "The game is a roguelike deck-builder"
    source: "game-brief workflow"
    created: "2026-01-27"

agents:
  game-designer:
    - id: "gd1"
      content: "User prefers Slay the Spire mechanics"
```

Agents can propose memories during conversations:
```
💾 **Remember?** "info detected"
→ [y] Yes  [n] No  [e] Edit
```
