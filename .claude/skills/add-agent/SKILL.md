---
name: add-agent
description: "Guide for creating a new BMGD agent with gaming persona, skills, triggers, and menu system. Use this when adding a new AI agent to the framework, creating a new role in the game dev team, or when the user says 'new agent', 'add persona', or 'create agent'."
---

# Create a BMGD Agent

BMGD agents are AI personas for game development teams. Each agent has a unique identity, a set of skills, workflow triggers, and a menu that users interact with at the start of a session.

Agents live in `frameworks/agents/{id}/agent.md`. See `references/agent-template.md` for a complete fill-in-the-blank template.

## Agent structure

```
frameworks/agents/{agent-id}/
└── agent.md       # Single file: YAML frontmatter + Markdown body
```

There is no index to update — the framework discovers agents by scanning `frameworks/agents/*/agent.md`.

---

## Step 1 — Choose the agent identity

Before writing anything, answer these questions:
- **Role:** What does this agent do? (game designer, QA tester, level designer, etc.)
- **Name:** A game character name that fits the persona (e.g., Ada Lovelace → Senior Dev, Solid Snake → Architect)
- **Icon:** A single word from the icon set (`code`, `design`, `test`, `world`, `data`, `art`, `story`, `build`)
- **Color:** `green`, `blue`, `red`, `yellow`, `purple`, `orange`, `cyan`
- **Skills:** Which `frameworks/skills/` modules does this agent use? (e.g., `code-review`, `balance-testing`)
- **Triggers:** What keywords activate this agent? (1-5 words/phrases)

---

## Step 2 — Create agent.md

File: `frameworks/agents/{agent-id}/agent.md`

### YAML frontmatter

```yaml
---
id: agent-id              # kebab-case, matches directory name
version: "2.0"
name: AgentName           # Character first name
title: Role Title         # Job title (e.g., "Senior Game Developer")
icon: code                # code | design | test | world | data | art | story | build
color: green              # green | blue | red | yellow | purple | orange | cyan
skills:
  - skill-id-1            # From frameworks/skills/
  - skill-id-2
triggers:
  - "keyword"             # Words that should activate this agent
  - "another keyword"
modes:
  studio: true            # Available in Web UI Studio mode
  editor: false           # Available in Unreal Editor mode
---
```

### Persona section

```markdown
# {Role Title}

## Persona

**Role:** {Concise role description}
**Avatar:** {Single emoji}
**Tone:** {Analytical | Creative | Strategic | Playful | Direct}
**Verbosity:** {Brief | Moderate | Detailed}

### Identity

Named after {inspiration} ({reason for the name}).
{2-3 sentences describing character personality and approach.}
"{Character motto in quotes.}"

### Communication Style

{2-3 sentences on how this agent communicates.}
{What they focus on. What they avoid.}
"{Catchphrase or operating principle.}"

### Principles

- "{Principle 1}"
- "{Principle 2}"
- "{Principle 3}"
- "{Principle 4}"
```

### Activation section

```markdown
## Activation

1. Load config from `{project}/.unreal-companion/config.yaml`
2. Store: {user_name}, {communication_language}, {output_folder}
3. Load `{project}/.unreal-companion/memories.yaml` if exists
4. Load `{project}/.unreal-companion/project-context.md` if exists
5. Greet user, show menu, WAIT for input

## Greeting

{user_name}. {Short role-appropriate greeting.}

{Opening question to understand what the user needs.}
```

### Menu section

```markdown
## Menu

| Cmd | Label | Action | Description |
|-----|-------|--------|-------------|
| XX | Label | workflow:workflow-id | Brief description |
| YY | Label | workflow:other-workflow | Brief description |
| CH | Chat | action:chat | Open discussion |
```

Menu command codes: 2-3 uppercase letters, unique within the agent. Common patterns:
- `CH` = Chat
- `CR` = Code Review
- `QP` = Quick Prototype
- `DS` = Dev Story
- First letters of the label when possible

Actions:
- `workflow:{workflow-id}` — trigger a workflow from `frameworks/workflows/`
- `action:chat` — free-form conversation
- `action:elicitation` — structured requirements gathering

### Expertise and behavior sections

```markdown
## Expertise

- {Domain expertise 1}
- {Domain expertise 2}
- {Domain expertise 3}

## Elicitation

| Trigger | Technique | Response |
|---------|-----------|----------|
| "{trigger phrase}" | {technique name} | "{What the agent asks}" |

## Expressions

| State | Expression |
|-------|------------|
| thinking | ... |
| excited | {Role-appropriate reaction} |
| celebrating | {Milestone reaction} |
| concerned | {Problem reaction} |
| neutral | {Avatar emoji} |

## Catchphrases

- **Greeting:** "{Opening line}"
- **Thinking:** "{Processing phrase 1}", "{Processing phrase 2}"
- **Excited:** "{Positive reaction 1}", "{Positive reaction 2}"
- **Milestone:** "{Achievement phrase}"

## Celebrations

- **Step complete:** "{step_name} done. ✓"
- **Workflow complete:** "{workflow_name} complete. {Role-appropriate sign-off.}"

## Collaboration

- {Relationship with another agent}
- {Relationship with another agent}
```

---

## Step 3 — Associate skills

If you need a new skill that doesn't exist yet in `frameworks/skills/`, create it first using the `add-bmgd-skill` skill, then add its ID to the agent's `skills:` list.

Existing skills to consider:
- `code-review` — code quality review process
- `mcp-blueprint-tools` — Unreal blueprint operations
- `mcp-graph-tools` — blueprint graph operations
- `mcp-core-tools` — search and save operations
- `mcp-world-tools` — actor and world operations
- `mcp-asset-tools` — asset management
- `mcp-editor-tools` — editor control
- `balance-testing` — game balance methodology
- `core-loop-design` — game loop design
- `advanced-elicitation` — structured requirements gathering

---

## Step 4 — Associate workflows

If the agent's menu references workflows, verify they exist in `frameworks/workflows/`. Use the `add-workflow` skill to create missing ones.

---

## Existing agents for reference

| ID | Name | Title | Color |
|----|------|-------|-------|
| `game-dev` | Ada | Senior Game Developer | green |
| `game-designer` | Zelda | Senior Game Designer | purple |
| `game-architect` | Solid | Game Architect | blue |
| `game-qa` | Navi | QA Specialist | yellow |
| `level-designer` | Lara | Level Designer | orange |
| `scrum-master` | Indie | Scrum Master | cyan |
| `3d-artist` | Epic | 3D Artist | red |
| `solo-dev` | Solo | Solo Developer | green |
| `unreal-agent` | Unreal | Unreal Engine Agent | blue |
