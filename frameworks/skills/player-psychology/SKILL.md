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
