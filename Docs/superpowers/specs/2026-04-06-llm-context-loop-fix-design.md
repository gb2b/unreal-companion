# LLM Context & Loop Fix — Design Spec

**Date:** 2026-04-06
**Priority:** CRITICAL — this is the #1 blocker for a usable Studio
**Status:** Designed, approved by user, not implemented

---

## Problems

1. **LLM loops** — re-asks questions already answered, stays in same section for 7+ mini-steps
2. **No structured context** — LLM receives raw conversation history with no summary of what was already answered
3. **Old steps are empty when revisited** — no readonly view with user's previous answers
4. **History grows unbounded** — every mini-step adds messages, context fills up

## Root Causes

1. The conversation history sent to the LLM is a raw list of messages — no structure
2. The system prompt says "fill sections naturally" but doesn't tell the LLM what's already filled
3. No progress tracker — the LLM doesn't know which section it's on or what questions were already answered
4. When user sends selection + text, the LLM may interpret it as a new question trigger

---

## Solution: Context Brief + Cleaned History + Steps Readonly

### Part 1: Context Brief (injected in system prompt)

A structured block built by the backend BEFORE each LLM call:

```markdown
## Current State

### Project
- Game: "The Last Shard" (Exploration/Puzzle)  
- Documents: Game Brief (in progress 3/8 sections), GDD (not started)
- References: concept-art.png, old-brief.pdf

### Current Document: Game Brief
- ✅ Init — Name: The Last Shard, Genre: Exploration/Puzzle
- ✅ Identity — Tagline: "Every shard holds a memory", Platform: PC/Console
- 🔄 Vision — IN PROGRESS (core experience discussed, USP pending)
- ○ Pillars — Empty
- ○ References — Empty
- ○ Audience — Empty
- ○ Scope — Empty
- ○ Review — Empty

### Conversation Summary
The user chose "Start from scratch", named the game "The Last Shard", 
described it as an exploration game inspired by Outer Wilds. 
They want a peaceful discovery experience with no combat.

### Rules for this turn
- You are working on section "Vision"
- The user just answered about the core experience
- Ask about the USP (unique selling point) next
- Do NOT re-ask: game name, genre, tagline, platform (already answered)
- When Vision is complete, call mark_section_complete("vision") and move to "Pillars"
```

**Built by:** new function `build_context_brief()` in `studio_v2.py`
**Sources:**
- `sectionStatuses` + `sectionContents` from DocumentStore
- `project-context.md` (LLM-maintained living summary)
- Last 3-5 user messages from conversation history (condensed)
- Workflow section hints for the current section

### Part 2: Cleaned Conversation History

Instead of sending ALL messages to the LLM:

**Send:**
- The Context Brief as part of the system prompt (always fresh)
- Last 6 messages only (3 user + 3 assistant) — recent context
- A preamble message summarizing older messages if they exist

**Don't send:**
- [WORKFLOW_START] messages (internal)
- Messages older than the last 6 (replaced by Context Brief)
- Duplicate/redundant messages

**Implementation:**
```python
# In studio_v2.py, before the agentic loop:
context_brief = build_context_brief(project_path, doc_id, workflow, section_statuses, section_contents)
builder.add("ContextBrief", context_brief, priority=12)  # Between UserIdentity and AgentPersona

# Trim history to last 6 messages
history = conv_history.load(doc_id)
recent = history[-6:] if len(history) > 6 else history
messages = recent + [{"role": "user", "content": request.message}]
```

### Part 3: LLM Memory (project-context.md)

The LLM already has the `update_project_context` tool. The Context Brief reads from project-context.md. This creates a memory loop:

```
LLM answers → calls update_project_context → writes to project-context.md
Next turn → backend reads project-context.md → injects in Context Brief
LLM sees updated context → knows what was discussed → doesn't repeat
```

**Enhancement:** The system prompt should explicitly tell the LLM:
- "After each section is completed, update the project context with the key decisions"
- "The project context is your memory — write important facts there"

### Part 4: Steps Readonly + "Proposer une modification"

When navigating to an old micro-step (via timeline click):

**Display:**
- Agent text (readonly, slightly dimmed)
- User response shown below: selection badges + text input content
- All interaction blocks disabled (choices grayed out with selected ones highlighted)
- A button: "Proposer une modification" 

**"Proposer une modification" behavior:**
- Creates a NEW mini-step at the END of the timeline (not in place)
- The new step sends to the LLM: "The user wants to modify their answer to: [original question]. Original answer was: [old answer]. Please ask them what they'd like to change."
- The LLM handles the modification naturally
- No rollback of previous steps — additive modification

**Implementation:**
- `MicroStep` already has `userResponse` — need to also store `selectedChoiceIds` and `selectedChoiceLabels`
- When `activeMicroStepIndex` points to an old step (not the last one), render in readonly mode
- The textarea and interaction blocks get `disabled` + visual dimming

---

## Files to Modify

### Backend
- `web-ui/server/api/studio_v2.py` — add `build_context_brief()`, trim history, inject in prompt
- `web-ui/server/services/llm_engine/system_prompt.py` — add `add_context_brief()` method
- `web-ui/server/services/conversation_history.py` — add `get_recent()` method

### Frontend
- `web-ui/src/stores/builderStore.ts` — store user selections in MicroStep, readonly mode logic
- `web-ui/src/components/Studio/Builder/StepSlide.tsx` — readonly rendering, "Proposer une modification" button
- `web-ui/src/types/studio.ts` — add `selectedChoiceIds`, `selectedChoiceLabels` to MicroStep

---

## Implementation Order

1. **build_context_brief()** — backend function that builds the structured context
2. **Inject Context Brief in system prompt** — wire into studio_v2.py
3. **Trim history** — only send last 6 messages
4. **Store user selections in MicroStep** — selectedChoiceIds/Labels
5. **Readonly step rendering** — dimmed, disabled, with user answers visible
6. **"Proposer une modification" button** — creates new mini-step at end
7. **Test end-to-end** — verify LLM doesn't loop, sections advance properly
