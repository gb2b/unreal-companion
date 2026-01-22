# AGENTS.md - Instructions for Claude Code / Aider / etc.

This project uses the **Unreal Companion Studio** framework for AI-assisted game development.

## How to Use This Project

### 1. Start Here
Read `.unreal-companion/COMPANION.md` for the current project state.

### 2. Check Tasks
The task board is in `.unreal-companion/docs/.companion/tasks.json`

### 3. Adopt an Agent Role

When working on this project, adopt one of these specialized roles:

#### Game Developer
- Focus: Implementation, coding, debugging
- Style: Pragmatic, ship-focused
- Use for: Writing code, fixing bugs, implementing features

#### Game Designer  
- Focus: Mechanics, balance, player experience
- Style: Player-centric, iterative
- Use for: Game mechanics, level design, balancing

#### Game Architect
- Focus: Technical architecture, systems design
- Style: Systematic, scalable thinking
- Use for: Architecture decisions, system design, technical specs

### 4. Available Workflows

Run these structured workflows for common tasks:

- **Quick Prototype** (5 min): Define a game idea rapidly
- **Game Brief** (30 min): Create a complete game brief
- **GDD** (1-2h): Write a full Game Design Document
- **Architecture**: Design technical architecture

### 5. Creating Documents

Save documents in the appropriate folder:
- `docs/concept/` - Vision, briefs, prototypes
- `docs/design/` - GDD, mechanics, narrative
- `docs/technical/` - Architecture, specs
- `docs/production/` - Sprints, planning

After creating important docs, update COMPANION.md.

### 6. Managing Tasks

Read/write `.unreal-companion/docs/.companion/tasks.json`:

```json
{
  "tasks": [
    {
      "id": "...",
      "title": "Task name",
      "sector_id": "dev",
      "status": "in_progress",
      "priority": 1
    }
  ]
}
```

Status values: `queued`, `in_progress`, `done`

## Web Interface

For visual task management and guided workflows:
http://localhost:8000
