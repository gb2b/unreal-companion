# Unreal Companion - AI Agent Instructions

> This file enables Cursor, Claude Desktop, Claude Code, and other AI agents to understand and interact with the project.

---

## Unified Architecture

**One Template, Multiple Interfaces**

Unreal Companion uses a **unified architecture** where the same workflow templates work across:
- **Web UI** (browser interface)
- **CLI** (terminal commands)
- **Cursor/Claude Code** (AI IDE integrations)

This ensures:
- Consistent behavior regardless of interface
- No duplication of workflow definitions
- Project-specific overrides work everywhere

---

## Quick Start

### Execute a Workflow

```
1. Load the workflow engine: ~/.unreal-companion/core/workflow-engine.md
2. Load the workflow config: {workflow_path}/workflow.yaml
3. Follow workflow-engine.md instructions
4. Save after each <template-output> section
5. Update workflow-status.yaml on completion
```

### For Cursor Users

Reference workflow rules directly:
- `@rules/workflows/game-brief` - Start Game Brief
- `@rules/workflows/gdd` - Start GDD
- `@rules/workflows/brainstorming` - Start Brainstorming
- `@rules/index` - See all available workflows

---

## Core Files

### `workflow-engine.md`
The **execution engine** - how to run any workflow.

Location: `~/.unreal-companion/core/workflow-engine.md`

**Always load this first** when executing a workflow.

### `project-context.md`
The **project memory** - contains:
- Game vision and pillars
- Key documents created
- Technical stack
- Current focus

**Read at session start** to understand the project.

### `workflow-status.yaml`
The **current state** - contains:
- Active workflow sessions
- Progress of each session
- Recently completed workflows
- Recently created documents

**Check this file** to know where the user left off.

---

## Workflow Execution Flow

### 1. Load Engine & Config

```python
# Read the core engine
engine = read("~/.unreal-companion/core/workflow-engine.md")

# Find workflow (priority order)
workflow = find_workflow(workflow_id)
# 1. {project}/.unreal-companion/workflows/{id}/
# 2. ~/.unreal-companion/workflows/custom/{id}/
# 3. ~/.unreal-companion/workflows/defaults/{id}/
```

### 2. Resolve Variables

```yaml
# From config files:
{project-root} → Project directory
{output_folder} → From config.yaml
{user_name} → From config.yaml  
{communication_language} → From config.yaml
{date} → System date (YYYY-MM-DD)
{datetime} → System datetime (YYYY-MM-DD-HHMM)
```

### 3. Initialize Output Document

For template-workflows:
```markdown
---
type: {workflow_id}
session_id: {uuid}
status: in_progress
steps_completed: []
total_steps: {n}
created_at: "{datetime}"
---

# Document Title

[Template sections with placeholders]
```

### 4. Execute Steps In Order

For each step:
1. Read step file
2. Execute instructions (ask questions, gather input)
3. On `<template-output>` tag:
   - Generate section content
   - Save to output file
   - Show checkpoint separator: `━━━━━━━━━━━━━━━━━━━━━`
   - Display generated content
   - Present options: [c]Continue / [a]Advanced / [p]Party-Mode / [y]YOLO
   - **Wait for user response**
4. Update frontmatter: `steps_completed: [..., current_step]`

### 5. Complete Workflow

1. Mark document: `status: complete`
2. Update `workflow-status.yaml`
3. Update `project-context.md`
4. Display completion message

---

## File Locations

```
~/.unreal-companion/                    # Global directory
├── config.yaml                         # Global configuration
├── projects.json                       # Registered projects
├── core/
│   └── workflow-engine.md              # Workflow execution engine
├── rules/                              # Cursor .mdc rules
│   ├── index.mdc
│   └── workflows/
│       ├── game-brief.mdc
│       ├── gdd.mdc
│       └── brainstorming.mdc
├── agents/
│   ├── defaults/                       # Built-in agents
│   └── custom/                         # Global custom agents
└── workflows/
    ├── defaults/                       # Built-in workflows
    │   ├── game-brief/
    │   │   ├── workflow.yaml
    │   │   ├── instructions.md
    │   │   ├── template.md
    │   │   ├── context.md
    │   │   └── steps/
    │   └── gdd/
    └── custom/                         # Global custom workflows

{project}/.unreal-companion/            # Project directory
├── config.yaml                         # Project config (overrides global)
├── project-context.md                  # Project memory
├── workflow-status.yaml                # Current workflow state
├── rules/                              # Project Cursor rules (optional)
├── agents/                             # Project custom agents
├── workflows/                          # Project custom workflows
├── output/                             # Generated documents
│   ├── concept/
│   │   └── game-brief.md
│   ├── design/
│   │   └── gdd.md
│   └── analysis/
│       └── brainstorming-2026-01-27.md
└── sessions/
    └── workflows.db                    # SQLite backup
```

## Priority Order

When loading agents/workflows, **later overrides earlier**:

1. **Defaults** (`~/.unreal-companion/*/defaults/`)
2. **Global Custom** (`~/.unreal-companion/*/custom/`)
3. **Project Custom** (`{project}/.unreal-companion/*/`)

---

## Available Workflows

| ID | Name | Type | Description |
|----|------|------|-------------|
| `game-brief` | Game Brief | one-shot | Define your game's complete vision |
| `gdd` | GDD | one-shot | Complete game design document |
| `brainstorming` | Brainstorming | repeatable | Free-form idea exploration |
| `narrative` | Narrative | one-shot | Narrative and world design |
| `quick-prototype` | Quick Prototype | repeatable | Rapid prototyping |
| `quick-dev` | Quick Dev | repeatable | Quick development tasks |
| `game-architecture` | Architecture | one-shot | Technical architecture |

---

## Critical Rules

<critical>
1. ALWAYS read COMPLETE files - NEVER skip content
2. Execute ALL steps IN EXACT ORDER
3. SAVE after EVERY <template-output> tag
4. NEVER skip a step
5. Communicate in {communication_language}
6. NO TIME ESTIMATES - Never mention hours, days, weeks
7. After each checkpoint: WAIT for user response
</critical>

---

## CLI Commands

```bash
# Show project status
npx unreal-companion --status

# Workflow menu
npx unreal-companion workflow

# Start a specific workflow
npx unreal-companion workflow start game-brief

# Continue active workflow
npx unreal-companion workflow continue

# Sync from Web UI sessions
npx unreal-companion workflow sync

# List all workflows
npx unreal-companion workflow list
```

---

## Response Format (for Agents)

When executing a workflow step:

```markdown
## Step X of Y: [Step Title]

**Progress:** Step X of Y

[Step content/questions]

---
*Workflow: {workflow_id} | Session: {session_id}*
*Document: {output_path}*

[c] Continue | [a] Advanced | [p] Party-Mode | [y] YOLO
```

---

## State File Examples

### workflow-status.yaml

```yaml
version: "1.0"
updated_at: "2026-01-27T10:30:00"

active_sessions:
  - session_id: "abc123-def456"
    workflow_id: "game-brief"
    workflow_name: "Game Brief"
    status: "active"
    current_step: 3
    total_steps: 8
    started_at: "2026-01-27T10:00:00"
    output_path: "output/concept/game-brief.md"

completed_sessions:
  - session_id: "xyz789"
    workflow_id: "brainstorming"
    completed_at: "2026-01-26T15:00:00"
    output_path: "output/analysis/brainstorming-2026-01-26.md"

recent_documents:
  - type: "brainstorming"
    path: "output/analysis/brainstorming-2026-01-26.md"
    created_at: "2026-01-26T15:00:00"
```

### project-context.md

```markdown
# Project Context

## Game Overview
**Name:** [Game Name]
**Genre:** [Genre]
**Vision:** [One-line vision]

## Core Pillars
1. [Pillar 1]
2. [Pillar 2]
3. [Pillar 3]

## Documents
- Game Brief: output/concept/game-brief.md
- Brainstorming: output/analysis/brainstorming-2026-01-26.md

## Current Focus
[What the team is working on]

## Technical Stack
- Engine: Unreal Engine 5.x
- Platform: [Platforms]
```

---

_This file is automatically read by compatible AI agents._
_Last updated: 2026-01-27_
