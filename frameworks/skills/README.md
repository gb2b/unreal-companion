# Skills

Skills are specialized knowledge packages that agents can use to perform specific tasks.

## Format

Each skill follows the **Agent Skills standard**:

```
skill-name/
├── SKILL.md              # Required - Main instructions
├── scripts/              # Optional - Executable code
├── references/           # Optional - Additional docs
└── assets/               # Optional - Templates, data
```

## SKILL.md Format

```markdown
---
name: skill-name
description: |
  What this skill does and when to use it.
  Include trigger words and scenarios.
---

# Skill Name

## When to Use
- Trigger scenarios

## Instructions
Step-by-step guidance

## Examples
Usage examples

## Additional Resources
Links to references
```

## Available Skills

### Game Design
- `balance-testing` - Game balance methodologies
- `progression-design` - XP curves, unlocks, rewards
- `core-loop-design` - Core gameplay loop design
- `player-psychology` - Player motivation and engagement

### QA & Testing
- `performance-testing` - FPS, profiling, optimization
- `playtesting` - Playtest methodologies
- `regression-testing` - Regression test strategies

### Development
- `code-review` - Code review checklist
- `story-writing` - User story format
- `sprint-planning` - Sprint planning techniques

### Unreal MCP
- `mcp-core-tools` - core_query, core_save, core_get_info
- `mcp-blueprint-tools` - blueprint_create, graph_batch
- `mcp-graph-tools` - graph_batch, nodes, connections
- `mcp-world-tools` - world_spawn_batch, actors
- `mcp-asset-tools` - materials, widgets, levels
- `mcp-editor-tools` - viewport, console, python

### Meta
- `advanced-elicitation` - 50 thinking techniques

## Installation

Skills are copied to:
- Cursor: `~/.cursor/skills/`
- Claude Code: `~/.claude/skills/`

## Usage

Skills are loaded automatically based on agent configuration.
The `skills` field in `agent.md` frontmatter references which skills an agent can use.
