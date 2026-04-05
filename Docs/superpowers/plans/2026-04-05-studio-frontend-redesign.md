# Studio Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat-like Studio frontend with a step-by-step builder paradigm. The LLM is an invisible orchestrator; the document being built is the central focus. One micro-step visible at a time, previous steps collapsed in a timeline.

**What stays untouched:** Backend LLM Engine (SSE streaming, agentic loop, providers), backend API endpoints (`/api/v2/studio/*`), SSE client (`services/sse.ts`), theme system, project management, Workflow V2 format.

**What gets replaced:** `conversationStore.ts` -> `builderStore.ts`, `WorkflowView` -> `BuilderView`, `ImmersiveZone` -> `StepSlide` + `MicroTimeline`, `Dashboard` -> `DocumentsDashboard`, `AgentBubble` -> `AgentPrompt`, `InputBar` -> inline text input inside StepSlide.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, existing CSS variables (`--primary: #00D4FF`, `--accent: #00D980`, `--bg-card`, etc.), react-markdown, framer-motion, lucide-react.

---

## File Structure

### New files to create

```
web-ui/src/
├── stores/
│   └── builderStore.ts              # Replaces conversationStore — micro-step state model
├── components/
│   └── studio/
│       ├── Builder/
│       │   ├── BuilderView.tsx       # Main 3-panel layout (timeline | slide | preview)
│       │   ├── StepSlide.tsx         # Active micro-step: agent prompt + interaction + text input
│       │   ├── AgentPrompt.tsx       # Agent instruction area (markdown, no bubble)
│       │   ├── MicroTimeline.tsx     # Left sidebar: collapsed micro-step cards
│       │   ├── MicroStepCard.tsx     # Single collapsed card in timeline
│       │   ├── ProcessingState.tsx   # Animated "LLM is working" indicator
│       │   └── StepNavigation.tsx    # Back / Skip / Continue buttons
│       └── Dashboard/
│           ├── DocumentsDashboard.tsx   # Replaces Dashboard.tsx — onboarding + categories
│           ├── OnboardingHero.tsx       # Welcome card with CTA
│           └── DocumentCategoryGrid.tsx # Category section with doc cards + empty slots
```

### Files to modify

```
web-ui/src/
├── types/
│   ├── studio.ts                    # Add MicroStep, BuilderState-related types
│   └── sse.ts                       # Add processing_status, micro_step, section_transition events
├── components/
│   └── studio/
│       ├── Workflow/
│       │   └── SectionBar.tsx       # Add 'skipped' status visual
│       └── Preview/
│           ├── PreviewPanel.tsx      # Wire to builderStore instead of conversationStore
│           └── DocumentPreview.tsx   # Add streaming text cursor effect
├── pages/
│   └── StudioPage.tsx               # Wire DocumentsDashboard + BuilderView
```

### Files to remove (after integration)

```
web-ui/src/stores/conversationStore.ts        # Replaced by builderStore
web-ui/src/components/studio/Workflow/WorkflowView.tsx      # Replaced by BuilderView
web-ui/src/components/studio/Workflow/ImmersiveZone.tsx      # Replaced by StepSlide + MicroTimeline
web-ui/src/components/studio/Workflow/InputBar.tsx           # Replaced by inline input in StepSlide
web-ui/src/components/studio/Workflow/blocks/AgentBubble.tsx # Replaced by AgentPrompt
web-ui/src/components/studio/Dashboard/Dashboard.tsx         # Replaced by DocumentsDashboard
```

---

## Task 1: DocumentsDashboard (Onboarding + Categories)

**Files:**
- Create: `web-ui/src/components/studio/Dashboard/DocumentsDashboard.tsx`
- Create: `web-ui/src/components/studio/Dashboard/OnboardingHero.tsx`
- Create: `web-ui/src/components/studio/Dashboard/DocumentCategoryGrid.tsx`

### Interfaces

```typescript
// OnboardingHero.tsx
interface OnboardingHeroProps {
  onStartGameBrief: () => void
  projectName?: string
}

// DocumentCategoryGrid.tsx
interface DocumentCategory {
  id: string
  name: string
  icon: string              // emoji
  workflows: CategoryWorkflow[]
}

interface CategoryWorkflow {
  workflowId: string
  name: string
  icon: string              // emoji
  document?: StudioDocument // if created, else null (empty slot)
  repeatable: boolean       // brainstorming can have multiple
}

interface DocumentCategoryGridProps {
  categories: DocumentCategory[]
  onOpenDocument: (docId: string) => void
  onNewDocument: (workflowId: string) => void
}

// DocumentsDashboard.tsx
interface DocumentsDashboardProps {
  projectPath: string
  onOpenDocument: (docId: string) => void
  onNewDocument: (workflowId: string) => void
}
```

- [ ] **Step 1: Create OnboardingHero component**

  File: `web-ui/src/components/studio/Dashboard/OnboardingHero.tsx`

  - Gradient background using `bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10`
  - Glow effect with `shadow-lg shadow-primary/10`
  - Title: "Build your game, step by step"
  - CTA button using existing `<Button>` component: "Start with Game Brief"
  - Subtitle below: "or choose a document type below"
  - Accepts `projectName` to personalize greeting
  - Uses framer-motion for entrance animation

- [ ] **Step 2: Create DocumentCategoryGrid component**

  File: `web-ui/src/components/studio/Dashboard/DocumentCategoryGrid.tsx`

  - Renders one section per category (Concept, Design, Technical, Production)
  - Each section: icon + name + progress count (`2/5`) + `[+ New]` button
  - Existing documents render as solid `DocumentCard` components (reuse existing)
  - Empty workflow slots render as dashed-border cards: `border-dashed border-border/40`
  - Clicking empty slot calls `onNewDocument(workflowId)`
  - Default categories hardcoded as constant:
    ```typescript
    const DEFAULT_CATEGORIES: DocumentCategory[] = [
      { id: 'concept', name: 'Concept', icon: '💡', workflows: [
        { workflowId: 'game-brief', name: 'Game Brief', icon: '🎮', repeatable: false },
        { workflowId: 'brainstorming', name: 'Brainstorming', icon: '📝', repeatable: true },
      ]},
      { id: 'design', name: 'Design', icon: '🎨', workflows: [
        { workflowId: 'gdd', name: 'GDD', icon: '📖', repeatable: false },
        { workflowId: 'level-design', name: 'Level Design', icon: '🗺️', repeatable: false },
        { workflowId: 'art-direction', name: 'Art Direction', icon: '🎨', repeatable: false },
        { workflowId: 'audio-design', name: 'Audio Design', icon: '🎵', repeatable: false },
        { workflowId: 'narrative', name: 'Narrative', icon: '📜', repeatable: false },
      ]},
      { id: 'technical', name: 'Technical', icon: '🏗️', workflows: [
        { workflowId: 'game-architecture', name: 'Game Architecture', icon: '🏛️', repeatable: false },
        { workflowId: 'diagrams', name: 'Diagrams', icon: '📊', repeatable: false },
      ]},
      { id: 'production', name: 'Production', icon: '📋', workflows: [
        { workflowId: 'sprint-planning', name: 'Sprint Planning', icon: '🗓️', repeatable: true },
        { workflowId: 'dev-stories', name: 'Dev Stories', icon: '📝', repeatable: true },
        { workflowId: 'code-review', name: 'Code Review', icon: '🔍', repeatable: true },
      ]},
    ]
    ```

- [ ] **Step 3: Create DocumentsDashboard component**

  File: `web-ui/src/components/studio/Dashboard/DocumentsDashboard.tsx`

  - Fetches documents from `/api/v2/studio/documents?project_path=...` on mount (same pattern as existing `Dashboard.tsx`)
  - Maps fetched `StudioDocument[]` to categories by matching `doc.meta.workflow_id` to category workflows
  - Shows `OnboardingHero` when `documents.length < 3`
  - Below hero (or alone if >= 3 docs): renders `DocumentCategoryGrid`
  - Loading state: skeleton cards using existing `Skeleton` component

- [ ] **Step 4: Verify with dev-browser**

  Open `http://localhost:3179` in the dev-browser, navigate to the Documents tab. Verify:
  - Hero shows when < 3 documents
  - Categories display with correct icons
  - Empty slots show dashed borders
  - Existing documents show status badges

---

## Task 2: BuilderStore (New Zustand Store)

**Files:**
- Create: `web-ui/src/stores/builderStore.ts`
- Modify: `web-ui/src/types/studio.ts`
- Modify: `web-ui/src/types/sse.ts`

- [ ] **Step 1: Add new types to `studio.ts`**

  Add after existing types in `web-ui/src/types/studio.ts`:

  ```typescript
  // --- Builder types (micro-step paradigm) ---

  export type MicroStepStatus = 'active' | 'answered' | 'skipped'

  export interface MicroStep {
    id: string
    agentPrompt: string            // markdown content from the LLM
    interactionType: InteractionBlockType | null
    interactionData: InteractionData | null
    userResponse: string | null    // what the user answered
    summary: string | null         // one-line summary for collapsed card
    status: MicroStepStatus
  }

  export type SectionBarStatus = SectionStatus | 'skipped'

  export interface AgentPersona {
    id: string
    name: string
    emoji: string
  }
  ```

- [ ] **Step 2: Add new SSE event types to `sse.ts`**

  Add to the `SSEEventType` union in `web-ui/src/types/sse.ts`:
  ```typescript
  | 'processing_status'
  | 'micro_step'
  | 'section_transition'
  ```

  Add new event data interfaces:
  ```typescript
  export interface ProcessingStatusEvent {
    text: string
  }

  export interface MicroStepEvent {
    prompt: string
    interaction_type: InteractionBlockType | null
    interaction_data: Record<string, unknown> | null
  }

  export interface SectionTransitionEvent {
    from_section: string
    to_section: string
  }
  ```

  Add them to the `SSEEventData` union.

- [ ] **Step 3: Create `builderStore.ts`**

  File: `web-ui/src/stores/builderStore.ts`

  This is the most critical piece. Full store implementation:

  ```typescript
  import { create } from 'zustand'
  import { streamSSE, StreamBatcher } from '@/services/sse'
  import type {
    SSEEvent, TextDeltaEvent, TextDoneEvent, InteractionBlockEvent,
    DocumentUpdateEvent, ToolCallEvent, ToolResultEvent, PrototypeReadyEvent,
    SectionCompleteEvent, UsageEvent, ErrorSSEEvent, ThinkingEvent,
    ProcessingStatusEvent, MicroStepEvent, SectionTransitionEvent,
  } from '@/types/sse'
  import type {
    SectionStatus, Prototype, WorkflowV2, WorkflowSection,
    MicroStep, MicroStepStatus, AgentPersona,
  } from '@/types/studio'
  import type { InteractionBlockType, InteractionData } from '@/types/interactions'

  // --- Helper: generate unique ID ---
  let stepCounter = 0
  function nextStepId(): string {
    return `step-${++stepCounter}-${Date.now()}`
  }

  // --- Agent persona map ---
  const AGENT_PERSONAS: Record<string, AgentPersona> = {
    'game-designer': { id: 'game-designer', name: 'Zelda', emoji: '🎲' },
    'game-architect': { id: 'game-architect', name: 'Solid', emoji: '🏗️' },
    'game-dev': { id: 'game-dev', name: 'Ada', emoji: '💻' },
    'solo-dev': { id: 'solo-dev', name: 'Indie', emoji: '⚡' },
    'level-designer': { id: 'level-designer', name: 'Lara', emoji: '🗺️' },
    '3d-artist': { id: '3d-artist', name: 'Navi', emoji: '🎨' },
    'game-qa': { id: 'game-qa', name: 'Tester', emoji: '🔍' },
    'scrum-master': { id: 'scrum-master', name: 'Coach', emoji: '📋' },
    'unreal-agent': { id: 'unreal-agent', name: 'Epic', emoji: '🎮' },
  }

  // --- Store Interface ---

  interface BuilderState {
    // Workflow context
    workflow: WorkflowV2 | null
    projectPath: string
    agent: AgentPersona

    // Document
    documentId: string | null
    sectionStatuses: Record<string, SectionStatus>

    // Current position
    activeSection: string | null
    microSteps: MicroStep[]
    activeMicroStepIndex: number

    // Streaming / processing
    isProcessing: boolean
    processingText: string       // "Writing Vision section..."
    currentStreamText: string    // text being streamed (accumulator)
    error: string | null

    // Prototypes
    prototypes: Prototype[]

    // Token usage
    inputTokens: number
    outputTokens: number

    // Actions
    initWorkflow: (workflow: WorkflowV2, projectPath: string) => void
    submitResponse: (response: string) => Promise<void>
    skipSection: () => void
    goBack: () => void
    jumpToSection: (sectionId: string) => void
    jumpToMicroStep: (index: number) => void
    reset: () => void
  }

  // --- Initial state ---
  const INITIAL_STATE = {
    workflow: null,
    projectPath: '',
    agent: { id: 'game-designer', name: 'Agent', emoji: '🤖' },
    documentId: null,
    sectionStatuses: {},
    activeSection: null,
    microSteps: [],
    activeMicroStepIndex: 0,
    isProcessing: false,
    processingText: '',
    currentStreamText: '',
    error: null,
    prototypes: [],
    inputTokens: 0,
    outputTokens: 0,
  }

  // --- Store ---

  export const useBuilderStore = create<BuilderState>()((set, get) => {
    let abortController: AbortController | null = null

    /**
     * Internal: send a message to the SSE endpoint and process events.
     * This transforms SSE events into the micro-step model:
     * - text_delta/text_done -> builds the agentPrompt of the current micro-step
     * - interaction_block -> sets interactionType/Data on the current micro-step
     * - processing_status -> updates processingText
     * - micro_step -> creates a new MicroStep from the LLM
     * - section_transition -> moves to next section, resets timeline
     * - document_update/section_complete -> updates sectionStatuses
     */
    async function sendToSSE(message: string, options: {
      hidden?: boolean
      sectionFocus?: string
      language?: string
    } = {}) {
      abortController?.abort()
      abortController = new AbortController()

      const state = get()
      if (!state.workflow) return

      // Mark current step as answered if it was active and we have user input
      if (!options.hidden && state.microSteps.length > 0) {
        const steps = [...state.microSteps]
        const activeStep = steps[state.activeMicroStepIndex]
        if (activeStep && activeStep.status === 'active') {
          steps[state.activeMicroStepIndex] = {
            ...activeStep,
            userResponse: message,
            status: 'answered',
            summary: message.length > 60 ? message.slice(0, 57) + '...' : message,
          }
        }
        set({ microSteps: steps })
      }

      // Create a new micro-step for the agent's response
      const newStep: MicroStep = {
        id: nextStepId(),
        agentPrompt: '',
        interactionType: null,
        interactionData: null,
        userResponse: null,
        summary: null,
        status: 'active',
      }

      set(s => ({
        isProcessing: true,
        error: null,
        currentStreamText: '',
        processingText: '',
        microSteps: [...s.microSteps, newStep],
        activeMicroStepIndex: s.microSteps.length, // point to the new step
      }))

      const batcher = new StreamBatcher<SSEEvent>((batch) => {
        const s = get()
        let streamText = s.currentStreamText
        let procText = s.processingText
        const steps = [...s.microSteps]
        const activeIdx = s.activeMicroStepIndex
        let statuses = { ...s.sectionStatuses }
        let protos = [...s.prototypes]
        let section = s.activeSection
        let inTkn = s.inputTokens
        let outTkn = s.outputTokens

        for (const event of batch) {
          switch (event.type) {
            case 'text_delta': {
              const d = event.data as TextDeltaEvent
              streamText += d.content
              break
            }
            case 'text_done': {
              const d = event.data as TextDoneEvent
              // Finalize the agent prompt on the active micro-step
              if (steps[activeIdx]) {
                steps[activeIdx] = {
                  ...steps[activeIdx],
                  agentPrompt: d.content,
                }
              }
              streamText = ''
              break
            }
            case 'interaction_block': {
              const d = event.data as InteractionBlockEvent
              if (steps[activeIdx]) {
                steps[activeIdx] = {
                  ...steps[activeIdx],
                  interactionType: d.block_type as InteractionBlockType,
                  interactionData: d.data as unknown as InteractionData,
                }
              }
              break
            }
            case 'processing_status': {
              const d = event.data as ProcessingStatusEvent
              procText = d.text
              break
            }
            case 'micro_step': {
              const d = event.data as MicroStepEvent
              // The backend explicitly sent a new micro-step (alternative to text_done)
              if (steps[activeIdx]) {
                steps[activeIdx] = {
                  ...steps[activeIdx],
                  agentPrompt: d.prompt,
                  interactionType: d.interaction_type as InteractionBlockType | null,
                  interactionData: d.interaction_data as unknown as InteractionData | null,
                }
              }
              break
            }
            case 'section_transition': {
              const d = event.data as SectionTransitionEvent
              statuses[d.from_section] = 'complete'
              section = d.to_section
              // Timeline resets on section change — keep only the latest active step
              const lastStep = steps[steps.length - 1]
              steps.length = 0
              if (lastStep) steps.push(lastStep)
              break
            }
            case 'document_update': {
              const d = event.data as DocumentUpdateEvent
              statuses[d.section_id] = d.status as SectionStatus
              if (d.status === 'in_progress') section = d.section_id
              break
            }
            case 'section_complete': {
              const d = event.data as SectionCompleteEvent
              statuses[d.section_id] = 'complete'
              break
            }
            case 'prototype_ready': {
              const d = event.data as PrototypeReadyEvent
              protos.push({ title: d.title, html: d.html })
              break
            }
            case 'thinking': {
              // Show as processing text
              const d = event.data as ThinkingEvent
              if (d.content) procText = d.content.slice(0, 100)
              break
            }
            case 'usage': {
              const d = event.data as UsageEvent
              inTkn = d.input_tokens
              outTkn += d.output_tokens
              break
            }
            case 'error': {
              const d = event.data as ErrorSSEEvent
              set({ error: d.message })
              break
            }
          }
        }

        set({
          currentStreamText: streamText,
          processingText: procText,
          microSteps: steps,
          sectionStatuses: statuses,
          prototypes: protos,
          activeSection: section,
          inputTokens: inTkn,
          outputTokens: outTkn,
        })
      })

      try {
        const stream = streamSSE({
          url: '/api/v2/studio/chat',
          body: {
            message,
            agent: state.workflow.agents.primary,
            workflow_id: state.workflow.id,
            section_focus: options.sectionFocus || state.activeSection || '',
            language: options.language || 'en',
            project_path: state.projectPath,
          },
          signal: abortController.signal,
        })

        for await (const event of stream) {
          batcher.push(event)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          set({ error: (e as Error).message })
        }
      } finally {
        batcher.destroy()
        set({ isProcessing: false, processingText: '' })
      }
    }

    return {
      ...INITIAL_STATE,

      initWorkflow: (workflow, projectPath) => {
        abortController?.abort()
        stepCounter = 0
        const persona = AGENT_PERSONAS[workflow.agents.primary] || {
          id: workflow.agents.primary,
          name: workflow.agents.primary,
          emoji: '🤖',
        }
        set({
          ...INITIAL_STATE,
          workflow,
          projectPath,
          agent: persona,
        })

        // Auto-start: send the init message
        const sectionList = workflow.sections
          .map(s => `- ${s.name}${s.required ? ' (required)' : ' (optional)'}`)
          .join('\n')

        const initMessage = [
          `[WORKFLOW_START]`,
          `Workflow: ${workflow.name}`,
          `Description: ${workflow.description}`,
          `Sections to fill:\n${sectionList}`,
          ``,
          `Greet the user and start the workflow. Introduce yourself with your persona.`,
          `Propose how to get started: either answer some questions to fill the document,`,
          `or upload an existing document/brief to pre-fill sections.`,
          `Show a choices block with: "Start from scratch", "Upload existing document", "Quick start (fill basics fast)".`,
        ].join('\n')

        sendToSSE(initMessage, { hidden: true })
      },

      submitResponse: async (response) => {
        await sendToSSE(response)
      },

      skipSection: () => {
        const { activeSection, workflow } = get()
        if (!activeSection || !workflow) return
        // Mark current section as skipped (todo), move to next
        set(s => ({
          sectionStatuses: { ...s.sectionStatuses, [activeSection]: 'todo' },
        }))
        sendToSSE(`[SKIP_SECTION] User skipped the "${activeSection}" section. Move to the next section.`, { hidden: true })
      },

      goBack: () => {
        const { activeMicroStepIndex, microSteps } = get()
        if (activeMicroStepIndex <= 0) return
        const prevIdx = activeMicroStepIndex - 1
        // Re-activate the previous step
        const steps = [...microSteps]
        steps[prevIdx] = { ...steps[prevIdx], status: 'active' }
        set({ activeMicroStepIndex: prevIdx, microSteps: steps })
      },

      jumpToSection: (sectionId) => {
        sendToSSE(`Let's work on the ${sectionId} section.`, { sectionFocus: sectionId })
      },

      jumpToMicroStep: (index) => {
        const { microSteps } = get()
        if (index < 0 || index >= microSteps.length) return
        set({ activeMicroStepIndex: index })
      },

      reset: () => {
        abortController?.abort()
        stepCounter = 0
        set(INITIAL_STATE)
      },
    }
  })
  ```

  Key patterns:
  - Same `streamSSE` + `StreamBatcher` pattern as `conversationStore.ts`
  - Same SSE endpoint `/api/v2/studio/chat`
  - Transforms flat block stream into structured micro-steps
  - `initWorkflow` replaces the `useEffect` auto-start in old `WorkflowView`
  - New SSE events (`processing_status`, `micro_step`, `section_transition`) handled gracefully — if backend doesn't send them yet, old events still work

- [ ] **Step 4: Verify types compile**

  Run `cd /Users/gdebeauchesne/Projects/unreal-companion/web-ui && npx tsc --noEmit` and fix any type errors.

---

## Task 3: BuilderView Layout

**Files:**
- Create: `web-ui/src/components/studio/Builder/BuilderView.tsx`
- Modify: `web-ui/src/components/studio/Workflow/SectionBar.tsx` (add skipped state)

- [ ] **Step 1: Update SectionBar with skipped status**

  In `web-ui/src/components/studio/Workflow/SectionBar.tsx`, add to `statusIndicator`:
  ```typescript
  case 'todo': return 'bg-orange-400/60 ring-1 ring-orange-400/30'  // skipped visual
  ```

  The SectionBar component is reused as-is — it already accepts `SectionStatus` which includes `'todo'`.

- [ ] **Step 2: Create BuilderView component**

  File: `web-ui/src/components/studio/Builder/BuilderView.tsx`

  ```typescript
  interface BuilderViewProps {
    workflow: WorkflowV2
    projectPath: string
  }
  ```

  Layout structure (3-panel):
  ```
  <div className="flex h-full flex-col">
    {/* Section Bar (top, full width) */}
    <SectionBar
      sections={workflow.sections}
      statuses={sectionStatuses}
      activeSection={activeSection}
      onSectionClick={jumpToSection}
    />

    {/* Main area: 3-column flex */}
    <div className="flex flex-1 overflow-hidden">
      {/* Left: MicroTimeline (w-64, shrink-0) */}
      <MicroTimeline ... />

      {/* Center: StepSlide (flex-1) */}
      <StepSlide ... />

      {/* Right: PreviewPanel (w-[400px], shrink-0) */}
      <PreviewPanel ... />
    </div>
  </div>
  ```

  Implementation details:
  - Reads all state from `useBuilderStore()`
  - Calls `initWorkflow(workflow, projectPath)` on mount via `useEffect` (with `hasInitialized` ref guard, same pattern as old `WorkflowView`)
  - Passes props down to child components — no business logic in this component
  - `PreviewPanel` receives `sectionStatuses`, `prototypes`, `workflow.sections` from the store
  - For `PreviewPanel.onSectionClick` and `PreviewPanel.onDocumentClick`, delegate to `jumpToSection` and a no-op respectively

- [ ] **Step 3: Verify with dev-browser**

  Temporarily wire `BuilderView` into `StudioPage.tsx` in place of `WorkflowView` (just the import swap) to confirm the layout renders. The child components will be placeholder `<div>` elements initially if they don't exist yet — create them as empty stubs returning their name in a bordered box so the layout is visible.

---

## Task 4: StepSlide + AgentPrompt

**Files:**
- Create: `web-ui/src/components/studio/Builder/AgentPrompt.tsx`
- Create: `web-ui/src/components/studio/Builder/StepSlide.tsx`

- [ ] **Step 1: Create AgentPrompt component**

  File: `web-ui/src/components/studio/Builder/AgentPrompt.tsx`

  ```typescript
  interface AgentPromptProps {
    content: string           // markdown from the LLM
    agentName: string
    agentEmoji: string
    isStreaming?: boolean      // show cursor animation
    streamingText?: string    // live text being streamed (before text_done)
  }
  ```

  Rendering:
  - NOT a chat bubble — it's an instruction/prompt area
  - Agent avatar + name header: `<div className="flex items-center gap-2 mb-3">`
    - Emoji in a small circle: `h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-sm`
    - Name in `text-xs font-semibold text-primary`
  - Content: `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with prose styling
    - Use same prose classes as old `AgentBubble` but without the bubble container
    - `prose prose-sm prose-invert max-w-none text-foreground`
  - If `isStreaming && streamingText`, render `streamingText` instead of `content`, with a blinking cursor: `<span className="animate-pulse text-primary">|</span>`

- [ ] **Step 2: Create StepSlide component**

  File: `web-ui/src/components/studio/Builder/StepSlide.tsx`

  ```typescript
  interface StepSlideProps {
    microStep: MicroStep | null
    streamingText: string
    isProcessing: boolean
    processingText: string
    agentName: string
    agentEmoji: string
    onSubmitResponse: (response: string) => void
    onInteractionResponse: (response: string) => void
  }
  ```

  Layout (vertical, centered, max-w-2xl mx-auto):
  ```
  <div className="flex flex-1 flex-col overflow-y-auto p-6">
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">

      {/* Processing state — shown when isProcessing and no prompt yet */}
      {isProcessing && !microStep?.agentPrompt && (
        <ProcessingState text={processingText} agentName={agentName} agentEmoji={agentEmoji} />
      )}

      {/* Agent Prompt */}
      {microStep?.agentPrompt && (
        <AgentPrompt
          content={microStep.agentPrompt}
          agentName={agentName}
          agentEmoji={agentEmoji}
          isStreaming={isProcessing}
          streamingText={streamingText}
        />
      )}

      {/* Interaction Component */}
      {microStep?.interactionType && microStep.interactionData && (
        <InteractionRenderer
          type={microStep.interactionType}
          data={microStep.interactionData}
          onResponse={onInteractionResponse}
          disabled={isProcessing}
        />
      )}

      {/* Text Input — always available */}
      <TextInput
        onSubmit={onSubmitResponse}
        disabled={isProcessing}
        placeholder="Add details..."
      />
    </div>
  </div>
  ```

  Internal components within StepSlide:

  `InteractionRenderer` — switch on type, renders the appropriate block:
  ```typescript
  function InteractionRenderer({ type, data, onResponse, disabled }: {
    type: InteractionBlockType
    data: InteractionData
    onResponse: (response: string) => void
    disabled: boolean
  }) {
    switch (type) {
      case 'choices': return <ChoicesBlock data={data as ChoicesData} onSelect={ids => onResponse(ids.join(', '))} disabled={disabled} />
      case 'slider': return <SliderBlock data={data as SliderData} onSubmit={v => onResponse(String(v))} />
      case 'rating': return <RatingBlock data={data as RatingData} onSubmit={v => onResponse(String(v))} />
      case 'upload': return <UploadBlock data={data as UploadData} onUpload={() => onResponse('[file uploaded]')} />
      case 'confirm': return <ConfirmBlock data={data as ConfirmData} onConfirm={ok => onResponse(ok ? 'approved' : 'revise')} />
      default: return null
    }
  }
  ```

  `TextInput` — simple textarea (replaces InputBar):
  ```typescript
  function TextInput({ onSubmit, disabled, placeholder }: {
    onSubmit: (text: string) => void
    disabled: boolean
    placeholder: string
  }) {
    const [text, setText] = useState('')
    // Submit on Enter (not shift+Enter), same pattern as old InputBar
    // Label: "Add details..." not "Type your message..."
    // Styled as a form field: border-border/50 bg-card rounded-lg
  }
  ```

- [ ] **Step 3: Verify with dev-browser**

  Open a workflow in the browser. Verify:
  - Agent prompt renders as markdown without bubble styling
  - Interaction blocks (choices, slider) render below the prompt
  - Text input is always visible at the bottom
  - Streaming text shows with cursor animation

---

## Task 5: MicroTimeline

**Files:**
- Create: `web-ui/src/components/studio/Builder/MicroStepCard.tsx`
- Create: `web-ui/src/components/studio/Builder/MicroTimeline.tsx`

- [ ] **Step 1: Create MicroStepCard component**

  File: `web-ui/src/components/studio/Builder/MicroStepCard.tsx`

  ```typescript
  interface MicroStepCardProps {
    step: MicroStep
    index: number
    isActive: boolean
    onClick: () => void
  }
  ```

  Rendering:
  - Compact card: `p-2 rounded-lg border transition-all cursor-pointer`
  - Active: `border-primary bg-primary/5` + `ring-1 ring-primary/30`
  - Answered: `border-border/30 bg-card/50`
  - Status icon on the left:
    - Active: `●` in primary color, pulsing
    - Answered: `✓` in green
    - Skipped: `⊘` in orange
  - One-line summary of the question (truncate `agentPrompt` to first sentence or 50 chars)
  - If answered: user response abbreviated below in `text-xs text-muted-foreground`
  - Format: `✓ Game name and genre → "Tactical Hearts — Tactical RPG"`

- [ ] **Step 2: Create MicroTimeline component**

  File: `web-ui/src/components/studio/Builder/MicroTimeline.tsx`

  ```typescript
  interface MicroTimelineProps {
    microSteps: MicroStep[]
    activeMicroStepIndex: number
    onStepClick: (index: number) => void
  }
  ```

  Layout:
  - Left sidebar: `w-64 shrink-0 border-r border-border/30 bg-card/30 overflow-y-auto`
  - Header: active section name in `text-xs font-semibold uppercase tracking-wider text-muted-foreground p-3`
  - List of `MicroStepCard` components, one per micro-step
  - Active card auto-scrolls into view via `useEffect` + `scrollIntoView`
  - Connecting line between cards: `before:absolute before:left-[19px] before:top-0 before:h-full before:w-px before:bg-border/30` on parent container (vertical timeline line)

- [ ] **Step 3: Verify with dev-browser**

  Open a workflow, answer a few questions. Verify:
  - Timeline shows on the left with collapsed cards
  - Active card is highlighted
  - Clicking a previous card jumps to it
  - Cards show status icons and summaries

---

## Task 6: ProcessingState

**Files:**
- Create: `web-ui/src/components/studio/Builder/ProcessingState.tsx`

- [ ] **Step 1: Create ProcessingState component**

  File: `web-ui/src/components/studio/Builder/ProcessingState.tsx`

  ```typescript
  interface ProcessingStateProps {
    text: string          // "Writing Vision section..." or empty
    agentName: string
    agentEmoji: string
  }
  ```

  Rendering:
  - Container: `rounded-xl border border-border/30 bg-card/50 p-6`
  - Header: `{agentEmoji} {agentName} is working...` in `text-sm font-medium`
  - Animated bouncing dots (reuse pattern from old `ImmersiveZone`):
    ```
    <div className="flex gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
    </div>
    ```
  - Processing text below dots: `text-xs text-muted-foreground` with a typing animation
  - If `text` is empty, show generic "Thinking..."
  - Subtle pulse animation on the whole container: `animate-pulse` at reduced opacity

---

## Task 7: StepNavigation

**Files:**
- Create: `web-ui/src/components/studio/Builder/StepNavigation.tsx`

- [ ] **Step 1: Create StepNavigation component**

  File: `web-ui/src/components/studio/Builder/StepNavigation.tsx`

  ```typescript
  interface StepNavigationProps {
    onBack: () => void
    onSkip: () => void
    onContinue: () => void
    canGoBack: boolean          // false if at first micro-step
    isProcessing: boolean       // disable all while LLM works
    hasResponse: boolean        // enable Continue only if user responded
  }
  ```

  Layout:
  - Fixed at bottom of the StepSlide area: `border-t border-border/30 bg-background/80 backdrop-blur px-6 py-3`
  - Three buttons in a flex row with `justify-between`:
    - Left: `<Button variant="ghost" size="sm" disabled={!canGoBack || isProcessing}>`
      - `<ArrowLeft className="h-4 w-4 mr-2" /> Back`
    - Center: `<Button variant="ghost" size="sm" disabled={isProcessing}>`
      - `Skip for now` in muted style
    - Right: `<Button size="sm" disabled={isProcessing || !hasResponse}>`
      - `Continue <ArrowRight className="h-4 w-4 ml-2" />`
      - Primary style: `bg-primary text-primary-foreground`

- [ ] **Step 2: Wire StepNavigation into StepSlide**

  Update `StepSlide.tsx` to include `<StepNavigation>` at the bottom, outside the scrollable area:
  ```
  <div className="flex flex-1 flex-col">
    <div className="flex-1 overflow-y-auto p-6">
      {/* ... AgentPrompt, Interaction, TextInput ... */}
    </div>
    <StepNavigation
      onBack={...}
      onSkip={...}
      onContinue={...}
      canGoBack={activeMicroStepIndex > 0}
      isProcessing={isProcessing}
      hasResponse={/* text input has content OR interaction was used */}
    />
  </div>
  ```

  `onContinue` calls `submitResponse()` from the builder store with the text input value. If the user used an interaction component (choices, slider), that already called `submitResponse` via `onInteractionResponse`. So `Continue` is for the text-only case.

- [ ] **Step 3: Verify with dev-browser**

  Open a workflow. Verify:
  - Back button disabled on first step, enabled after answering
  - Skip marks section as TODO and moves to next
  - Continue submits and triggers LLM processing
  - All buttons disabled while processing

---

## Task 8: Integration

**Files:**
- Modify: `web-ui/src/components/pages/StudioPage.tsx`
- Modify: `web-ui/src/components/studio/Preview/PreviewPanel.tsx`

- [ ] **Step 1: Wire BuilderView into StudioPage**

  In `web-ui/src/components/pages/StudioPage.tsx`:

  1. Replace the import of `Dashboard` with `DocumentsDashboard`:
     ```typescript
     import { DocumentsDashboard } from '@/components/studio/Dashboard/DocumentsDashboard'
     ```

  2. Replace the import of `WorkflowView` with `BuilderView`:
     ```typescript
     import { BuilderView } from '@/components/studio/Builder/BuilderView'
     ```

  3. Remove the import of `useConversationStore` — it's no longer needed in StudioPage.
     The `resetConversation` call in `handleBackFromV2Workflow` becomes `useBuilderStore.getState().reset()`.

  4. In the `studioWorkflow` view render block, replace:
     ```tsx
     <WorkflowView workflow={activeV2Workflow} />
     ```
     with:
     ```tsx
     <BuilderView workflow={activeV2Workflow} projectPath={projectPath} />
     ```

  5. In the `documents` view render block, replace:
     ```tsx
     <Dashboard
       projectPath={projectPath}
       onOpenDocument={handleOpenDocument}
       onNewDocument={() => setNewDocModalOpen(true)}
     />
     ```
     with:
     ```tsx
     <DocumentsDashboard
       projectPath={projectPath}
       onOpenDocument={handleOpenDocument}
       onNewDocument={handleSelectV2Workflow}
     />
     ```
     Note: `onNewDocument` now receives a `workflowId` string directly from the category grid, so it calls `handleSelectV2Workflow` instead of opening a modal.

- [ ] **Step 2: Wire PreviewPanel to builderStore**

  In `web-ui/src/components/studio/Preview/PreviewPanel.tsx`, the component already accepts props. The wiring happens in `BuilderView.tsx` which passes builderStore state as props. No changes needed to PreviewPanel itself — it's already decoupled via props.

  However, verify that `DocumentPreview` renders correctly with the builderStore's `sectionStatuses`. The existing `DocumentPreview` component uses `WorkflowSection[]` and `Record<string, SectionStatus>` which are the same types the builderStore provides.

- [ ] **Step 3: TypeScript compilation check**

  Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/web-ui && npx tsc --noEmit`

  Fix any type errors. Common issues:
  - Missing imports in new files
  - `InteractionData` type narrowing in `InteractionRenderer`
  - `SSEEventData` union not updated with new event types

- [ ] **Step 4: End-to-end test with dev-browser**

  1. Start the dev server: `cd /Users/gdebeauchesne/Projects/unreal-companion/web-ui && npm run dev:all`
  2. Open `http://localhost:3179` in dev-browser
  3. Navigate to Documents tab:
     - Verify OnboardingHero shows (if < 3 docs)
     - Verify category grid with document cards and empty slots
  4. Click "Start with Game Brief" or an empty slot:
     - Verify BuilderView opens with SectionBar at top
     - Verify MicroTimeline on left (empty initially)
     - Verify StepSlide in center shows processing state
     - Verify PreviewPanel on right with doc/graph/proto tabs
  5. Wait for LLM response:
     - Verify AgentPrompt renders markdown (no bubble)
     - Verify interaction block (choices) renders below prompt
     - Verify text input is visible below interaction
  6. Answer a question:
     - Verify previous step collapses into MicroTimeline card
     - Verify new step appears in StepSlide
     - Verify StepNavigation Back button is now enabled
  7. Click Back:
     - Verify previous step re-expands
  8. Click Skip:
     - Verify section marked as TODO in SectionBar
     - Verify timeline resets for next section

- [ ] **Step 5: Clean up old files**

  Once everything works:
  1. Delete `web-ui/src/stores/conversationStore.ts`
  2. Delete `web-ui/src/components/studio/Workflow/WorkflowView.tsx`
  3. Delete `web-ui/src/components/studio/Workflow/ImmersiveZone.tsx`
  4. Delete `web-ui/src/components/studio/Workflow/InputBar.tsx`
  5. Delete `web-ui/src/components/studio/Workflow/blocks/AgentBubble.tsx`
  6. Delete `web-ui/src/components/studio/Dashboard/Dashboard.tsx`
  7. Run `npx tsc --noEmit` to ensure no dangling imports reference deleted files
  8. Search for any remaining imports of deleted modules: `grep -r "conversationStore\|WorkflowView\|ImmersiveZone\|InputBar\|AgentBubble\|from.*Dashboard/Dashboard" web-ui/src/`

---

### Task 9: Backend — Processing Status Event + Conversation Persistence

**Files:**
- Modify: `web-ui/server/services/llm_engine/events.py`
- Modify: `web-ui/server/services/llm_engine/interceptors.py`
- Modify: `web-ui/server/api/studio_v2.py`

- [ ] **Step 1: Add ProcessingStatus SSE event**

In `web-ui/server/services/llm_engine/events.py`, add after the `ThinkingEvent` class:

```python
@dataclass
class ProcessingStatus(SSEEvent):
    event: EventType = field(default="processing_status", init=False)
    text: str = ""  # e.g., "Writing Vision section...", "Analyzing references..."
```

Update the `EventType` literal to include `"processing_status"`.

Update `__init__.py` exports to include `ProcessingStatus`.

- [ ] **Step 2: Add processing_status interceptor tool**

In `web-ui/server/services/llm_engine/interceptors.py`:

Add `"report_progress"` to `INTERCEPTOR_NAMES`.

Add tool definition to `INTERCEPTOR_TOOLS`:
```python
{
    "name": "report_progress",
    "description": "Report what you're currently doing to the user. Call this before starting a lengthy operation like writing a document section or generating a prototype.",
    "input_schema": {
        "type": "object",
        "properties": {
            "status": {"type": "string", "description": "What you're doing, e.g., 'Writing the Vision section...'"},
        },
        "required": ["status"],
    },
},
```

Add handler in `handle_interceptor`:
```python
elif tool_name == "report_progress":
    events.append(ProcessingStatus(text=tool_input.get("status", "")))
```

- [ ] **Step 3: Add conversation persistence to chat endpoint**

In `web-ui/server/api/studio_v2.py`, modify the `/chat` endpoint:

After the agentic loop completes, save the conversation:
```python
# After the stream ends, save conversation linked to document
# The conversation_id is passed from the frontend
# If a document is being built, update its meta.json with the conversation_id
if request.workflow_id and request.project_path:
    try:
        doc_store = DocumentStore(request.project_path)
        # The document ID comes from the workflow_id (e.g., "game-brief" -> "concept/game-brief")
        # The frontend should pass document_id in future — for now, infer from workflow
    except Exception:
        pass
```

- [ ] **Step 4: Add document reload on builder open**

In the `builderStore.ts` (already created in Task 2), ensure `startWorkflow` loads existing document state:

The `startWorkflow` action should:
1. Call `GET /api/v2/studio/documents/{docId}?project_path=...` to check if a document exists
2. If it exists, populate `sectionStatuses` from the document's `meta.json` sections
3. If sections are already filled, mark them as `complete` in the section bar
4. Then send the init message (the LLM will see the existing document in its system prompt context)

- [ ] **Step 5: Run all tests**

```bash
cd /Users/gdebeauchesne/Projects/unreal-companion
npm run test:web    # Backend tests
cd web-ui && npx tsc --noEmit   # TypeScript check
```

- [ ] **Step 6: Verify with dev-browser**

Test the full lifecycle:
1. Start a Game Brief workflow, fill 2 sections
2. Click "Back to Documents"
3. Click the Game Brief card again
4. Verify: section bar shows sections 1-2 as complete, builder starts at section 3
5. Verify: preview panel shows the previously filled content

---

### Task 10: Smart Project Context — Compact Summary + On-Demand Document Access

**Files:**
- Create: `web-ui/server/services/project_context.py`
- Modify: `web-ui/server/services/llm_engine/system_prompt.py`
- Modify: `web-ui/server/services/llm_engine/interceptors.py`
- Modify: `web-ui/server/api/studio_v2.py`

The problem: dumping all project documents into the system prompt wastes tokens and can exceed the context window. Instead, the LLM gets a compact summary and can fetch specific documents on demand.

- [ ] **Step 1: Create project context service**

```python
# web-ui/server/services/project_context.py
"""
Smart project context — generates a compact summary of the project state
for injection into the LLM system prompt. Keeps it under 500 tokens.
The LLM uses a tool to read full documents when needed.
"""
import logging
from pathlib import Path
from services.document_store import DocumentStore

logger = logging.getLogger(__name__)


def build_project_summary(project_path: str) -> str:
    """
    Build a compact project summary for the system prompt.
    Lists documents with status but NOT their full content.
    Typically < 500 tokens.
    """
    if not project_path:
        return ""

    parts = ["## Project Context\n"]

    # Load project-context.md if it exists (human-written vision)
    context_file = Path(project_path) / ".unreal-companion" / "project-context.md"
    if context_file.exists():
        content = context_file.read_text(encoding="utf-8")
        # Take only the first 300 chars as a summary
        if len(content) > 300:
            content = content[:300] + "..."
        parts.append(f"### Project Vision\n{content}\n")

    # List existing documents with status (compact — no content)
    try:
        store = DocumentStore(project_path)
        docs = store.list_documents()
        if docs:
            parts.append("### Existing Documents\n")
            parts.append("| Document | Status | Sections |")
            parts.append("|----------|--------|----------|")
            for doc in docs:
                name = doc.get("name", doc.get("id", "?"))
                status = doc.get("status", "unknown")
                sections = doc.get("sections", {})
                filled = sum(1 for s in sections.values() if s.get("status") == "complete") if isinstance(sections, dict) else 0
                total = len(sections) if isinstance(sections, dict) else 0
                parts.append(f"| {name} | {status} | {filled}/{total} |")
            parts.append("")
            parts.append("Use the `read_project_document` tool to read any document's full content when needed.")
        else:
            parts.append("No documents created yet. This is a fresh project.\n")
    except Exception:
        parts.append("No documents found.\n")

    return "\n".join(parts)
```

- [ ] **Step 2: Add read_project_document tool to interceptors**

In `web-ui/server/services/llm_engine/interceptors.py`:

Add `"read_project_document"` to `INTERCEPTOR_NAMES`.

Add tool definition:
```python
{
    "name": "read_project_document",
    "description": "Read the full content of a project document. Use this when you need to reference or build upon an existing document (e.g., reading the Game Brief to inform the GDD).",
    "input_schema": {
        "type": "object",
        "properties": {
            "document_id": {"type": "string", "description": "Document ID (e.g., 'concept/game-brief', 'design/gdd')"},
        },
        "required": ["document_id"],
    },
},
```

This tool is NOT a normal interceptor — it returns content to the LLM, not an SSE event. Handle it specially in the agentic loop: instead of emitting SSE events, return the document content as the tool result.

In `handle_interceptor`, add:
```python
elif tool_name == "read_project_document":
    # This returns content, not SSE events — handled by agentic loop
    pass  # Actual reading done in the tool_executor
```

In `studio_v2.py`, modify the `tool_executor` to handle this tool:
```python
async def tool_executor(name: str, tool_input: dict) -> str:
    # Handle read_project_document locally (not via MCP)
    if name == "read_project_document":
        doc_id = tool_input.get("document_id", "")
        try:
            store = DocumentStore(request.project_path)
            content = store.get_document(doc_id)
            if content:
                return json.dumps({"success": True, "content": content[:4000]})
            return json.dumps({"success": False, "error": f"Document '{doc_id}' not found"})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    # All other tools → MCP bridge
    try:
        result = await execute_tool(name, tool_input)
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})
```

Remove `read_project_document` from `INTERCEPTOR_NAMES` since it's handled as a real tool (returns content to LLM, doesn't emit SSE).

- [ ] **Step 3: Replace document dump with smart context in system prompt**

In `web-ui/server/services/llm_engine/system_prompt.py`, add:
```python
def add_project_context(self, summary: str) -> "SystemPromptBuilder":
    """Add compact project context (document index, not full content)."""
    if summary.strip():
        return self.add("ProjectContext", summary, priority=15)
    return self
```

In `web-ui/server/api/studio_v2.py`, replace the document dump with the smart context:

Replace:
```python
# Load existing project documents for context
if request.project_path:
    try:
        doc_store = DocumentStore(request.project_path)
        existing_docs = doc_store.list_documents()
        ...
```

With:
```python
# Add compact project context (document index, not full dump)
if request.project_path:
    from services.project_context import build_project_summary
    summary = build_project_summary(request.project_path)
    builder.add_project_context(summary)
```

- [ ] **Step 4: Add `update_project_context` interceptor tool**

The project-context.md is written by the LLM itself — not auto-generated. The LLM summarizes
key facts after every document update, keeping a living summary of the project.

In `web-ui/server/services/llm_engine/interceptors.py`:

Add `"update_project_context"` to `INTERCEPTOR_NAMES`.

Add tool definition:
```python
{
    "name": "update_project_context",
    "description": "Update the project context summary with key decisions and facts. Call this EVERY TIME you write or update a document section. Summarize the important facts — game name, genre, core mechanics, target audience, key decisions made. Keep it concise (under 500 words). This context is read at the start of every future conversation so the entire studio knows the project state.",
    "input_schema": {
        "type": "object",
        "properties": {
            "summary": {
                "type": "string",
                "description": "The complete updated project context summary in markdown. Include: game identity, key design decisions, current status, important constraints."
            },
        },
        "required": ["summary"],
    },
},
```

In `handle_interceptor`, add:
```python
elif tool_name == "update_project_context":
    # Write the LLM-authored summary to project-context.md
    # The actual file write happens in the tool_executor (needs project_path)
    pass  # Handled by tool_executor
```

In `studio_v2.py`, handle in `tool_executor`:
```python
if name == "update_project_context":
    summary = tool_input.get("summary", "")
    try:
        context_path = Path(request.project_path) / ".unreal-companion" / "project-context.md"
        context_path.parent.mkdir(parents=True, exist_ok=True)
        context_path.write_text(summary, encoding="utf-8")
        return json.dumps({"success": True})
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})
```

Remove `update_project_context` from `INTERCEPTOR_NAMES` (it's a real tool that returns to LLM).

- [ ] **Step 4b: Add instruction in system prompt to use update_project_context**

In `system_prompt.py`, update the `INTERACTION_GUIDE` to include:
```
### Project Context
- After EVERY document section update, call `update_project_context` to refresh the project summary
- The summary should capture: game name, genre, core pillars, key mechanics, target audience, platforms, scope, and any important decisions
- Keep it under 500 words — it's read at the start of every future conversation
- Write it as a living document, not a log — replace with the latest state, don't append
```

---

### Task 11: Polish & UX — Animations, Celebrations, Agent Life, Shortcuts

This task turns the functional builder into a memorable experience. Every sub-step is independently implementable.

**Files:**
- Create: `web-ui/src/components/Studio/Builder/animations.css`
- Create: `web-ui/src/components/Studio/Builder/Confetti.tsx`
- Create: `web-ui/src/components/Studio/Builder/OnboardingTour.tsx`
- Create: `web-ui/src/components/Studio/Builder/ProgressRing.tsx`
- Modify: `web-ui/src/components/Studio/Builder/StepSlide.tsx`
- Modify: `web-ui/src/components/Studio/Builder/MicroTimeline.tsx`
- Modify: `web-ui/src/components/Studio/Builder/ProcessingState.tsx`
- Modify: `web-ui/src/components/Studio/Builder/SectionBar.tsx`
- Modify: `web-ui/src/components/Studio/Builder/BuilderView.tsx`
- Modify: `web-ui/src/components/Studio/Dashboard/DocumentsDashboard.tsx`

- [ ] **Step 1: Micro-animations and transitions**

Create `web-ui/src/components/Studio/Builder/animations.css`:

```css
/* Slide transitions between micro-steps */
.step-enter { opacity: 0; transform: translateX(20px); }
.step-enter-active { opacity: 1; transform: translateX(0); transition: all 0.3s ease-out; }
.step-exit { opacity: 1; transform: translateX(0); }
.step-exit-active { opacity: 0; transform: translateX(-20px); transition: all 0.3s ease-out; }

/* Stagger animation for choice cards */
.choice-stagger > * {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeSlideUp 0.3s ease-out forwards;
}
.choice-stagger > *:nth-child(1) { animation-delay: 0ms; }
.choice-stagger > *:nth-child(2) { animation-delay: 80ms; }
.choice-stagger > *:nth-child(3) { animation-delay: 160ms; }
.choice-stagger > *:nth-child(4) { animation-delay: 240ms; }
.choice-stagger > *:nth-child(5) { animation-delay: 320ms; }
.choice-stagger > *:nth-child(6) { animation-delay: 400ms; }

@keyframes fadeSlideUp {
  to { opacity: 1; transform: translateY(0); }
}

/* Section bar pulse on active */
.section-pulse {
  animation: sectionPulse 2s infinite;
}
@keyframes sectionPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.2); }
  50% { box-shadow: 0 0 0 4px rgba(0, 212, 255, 0.05); }
}

/* Preview typing cursor */
.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: hsl(var(--primary));
  animation: cursorBlink 1s infinite;
  vertical-align: text-bottom;
  margin-left: 1px;
}
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Section complete flash */
.section-complete-flash {
  animation: completeFlash 0.6s ease-out;
}
@keyframes completeFlash {
  0% { background: rgba(0, 217, 128, 0.3); }
  100% { background: rgba(0, 217, 128, 0.08); }
}

/* Timeline dot bounce on complete */
.dot-bounce {
  animation: dotBounce 0.4s ease-out;
}
@keyframes dotBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.5); }
  100% { transform: scale(1); }
}
```

Import this CSS in `BuilderView.tsx`:
```typescript
import './animations.css'
```

Apply classes:
- In `StepSlide`: wrap interaction components in `<div className="choice-stagger">` for cards
- In `SectionBar`: add `section-pulse` class to active section pill
- In `DocumentPreview`: use `typing-cursor` span at end of active section content

- [ ] **Step 2: Celebration moments**

Create `web-ui/src/components/Studio/Builder/Confetti.tsx`:

```typescript
import { useEffect, useState } from 'react'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number; x: number; y: number; color: string; rotation: number; scale: number
  }>>([])

  useEffect(() => {
    if (!trigger) return
    const colors = ['#00D4FF', '#00D980', '#FFB020', '#FF4CFF', '#FFF']
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,  // center area
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    }))
    setParticles(newParticles)
    const timer = setTimeout(() => {
      setParticles([])
      onComplete?.()
    }, 1500)
    return () => clearTimeout(timer)
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute h-2 w-2 rounded-full"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            animation: `confettiFall 1.5s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { top: -5%; opacity: 1; }
          100% { top: 100%; opacity: 0; transform: rotate(720deg) scale(0); }
        }
      `}</style>
    </div>
  )
}
```

In `BuilderView.tsx`, add confetti trigger:
```typescript
const [showConfetti, setShowConfetti] = useState(false)

// Listen for section completion in builderStore
useEffect(() => {
  // When a section transitions to complete, trigger confetti
  const unsubscribe = useBuilderStore.subscribe(
    (state) => state.sectionStatuses,
    (statuses, prevStatuses) => {
      const newlyComplete = Object.entries(statuses).find(
        ([id, s]) => s === 'complete' && prevStatuses[id] !== 'complete'
      )
      if (newlyComplete) setShowConfetti(true)
    }
  )
  return unsubscribe
}, [])

// In JSX:
<Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
```

- [ ] **Step 3: Agent "alive" — contextual thinking messages**

In `ProcessingState.tsx`, replace static "thinking..." with rotating contextual messages:

```typescript
interface ProcessingStateProps {
  agentName: string
  agentEmoji: string
  processingText?: string  // from SSE processing_status event
  sectionName?: string
}

export function ProcessingState({ agentName, agentEmoji, processingText, sectionName }: ProcessingStateProps) {
  const [dotCount, setDotCount] = useState(0)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  // Animated dots
  useEffect(() => {
    const timer = setInterval(() => setDotCount(d => (d + 1) % 4), 400)
    return () => clearInterval(timer)
  }, [])

  // Rotate fallback messages if no processingText from SSE
  const fallbackMessages = [
    `${agentEmoji} ${agentName} is thinking`,
    `Analyzing your response`,
    sectionName ? `Working on ${sectionName}` : `Preparing next question`,
    `Almost there`,
  ]
  useEffect(() => {
    if (processingText) return
    const timer = setInterval(() => setFallbackIdx(i => (i + 1) % fallbackMessages.length), 2500)
    return () => clearInterval(timer)
  }, [processingText])

  const displayText = processingText || fallbackMessages[fallbackIdx]
  const dots = '.'.repeat(dotCount)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/50 px-5 py-4">
      <div className="flex gap-1">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-muted-foreground transition-all duration-300">
        {displayText}{dots}
      </span>
    </div>
  )
}
```

Add agent emoji reactions in `StepSlide` — when user selects a choice, briefly show a reaction:

```typescript
const [agentReaction, setAgentReaction] = useState<string | null>(null)

const handleChoiceSelect = (choiceId: string) => {
  // ... existing logic
  // Show brief agent reaction
  const reactions = ['👍', '✨', '💡', '🎯', '🔥']
  setAgentReaction(reactions[Math.floor(Math.random() * reactions.length)])
  setTimeout(() => setAgentReaction(null), 1000)
}

// In JSX, near the agent prompt:
{agentReaction && (
  <span className="absolute -right-2 -top-2 animate-bounce text-lg">
    {agentReaction}
  </span>
)}
```

- [ ] **Step 4: Keyboard shortcuts**

In `BuilderView.tsx`, add keyboard handler:

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // Don't capture if typing in input/textarea
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
      // Enter in textarea = submit (unless Shift+Enter for newline)
      if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLTextAreaElement) {
        e.preventDefault()
        // trigger submit
        const value = e.target.value.trim()
        if (value) {
          submitResponse(value)
          e.target.value = ''
        }
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      // Continue to next step
      handleContinue()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleSkip()
    } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      e.preventDefault()
      handleBack()
    }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

Auto-focus the interaction component when a new step appears:

```typescript
// In StepSlide, after rendering:
useEffect(() => {
  // Focus the first interactive element
  const el = document.querySelector('[data-autofocus]') as HTMLElement
  el?.focus()
}, [activeMicroStepIndex])
```

Add `data-autofocus` to the first choice card or textarea in each interaction component.

- [ ] **Step 5: Onboarding tour (first time)**

Create `web-ui/src/components/Studio/Builder/OnboardingTour.tsx`:

```typescript
import { useState, useEffect } from 'react'

interface TourStep {
  target: string  // CSS selector
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="section-bar"]',
    title: 'Document Sections',
    description: 'These are the sections of your document. Each one will be filled step by step.',
    position: 'bottom',
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Step History',
    description: 'Your previous answers appear here. Click any step to go back and modify it.',
    position: 'right',
  },
  {
    target: '[data-tour="step-slide"]',
    title: 'Current Step',
    description: 'Answer the question here. Pick options, type text, or upload files.',
    position: 'top',
  },
  {
    target: '[data-tour="preview"]',
    title: 'Live Preview',
    description: 'Watch your document build in real-time as you answer questions.',
    position: 'left',
  },
]

const TOUR_KEY = 'uc-builder-tour-done'

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return
    // Delay to let the builder render
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible || step >= TOUR_STEPS.length) return null

  const current = TOUR_STEPS[step]
  const target = document.querySelector(current.target)
  if (!target) return null

  const rect = target.getBoundingClientRect()

  const handleNext = () => {
    if (step === TOUR_STEPS.length - 1) {
      localStorage.setItem(TOUR_KEY, 'true')
      setVisible(false)
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setVisible(false)
  }

  // Position tooltip near target
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100,
    ...(current.position === 'bottom' && { top: rect.bottom + 12, left: rect.left }),
    ...(current.position === 'top' && { bottom: window.innerHeight - rect.top + 12, left: rect.left }),
    ...(current.position === 'right' && { top: rect.top, left: rect.right + 12 }),
    ...(current.position === 'left' && { top: rect.top, right: window.innerWidth - rect.left + 12 }),
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99] bg-black/40" onClick={handleSkip} />

      {/* Highlight target */}
      <div
        className="fixed z-[100] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
        style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
      />

      {/* Tooltip */}
      <div style={tooltipStyle} className="z-[101] w-72 rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-1 text-xs text-muted-foreground">Step {step + 1}/{TOUR_STEPS.length}</div>
        <div className="mb-1 text-sm font-semibold">{current.title}</div>
        <div className="mb-3 text-xs text-muted-foreground">{current.description}</div>
        <div className="flex items-center justify-between">
          <button onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground">
            Skip tour
          </button>
          <button onClick={handleNext} className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            {step === TOUR_STEPS.length - 1 ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}
```

Add `data-tour` attributes to the relevant containers in `BuilderView.tsx`:
- `data-tour="section-bar"` on the SectionBar wrapper
- `data-tour="timeline"` on the MicroTimeline wrapper
- `data-tour="step-slide"` on the StepSlide wrapper
- `data-tour="preview"` on the PreviewPanel wrapper

Render `<OnboardingTour />` inside `BuilderView`.

- [ ] **Step 6: Progress visualization**

Create `web-ui/src/components/Studio/Builder/ProgressRing.tsx`:

```typescript
interface ProgressRingProps {
  percent: number  // 0-100
  size?: number
  strokeWidth?: number
}

export function ProgressRing({ percent, size = 36, strokeWidth = 3 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">
        {Math.round(percent)}%
      </span>
    </div>
  )
}
```

Add to `DocumentsDashboard.tsx` header:
```typescript
// Calculate overall project progress
const totalSections = documents.reduce((sum, doc) => sum + Object.keys(doc.sections || {}).length, 0)
const completeSections = documents.reduce((sum, doc) =>
  sum + Object.values(doc.sections || {}).filter(s => s.status === 'complete').length, 0
)
const projectPercent = totalSections > 0 ? (completeSections / totalSections) * 100 : 0

// In JSX, next to the page title:
<div className="flex items-center gap-3">
  <h1 className="text-xl font-bold">Documents</h1>
  {projectPercent > 0 && <ProgressRing percent={projectPercent} />}
</div>
```

- [ ] **Step 7: Contextual help tooltips**

Add tooltips to section pills in `SectionBar.tsx`:

```typescript
// Each section pill gets a title attribute with a helpful description
const SECTION_TOOLTIPS: Record<string, string> = {
  identity: 'Game name, genre, tagline, and platform',
  vision: 'The core experience players will feel',
  pillars: '3-5 guiding principles for every design decision',
  references: 'Games, media, and art that inspire your project',
  audience: 'Who will play your game and why',
  scope: 'Platform, team size, timeline, and MVP scope',
  review: 'Review and finalize the complete document',
}

// In JSX:
<button
  title={SECTION_TOOLTIPS[section.id] || section.name}
  className={...}
>
```

- [ ] **Step 8: Verify all polish with dev-browser**

Test:
1. Open a workflow → verify choice cards animate in with stagger
2. Complete a section → verify confetti + section bar flash
3. Wait for LLM thinking → verify rotating contextual messages
4. Press Enter/Escape/← → verify keyboard shortcuts work
5. First time opening → verify onboarding tour appears
6. Complete tour → verify it doesn't show again (localStorage)
7. Check progress ring in dashboard updates with document completion

- [ ] **Step 5: Test**

```bash
cd /Users/gdebeauchesne/Projects/unreal-companion/web-ui/server
uv run pytest tests/ -v
```

Verify:
- `build_project_summary` returns compact text (< 500 tokens)
- `read_project_document` tool returns document content
- System prompt includes project context table, not full documents
- Completing a document section updates project-context.md
