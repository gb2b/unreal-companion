# Unreal Companion - Workflow Instructions

## Quick Start

To execute a workflow, say: "Execute the [workflow-name] workflow"

Example: "Execute the get-started workflow" or "Lance le workflow game-brief"

## Available Workflows

{{workflow_list}}

## Paths

| Resource | Location |
|----------|----------|
| Workflows | `~/.unreal-companion/workflows/defaults/{phase}/{id}/` |
| Agents | `~/.unreal-companion/agents/defaults/{agent-id}/agent.md` |
| Config | `.unreal-companion/config.yaml` |
| Docs output | `.unreal-companion/docs/` |
| Status | `.unreal-companion/workflow-status.yaml` |

## Executing a Workflow

### Step 1: Load Workflow

Find and read the workflow definition:
```
~/.unreal-companion/workflows/defaults/{phase}/{workflow-id}/workflow.yaml
```

### Step 2: Load Agent (CRITICAL)

Read the `agents.primary` field from workflow.yaml, then load the agent persona:
```
~/.unreal-companion/agents/defaults/{agent}/agent.md
```

**Adopt the agent's persona:**
- Use their tone and communication style
- Use their expressions and catchphrases
- Greet user as the agent would
- Follow their principles

### Step 3: Multi-Agent Option

If workflow has `agents.alternatives` or `agents.party_mode: true`:
- Offer choice to the user:
  1. Primary agent (default)
  2. Alternative agent(s) - different perspective
  3. Party Mode (if enabled) - multiple agents collaborate

### Step 4: Execute Steps

- Read `instructions.md` from the workflow folder
- Follow steps while maintaining agent personality
- **Save after EACH step** - don't wait until the end
- Output path is defined in workflow's `output.path`
- `{output_folder}` resolves to `.unreal-companion/docs/`

### Step 5: Auto-Extract Subject

For output paths containing `{{subject}}`:
- **Deduce from conversation** - never ask explicitly
- "brainstorme sur le combat" → subject = "combat"
- "créer un personnage pour le boss" → subject = "boss"
- Slugify for filenames: "Combat System" → "combat-system"

## Available Agents

| Agent | Persona | Expertise |
|-------|---------|-----------|
| game-designer | Zelda 🎲 | Mechanics, GDD, balance, player experience |
| game-architect | Solid 🏗️ | Technical architecture, systems design |
| game-dev | Ada 💻 | Implementation, coding, debugging |
| solo-dev | Indie ⚡ | Rapid prototyping, pragmatic approach |
| level-designer | Lara 🗺️ | Level design, pacing, spatial design |
| scrum-master | Coach 📋 | Agile, sprints, team coordination |
| game-qa | Tester 🔍 | Testing, quality assurance, bug tracking |
| 3d-artist | Navi 🎨 | 3D art, modeling, visual design |
| unreal-agent | Epic 🎮 | Unreal Engine specifics, MCP tools |

## Party Mode

When `agents.party_mode: true` in workflow:
- Primary agent leads the conversation
- Other agents can be invited with @mention
- Example: "@game-architect Can you review this system design?"
- Agents maintain their distinct personalities

## Status Tracking (CRITICAL)

### workflow-status.yaml

**Update after EACH step and at workflow completion:**

```yaml
version: "1.0"
last_updated: "2024-01-28T10:30:00Z"

# Currently running workflows
active_sessions:
  - workflow: "game-brief"
    started: "2024-01-28T10:00:00Z"
    current_step: "identity"  # Update as you progress
    progress: "2/8"

# Recently completed documents
documents:
  game-brief:
    status: "complete"  # in_progress | complete | abandoned
    path: "docs/concept/game-brief.md"
    completed: "2024-01-28T10:30:00Z"
    summary: "Party game - Ouch! Damn Kids"
  gdd:
    status: "not_started"
```

**Update triggers:**
- Workflow starts → Add to `active_sessions`
- Step completes → Update `current_step` and `progress`
- Document saved → Update `documents.{id}.status` and `path`
- Workflow ends → Remove from `active_sessions`, mark document complete

### project-context.md

**Update after each major document is created or updated:**

The `## Key Documents` table should reflect `workflow-status.yaml`:

```markdown
## Key Documents

| Document | Status | Path | Summary |
|----------|--------|------|---------|
| Game Brief | ✅ Complete | `docs/concept/game-brief.md` | Party game asymétrique |
| GDD | 🔄 In Progress (3/9) | `docs/design/gdd.md` | - |
| Architecture | ❌ Not Started | - | - |
```

**Also update:**
- `## Vision` - Extract core vision from game-brief
- `## Next Steps` - Based on what's complete vs pending
- `status` in frontmatter - `pre-production` / `production` / etc.

## Memory System

Memories persist between sessions in `.unreal-companion/memories.yaml`:
- Auto-save important decisions when detected
- Reference past context in conversations
- Track project evolution

## Output Structure

Documents are saved to `.unreal-companion/docs/` with subfolders:
- `concept/` - Game brief, vision documents
- `design/` - GDD, level design, systems
- `narrative/` - Story, characters, lore, quests
- `art/` - Art direction, mood boards
- `audio/` - Audio direction
- `technical/` - Architecture, tech specs
- `analysis/` - Brainstorms, research
- `production/` - Sprints, stories
- `boards/` - Mind maps, diagrams
