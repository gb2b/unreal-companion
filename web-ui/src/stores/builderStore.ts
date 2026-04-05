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
  WorkflowSection, MicroStep, AgentPersona, StepBlock,
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

  // Dynamic sections (added by LLM at runtime)
  dynamicSections: WorkflowSection[]

  // Token usage
  inputTokens: number
  outputTokens: number

  // Actions
  initWorkflow: (workflow: WorkflowV2, projectPath: string) => Promise<void>
  setSectionDisplayNames: (names: Record<string, string>) => void
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
  dynamicSections: [],
  inputTokens: 0,
  outputTokens: 0,
}

// --- Debounced save ---

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSaveSteps(microSteps: MicroStep[], workflow: WorkflowV2 | null, projectPath: string) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!workflow || !projectPath) return
    const docId = `concept/${workflow.id}`
    fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}/steps`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath, steps: microSteps }),
      }
    ).catch(console.error)
  }, 1000)
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
      blocks: [],
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

    // Tool name → user-friendly label map
    const TOOL_LABELS: Record<string, string> = {
      'show_interaction': 'Preparing options',
      'update_document': 'Updating document',
      'mark_section_complete': 'Completing section',
      'show_prototype': 'Building prototype',
      'read_project_document': 'Reading project documents',
      'update_project_context': 'Updating project context',
      'report_progress': 'Reporting progress',
    }

    const batcher = new StreamBatcher<SSEEvent>((batch) => {
      const s = get()
      let streamText = s.currentStreamText
      let procText = s.processingText
      const steps = [...s.microSteps]
      const activeIdx = s.activeMicroStepIndex
      let statuses = { ...s.sectionStatuses }
      let protos = [...s.prototypes]
      let dynSections = [...s.dynamicSections]
      let section = s.activeSection
      let inTkn = s.inputTokens
      let outTkn = s.outputTokens

      // Helper: get blocks array of active step (mutable copy already made above)
      function getBlocks(): StepBlock[] {
        return steps[activeIdx] ? [...steps[activeIdx].blocks] : []
      }
      function setBlocks(blocks: StepBlock[]) {
        if (!steps[activeIdx]) return
        // Derive summary from last text block
        const lastText = [...blocks].reverse().find(b => b.kind === 'text')
        const summary = lastText
          ? (lastText.content.length > 80
            ? lastText.content.replace(/[#*_`]/g, '').slice(0, 77) + '...'
            : lastText.content.replace(/[#*_`]/g, ''))
          : steps[activeIdx].summary
        steps[activeIdx] = { ...steps[activeIdx], blocks, summary: summary ?? null }
      }

      for (const event of batch) {
        switch (event.type) {
          case 'text_delta': {
            const d = event.data as TextDeltaEvent
            streamText += d.content
            // Update (or push) the streaming block
            const blocks = getBlocks()
            const last = blocks[blocks.length - 1]
            if (last?.kind === 'streaming') {
              blocks[blocks.length - 1] = { kind: 'streaming', content: last.content + d.content }
            } else {
              blocks.push({ kind: 'streaming', content: streamText })
            }
            setBlocks(blocks)
            break
          }
          case 'text_done': {
            const d = event.data as TextDoneEvent
            const blocks = getBlocks()
            // Replace the last streaming block with a text block (or push a new text block)
            const lastIdx = blocks.map(b => b.kind).lastIndexOf('streaming')
            if (lastIdx !== -1) {
              blocks[lastIdx] = { kind: 'text', content: d.content }
            } else {
              blocks.push({ kind: 'text', content: d.content })
            }
            setBlocks(blocks)
            streamText = ''
            break
          }
          case 'interaction_block': {
            const d = event.data as InteractionBlockEvent
            if (steps[activeIdx]) {
              const blocks = getBlocks()
              blocks.push({
                kind: 'interaction',
                type: d.block_type as InteractionBlockType,
                data: d.data as unknown as InteractionData,
              })
              setBlocks(blocks)
              steps[activeIdx] = {
                ...steps[activeIdx],
                blocks: steps[activeIdx].blocks, // already updated by setBlocks
                interactionType: d.block_type as InteractionBlockType,
                interactionData: d.data as unknown as InteractionData,
              }
            }
            break
          }
          case 'processing_status': {
            const d = event.data as ProcessingStatusEvent
            procText = d.text
            // Update or push thinking block
            const blocks = getBlocks()
            const last = blocks[blocks.length - 1]
            if (last?.kind === 'thinking') {
              blocks[blocks.length - 1] = { kind: 'thinking', content: d.text }
            } else {
              blocks.push({ kind: 'thinking', content: d.text })
            }
            setBlocks(blocks)
            break
          }
          case 'micro_step': {
            const d = event.data as MicroStepEvent
            if (steps[activeIdx]) {
              const blocks = getBlocks()
              blocks.push({ kind: 'text', content: d.prompt })
              setBlocks(blocks)
              steps[activeIdx] = {
                ...steps[activeIdx],
                blocks: steps[activeIdx].blocks,
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
          case 'tool_call': {
            const d = event.data as any
            const toolName = d?.name || ''
            const label = TOOL_LABELS[toolName] || 'Processing'
            const blocks = getBlocks()
            // If last block is streaming, convert it to text first
            const last = blocks[blocks.length - 1]
            if (last?.kind === 'streaming') {
              blocks[blocks.length - 1] = { kind: 'text', content: last.content }
              streamText = ''
            }
            blocks.push({ kind: 'tool_call', name: toolName, label })
            setBlocks(blocks)
            procText = label
            break
          }
          case 'tool_result': {
            // Tool completed — nothing to display
            break
          }
          case 'thinking': {
            const d = event.data as ThinkingEvent
            if (d.content) {
              procText = d.content.slice(0, 100)
              const blocks = getBlocks()
              const last = blocks[blocks.length - 1]
              if (last?.kind === 'thinking') {
                blocks[blocks.length - 1] = { kind: 'thinking', content: d.content.slice(0, 100) }
              } else {
                blocks.push({ kind: 'thinking', content: d.content.slice(0, 100) })
              }
              setBlocks(blocks)
            }
            break
          }
          case 'usage': {
            const d = event.data as UsageEvent
            inTkn = d.input_tokens
            outTkn += d.output_tokens
            break
          }
          case 'section_added': {
            const d = event.data as { section_id: string; section_name: string; required?: boolean }
            // Only add if not already present in dynamic sections
            const alreadyExists = dynSections.some(s => s.id === d.section_id)
            if (!alreadyExists) {
              dynSections.push({
                id: d.section_id,
                name: d.section_name,
                required: d.required ?? false,
                hints: '',
                interaction_types: [],
              })
            }
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
        dynamicSections: dynSections,
        activeSection: section,
        inputTokens: inTkn,
        outputTokens: outTkn,
      })

      const { workflow, projectPath } = get()
      debouncedSaveSteps(steps, workflow, projectPath)
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

      // Load existing micro-steps — if found, restore and skip init message
      try {
        const stepsRes = await fetch(
          `/api/v2/studio/documents/${encodeURIComponent(docId)}/steps?project_path=${encodeURIComponent(projectPath)}`
        )
        if (stepsRes.ok) {
          const stepsData = await stepsRes.json()
          const loadedSteps: MicroStep[] = stepsData.steps || []
          if (loadedSteps.length > 0) {
            set({
              microSteps: loadedSteps,
              activeMicroStepIndex: loadedSteps.length - 1,
            })
            return
          }
        }
      } catch { /* no steps yet */ }

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

    setSectionDisplayNames: (_names: Record<string, string>) => {
      // Placeholder — display names are resolved on the frontend via language detection
      // This action exists for external callers if needed
    },

    reset: () => {
      abortController?.abort()
      stepCounter = 0
      set(INITIAL_STATE)
    },
  }
})
