---
name: sprint-planning
description: |
  Agile sprint planning adapted for game development teams.
  Use when organizing work into sprints, estimating capacity, or defining sprint goals.
---

# Sprint Planning

## When to Use

- Starting a new development sprint
- Estimating capacity and velocity
- Breaking features into sprint-sized tasks
- Defining what "done" looks like for the sprint

## Core Concepts

### Sprint Duration

| Team Size | Recommended Sprint |
|-----------|------------------|
| Solo dev | 1 week |
| 2–3 people | 1–2 weeks |
| 4–8 people | 2 weeks |
| 8+ people | 2–3 weeks |

Game jams are an extreme form: 48–72 hour sprint with a hard ship constraint.

### Velocity

Velocity = story points completed per sprint.

- Track for 3+ sprints before relying on it for planning
- Use yesterday's weather: plan based on last sprint's actual output
- Adjust for holidays, crunch risk, and team changes

### Capacity Planning

```
Capacity = (team_members × sprint_days × hours_per_day) × focus_factor

focus_factor ≈ 0.6–0.7 for game dev
(meetings, bug fixes, engine issues eat ~30–40% of time)
```

## Sprint Planning Process

### Step 1 — Review Backlog

Before the meeting:
- Product backlog is groomed and prioritized
- Top items have acceptance criteria
- Stories are estimated (or can be quickly estimated)

### Step 2 — Set Sprint Goal

One clear sentence: "By end of sprint, players can complete the tutorial level."

A good sprint goal:
- Aligns the team on what matters
- Provides a decision filter for scope changes
- Is achievable in the sprint duration

### Step 3 — Select Stories

Pull from the top of the backlog until capacity is filled:

1. Confirm story is understood by the whole team
2. Confirm acceptance criteria are clear
3. Break down into tasks if needed (aim for tasks under 1 day)
4. Add to sprint backlog

### Step 4 — Identify Risks

For game dev specifically:
- Engine/tool unknowns (always add buffer)
- Art dependency on code (or vice versa)
- External dependencies (middleware, platforms)
- Playtest feedback integration time

### Step 5 — Commit

The team commits to the sprint goal (not necessarily every story). Stories can be dropped if blocked; the goal should not be.

## Story Pointing for Game Dev

### Point Scale (Fibonacci)

| Points | Meaning |
|--------|---------|
| 1 | Trivial: change a value, fix a typo |
| 2 | Simple: well-understood task, <2h |
| 3 | Small: clear scope, half a day |
| 5 | Medium: some uncertainty, 1–2 days |
| 8 | Large: significant work or unknown, 2–3 days |
| 13 | Spike needed: too uncertain to commit |

### Game Dev Sizing Pitfalls

- **"It's just a blueprint"** — always costs more than expected
- **Visual polish** — infinitely expandable, always timebox
- **Physics/animation** — integration complexity is high
- **Multiplayer** — multiply everything by 3
- **Platform builds** — add a full day per new platform

## Sprint Backlog Format

```markdown
## Sprint Goal
[One sentence]

## Committed Stories
- [ ] STORY-001: [Title] — [Points]p
- [ ] STORY-002: [Title] — [Points]p

## Tasks
### STORY-001
- [ ] Task A (dev, 4h)
- [ ] Task B (art, 2h)

## Risks
- [Risk] → [Mitigation]

## Velocity
- Last sprint: [N] points
- Capacity this sprint: [N] points
- Committed: [N] points
```

## Common Issues

### Overcommitment
**Cause:** Optimistic estimates, no buffer for unknowns
**Fix:** Track velocity, use focus factor, say no to scope creep

### No Sprint Goal
**Cause:** Treating sprint as a task list
**Fix:** Write the goal first, then select stories that serve it

### Stories Too Large
**Cause:** Skipping breakdown
**Fix:** If a story takes more than 3 days, split it

### Mid-Sprint Scope Changes
**Cause:** Reactive management
**Fix:** Add to next sprint's backlog; protect the current sprint goal
