---
name: advanced-elicitation
description: |
  50+ thinking techniques to challenge the LLM for better responses.
  Use during workflows to enhance generated content or when stuck.
---

# Advanced Elicitation

## When to Use

- Content generation feels shallow or generic
- User seems stuck or uncertain
- Need to explore multiple perspectives
- Want to challenge assumptions
- Building complex documents (GDD, Architecture)

## How to Use

During a workflow, when generating a section:

1. Generate initial content
2. Present to user with elicitation options
3. Apply selected technique(s)
4. Offer to accept, modify, or regenerate

```
**Section Generated!**

[A] Advanced Elicitation - Dig deeper
[P] Party Mode - Get other perspectives
[C] Continue - Accept and move on

Which option?
```

## Technique Categories

### Core Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| First Principles | Break down to fundamental truths | Starting fresh, avoiding assumptions |
| 5 Whys | Drill to root cause | Understanding motivations |
| Socratic Questioning | Guided discovery | Teaching through questions |
| MECE | Mutually Exclusive, Collectively Exhaustive | Organizing categories |
| Inversion | Consider the opposite | Finding blind spots |

### Collaboration Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| Stakeholder Round Table | Multiple viewpoints | Product decisions |
| Expert Panel | Domain expert opinions | Technical decisions |
| Debate Club | Argue both sides | Controversial choices |
| Devil's Advocate | Challenge assumptions | Validating decisions |
| Red Team / Blue Team | Attack and defend | Security, robustness |

### Creative Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| SCAMPER | Substitute, Combine, Adapt, Modify | Iterating on ideas |
| What If Scenarios | Explore alternatives | Future planning |
| Genre Mashup | Combine unexpected elements | Innovation |
| Constraint Removal | What if no limits? | Breakthrough thinking |
| Random Stimulus | Inject random element | Breaking patterns |

### Risk Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| Pre-mortem Analysis | Imagine failure | Risk identification |
| Chaos Monkey | Random disruption | Resilience testing |
| Edge Case Storm | Find extremes | Robustness |
| Murphy's Law | What can go wrong? | Defensive planning |

### Advanced Reasoning

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| Tree of Thoughts | Branching reasoning | Complex problems |
| Chain of Thought | Step-by-step | Logical analysis |
| Self-Consistency | Multiple attempts | Validation |
| Metacognitive Review | Thinking about thinking | Quality check |

## Example Applications

### Game Design - Mechanic Exploration

```
User: "I want a combat system"

Apply: Genre Mashup + First Principles

"Let's explore combat from first principles:
- What emotion should combat evoke?
- What's the core action loop?

Now let's mashup unexpected genres:
- What if we combined turn-based with rhythm?
- What if combat was puzzle-based?
- What if the enemy's attacks were the controls?"
```

### Architecture - Scalability Review

```
Apply: Pre-mortem + Chaos Monkey

"Let's imagine this architecture failed at scale:
- 10,000 concurrent players caused what?
- The database became the bottleneck because?

Now let's inject chaos:
- What if the main server goes down?
- What if network latency spikes to 500ms?
- What if a player exploits X?"
```

### GDD - Feature Validation

```
Apply: Devil's Advocate + Stakeholder Round Table

"As devil's advocate:
- Why would players hate this feature?
- What's the worst-case interpretation?

From different stakeholders:
- Publisher: 'How does this monetize?'
- QA: 'How do we test this edge case?'
- Player: 'Why should I care about this?'"
```

## Integration with Workflows

Add to any workflow step that generates content:

```yaml
# In step file
elicitation_options:
  enabled: true
  default_techniques:
    - first_principles
    - stakeholder_round_table
  menu_label: "[A] Advanced Elicitation"
```

## Best Practices

1. **Don't overuse** - Not every section needs deep elicitation
2. **Match technique to task** - Creative tasks need creative techniques
3. **Let user choose** - Offer options, don't force
4. **Build on results** - Each application should improve content
5. **Know when to stop** - Diminishing returns after 2-3 iterations

## Additional Resources

See [references/methods.csv](references/methods.csv) for the complete list of 50+ techniques with detailed descriptions and output patterns.
