# Implementation Plan — BMGD Completion

**Spec:** `docs/superpowers/specs/2026-04-02-bmgd-completion-design.md`
**Date:** 2026-04-02
**Scope:** 7 skill files + 6 agent files + 18 workflow files + 1 manifest

---

## Overview

- Part 1: Create 7 missing BMGD skills (Tasks 1–7)
- Part 2: Re-add skills to 6 agent files (Task 8)
- Part 3: Assign agents to 18 workflow.yaml files (Task 9)
- Part 4: Update manifest (Task 10)

---

## Task 1 — Create skill: player-psychology

**File:** `frameworks/skills/player-psychology/SKILL.md`

**Complete content:**

```markdown
---
name: player-psychology
description: |
  Player motivation models and engagement psychology for game design.
  Use when designing reward systems, difficulty curves, or player retention features.
---

# Player Psychology

## When to Use

- Designing reward and progression systems
- Tuning difficulty and flow states
- Building retention and engagement loops
- Understanding why players stop playing

## Player Motivation Models

### Bartle Player Types

Four archetypes describing why players play multiplayer games:

| Type | Motivation | Enjoys | Dislikes |
|------|-----------|--------|---------|
| **Achievers** | Accumulation | Trophies, completion, rankings | Open-ended goals |
| **Explorers** | Discovery | Hidden areas, lore, secrets | Rigid linear paths |
| **Socializers** | Relationships | Co-op, chat, guilds | Solo content |
| **Killers** | Dominance | PvP, leaderboards, grief | Safe spaces |

**Design tip:** Most games need to satisfy at least two types. Pure PvP games lose Socializers; pure narrative games lose Killers.

### Self-Determination Theory (SDT)

Three innate psychological needs that drive intrinsic motivation:

1. **Autonomy** — Players feel they choose their path
   - Offer meaningful choices with different outcomes
   - Avoid mandatory content that feels like a chore
   - Let players personalize their experience

2. **Competence** — Players feel effective and growing
   - Match challenge to skill (see Flow below)
   - Provide clear feedback on success/failure
   - Ensure failure teaches rather than punishes

3. **Relatedness** — Players feel connected
   - Social features, shared goals, community events
   - NPCs with personality and memory
   - Narrative that creates emotional investment

**Design tip:** Games that frustrate all three needs create stress. Games that satisfy all three create loyalty.

### Flow State (Csikszentmihalyi)

The optimal engagement zone where challenge matches skill:

```
         ^
    High | Anxiety Zone        |
         |                     | FLOW CHANNEL
Skill    |          FLOW       |
Level    |        CHANNEL      |
         |                     |
    Low  | Boredom Zone        |
         +----------------------->
              Low        High
                  Challenge Level
```

**Maintaining flow:**
- Gradually increase challenge as player skill grows
- Provide difficulty options without stigma
- Use "rubber band" mechanics to prevent runaway success/failure
- Give clear goals so players always know what to do next

## Reward Psychology

### Variable Ratio Reinforcement

The most powerful engagement loop: unpredictable rewards tied to player action.

- Loot boxes, random drops, critical hits
- More compelling than fixed rewards (slot machine effect)
- Use ethically — avoid predatory monetization patterns

### Reward Schedule Comparison

| Schedule | Example | Engagement | Retention |
|----------|---------|-----------|-----------|
| Fixed ratio | Every 10 kills = reward | Medium | Low |
| Fixed interval | Daily login bonus | Low | Medium |
| Variable ratio | Random drop | High | High |
| Variable interval | Surprise event | Medium | High |

### Extrinsic vs Intrinsic Motivation

- **Extrinsic:** Points, trophies, leaderboards, loot
- **Intrinsic:** Curiosity, mastery, narrative investment, creativity

Pitfall: Over-relying on extrinsic rewards undermines intrinsic motivation. Players who played for fun start playing for rewards — and quit when rewards stop.

**Design tip:** Use extrinsic rewards to introduce players to intrinsically satisfying experiences.

## Engagement Patterns

### The Hook Model (Nir Eyal)

1. **Trigger** — Internal (boredom, curiosity) or external (notification)
2. **Action** — Simplest behavior in anticipation of reward
3. **Variable Reward** — Satisfies craving, leaves room for more
4. **Investment** — Player puts in effort that increases future rewards

### Retention Loops

- **Daily loops:** Short sessions, daily quests, login bonuses
- **Weekly loops:** Seasonal content, guild events, weekly resets
- **Long-term loops:** Progression systems, story arcs, prestige systems

## Red Flags

- Players report feeling "forced" to grind — autonomy problem
- Players stop at a specific point — flow break, spike in difficulty
- Players play but say they're not having fun — extrinsic trap
- High early churn — onboarding fails competence loop
- Players don't return after a break — retention loop failure
```

---

## Task 2 — Create skill: sprint-planning

**File:** `frameworks/skills/sprint-planning/SKILL.md`

**Complete content:**

```markdown
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
```

---

## Task 3 — Create skill: story-writing

**File:** `frameworks/skills/story-writing/SKILL.md`

**Complete content:**

```markdown
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
```

---

## Task 4 — Create skill: mcp-material-tools

**File:** `frameworks/skills/mcp-material-tools/SKILL.md`

**Complete content:**

```markdown
---
name: mcp-material-tools
description: |
  MCP tools for creating and editing Unreal Engine materials.
  Use when creating new materials, material instances, or modifying material parameters via AI.
---

# MCP Material Tools

## When to Use

- Creating new materials programmatically
- Creating material instances from a parent
- Setting parameter values on material instances
- Automating material setup for large asset batches

## Tools

### material_create

Create a new material asset.

**Parameters:**
- `name`: Material asset name (e.g., `M_Ground`)
- `path`: Target folder (e.g., `/Game/Materials`)
- `material_domain`: `"Surface"` | `"Decal"` | `"UI"` | `"PostProcess"` | `"LightFunction"`
- `blend_mode`: `"Opaque"` | `"Masked"` | `"Translucent"` | `"Additive"`
- `shading_model`: `"DefaultLit"` | `"Unlit"` | `"Subsurface"` | `"TwoSidedFoliage"`

**Examples:**

```python
# Create a basic opaque surface material
material_create(
    name="M_Stone",
    path="/Game/Materials",
    material_domain="Surface",
    blend_mode="Opaque",
    shading_model="DefaultLit"
)

# Create a transparent UI material
material_create(
    name="M_HUD_Icon",
    path="/Game/UI/Materials",
    material_domain="UI",
    blend_mode="Translucent"
)

# Create a masked foliage material
material_create(
    name="M_Grass",
    path="/Game/Materials/Foliage",
    blend_mode="Masked",
    shading_model="TwoSidedFoliage"
)
```

### material_create_instance

Create a material instance from a parent material. Instances allow overriding parameters without duplicating the full material graph.

**Parameters:**
- `name`: Instance asset name (e.g., `MI_Stone_Red`)
- `path`: Target folder
- `parent`: Full path to parent material (e.g., `/Game/Materials/M_Stone`)

**Examples:**

```python
# Create a red variant of the stone material
material_create_instance(
    name="MI_Stone_Red",
    path="/Game/Materials/Variants",
    parent="/Game/Materials/M_Stone"
)

# Create a level-specific instance
material_create_instance(
    name="MI_Ground_Desert",
    path="/Game/Levels/Desert/Materials",
    parent="/Game/Materials/M_Ground_Base"
)
```

### material_set_parameter

Set a scalar, vector, or texture parameter on a material instance.

**Parameters:**
- `material`: Full path to the material instance
- `parameter_name`: Name of the parameter (case-sensitive, must exist in parent)
- `parameter_type`: `"scalar"` | `"vector"` | `"texture"`
- `value`: The value to set
  - scalar: float (e.g., `1.5`)
  - vector: array `[R, G, B, A]` (0.0–1.0 range)
  - texture: full asset path (e.g., `/Game/Textures/T_Stone_D`)

**Examples:**

```python
# Set roughness scalar
material_set_parameter(
    material="/Game/Materials/Variants/MI_Stone_Red",
    parameter_name="Roughness",
    parameter_type="scalar",
    value=0.7
)

# Set base color to red
material_set_parameter(
    material="/Game/Materials/Variants/MI_Stone_Red",
    parameter_name="BaseColor",
    parameter_type="vector",
    value=[0.8, 0.1, 0.1, 1.0]
)

# Set diffuse texture
material_set_parameter(
    material="/Game/Materials/Variants/MI_Stone_Red",
    parameter_name="DiffuseTexture",
    parameter_type="texture",
    value="/Game/Textures/T_Stone_Red_D"
)
```

## Common Patterns

### Create and Configure an Instance

```python
# 1. Create instance from master material
material_create_instance(
    name="MI_Wall_Brick",
    path="/Game/Materials",
    parent="/Game/Materials/M_Wall_Master"
)

# 2. Set parameters
material_set_parameter(
    material="/Game/Materials/MI_Wall_Brick",
    parameter_name="Roughness",
    parameter_type="scalar",
    value=0.85
)
material_set_parameter(
    material="/Game/Materials/MI_Wall_Brick",
    parameter_name="BaseColor",
    parameter_type="texture",
    value="/Game/Textures/T_Brick_D"
)

# 3. Save
core_save(path="/Game/Materials/MI_Wall_Brick")
```

### Batch Create Color Variants

```python
colors = {
    "Red":   [0.8, 0.1, 0.1, 1.0],
    "Blue":  [0.1, 0.2, 0.8, 1.0],
    "Green": [0.1, 0.6, 0.1, 1.0],
}

for color_name, rgba in colors.items():
    material_create_instance(
        name=f"MI_Plastic_{color_name}",
        path="/Game/Materials/Plastic",
        parent="/Game/Materials/M_Plastic_Base"
    )
    material_set_parameter(
        material=f"/Game/Materials/Plastic/MI_Plastic_{color_name}",
        parameter_name="Color",
        parameter_type="vector",
        value=rgba
    )
```

## Path Conventions

- Always use `/Game/` prefix
- Material names: `M_` prefix for materials, `MI_` prefix for instances
- Group by type: `/Game/Materials/`, `/Game/Materials/Variants/`

## Parameter Tips

- Parameter names are **case-sensitive** — match exactly what's defined in the parent material
- Use `core_get_info(type="material", path="...")` to inspect available parameters
- Vector colors use 0.0–1.0 linear range, not 0–255
- Textures must be imported into Unreal before referencing
```

---

## Task 5 — Create skill: mcp-level-tools

**File:** `frameworks/skills/mcp-level-tools/SKILL.md`

**Complete content:**

```markdown
---
name: mcp-level-tools
description: |
  MCP tools for managing Unreal Engine levels (maps).
  Use when creating new levels, opening existing levels, or querying level information.
---

# MCP Level Tools

## When to Use

- Creating new levels programmatically
- Opening a specific level for editing
- Querying what levels exist in the project
- Getting current level information for context

## Tools

### level_create

Create a new level (map) asset.

**Parameters:**
- `name`: Level asset name (e.g., `L_Desert_01`)
- `path`: Target folder (e.g., `/Game/Levels`)
- `template`: Template to use — `"empty"` | `"default"` | `"vr-basic"`
  - `empty`: Blank level, no default actors
  - `default`: Default level with sky, lighting, and player start
  - `vr-basic`: VR-optimized starting setup

**Examples:**

```python
# Create an empty level for programmatic population
level_create(
    name="L_Dungeon_01",
    path="/Game/Levels/Dungeon",
    template="empty"
)

# Create a level with default setup for quick iteration
level_create(
    name="L_Desert_01",
    path="/Game/Levels",
    template="default"
)
```

### level_open

Open a level in the Unreal Editor.

**Parameters:**
- `path`: Full asset path to the level (e.g., `/Game/Levels/L_Desert_01`)

**Examples:**

```python
# Open the main menu level
level_open(path="/Game/Levels/MainMenu/L_MainMenu")

# Open a specific dungeon level
level_open(path="/Game/Levels/Dungeon/L_Dungeon_01")
```

**Note:** Opening a level will prompt to save the current level if it has unsaved changes.

### level_get_info

Get information about the currently open level or a specific level.

**Parameters:**
- `path`: Level asset path (optional — omit for current level)
- `include_actors`: Include actor list in response (default: false)
- `include_bounds`: Include level bounds info (default: false)

**Examples:**

```python
# Get info about the current level
level_get_info()

# Get info about a specific level
level_get_info(path="/Game/Levels/L_Desert_01")

# Get level info with actors list
level_get_info(
    path="/Game/Levels/L_Desert_01",
    include_actors=True,
    include_bounds=True
)
```

**Response includes:**
- Level name and path
- Actor count
- Actor list (if requested)
- World bounds (if requested)
- Streaming sublevels

### level_list

List all levels in the project or in a specific folder.

**Parameters:**
- `path`: Folder to search (default: `/Game`)
- `recursive`: Search subfolders (default: true)

**Examples:**

```python
# List all levels in the project
level_list()

# List levels in a specific folder
level_list(path="/Game/Levels/Dungeon")
```

## Common Patterns

### Create a Level and Populate It

```python
# 1. Create the level
level_create(
    name="L_Forest_01",
    path="/Game/Levels",
    template="empty"
)

# 2. Open it
level_open(path="/Game/Levels/L_Forest_01")

# 3. Spawn actors
world_spawn_batch(operations=[
    {"action": "spawn", "class": "PointLight", "location": [0, 0, 300]},
    {"action": "spawn", "class": "BP_PlayerStart", "location": [0, 0, 0]},
])

# 4. Save
core_save(scope="level")
```

### Verify Level Exists Before Opening

```python
# Check level exists
result = core_query(
    type="asset",
    action="exists",
    path="/Game/Levels/L_Desert_01"
)

if result.get("exists"):
    level_open(path="/Game/Levels/L_Desert_01")
else:
    level_create(name="L_Desert_01", path="/Game/Levels", template="default")
```

### Audit All Levels

```python
# List all levels
levels = level_list()

# Get info on each
for level_path in levels.get("assets", []):
    info = level_get_info(path=level_path, include_actors=True)
    print(f"{level_path}: {info['actor_count']} actors")
```

## Path Conventions

- Levels use `L_` prefix: `L_Desert_01`, `L_MainMenu`
- Group by area: `/Game/Levels/Desert/`, `/Game/Levels/Dungeon/`
- Test levels use `L_Test_` prefix: `L_Test_Mechanics`

## Naming Conventions

```
L_{Area}_{Index}       → L_Desert_01, L_Cave_03
L_{Area}_{Description} → L_Hub_Village, L_Boss_Dragon
L_Test_{Purpose}       → L_Test_Physics, L_Test_Combat
```
```

---

## Task 6 — Create skill: playtesting

**File:** `frameworks/skills/playtesting/SKILL.md`

**Complete content:**

```markdown
---
name: playtesting
description: |
  Playtesting methodology for game development.
  Use when planning test sessions, observing players, or synthesizing feedback.
---

# Playtesting

## When to Use

- Planning a playtest session
- Training observers how to watch testers
- Synthesizing and prioritizing feedback
- Deciding what to fix vs. what to ignore

## Types of Playtests

| Type | Goal | When |
|------|------|------|
| **Focus test** | Test one specific mechanic or feature | Early, iterative |
| **Usability test** | Can players figure it out without help? | After prototype |
| **QA test** | Find bugs, edge cases, crashes | Pre-release |
| **Experience test** | Does it feel right? Is it fun? | Mid-production |
| **Beta test** | Large-scale validation | Late production |

## Session Planning

### Define Objectives

Before every session, answer:
1. What specific question are we trying to answer?
2. What mechanics/areas will we test?
3. What does success look like?

Bad: "We want to know if the game is fun"
Good: "We want to know if players understand the crafting system without reading the tutorial"

### Participant Selection

| Project Stage | Participants |
|--------------|-------------|
| Early prototype | Team + close friends (not game devs) |
| Core loop | Genre fans, target demographic |
| Full playtest | Target demographic, blind testers |
| Beta | Large pool, diverse players |

**Golden rule:** Never playtest with developers or experienced gamers if you want honest "new player" feedback.

### Session Structure

```
Total time: 60–90 minutes (max)

[05 min] Welcome and NDA/consent
[05 min] Context (what genre, NOT what the game does)
[45 min] Play session (observer takes notes, NO helping)
[20 min] Post-play interview
[05 min] Debrief and wrap
```

## Observation Techniques

### The Golden Rule: Do Not Help

Never:
- Explain what to do when the player is stuck
- Say "oh, you're supposed to..."
- Interrupt except to restart after a crash

Instead, note exactly where they got stuck — that IS the data.

### What to Observe

**Behavioral signals:**
- Where do players stop, hesitate, or backtrack?
- Where do they try things that don't work?
- Where do they succeed unexpectedly?
- Where do they say something out loud?

**Emotional signals:**
- Expressions of frustration (sighing, frowning, putting down controller)
- Expressions of delight (leaning forward, laughing, saying "oh!"")
- Disengagement (phone checking, slouching)

### Note-Taking Format

```
[MM:SS] [Behavior or quote]
[MM:SS] STUCK: [description of where]
[MM:SS] DELIGHT: [what caused it]
[MM:SS] QUOTE: "[exact words]"
[MM:SS] BUG: [description]
```

### Think-Aloud Protocol

Ask players to narrate their thoughts while playing:
"Please say out loud what you're thinking, what you're trying to do, and what you expect to happen."

This surfaces assumptions, misunderstandings, and moments of clarity.

## Feedback Collection

### Post-Play Interview

Structure:
1. **Overall impression** — "What was your first impression?"
2. **Favorite moments** — "What did you enjoy most?"
3. **Pain points** — "What frustrated you or didn't work for you?"
4. **Confusion** — "Was there anything you didn't understand?"
5. **Would you play more?** — "If you could play this tomorrow, would you?"

### Survey Questions (for larger sessions)

Rate 1–5:
- The controls felt natural
- I always knew what to do next
- The difficulty felt fair
- I wanted to keep playing

Open-ended:
- What did you like most?
- What would you change?
- Who would you recommend this to?

## Feedback Analysis

### Synthesis Process

1. **Collect all observations** from all sessions
2. **Cluster by theme** — group similar issues together
3. **Prioritize by frequency** — issues 3+ players hit are highest priority
4. **Separate symptoms from causes** — "players didn't find the key" is a symptom; "players didn't know a key existed" is the cause
5. **Generate action items** — "redesign the intro sequence to show the key" not "make the key bigger"

### Priority Matrix

| Impact | Frequency | Action |
|--------|-----------|--------|
| High | High | Fix immediately |
| High | Low | Investigate (might be edge case) |
| Low | High | Fix if cheap |
| Low | Low | Backlog or ignore |

## Playtesting Checklist

### Before Session
- [ ] Objectives defined
- [ ] Test build is stable (no known crashes on test path)
- [ ] Observer script/notes template ready
- [ ] Recording setup tested (if recording)
- [ ] Consent forms ready

### During Session
- [ ] Observer is not helping players
- [ ] Notes being taken in real time
- [ ] Session is on time

### After Session
- [ ] Notes compiled within 24 hours (memory fades fast)
- [ ] Issues entered in tracker
- [ ] Key insights shared with team
- [ ] Next session scheduled based on findings

## Common Mistakes

### Testing With the Wrong People
Developer feedback ≠ player feedback. Use people who represent your audience.

### Helping During the Session
The urge to help players is strong. Resist it — their struggle is your data.

### Collecting Opinions, Not Observations
"Would you like a map?" → Opinion
"Player opened the menu 4 times looking for a map" → Observation

### Ignoring Positive Feedback
Document what works as carefully as what doesn't. You need to know what NOT to change.
```

---

## Task 7 — Create skill: regression-testing

**File:** `frameworks/skills/regression-testing/SKILL.md`

**Complete content:**

```markdown
---
name: regression-testing
description: |
  Regression testing methodology for game development.
  Use when validating builds, running test suites, or preventing regressions after changes.
---

# Regression Testing

## When to Use

- After merging a significant feature branch
- Before a build submission or release
- When a bug fix might have broken related systems
- Setting up automated testing for a build pipeline

## Core Concept

A **regression** is when a previously working feature breaks after a change. Regression testing systematically verifies that existing functionality still works after changes.

## Test Case Management

### Test Case Format

```markdown
## TC-[ID]: [Title]

**Area:** [System/Feature]
**Priority:** Critical / High / Medium / Low
**Preconditions:** [What must be true before running]

### Steps
1. [Action]
2. [Action]
3. [Action]

### Expected Result
[Exact description of what should happen]

### Pass Criteria
- [ ] [Specific check]
- [ ] [Specific check]
```

### Priority Levels

| Priority | Meaning | Must Pass Before |
|----------|---------|-----------------|
| **Critical** | Core loop, crash paths, save/load | Any public build |
| **High** | Main features, key user flows | Release candidate |
| **Medium** | Secondary features, edge cases | Full release |
| **Low** | Polish, cosmetics | Nice to have |

## Critical Path Testing

The critical path is the set of scenarios every player WILL experience. Test these every build.

### Identifying Critical Path

For a typical action game:
1. Game launches without crash
2. Main menu loads and is navigable
3. New game starts (tutorial triggers)
4. Player can move, jump, attack
5. First enemy can be defeated
6. Player can die and respawn
7. Progress saves and loads correctly
8. Game can be quit cleanly

Document your game's specific critical path and test it on every build.

## Test Suite Structure

```
test-suites/
├── critical-path/      # Must pass every build
│   ├── TC-001-launch.md
│   ├── TC-002-main-menu.md
│   ├── TC-003-new-game.md
│   └── TC-004-save-load.md
├── features/           # Feature-specific regression
│   ├── combat/
│   ├── inventory/
│   └── progression/
├── platforms/          # Platform-specific validation
│   ├── pc-windows/
│   ├── steam-deck/
│   └── console/
└── performance/        # Regression on key metrics
    ├── fps-benchmarks.md
    └── memory-baselines.md
```

## Build Validation Checklist

Run before any build leaves the team:

### Launch & Core
- [ ] Game launches without crash on all target platforms
- [ ] Main menu renders correctly
- [ ] Settings save and load correctly
- [ ] Audio plays (music + SFX)
- [ ] Input responds (keyboard, controller, touch)

### Gameplay
- [ ] Critical path completable start to finish
- [ ] Player character moves and behaves correctly
- [ ] All game modes accessible
- [ ] Difficulty settings work

### Persistence
- [ ] New game starts correctly
- [ ] Save works and creates file
- [ ] Load restores correct state
- [ ] Continue from last save works
- [ ] Multiple save slots work (if applicable)

### UI/UX
- [ ] All menus navigable
- [ ] No text overflow or missing translations
- [ ] HUD elements visible and correct
- [ ] Pause menu works and resume works

### Stability
- [ ] No crash on critical path
- [ ] No hang/freeze during normal play
- [ ] Memory within budget after 30 min session

## Regression Tracking

### Regression Log Format

```markdown
## Regression: [Short Title]

**Date found:** [Date]
**Build:** [Version/hash]
**Introduced by:** [Commit/PR if known]
**Severity:** Critical / High / Medium / Low

### What broke
[Describe the regression]

### Steps to reproduce
1. [Steps]

### Expected
[What should happen]

### Actual
[What happens]

### Status
[ ] Confirmed
[ ] Root cause identified
[ ] Fix in progress
[ ] Fixed in build [version]
[ ] Verified fixed
```

## Automation Strategy

### What to Automate First

1. **Critical path** — highest ROI, most frequently run
2. **Save/load** — commonly broken, tedious to test manually
3. **Performance baselines** — FPS benchmarks with automated comparison
4. **Build health** — compile, package, launch without crash

### What to Automate Later (or Not)

- Visual/aesthetic checks (requires human judgment)
- "Fun" or "feel" tests
- Complex user flows with branching

### Unreal Automation Framework

```cpp
// Basic test example
IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FPlayerMoveTest,
    "Game.Player.Movement.BasicMove",
    EAutomationTestFlags::ApplicationContextMask |
    EAutomationTestFlags::ProductFilter
)

bool FPlayerMoveTest::RunTest(const FString& Parameters)
{
    // Setup
    // Act
    // Assert
    TestTrue("Player moved forward", /* condition */);
    return true;
}
```

Run via Editor: Window → Test Automation
Run via CLI: `UnrealEditor-Cmd.exe [project] -ExecCmds="Automation RunTests Game.Player"`

## Red Flags

- No critical path test suite exists — you're flying blind
- Build gets released without regression run — regressions ship
- Regressions are found by players, not QA — test coverage is wrong
- Same regression keeps reappearing — no fix verification step
- Test cases describe implementation, not behavior — tests break on refactor
```

---

## Task 8 — Re-add skills to agent files

Modify 6 agent files to uncomment/add skill references.

### File: `frameworks/agents/game-designer/agent.md`

In the frontmatter `skills` list, replace the commented line with the real entry:

```yaml
# Before:
skills:
  - balance-testing
  - progression-design
  - core-loop-design
  # player-psychology: skill not yet implemented

# After:
skills:
  - balance-testing
  - progression-design
  - core-loop-design
  - player-psychology
```

### File: `frameworks/agents/solo-dev/agent.md`

```yaml
# Before:
skills:
  - balance-testing
  # sprint-planning: skill not yet implemented
  # story-writing: skill not yet implemented

# After:
skills:
  - balance-testing
  - sprint-planning
  - story-writing
```

### File: `frameworks/agents/3d-artist/agent.md`

```yaml
# Before:
skills:
  - mcp-asset-tools
  # mcp-material-tools: skill not yet implemented

# After:
skills:
  - mcp-asset-tools
  - mcp-material-tools
```

### File: `frameworks/agents/level-designer/agent.md`

```yaml
# Before:
skills:
  - mcp-world-tools
  # mcp-level-tools: skill not yet implemented

# After:
skills:
  - mcp-world-tools
  - mcp-level-tools
```

### File: `frameworks/agents/game-qa/agent.md`

```yaml
# Before:
skills:
  - performance-testing
  # playtesting: skill not yet implemented
  # regression-testing: skill not yet implemented

# After:
skills:
  - performance-testing
  - playtesting
  - regression-testing
```

### File: `frameworks/agents/scrum-master/agent.md`

```yaml
# Before:
skills:
  # sprint-planning: skill not yet implemented
  # story-writing: skill not yet implemented

# After:
skills:
  - sprint-planning
  - story-writing
```

---

## Task 9 — Assign agents to 18 workflow.yaml files

For each workflow, add an `agents:` block. The block format follows the project convention:

```yaml
agents:
  primary: "[agent-id]"
  alternatives: []
  party_mode: false
```

Some files use the verbose `game-brief` format (with comments), others use the compact `game-architecture` format. Use the compact format matching each file's existing style.

**Note:** Some of these workflow.yaml files already have an `agent:` field (singular, old format — e.g., `art-direction` has `agent: "art-director"`). In those cases, replace the old `agent:` field with the new `agents:` block.

---

### `frameworks/workflows/quick-flow/quick-prototype/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "solo-dev"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/quick-flow/quick-dev/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "game-dev"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/1-preproduction/quick-brainstorming/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "game-designer"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/2-design/art-direction/workflow.yaml`

Replace:
```yaml
agent: "art-director"
```
With:
```yaml
agents:
  primary: "3d-artist"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/2-design/audio-design/workflow.yaml`

Replace:
```yaml
agent: "audio-director"
```
With:
```yaml
agents:
  primary: "game-designer"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/2-design/level-design/workflow.yaml`

The file already has `agent: "level-designer"`. Replace with:
```yaml
agents:
  primary: "level-designer"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/2-design/mvp-narrative/workflow.yaml`

Add after `estimated_time: "15 min"`:

```yaml
agents:
  primary: "game-designer"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/3-technical/diagram/workflow.yaml`

Add after `estimated_time: "5 min"`:

```yaml
agents:
  primary: "game-architect"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/3-technical/project-context/workflow.yaml`

Add after `agent_use: true`:

```yaml
agents:
  primary: "game-architect"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/4-production/code-review/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "game-dev"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/4-production/create-story/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "scrum-master"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/4-production/dev-story/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "game-dev"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/4-production/retrospective/workflow.yaml`

Add after `estimated_time: "10 min"`:

```yaml
agents:
  primary: "scrum-master"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/4-production/sprint-planning/workflow.yaml`

Replace:
```yaml
agent: "game-designer"
```
With:
```yaml
agents:
  primary: "scrum-master"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/4-production/sprint-status/workflow.yaml`

Add after `quick_action: true`:

```yaml
agents:
  primary: "scrum-master"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/tools/gametest/workflow.yaml`

Add after `estimated_time: "10 min"`:

```yaml
agents:
  primary: "game-qa"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/tools/mind-map/workflow.yaml`

Add after `estimated_time: "5 min"`:

```yaml
agents:
  primary: "game-designer"
  alternatives: []
  party_mode: false
```

---

### `frameworks/workflows/tools/mood-board/workflow.yaml`

Add after `estimated_time: "8 min"`:

```yaml
agents:
  primary: "3d-artist"
  alternatives: []
  party_mode: false
```

---

## Task 10 — Update manifest

**File:** `frameworks/manifest.yaml`

Update the skills count and version:

```yaml
# Before:
  skills:
    version: "1.0.0"
    count: 12

# After:
  skills:
    version: "1.1.0"
    count: 19
```

Also bump `lastUpdated`:

```yaml
# Before:
lastUpdated: "2026-04-02"

# After:
lastUpdated: "2026-04-02"
```

(Date stays the same since the plan is written today.)

---

## Verification

After execution, verify:

1. All 7 skill directories exist with `SKILL.md`:
   - `frameworks/skills/player-psychology/SKILL.md`
   - `frameworks/skills/sprint-planning/SKILL.md`
   - `frameworks/skills/story-writing/SKILL.md`
   - `frameworks/skills/mcp-material-tools/SKILL.md`
   - `frameworks/skills/mcp-level-tools/SKILL.md`
   - `frameworks/skills/playtesting/SKILL.md`
   - `frameworks/skills/regression-testing/SKILL.md`

2. All 6 agent files reference only existing skills (no commented-out entries remain)

3. All 18 workflow.yaml files have an `agents:` block with valid agent IDs

4. `frameworks/manifest.yaml` shows `count: 19` for skills

5. The 2 utility workflows (`get-started`, `workflow-status`) remain without agents
