import { create } from 'zustand'
import { streamSSE, StreamBatcher } from '@/services/sse'
import type {
  SSEEvent, TextDeltaEvent, TextDoneEvent, InteractionBlockEvent,
  DocumentUpdateEvent, PrototypeReadyEvent,
  SectionCompleteEvent, UsageEvent, ErrorSSEEvent, ThinkingEvent,
  ProcessingStatusEvent, MicroStepEvent, SectionTransitionEvent,
} from '@/types/sse'
import type {
  SectionStatus, Prototype, WorkflowV2,
  MicroStep, AgentPersona,
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
  initWorkflow: (workflow: WorkflowV2, projectPath: string) => Promise<void>
  submitResponse: (response: string) => Promise<void>
  skipSection: () => void
  goBack: () => void
  jumpToSection: (sectionId: string) => void
  scrollToSection: (sectionId: string) => void
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
      agentPrompts: [],
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
            // Append text block to the micro-step's agentPrompts array.
            // The LLM may send multiple text blocks in one agentic loop
            // (text → tool call → text → tool call → text).
            // All are kept. The LAST one is the main prompt, others are "thinking".
            if (steps[activeIdx]) {
              const prompts = [...steps[activeIdx].agentPrompts, d.content]
              const lastPrompt = prompts[prompts.length - 1]
              steps[activeIdx] = {
                ...steps[activeIdx],
                agentPrompts: prompts,
                summary: lastPrompt.length > 80
                  ? lastPrompt.replace(/[#*_`]/g, '').slice(0, 77) + '...'
                  : lastPrompt.replace(/[#*_`]/g, ''),
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
            if (steps[activeIdx]) {
              steps[activeIdx] = {
                ...steps[activeIdx],
                agentPrompts: [...steps[activeIdx].agentPrompts, d.prompt],
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

    initWorkflow: async (workflow, projectPath) => {
      abortController?.abort()
      stepCounter = 0
      const persona = AGENT_PERSONAS[workflow.agents.primary] || {
        id: workflow.agents.primary,
        name: workflow.agents.primary,
        emoji: '🤖',
      }
      // Set initial active section to the first section
      const firstSectionId = workflow.sections[0]?.id || null

      set({
        ...INITIAL_STATE,
        workflow,
        projectPath,
        agent: persona,
        activeSection: firstSectionId,
      })

      // Check if a document already exists for this workflow
      const docId = `concept/${workflow.id}`
      let existingSectionStatuses: Record<string, SectionStatus> = {}
      try {
        const res = await fetch(`/api/v2/studio/documents/resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: docId, project_path: projectPath }),
        })
        if (res.ok) {
          const data = await res.json()
          const sections = data?.meta?.sections || {}
          for (const [sectionId, sectionData] of Object.entries(sections)) {
            const s = sectionData as { status?: string }
            if (s?.status === 'complete') {
              existingSectionStatuses[sectionId] = 'complete'
            } else if (s?.status === 'in_progress') {
              existingSectionStatuses[sectionId] = 'in_progress'
            }
          }
          if (Object.keys(existingSectionStatuses).length > 0) {
            set({ sectionStatuses: existingSectionStatuses })
          }
        }
      } catch { /* ignore — document may not exist yet */ }

      // Auto-start: send the init message
      const sectionList = workflow.sections
        .map(s => `- ${s.name}${s.required ? ' (required)' : ' (optional)'}`)
        .join('\n')

      const hasExistingContent = Object.keys(existingSectionStatuses).length > 0
      const initMessage = [
        `[WORKFLOW_START]`,
        `Workflow: ${workflow.name}`,
        `Description: ${workflow.description}`,
        `Sections to fill:\n${sectionList}`,
        ``,
        hasExistingContent
          ? `This document already has some sections filled (see project context). Resume where we left off.`
          : `Greet the user and start the workflow. Introduce yourself with your persona.`,
        `Propose how to get started: either answer some questions to fill the document,`,
        `or upload an existing document/brief to pre-fill sections.`,
        `Show a choices block with: "Start from scratch", "Upload existing document", "Quick start (fill basics fast)".`,
        `IMPORTANT: Respond with exactly ONE text message followed by ONE show_interaction call.`,
        `Do NOT send multiple text blocks — combine everything in one message.`,
      ].join('\n')

      // Detect language from i18n store
      let lang = 'en'
      try {
        const i18nRaw = localStorage.getItem('i18n-store')
        if (i18nRaw) {
          const parsed = JSON.parse(i18nRaw)
          lang = parsed?.state?.language || 'en'
        }
      } catch { /* ignore */ }

      sendToSSE(initMessage, { hidden: true, language: lang })
    },

    submitResponse: async (response) => {
      // Detect language
      let lang = 'en'
      try {
        const i18nRaw = localStorage.getItem('i18n-store')
        if (i18nRaw) lang = JSON.parse(i18nRaw)?.state?.language || 'en'
      } catch { /* ignore */ }
      await sendToSSE(response, { language: lang })
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

    scrollToSection: (sectionId) => {
      // Scroll to the section's micro-steps in the timeline without sending a new message.
      // If the section matches activeSection, find the first micro-step for that section.
      const { microSteps, activeSection } = get()
      if (sectionId === activeSection && microSteps.length > 0) {
        // Jump to the first micro-step (beginning of the current section)
        set({ activeMicroStepIndex: 0 })
      }
      // If the section is a different one, just update activeSection visually
      // without sending a new LLM message
      set({ activeSection: sectionId })
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
