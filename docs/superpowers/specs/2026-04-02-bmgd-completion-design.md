# BMGD Completion — Design Spec

**Date:** 2026-04-02
**Scope:** Assign agents to 22 unassigned workflows + create 7 missing BMGD skills

---

## Objective

Complete the BMGD methodology so every workflow has a primary agent and every agent skill reference is valid. Currently 22/25 workflows lack agent assignments and 7 skills referenced by agents were removed because they didn't exist.

---

## Part 1 — Workflow Agent Assignments

### Current state

Only 3 workflows have agents assigned:
- `brainstorming` → game-designer
- `game-brief` → game-designer
- `gdd` → game-designer
- `game-architecture` → game-architect
- `narrative` → game-designer

### Proposed assignments

| Phase | Workflow | Proposed Agent | Rationale |
|-------|----------|---------------|-----------|
| **quick-flow** | get-started | (none) | Generic onboarding, no persona needed |
| **quick-flow** | quick-prototype | solo-dev | Rapid prototyping is Indie's specialty |
| **quick-flow** | quick-dev | game-dev | Implementation-focused = Ada |
| **1-preproduction** | quick-brainstorming | game-designer | Brainstorming = Zelda |
| **2-design** | art-direction | 3d-artist | Visual direction = Navi |
| **2-design** | audio-design | game-designer | No audio agent, Zelda covers design |
| **2-design** | level-design | level-designer | Level design = Lara |
| **2-design** | mvp-narrative | game-designer | Narrative = Zelda |
| **3-technical** | diagram | game-architect | Technical diagrams = Solid |
| **3-technical** | project-context | game-architect | Technical context = Solid |
| **4-production** | code-review | game-dev | Code review = Ada |
| **4-production** | create-story | scrum-master | User stories = Coach |
| **4-production** | dev-story | game-dev | Dev stories = Ada |
| **4-production** | retrospective | scrum-master | Agile ceremonies = Coach |
| **4-production** | sprint-planning | scrum-master | Sprint management = Coach |
| **4-production** | sprint-status | scrum-master | Sprint tracking = Coach |
| **tools** | gametest | game-qa | Testing = Tester |
| **tools** | mind-map | game-designer | Creative tool = Zelda |
| **tools** | mood-board | 3d-artist | Visual reference = Navi |
| **tools** | workflow-status | (none) | Utility, no persona needed |

### Implementation

For each workflow, edit `workflow.yaml` to add/update the `agents` field:

```yaml
agents:
  primary: game-designer
  alternatives: [solo-dev]
  party_mode: false
```

Workflows that stay without agent (get-started, workflow-status) are utility workflows where the agent uses the default configured persona or no persona.

---

## Part 2 — Missing BMGD Skills

### Skills to create

These 7 skills were removed from agent references because they didn't exist. Now we create them.

| Skill ID | For Agent(s) | Content |
|----------|-------------|---------|
| `player-psychology` | game-designer | Player motivation models (Bartle types, self-determination theory, flow state), engagement patterns, reward psychology |
| `sprint-planning` | scrum-master, solo-dev | Agile sprint planning for game dev — capacity estimation, story pointing, sprint goals, velocity tracking |
| `story-writing` | scrum-master, solo-dev | User story writing — format (As a... I want... So that...), acceptance criteria, story splitting, INVEST criteria |
| `mcp-material-tools` | 3d-artist | MCP tools for materials — material_create, material_set_param, material_create_instance. When to use each. |
| `mcp-level-tools` | level-designer | MCP tools for levels — level_create, level_load, level_list. When to use each. |
| `playtesting` | game-qa | Playtesting methodology — session planning, observation techniques, feedback collection, analysis frameworks |
| `regression-testing` | game-qa | Regression testing for games — test case management, automation, build validation, critical path testing |

### Skill structure

Each skill follows the BMGD skill format:

```
frameworks/skills/{skill-id}/
├── SKILL.md            # YAML frontmatter + content
└── references/         # Optional detailed docs
```

### After creation: re-add to agents

Once skills exist, re-add them to the agent frontmatter:
- `game-designer/agent.md` → add `player-psychology`
- `solo-dev/agent.md` → add `sprint-planning`, `story-writing`
- `3d-artist/agent.md` → add `mcp-material-tools`
- `level-designer/agent.md` → add `mcp-level-tools`
- `game-qa/agent.md` → add `playtesting`, `regression-testing`
- `scrum-master/agent.md` → add `sprint-planning`, `story-writing`

### Update manifest

Update `frameworks/manifest.yaml`:
- skills count: 12 → 19
- skills version bump

---

## Execution Order

1. Create the 7 missing skills in `frameworks/skills/`
2. Re-add skill references to agent files
3. Assign agents to 20 workflows (2 stay without agent)
4. Update `frameworks/manifest.yaml`
5. Verify: all agents reference only existing skills, all workflows with agents reference existing agents

## Files Changed

### Part 1 — Workflow assignments
| Action | File |
|--------|------|
| Modify | `frameworks/workflows/quick-flow/quick-prototype/workflow.yaml` |
| Modify | `frameworks/workflows/quick-flow/quick-dev/workflow.yaml` |
| Modify | `frameworks/workflows/1-preproduction/quick-brainstorming/workflow.yaml` |
| Modify | `frameworks/workflows/2-design/art-direction/workflow.yaml` |
| Modify | `frameworks/workflows/2-design/audio-design/workflow.yaml` |
| Modify | `frameworks/workflows/2-design/level-design/workflow.yaml` |
| Modify | `frameworks/workflows/2-design/mvp-narrative/workflow.yaml` |
| Modify | `frameworks/workflows/3-technical/diagram/workflow.yaml` |
| Modify | `frameworks/workflows/3-technical/project-context/workflow.yaml` |
| Modify | `frameworks/workflows/4-production/code-review/workflow.yaml` |
| Modify | `frameworks/workflows/4-production/create-story/workflow.yaml` |
| Modify | `frameworks/workflows/4-production/dev-story/workflow.yaml` |
| Modify | `frameworks/workflows/4-production/retrospective/workflow.yaml` |
| Modify | `frameworks/workflows/4-production/sprint-planning/workflow.yaml` |
| Modify | `frameworks/workflows/4-production/sprint-status/workflow.yaml` |
| Modify | `frameworks/workflows/tools/gametest/workflow.yaml` |
| Modify | `frameworks/workflows/tools/mind-map/workflow.yaml` |
| Modify | `frameworks/workflows/tools/mood-board/workflow.yaml` |

### Part 2 — Missing skills
| Action | File |
|--------|------|
| Create | `frameworks/skills/player-psychology/SKILL.md` |
| Create | `frameworks/skills/sprint-planning/SKILL.md` |
| Create | `frameworks/skills/story-writing/SKILL.md` |
| Create | `frameworks/skills/mcp-material-tools/SKILL.md` |
| Create | `frameworks/skills/mcp-level-tools/SKILL.md` |
| Create | `frameworks/skills/playtesting/SKILL.md` |
| Create | `frameworks/skills/regression-testing/SKILL.md` |
| Modify | `frameworks/agents/game-designer/agent.md` |
| Modify | `frameworks/agents/solo-dev/agent.md` |
| Modify | `frameworks/agents/3d-artist/agent.md` |
| Modify | `frameworks/agents/level-designer/agent.md` |
| Modify | `frameworks/agents/game-qa/agent.md` |
| Modify | `frameworks/agents/scrum-master/agent.md` |
| Modify | `frameworks/manifest.yaml` |
