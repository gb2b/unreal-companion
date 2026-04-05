# Studio Frontend Redesign — Design Spec

**Date:** 2026-04-05
**Scope:** Complete frontend UX overhaul — from "chat" to "builder" paradigm
**Supersedes:** Frontend portions of `2026-04-04-studio-core-design.md`

---

## Objective

Redesign the Studio frontend from a chat-like interface to a step-by-step builder where the user constructs game development documents through guided interactions. The LLM is an invisible orchestrator, not a chat partner. The document being built is the central focus, not the conversation.

---

## Core Principles

1. **Builder, not chat** — No chat bubbles. The user fills forms, picks cards, adjusts sliders. Their responses are inputs, not messages.
2. **Document is the hero** — The preview panel shows the document building in real-time. Every interaction visibly contributes to the output.
3. **Step-by-step, not scroll** — One micro-step visible at a time. Previous steps are collapsed in the timeline. Navigation is explicit (back, skip, jump).
4. **Show the work** — When the LLM processes, show what it's doing: "Writing Vision section...", "Analyzing your references...". The document writes itself visibly.
5. **Always resumable** — Conversations persist. Re-opening a document restores the exact state.

---

## Layout Architecture

### Two-Level Step Model

**Section Bar (top)** = macro-steps = document sections (Identity, Vision, Pillars...)
- These come from the workflow YAML `sections` field
- Status: done ✓, active ●, future ○, skipped ⊘
- Clicking a section jumps to it

**Timeline (left)** = micro-steps = exchanges within the active section
- Each micro-step is one question→response cycle
- The timeline grows as the LLM asks more questions within a section
- Previous micro-steps collapse into summary cards
- The active micro-step is fully expanded in the slide area
- When the section is complete, the timeline resets for the next section

### Full Layout

```
┌────────────────────────────────────────────────────────────┐
│ Header: ← Documents | Game Brief | Progress | 🎲 Zelda    │
├────────────────────────────────────────────────────────────┤
│ Section Bar: [Identity ✓] [Vision ●] [Pillars ○] [...]    │
├────────┬──────────────────────────────┬────────────────────┤
│        │                              │                    │
│ MICRO  │    ACTIVE MICRO-STEP         │   PREVIEW          │
│ STEPS  │                              │   PANEL            │
│        │  Agent prompt (Zelda)        │                    │
│ ┌────┐ │  Interaction component       │   📄 Document      │
│ │ Q1 │ │  (cards/slider/text/upload)  │   building live    │
│ └────┘ │                              │                    │
│ ┌────┐ │  Text input zone             │   Sections:        │
│ │ Q2 │ │  (optional, always avail)    │   ✓ Identity       │
│ └────┘ │                              │   ● Vision ▌       │
│ ┌════┐ │  ──────────────────────      │   ○ Pillars        │
│ ║ Q3 ║ │  [← Back] [Skip] [Next →]   │   ○ References     │
│ ║ACT ║ │                              │   ○ Audience       │
│ └════┘ │                              │   ○ Scope          │
│        │                              │                    │
└────────┴──────────────────────────────┴────────────────────┘
```

### Micro-Step Cards (collapsed in timeline)

Each collapsed card shows:
- A status icon (✓ answered, ● active)
- A one-line summary of the question
- The user's answer (abbreviated)

Example:
```
✓ Game name and genre → "Tactical Hearts — Tactical RPG"
✓ Platform and scope → "PC + Console, 20h campaign"
● What core experience? → [active — expanded in slide]
```

---

## Documents Dashboard

### Layout

When the user opens the Documents tab:

```
┌─────────────────────────────────────────────────┐
│  ONBOARDING HERO (if few/no documents)          │
│  🎮 Build your game, step by step               │
│  [🚀 Start with Game Brief]                     │
│  or choose below                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  💡 Concept                              [+ New]│
│  ┌─────────┐  ┌─────────┐  ┌ ─ ─ ─ ─ ┐       │
│  │✓ Game   │  │📝 Combat│  │+ New     │       │
│  │  Brief  │  │  Brainstm│  │brainstorm│       │
│  └─────────┘  └─────────┘  └ ─ ─ ─ ─ ┘       │
│                                                 │
│  🎨 Design                        0/5   [+ New]│
│  ┌─────────┐  ┌ ─ ─ ─ ─ ┐  ┌ ─ ─ ─ ─ ┐      │
│  │🔄 GDD   │  │🗺️ Level │  │🎨 Art    │      │
│  │  3/9    │  │  Design  │  │ Direction│      │
│  └─────────┘  └ ─ ─ ─ ─ ┘  └ ─ ─ ─ ─ ┘      │
│               ┌ ─ ─ ─ ─ ┐  ┌ ─ ─ ─ ─ ┐      │
│               │🎵 Audio  │  │📜 Narrat.│      │
│               └ ─ ─ ─ ─ ┘  └ ─ ─ ─ ─ ┘      │
│                                                 │
│  🏗️ Technical                     0/2   [+ New]│
│  ...                                            │
│                                                 │
│  📋 Production                    0/3   [+ New]│
│  ...                                            │
└─────────────────────────────────────────────────┘
```

### Document Cards

Each card shows:
- Icon + document name
- Status badge: "Complete" (green), "3/9 sections" (cyan), "Draft" (amber)
- Agent that worked on it (emoji + name)
- Last modified date
- Progress bar (for multi-section documents)

### Empty Slots

Each category shows the possible document types as dashed empty cards:
- Icon + document type name
- Click → opens workflow selector or starts the workflow directly

### Onboarding Hero

Shown when project has < 3 documents:
- Gradient background with glow
- Title + description
- CTA button: "Start with Game Brief" (or context-aware suggestion)
- Subtitle: "or choose below"

Hides after the user has 3+ documents.

### Categories

Default categories (extensible):
- 💡 **Concept** — Game Brief, Brainstorming (repeatable)
- 🎨 **Design** — GDD, Level Design, Art Direction, Audio Design, Narrative
- 🏗️ **Technical** — Game Architecture, Diagrams
- 📋 **Production** — Sprint Planning, Dev Stories, Code Review

Categories map to workflow phases. New workflows in new phases create new categories.

---

## Builder — Slide Wizard

### The Active Micro-Step

The center area shows ONE micro-step at a time. Each micro-step has:

1. **Agent Prompt** — the question/instruction from the LLM
   - Shows agent avatar + name (e.g., 🎲 Zelda)
   - Rendered as markdown (headings, bold, lists)
   - NOT a chat bubble — it's an instruction/prompt area

2. **Interaction Component** — what the user responds with
   - `choices` — clickable cards (single or multi-select)
   - `slider` — range with labels
   - `rating` — star rating
   - `upload` — file drop zone
   - `confirm` — approve section completion
   - `prototype` — interactive HTML preview (inline or in preview panel)

3. **Text Input** — always available below the interaction
   - Labeled as "Add details..." not "Type your message..."
   - It's a form field, not a chat input
   - Optional — user can just use the interaction component

4. **Navigation** — fixed at bottom
   - ← Back (go to previous micro-step)
   - Skip for now (mark section TODO, move to next section)
   - Continue → (submit response, LLM processes, next micro-step appears)

### Thinking/Processing State

When the user clicks "Continue →", the slide shows the LLM working:

```
┌─────────────────────────────────────────┐
│  🎲 Zelda is working...                │
│                                         │
│  ● Analyzing your vision statement      │
│  ● Writing the Vision section...        │
│  ● Preparing next question              │
│                                         │
│  [Document preview updates in real-time]│
└─────────────────────────────────────────┘
```

The thinking state shows:
- Animated dots/spinner
- Contextual text describing what the LLM is doing
- The preview panel updates simultaneously (document writes itself)

When done, the slide transitions to the next micro-step (or next section).

### Section Transition

When all micro-steps for a section are complete:
1. Section bar updates: Vision ● → Vision ✓
2. Brief "Section complete" animation
3. Timeline resets (clears micro-steps)
4. Next section becomes active: Pillars ○ → Pillars ●
5. LLM auto-sends first question for the new section

---

## Preview Panel

Three tabs, always visible:

### 📄 Document

- Live markdown render of the document being built
- Sections shown with status indicators:
  - ✓ Filled (green left border) — content visible
  - ● Active (cyan left border) — content being written with cursor animation
  - ○ Empty (dimmed) — "Waiting..."
- Clicking a section in the preview → jumps to that section in the builder
- As the LLM writes, text appears character by character (streaming effect)

### 🎮 Prototype

- Sandboxed iframe for HTML/JS/Three.js prototypes
- Generated by the LLM when discussing gameplay mechanics
- Multiple prototypes tabbed if several exist
- Each prototype saved as attachment to the document

### 🗺️ Graph

- Document dependency visualization
- Nodes = documents (Game Brief, GDD, Architecture...)
- Edges = dependencies
- Color-coded by status (green/cyan/gray)
- Click node → navigate to that document

---

## Other Tabs (cohérence)

### Today Tab

Keep existing functionality but align styling:
- "Good morning" greeting with project context
- Suggested next workflows based on project state
- Recent activity feed

### Board Tab

Keep existing functionality:
- Sprint/production task management
- Will be enhanced by Studio Production spec later

### Team Tab

Keep existing but enrich:
- Show agents with their personas (emoji, name, role)
- Show which agent is "active" (currently working on a document)
- Click agent → see their skills and workflows

---

## State Management

### Conversation Persistence

Each document has a conversation linked to it:
- Stored in SQLite (existing conversation table)
- `conversation_id` linked to `document_id` in meta.json
- Re-opening a document loads the conversation and restores:
  - Which section is active
  - Which micro-step within the section
  - All previous micro-steps (collapsed in timeline)
  - The document state (filled sections)

### Zustand Store Changes

**Replace `conversationStore`** with `builderStore`:

```typescript
interface BuilderState {
  // Document
  documentId: string | null
  documentSections: Record<string, SectionState>
  
  // Current position
  activeSection: string | null
  microSteps: MicroStep[]  // all micro-steps for current section
  activeMicroStepIndex: number
  
  // Streaming
  isProcessing: boolean
  processingText: string  // "Writing Vision section..."
  currentStreamText: string  // text being streamed
  
  // Actions
  submitResponse: (response: string) => Promise<void>
  skipSection: () => void
  goBack: () => void
  jumpToSection: (sectionId: string) => void
  jumpToMicroStep: (index: number) => void
}

interface MicroStep {
  id: string
  agentPrompt: string  // the question (markdown)
  interactionType: InteractionBlockType | null
  interactionData: InteractionData | null
  userResponse: string | null  // what the user answered
  status: 'active' | 'answered' | 'skipped'
}
```

---

## Component Changes

### Components to CREATE

| Component | Purpose |
|---|---|
| `BuilderView` | Replaces WorkflowView — main builder layout |
| `MicroTimeline` | Left timeline showing micro-step cards |
| `MicroStepCard` | Collapsed micro-step in timeline |
| `StepSlide` | The active micro-step slide |
| `AgentPrompt` | Agent question rendering (markdown, no bubble) |
| `ProcessingState` | Animated "LLM is working" indicator |
| `StepNavigation` | Back / Skip / Continue buttons |
| `DocumentsDashboard` | New dashboard with onboarding + categories |
| `OnboardingHero` | Welcome card with CTA |
| `DocumentCategoryGrid` | Category section with doc cards + empty slots |

### Components to MODIFY

| Component | Change |
|---|---|
| `SectionBar` | Keep, add skipped state |
| `ChoicesBlock` | Keep, remove chat-specific styling |
| `SliderBlock` | Keep |
| `RatingBlock` | Keep |
| `UploadBlock` | Keep |
| `ConfirmBlock` | Keep |
| `PreviewPanel` | Keep, wire to builderStore |
| `DocumentPreview` | Keep, enhance with streaming text effect |

### Components to REMOVE

| Component | Why |
|---|---|
| `ImmersiveZone` | Replaced by StepSlide + MicroTimeline |
| `InputBar` | Replaced by inline text input in StepSlide |
| `AgentBubble` | Replaced by AgentPrompt (no bubble) |
| Old `Dashboard` | Replaced by DocumentsDashboard |

---

## Backend Changes

### New SSE Events

| Event | Purpose |
|---|---|
| `processing_status` | `{text: "Writing Vision section..."}` — shown during thinking |
| `micro_step` | `{prompt, interaction_type, interaction_data}` — new micro-step from LLM |
| `section_transition` | `{from_section, to_section}` — section completed, moving to next |

### System Prompt Enhancement

Add to the workflow briefing:
```
When responding, structure your output as micro-steps:
1. First call update_document to write/update the section content
2. Then call show_interaction to present the next question
3. Use processing_status to describe what you're doing

Each response should produce exactly ONE question for the user.
Don't ask multiple questions at once — one micro-step = one question.
```

---

## Migration from Current Code

### What stays
- Backend LLM Engine (SSE streaming, agentic loop, providers, context manager) — untouched
- Backend API endpoints (`/api/v2/studio/*`) — untouched
- SSE client (`services/sse.ts`) — untouched
- Theme system — untouched
- Project management — untouched
- Workflow V2 format — untouched

### What changes
- `conversationStore.ts` → `builderStore.ts` (new state model)
- `WorkflowView` → `BuilderView` (new layout)
- `ImmersiveZone` → `StepSlide` + `MicroTimeline` (new components)
- `Dashboard` → `DocumentsDashboard` (new dashboard)
- `AgentBubble` → `AgentPrompt` (no bubble style)

### What's added
- `MicroTimeline`, `MicroStepCard`, `ProcessingState`, `StepNavigation`
- `OnboardingHero`, `DocumentCategoryGrid`
- `processing_status` SSE event type

---

## Implementation Order

1. **DocumentsDashboard** — new dashboard with onboarding + categories
2. **BuilderStore** — new Zustand store with micro-step state model
3. **BuilderView layout** — header + section bar + timeline + slide + preview
4. **StepSlide + AgentPrompt** — the active micro-step rendering
5. **MicroTimeline** — collapsed cards for previous micro-steps
6. **ProcessingState** — animated thinking/working indicator
7. **StepNavigation** — back/skip/continue with section transitions
8. **Integration** — wire to SSE, test end-to-end with dev-browser
