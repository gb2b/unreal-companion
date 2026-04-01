---
name: add-bmgd-skill
description: Create a new BMGD skill for the frameworks — a reusable expertise module that agents can use during workflows. Use this whenever creating game development skills like balance-testing, progression-design, or any domain-specific expertise that agents need.
---

# Create a BMGD Skill

BMGD skills are reusable expertise modules that live in `frameworks/skills/` and get deployed to users alongside agents and workflows. They're different from Claude Code dev skills (`.claude/skills/`) — BMGD skills are product features used by game dev agents.

## Skill structure

```
frameworks/skills/{skill-id}/
├── SKILL.md            # Main skill file with YAML frontmatter
├── references/         # Supporting docs, examples, data
│   └── ...
└── scripts/            # Optional automation scripts
```

## Step-by-step

### 1. Create SKILL.md

```markdown
---
name: my-skill-name
description: Clear description of what expertise this skill provides
---

# {Skill Name}

## When to use

Describe the situations where an agent should activate this skill.

## Methodology

The core knowledge/process this skill provides. This is the main content —
make it actionable and specific to game development.

## Tools

If this skill uses MCP tools, list them:
- `tool_name` — what it's used for in this context

## Examples

Concrete examples showing the skill in action.

## References

Point to files in references/ for detailed documentation:
- See `references/detailed-guide.md` for the complete methodology
```

### 2. Associate with agents

Edit the relevant agent(s) in `frameworks/agents/{id}/agent.md` to include this skill:

```yaml
---
skills: [existing-skill, my-skill-name]
---
```

### 3. Add references (optional)

Add detailed documentation, data tables, or examples to `references/`:
- Keep SKILL.md under 500 lines for fast loading
- Put deep-dive content in references/ for on-demand reading

### 4. Verify availability

After creating the skill:
- Check it appears in the CLI: `npx unreal-companion --status`
- Check it loads in web-ui workflows
- Verify the unified_loader.py can find it
- Update `frameworks/manifest.yaml` with new version

## BMGD skill vs Claude Code dev skill

| | BMGD Skill | Dev Skill |
|---|---|---|
| Location | `frameworks/skills/` | `.claude/skills/` |
| Audience | End users (game developers) | Project contributors |
| Used by | BMGD agents during workflows | Claude Code during dev |
| Deployed to | `~/.unreal-companion/skills/` | Stays in repo |
| Content | Game dev expertise | Dev processes & checklists |

## Checklist

- [ ] SKILL.md with valid YAML frontmatter (name, description)
- [ ] Clear "When to use" section
- [ ] Actionable methodology content
- [ ] Associated with at least one agent
- [ ] References/ for detailed content (if SKILL.md > 300 lines)
- [ ] Manifest updated
