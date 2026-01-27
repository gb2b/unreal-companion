# Frameworks

This directory contains the **BMGD Framework** (Blueprint Method for Game Development) - a structured approach to AI-assisted game development.

## Structure

```
frameworks/
├── workflows/       # 26 workflow definitions (source of truth)
├── agents/          # 7 AI agent personas (source of truth)
├── global/          # Files installed to ~/.unreal-companion/
├── project/         # Files installed to {project}/.unreal-companion/
└── suggestions.yaml # AI suggestion definitions
```

## BMGD Framework

BMGD provides:

- **Agents**: Specialized AI personas (Game Designer, Architect, Developer, etc.)
- **Workflows**: Guided multi-step processes for common tasks
- **Documents**: Structured output templates (Game Brief, GDD, etc.)

## Installation Flow

1. **Global install** (`npx unreal-companion --install`):
   - `global/` → `~/.unreal-companion/`
   - `workflows/` → `~/.unreal-companion/workflows/defaults/`
   - `agents/` → `~/.unreal-companion/agents/defaults/`

2. **Project setup** (`npx unreal-companion init`):
   - `project/` → `{project}/.unreal-companion/`

## Customization

Users can override defaults by placing custom workflows/agents in:
- Global: `~/.unreal-companion/workflows/custom/`
- Project: `{project}/.unreal-companion/workflows/`

Project-specific overrides take priority over global ones.
