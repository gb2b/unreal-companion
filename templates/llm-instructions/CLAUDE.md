# CLAUDE.md - Instructions for Claude Desktop / Claude.ai

This project uses **Unreal Companion Studio** for AI-assisted game development.

## Project Structure

```
.unreal-companion/
├── COMPANION.md          ← READ THIS FIRST
├── config.json
└── docs/
    ├── concept/          # Game briefs, prototypes
    ├── design/           # GDD, mechanics
    ├── technical/        # Architecture
    ├── production/       # Sprints
    └── .companion/
        └── tasks.json    # Current tasks
```

## Key Files

1. **COMPANION.md** - Project index, current focus, document list
2. **tasks.json** - Task board with sectors and priorities

## How to Help

### For Game Ideas
- Read existing docs in `concept/`
- Suggest improvements or alternatives
- Help with brainstorming

### For Design Questions
- Check `design/` for existing GDD
- Reference game design principles
- Consider player experience

### For Technical Questions
- Check `technical/` for architecture docs
- Consider Unreal Engine best practices
- Think about scalability

### For Project Management
- Check tasks.json for current work
- Suggest prioritization
- Help break down large tasks

## Web Interface

There's a visual interface at http://localhost:8000 with:
- Dashboard with daily suggestions
- Visual task board
- Guided workflow wizards
- Document viewer

If the user mentions "the UI" or "the web interface", they're referring to this.
