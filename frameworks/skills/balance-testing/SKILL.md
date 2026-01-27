---
name: balance-testing
description: |
  Game balance testing methodologies and metrics.
  Use when designing or testing game balance systems.
---

# Balance Testing

## When to Use

- Designing progression systems
- Testing difficulty curves
- Balancing economy
- Tuning combat/mechanics

## Balance Pillars

### 1. Fairness
- All choices should be viable
- No dominant strategies
- Counterplay exists

### 2. Depth
- Meaningful choices
- Skill expression
- Strategic variety

### 3. Accessibility
- Easy to learn
- Hard to master
- Clear feedback

## Testing Methods

### Quantitative Analysis

**Metrics to Track:**
- Win rates by character/strategy
- Time to kill/complete
- Resource accumulation rates
- Player progression speed

**Tools:**
- Spreadsheet simulations
- Monte Carlo analysis
- A/B testing

### Qualitative Analysis

**Methods:**
- Playtesting sessions
- Player interviews
- Community feedback
- Expert review

## Balance Metrics

### Combat Balance

| Metric | Target | Red Flag |
|--------|--------|----------|
| TTK variance | <20% | >50% |
| Win rate | 45-55% | <40% or >60% |
| Pick rate | Varied | One dominant |
| Counter availability | Always | Rock-paper-scissors only |

### Economy Balance

| Metric | Target | Red Flag |
|--------|--------|----------|
| Inflation rate | Stable | Exponential |
| Sink/faucet ratio | ~1.0 | >1.5 or <0.5 |
| Time to reward | Consistent | Highly variable |

### Progression Balance

| Metric | Target | Red Flag |
|--------|--------|----------|
| XP curve | Smooth | Sudden spikes |
| Power creep | Controlled | Unbounded |
| Catch-up mechanics | Present | Absent |

## Common Issues

### Power Creep
**Problem:** New content stronger than old
**Solution:** Rotate meta, buff weak options, cap power

### Dominant Strategy
**Problem:** One approach always wins
**Solution:** Add counters, nerf, or redesign

### Feast or Famine
**Problem:** Small advantages snowball
**Solution:** Comeback mechanics, diminishing returns

### Analysis Paralysis
**Problem:** Too many equivalent choices
**Solution:** Reduce options, add clear trade-offs

## Balance Process

1. **Establish Goals**
   - What feeling should the system create?
   - What player behaviors do we want?

2. **Create Framework**
   - Define variables
   - Set baseline values
   - Document assumptions

3. **Test Theoretically**
   - Spreadsheet analysis
   - Edge case checking
   - Monte Carlo simulation

4. **Test Practically**
   - Internal playtests
   - Focus groups
   - Beta testing

5. **Iterate**
   - Gather data
   - Identify issues
   - Adjust values
   - Repeat

## Spreadsheet Template

```
| Unit | HP | DPS | TTK vs Unit A | TTK vs Unit B | Cost | Value |
|------|-----|-----|---------------|---------------|------|-------|
| A | 100 | 20 | - | 5s | 100 | 1.0 |
| B | 150 | 15 | 6.6s | - | 120 | 1.1 |
```

## Red Flags

- One option picked >70% of the time
- Win rate deviation >10% from 50%
- "Solved" meta with no variety
- Community consensus on "broken" elements
- Frequent emergency nerfs needed
