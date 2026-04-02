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
- Expressions of delight (leaning forward, laughing, saying "oh!")
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
Developer feedback is not player feedback. Use people who represent your audience.

### Helping During the Session
The urge to help players is strong. Resist it — their struggle is your data.

### Collecting Opinions, Not Observations
"Would you like a map?" → Opinion
"Player opened the menu 4 times looking for a map" → Observation

### Ignoring Positive Feedback
Document what works as carefully as what doesn't. You need to know what NOT to change.
