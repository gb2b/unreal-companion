# Frameworks — BMGD Method

Source of truth for templates deployed to users. This folder is **NEVER read at runtime** — its content is copied to `~/.unreal-companion/` by the CLI or web-ui during installation.

## Structure

```
frameworks/
├── manifest.yaml              # Template version
├── agents/                    # 9 agents with gaming personas
│   ├── game-designer/         # "Zelda" — design, GDD
│   ├── game-architect/        # "Solid" — technical architecture
│   ├── level-designer/        # "Lara" — level design
│   ├── 3d-artist/             # "Navi" — 3D art
│   ├── game-dev/              # "Ada" — development
│   ├── solo-dev/              # "Indie" — rapid prototyping
│   ├── unreal-agent/          # "Epic" — UE expert (Editor mode)
│   ├── game-qa/               # QA testing
│   └── scrum-master/          # Agile management
├── workflows/                 # Organized by phase
│   ├── 1-preproduction/       # brainstorming, game-brief
│   ├── 2-design/              # gdd, narrative, art-direction, level-design
│   ├── 3-technical/           # game-architecture, project-context
│   ├── 4-production/          # sprint-planning, dev-story, code-review
│   ├── quick-flow/            # quick-prototype, quick-dev
│   └── tools/                 # mind-map, mood-board, gametest
├── skills/                    # BMGD skills (reusable by agents)
│   ├── mcp-core-tools/
│   ├── mcp-blueprint-tools/
│   ├── balance-testing/
│   ├── progression-design/
│   ├── advanced-elicitation/
│   └── ...
├── rules-templates/           # Templates for generating IDE files
│   ├── cursor/                # *.mdc.template
│   ├── claude-code/           # CLAUDE.md.template
│   ├── windsurf/              # rules.md.template
│   ├── vscode-copilot/        # *.instructions.md.template
│   ├── generic/               # AGENTS.md.template
│   └── core/                  # workflow-instructions.md (shared)
├── project/                   # Project initialization templates
│   ├── config.yaml
│   ├── project-context.md
│   ├── workflow-status.yaml
│   └── memories.yaml
└── teams/                     # Team definitions
    └── team-gamedev/
```

## File Formats

### Agent (`agent.md`)
```yaml
---
id: game-designer
name: Game Designer
title: Zelda
icon: gamepad
skills: [balance-testing, progression-design, core-loop-design]
triggers: [game-brief, gdd, brainstorming]
modes: [studio]
---
# Persona, communication style, menu, expertise...
```

### Workflow (`workflow.yaml` + `steps/`)
```yaml
id: game-brief
name: Game Brief
phase: 1-preproduction
agent: game-designer
steps:
  - id: step-01-init
    name: Initialization
  - id: step-02-identity
    name: Game Identity
  # ...
```

Each step is a `steps/step-{nn}-{name}.md` file with:
- Mandatory execution rules (do not skip, do not optimize)
- Interactive content (questions for the user)
- Progress menu: [A] Accept, [P] Feedback, [C] Continue, [AE] Advanced Elicitation

### BMGD Skill (`SKILL.md`)
```yaml
---
name: balance-testing
description: Game balance analysis methodologies
---
# Skill content...
```

## Modifying a Workflow

1. Edit the files in `frameworks/workflows/{phase}/{id}/`
2. Test loading: `npx unreal-companion` → verify the workflow appears
3. Update `manifest.yaml` if the change is significant
4. Users will receive the update via `npx unreal-companion upgrade`

## Modifying an Agent

1. Edit `frameworks/agents/{id}/agent.md`
2. Verify that referenced skills exist in `frameworks/skills/`
3. Update `manifest.yaml`

## Distinction between "meta" doc and "product" doc

- This `frameworks/` folder = "product" doc (for Unreal Companion users)
- The CLAUDE.md files in the repo = "meta" doc (for Unreal Companion developers)
- The `rules-templates/claude-code/CLAUDE.md.template` template is deployed in the **user's project**, not in this repo
