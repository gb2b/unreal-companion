---
name: core-loop-design
description: |
  Core gameplay loop design principles and patterns.
  Use when designing the fundamental action-feedback-reward cycle.
---

# Core Loop Design

## When to Use

- Designing the main gameplay loop
- Analyzing game feel and engagement
- Optimizing player motivation cycles
- Evaluating game pacing

## What is a Core Loop?

The core loop is the fundamental cycle of actions players repeat throughout the game:

```
ACTION → FEEDBACK → REWARD → MOTIVATION → ACTION
```

## Loop Components

### 1. Action
What the player does repeatedly:
- Move, shoot, jump
- Build, craft, trade
- Match, solve, explore

### 2. Feedback
Immediate response to action:
- Visual effects (particles, animations)
- Audio cues (sounds, music changes)
- Screen shake, haptics
- UI changes

### 3. Reward
Why the action was worth it:
- Progress (XP, levels)
- Resources (currency, items)
- Content (story, areas)
- Mastery (skills, abilities)

### 4. Motivation
Why to continue:
- Extrinsic (unlocks, achievements)
- Intrinsic (fun, curiosity)
- Social (competition, cooperation)

## Loop Types

| Type | Duration | Example |
|------|----------|---------|
| Micro | Seconds | Single attack combo |
| Core | Minutes | Complete a level |
| Meta | Hours | Upgrade character |
| Macro | Days/Weeks | Seasonal content |

## Design Checklist

### Micro Loop (Moment-to-Moment)
- [ ] Actions feel responsive (<100ms feedback)
- [ ] Clear cause and effect
- [ ] Satisfying sensory feedback
- [ ] Skill expression possible

### Core Loop (Session)
- [ ] Clear objective
- [ ] Measurable progress
- [ ] Meaningful choices
- [ ] Session-appropriate duration

### Meta Loop (Long-term)
- [ ] Goals worth pursuing
- [ ] Visible progress path
- [ ] Rewards feel earned
- [ ] Variety prevents fatigue

## Analysis Framework

### Questions to Ask

1. **Is it fun in isolation?**
   Remove rewards - is the action still satisfying?

2. **Is feedback immediate?**
   Can player understand action → result?

3. **Is progression meaningful?**
   Do rewards change the experience?

4. **Is there mastery?**
   Can skill improve outcomes?

### Red Flags

- Action requires reward to be tolerable
- Feedback delayed or unclear
- Progression is just numbers going up
- No skill ceiling or floor

## Examples

### Platformer Core Loop
```
Jump/Run → Land/Collect → Coin/Checkpoint → Next Challenge
```

### RPG Core Loop
```
Explore → Battle → XP/Loot → Level Up → Harder Areas
```

### Puzzle Core Loop
```
Observe → Solve → Satisfaction → Harder Puzzle
```

## Integration Points

- Work with **Game Designer** on mechanics
- Coordinate with **3D Artist** for visual feedback
- Partner with **Game Dev** for implementation
