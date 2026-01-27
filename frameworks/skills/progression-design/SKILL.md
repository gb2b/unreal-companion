---
name: progression-design
description: |
  Player progression system design - XP curves, unlocks, rewards.
  Use when designing leveling, unlocks, or reward systems.
---

# Progression Design

## When to Use

- Designing XP/leveling systems
- Creating unlock sequences
- Balancing reward schedules
- Monetization planning

## Progression Types

### Vertical Progression
- Stats increase (more power)
- New abilities unlock
- Higher tier gear

### Horizontal Progression
- More options (sidegrades)
- Cosmetics
- Convenience features

### Hybrid
- Core vertical progression
- Optional horizontal content
- Best of both worlds

## XP Curve Formulas

### Linear
```
XP_for_level(n) = base * n
```
- Simple, predictable
- Feels slow later

### Quadratic
```
XP_for_level(n) = base * n²
```
- Accelerating difficulty
- Common in RPGs

### Exponential
```
XP_for_level(n) = base * factor^n
```
- Dramatic scaling
- Risk of grind walls

### Custom Curve
```
XP_for_level(n) = base * n^1.5 + (n * bonus)
```
- Tunable feel
- Recommended approach

## Reward Schedules

### Fixed Ratio
- Reward every N actions
- Predictable, can feel grindy
- Example: XP per kill

### Variable Ratio
- Random chance on action
- Engaging, potentially addictive
- Example: Loot drops

### Fixed Interval
- Reward every N minutes
- Encourages return
- Example: Daily rewards

### Variable Interval
- Random timing
- Constant engagement
- Example: Random events

## Unlock Pacing

### Early Game (0-25%)
- Frequent rewards (every 5-10 min)
- Core mechanics unlock
- Hook the player

### Mid Game (25-75%)
- Moderate rewards (every 15-30 min)
- Variety expands
- Depth reveals

### Late Game (75-100%)
- Spaced rewards (every 30-60 min)
- Mastery content
- Prestige items

## Progression Checklist

### Core Systems
- [ ] Level/XP system defined
- [ ] Curve feels good at all stages
- [ ] Clear progress indication
- [ ] Meaningful level rewards

### Unlocks
- [ ] Unlock order makes sense
- [ ] No essential items locked too late
- [ ] Mix of gameplay and cosmetic
- [ ] Sense of discovery maintained

### Economy
- [ ] Currency sources balanced
- [ ] Sinks prevent inflation
- [ ] Premium doesn't break balance
- [ ] Catch-up for new players

## Anti-Patterns

### Grind Wall
**Problem:** Progression halts, requires excessive repetition
**Solution:** Adjust curve, add alternative sources

### Overwhelming Choice
**Problem:** Too many unlocks at once
**Solution:** Gate unlocks, introduce gradually

### Power Creep
**Problem:** Later content trivializes earlier
**Solution:** Scale challenges, add prestige systems

### Pay-to-Win
**Problem:** Purchases give unfair advantage
**Solution:** Cosmetic-only monetization

## Example: RPG Level System

```yaml
progression:
  base_xp: 100
  formula: "base * level^1.5"
  max_level: 50
  
  level_rewards:
    every_level:
      - stat_point: 1
    every_5_levels:
      - skill_point: 1
    milestones:
      10: "Class specialization unlock"
      25: "Mount unlock"
      50: "Prestige system unlock"
      
  xp_sources:
    quest_main: 500
    quest_side: 200
    enemy_kill: "enemy_level * 10"
    discovery: 50
```

## Metrics to Track

| Metric | Healthy | Concerning |
|--------|---------|------------|
| Time to max level | Target ± 20% | >50% variance |
| Drop-off rate | <10% per stage | >20% per stage |
| Return rate | >50% next day | <30% next day |
| Engagement time | Stable/growing | Declining |
