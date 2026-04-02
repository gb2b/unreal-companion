---
name: story-writing
description: |
  User story writing methodology for game development.
  Use when creating player-facing features, defining acceptance criteria, or grooming the backlog.
---

# Story Writing

## When to Use

- Adding features to the backlog
- Translating game design into dev tasks
- Defining what "done" looks like for a feature
- Grooming the backlog before sprint planning

## The User Story Format

### Standard Format

```
As a [player/user/persona],
I want to [do something],
So that [I get some value].
```

### Game Dev Adaptations

Game dev often has multiple "users":
- **Player** — end user experiencing the game
- **Designer** — needs tools and data
- **Developer** — needs technical context
- **QA** — needs testable criteria

**Example:**
```
As a player,
I want to save my progress at any point in the level,
So that I don't lose progress if I have to stop playing.
```

## INVEST Criteria

Good stories are:

| Letter | Meaning | Check |
|--------|---------|-------|
| **I** | Independent | Can be built without another story? |
| **N** | Negotiable | Scope can be adjusted during planning? |
| **V** | Valuable | Delivers something meaningful to the player? |
| **E** | Estimable | Team can estimate it confidently? |
| **S** | Small | Fits in one sprint? |
| **T** | Testable | Has clear pass/fail criteria? |

If a story fails multiple checks, it needs refinement before entering the sprint.

## Acceptance Criteria

### Given/When/Then Format

```
Given [initial context],
When [action occurs],
Then [expected result].
```

**Example:**
```
Given the player has unsaved progress,
When the player opens the pause menu,
Then a "Save Game" option is visible and enabled.

Given the player selects "Save Game",
When the save completes,
Then a confirmation message appears for 2 seconds.

Given the save is complete,
When the player restarts the game,
Then progress is restored to the save point.
```

### Checklist Format (simpler)

For straightforward stories, a checklist works:

```
Acceptance criteria:
- [ ] Player can access save from pause menu
- [ ] Save confirmation message appears after save
- [ ] Save data persists across game restarts
- [ ] Save works in all levels (not just hub)
- [ ] Save does not block gameplay (async)
```

## Story Splitting Techniques

When a story is too large:

### By Workflow Step
Split at natural user workflow steps.
"Complete checkout" → "Enter shipping info" + "Enter payment" + "Confirm order"

### By CRUD Operation
Split by create / read / update / delete.
"Manage inventory" → "View inventory" + "Add item" + "Remove item"

### By Happy/Sad Path
Split normal flow from error handling.
"Save game" → "Save game (success)" + "Handle save failure"

### By Platform
"Support game controllers" → "Xbox controller" + "PS5 controller" + "Switch Pro controller"

### By Performance
"Load level" → "Load level (functional)" + "Load level under 5 seconds"

## Story Types in Game Dev

### Feature Stories
Core gameplay additions. Standard format applies.

### Technical Stories (Tech Debt / Infrastructure)
No "player value" but needed for dev health:
```
As the development team,
We need to [technical task],
So that [technical benefit].
```

### Spike Stories
Research tasks with unknown scope:
```
Spike: Investigate [topic]
Goal: Answer [specific question]
Timebox: [N hours/days]
Output: Decision or implementation approach documented
```

### Bug Stories
Use a defect format, not user story:
```
Bug: [Short title]
Steps to reproduce: [numbered steps]
Expected: [what should happen]
Actual: [what happens]
Severity: Critical / High / Medium / Low
```

## Story Template

```markdown
## [STORY-ID] [Title]

**As a** [persona],
**I want to** [action],
**So that** [value].

### Acceptance Criteria
- Given [...], When [...], Then [...].
- Given [...], When [...], Then [...].

### Notes
- [Any design constraints, edge cases, or open questions]

### Dependencies
- Blocked by: [STORY-ID] (if any)
- Blocks: [STORY-ID] (if any)

### Estimate
[Points]
```

## Common Mistakes

### Describing Solutions, Not Problems
Bad: "As a player, I want a button on screen to save"
Good: "As a player, I want to save my progress easily"

### Missing the "So That"
Without "so that", stories lack justification and get gold-plated.

### Acceptance Criteria as Implementation Specs
AC should describe behavior, not how it's built.
Bad: "Save function calls SaveGameToSlot()"
Good: "Player can resume from saved position after restarting"

### No Estimation
Unestimateable stories signal missing context. Do a spike first.
