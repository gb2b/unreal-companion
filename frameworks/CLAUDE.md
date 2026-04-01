# Frameworks — Méthode BMGD

Source de vérité pour les templates déployés chez l'utilisateur. Ce dossier n'est **JAMAIS lu au runtime** — son contenu est copié vers `~/.unreal-companion/` par le CLI ou le web-ui lors de l'installation.

## Structure

```
frameworks/
├── manifest.yaml              # Version des templates
├── agents/                    # 9 agents avec personas gaming
│   ├── game-designer/         # "Zelda" — design, GDD
│   ├── game-architect/        # "Solid" — architecture technique
│   ├── level-designer/        # "Lara" — level design
│   ├── 3d-artist/             # "Navi" — art 3D
│   ├── game-dev/              # "Ada" — développement
│   ├── solo-dev/              # "Indie" — prototypage rapide
│   ├── unreal-agent/          # "Epic" — expert UE (mode Editor)
│   ├── game-qa/               # QA testing
│   └── scrum-master/          # Gestion agile
├── workflows/                 # Organisés par phase
│   ├── 1-preproduction/       # brainstorming, game-brief
│   ├── 2-design/              # gdd, narrative, art-direction, level-design
│   ├── 3-technical/           # game-architecture, project-context
│   ├── 4-production/          # sprint-planning, dev-story, code-review
│   ├── quick-flow/            # quick-prototype, quick-dev
│   └── tools/                 # mind-map, mood-board, gametest
├── skills/                    # Skills BMGD (réutilisables par les agents)
│   ├── mcp-core-tools/
│   ├── mcp-blueprint-tools/
│   ├── balance-testing/
│   ├── progression-design/
│   ├── advanced-elicitation/
│   └── ...
├── rules-templates/           # Templates pour générer les fichiers IDE
│   ├── cursor/                # *.mdc.template
│   ├── claude-code/           # CLAUDE.md.template
│   ├── windsurf/              # rules.md.template
│   ├── vscode-copilot/        # *.instructions.md.template
│   ├── generic/               # AGENTS.md.template
│   └── core/                  # workflow-instructions.md (commun)
├── project/                   # Templates d'initialisation projet
│   ├── config.yaml
│   ├── project-context.md
│   ├── workflow-status.yaml
│   └── memories.yaml
└── teams/                     # Définitions d'équipes
    └── team-gamedev/
```

## Formats de fichiers

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

Chaque step est un fichier `steps/step-{nn}-{name}.md` avec :
- Mandatory execution rules (ne pas skip, ne pas optimiser)
- Contenu interactif (questions à l'utilisateur)
- Menu de progression : [A] Accepter, [P] Feedback, [C] Continuer, [AE] Advanced Elicitation

### Skill BMGD (`SKILL.md`)
```yaml
---
name: balance-testing
description: Game balance analysis methodologies
---
# Contenu du skill...
```

## Modifier un workflow

1. Éditer les fichiers dans `frameworks/workflows/{phase}/{id}/`
2. Tester le chargement : `npx unreal-companion` → vérifier que le workflow apparaît
3. Mettre à jour `manifest.yaml` si changement significatif
4. L'utilisateur recevra la mise à jour via `npx unreal-companion upgrade`

## Modifier un agent

1. Éditer `frameworks/agents/{id}/agent.md`
2. Vérifier que les skills référencés existent dans `frameworks/skills/`
3. Mettre à jour `manifest.yaml`

## Distinction doc "méta" vs doc "produit"

- Ce dossier `frameworks/` = doc "produit" (pour les utilisateurs d'Unreal Companion)
- Les CLAUDE.md du repo = doc "méta" (pour les développeurs d'Unreal Companion)
- Le template `rules-templates/claude-code/CLAUDE.md.template` est déployé dans le **projet de l'utilisateur**, pas dans ce repo
