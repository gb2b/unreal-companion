import { create } from 'zustand'
import { streamSSE, StreamBatcher } from '@/services/sse'
import type {
  SSEEvent, TextDeltaEvent, TextDoneEvent, InteractionBlockEvent,
  DocumentUpdateEvent, PrototypeReadyEvent,
  SectionCompleteEvent, UsageEvent, ErrorSSEEvent, ThinkingEvent,
  ProcessingStatusEvent, MicroStepEvent, SectionTransitionEvent,
  LearningCardEvent,
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
  documentDisplayName: string | null  // set by rename_document tool SSE event
  sectionStatuses: Record<string, SectionStatus>
  sectionContents: Record<string, string>  // section_id → markdown content (live updates)
  documentContent: string  // raw markdown content of the full document

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
  initWorkflow: (workflow: WorkflowV2, projectPath: string, docIdOverride?: string) => Promise<void>
  setSectionDisplayNames: (names: Record<string, string>) => void
  submitResponse: (response: string) => Promise<void>
  skipSection: () => void
  goBack: () => void
  jumpToSection: (sectionId: string) => void
  scrollToSection: (sectionId: string) => void
  jumpToMicroStep: (index: number) => void
  proposeModification: (stepIndex: number) => void
  requestEditFromPreview: (sectionId: string, selectedText: string, prompt: string) => void
  reset: () => void
}

// --- Initial state ---
const INITIAL_STATE = {
  workflow: null,
  projectPath: '',
  agent: { id: 'game-designer', name: 'Agent', emoji: '🤖' },
  documentId: null,
  documentDisplayName: null,
  sectionStatuses: {},
  activeSection: null,
  sectionContents: {},
  documentContent: '',
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

function debouncedSaveSteps(microSteps: MicroStep[], workflow: WorkflowV2 | null, projectPath: string, docId?: string) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!workflow || !projectPath) return
    const resolvedDocId = docId ?? `concept/${workflow.id}`
    fetch(
      `/api/v2/studio/steps/${encodeURIComponent(resolvedDocId)}`,
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
        // Extract selected choice IDs/labels from interaction data
        let choiceIds: string[] = []
        let choiceLabels: string[] = []
        const interactionBlock = activeStep.blocks.find(b => b.kind === 'interaction')
        if (interactionBlock && interactionBlock.kind === 'interaction') {
          const choicesData = interactionBlock.data as { options?: { id: string; label: string }[] }
          const options = choicesData?.options ?? []
          // Match user's response against known option labels (clean, no "Selected:" prefix)
          const firstLine = message.split('\n')[0]
          const candidateLabels = firstLine.split(', ')
          const matched = candidateLabels.filter(cl =>
            options.some(o => o.label.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim() === cl.trim())
          )
          if (matched.length > 0) {
            choiceLabels = options
              .filter(o => matched.some(m => o.label.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim() === m.trim()))
              .map(o => o.label)
            choiceIds = choiceLabels.map(label => options.find(o => o.label === label)?.id ?? label)
          }
        }

        // Never overwrite summary — it's set by step_done only
        steps[state.activeMicroStepIndex] = {
          ...activeStep,
          userResponse: message,
          selectedChoiceIds: choiceIds,
          selectedChoiceLabels: choiceLabels,
          status: 'answered',
        }
      }
      set({ microSteps: steps })
    }

    // Create a new micro-step for the agent's response
    const newStep: MicroStep = {
      id: nextStepId(),
      sectionId: state.activeSection || '',
      blocks: [],
      interactionType: null,
      interactionData: null,
      userResponse: null,
      selectedChoiceIds: [],
      selectedChoiceLabels: [],
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
    function buildToolLabel(name: string, input: Record<string, any>): string {
      const shortId = (id: string) => id.split('/').pop() || id
      switch (name) {
        case 'doc_scan': return `Scan — ${shortId(input.doc_id || '')}`
        case 'doc_read_summary': return `Read summary — ${shortId(input.doc_id || '')}`
        case 'doc_read_section': return `Read section — ${shortId(input.doc_id || '')} → ${input.section || ''}`
        case 'doc_grep': return `Search — "${input.query || ''}"${input.doc_ids?.length ? ` in ${input.doc_ids.map(shortId).join(', ')}` : ''}`
        case 'edit_content': return `Edit — ${input.file_path || input.section_id || 'content'}`
        case 'mark_section_complete': return `Complete — ${input.section_id || 'section'}`
        case 'update_session_memory': return 'Save session memory'
        case 'read_project_document': return `Read — ${shortId(input.doc_id || 'document')}`
        case 'rename_document': return `Rename — ${input.name || ''}`
        case 'show_interaction': return 'Preparing question'
        case 'show_prototype': return 'Building prototype'
        case 'report_progress': return 'Progress update'
        default: return name.replace(/_/g, ' ')
      }
    }

    const batcher = new StreamBatcher<SSEEvent>((batch) => {
      const s = get()
      let streamText = s.currentStreamText
      let procText = s.processingText
      const steps = [...s.microSteps]
      const activeIdx = s.activeMicroStepIndex
      let statuses = { ...s.sectionStatuses }
      let contents = { ...s.sectionContents }
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
        // Summary is only set by step_done — no auto-extraction
        steps[activeIdx] = { ...steps[activeIdx], blocks }
      }

      for (const event of batch) {
        console.log('[builder]', event.type, event.type === 'text_delta' ? '(delta)' : JSON.stringify(event.data).substring(0, 80))

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
            // Find the streaming block and replace it with the final text
            const streamIdx = blocks.findIndex(b => b.kind === 'streaming')
            if (streamIdx !== -1) {
              blocks[streamIdx] = { kind: 'text', content: d.content }
            }
            // If no streaming block found, don't add — it means the text was already
            // handled (e.g., tool_call converted it). text_done is always the final
            // version of the previously streamed text, not new content.
            setBlocks(blocks)
            streamText = ''
            procText = ''  // Clear processing text once LLM finishes producing text
            break
          }
          case 'interaction_block': {
            const d = event.data as InteractionBlockEvent
            if (steps[activeIdx]) {
              const blocks = getBlocks()
              // Mark any pending tool_calls as done — the interaction IS the result
              for (let i = 0; i < blocks.length; i++) {
                if (blocks[i].kind === 'tool_call' && (blocks[i] as any).status === 'pending') {
                  blocks[i] = { ...blocks[i], status: 'done' } as any
                }
              }
              blocks.push({
                kind: 'interaction',
                type: d.block_type as InteractionBlockType,
                data: d.data as unknown as InteractionData,
              })
              setBlocks(blocks)
              // Don't re-assign blocks — setBlocks already updated steps[activeIdx].blocks
              const stepTitle = (d as any).step_title || ''
              steps[activeIdx] = {
                ...steps[activeIdx],
                interactionType: d.block_type as InteractionBlockType,
                interactionData: d.data as unknown as InteractionData,
                ...(stepTitle ? { summary: stepTitle } : {}),
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
              // Don't re-assign blocks — setBlocks already updated steps[activeIdx].blocks
              steps[activeIdx] = {
                ...steps[activeIdx],
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
            if (d.section_id === '_refresh') {
              // edit_content signals a refresh — fetch the doc from the server
              const { documentId, projectPath } = get()
              if (documentId && projectPath) {
                fetch(`/api/v2/studio/documents/${encodeURIComponent(documentId)}?project_path=${encodeURIComponent(projectPath)}`)
                  .then(r => r.ok ? r.json() : null)
                  .then(doc => {
                    if (!doc?.content) return
                    const newContents: Record<string, string> = {}
                    let curId = '', curLines: string[] = []
                    for (const line of doc.content.split('\n')) {
                      if (line.match(/^#{1,2} /)) {
                        if (curId) { const t = curLines.join('\n').trim(); if (t) newContents[curId] = t }
                        curId = line.replace(/^#+\s*/, '').trim().toLowerCase().replace(/\s+/g, '-')
                        curLines = []
                      } else if (curId) curLines.push(line)
                    }
                    if (curId) { const t = curLines.join('\n').trim(); if (t) newContents[curId] = t }
                    set(s => ({ sectionContents: { ...s.sectionContents, ...newContents }, documentContent: doc.content }))
                  })
                  .catch(() => {})
              }
            } else {
              statuses[d.section_id] = d.status as SectionStatus
              if (d.content) {
                contents[d.section_id] = d.content
              }
              if (d.status === 'in_progress' && !section) section = d.section_id
              // Re-fetch full document to update documentContent
              const { documentId: did, projectPath: pp } = get()
              if (did && pp) {
                fetch(`/api/v2/studio/documents/${encodeURIComponent(did)}?project_path=${encodeURIComponent(pp)}`)
                  .then(r => r.ok ? r.json() : null)
                  .then(doc => { if (doc?.content) set({ documentContent: doc.content }) })
                  .catch(() => {})
              }
            }
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
            const toolInput = d?.input || {}
            const toolDesc = d?.description || ''
            const hasInput = Object.keys(toolInput).length > 0
            const blocks = getBlocks()

            // If this is an update (has input/description) to an existing pending tool, update it
            if (hasInput || toolDesc) {
              let existingIdx = -1
              for (let i = blocks.length - 1; i >= 0; i--) {
                if ((blocks[i] as any).kind === 'tool_call' && (blocks[i] as any).name === toolName && (blocks[i] as any).status === 'pending') {
                  existingIdx = i; break
                }
              }
              if (existingIdx >= 0) {
                const label = toolDesc || buildToolLabel(toolName, toolInput)
                blocks[existingIdx] = { ...blocks[existingIdx], label } as any
                setBlocks(blocks)
                break
              }
            }

            // New tool call
            const label = toolDesc || buildToolLabel(toolName, toolInput)
            blocks.push({ kind: 'tool_call', name: toolName, label, status: 'pending', startTime: Date.now() } as any)
            setBlocks(blocks)
            // Don't set processingText for hidden tools — the interaction itself is the visual
            const HIDDEN_TOOLS = ['show_interaction', 'show_prototype', 'report_progress', 'ask_user']
            if (!HIDDEN_TOOLS.includes(toolName)) {
              procText = label
            }
            break
          }
          case 'tool_result': {
            const d_tr = event.data as any
            const resultStr = d_tr?.result || ''
            const sseSummary = d_tr?.summary || ''  // summary from tool module
            let isError = false
            let resultPreview = ''
            try {
              const parsed = JSON.parse(resultStr)
              isError = !!parsed.error
              if (isError) {
                resultPreview = parsed.message || parsed.error || ''
              } else if (parsed.summary) {
                resultPreview = parsed.summary
              } else if (parsed.success !== undefined) {
                resultPreview = parsed.success ? 'Done' : 'Failed'
              } else if (Array.isArray(parsed)) {
                resultPreview = `${parsed.length} result${parsed.length !== 1 ? 's' : ''}`
              }
            } catch {
              resultPreview = resultStr.length > 100 ? resultStr.slice(0, 97) + '...' : resultStr
            }

            // Prefer SSE summary from tool module over parsed preview
            const summary = sseSummary || resultPreview

            const blocks = getBlocks()
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].kind === 'tool_call' && (blocks[i] as any).status === 'pending') {
                blocks[i] = { ...blocks[i], status: isError ? 'error' : 'done', result: resultPreview, rawResult: resultStr, summary, endTime: Date.now() } as any
                break
              }
            }
            setBlocks(blocks)
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
          case 'processing_status': {
            const d = event.data as any
            const statusStr = d?.status || ''
            if (statusStr.startsWith('step_done:') && steps[activeIdx]) {
              const title = statusStr.slice('step_done:'.length).trim()
              steps[activeIdx] = {
                ...steps[activeIdx],
                summary: title || null,
                // Store step stats for the footer
                stepDoneAt: Date.now(),
                stepTokensIn: inTkn,
                stepTokensOut: outTkn,
              } as any
            }
            break
          }
          case 'document_renamed': {
            const d = event.data as { new_doc_id?: string; new_display_name?: string }
            if (d.new_doc_id) {
              set({ documentId: d.new_doc_id, documentDisplayName: d.new_display_name || null })
            }
            break
          }
          case 'learning_card': {
            const d = event.data as LearningCardEvent
            const blocks = getBlocks()
            blocks.push({
              kind: 'learning_card',
              term: d.term,
              explanation: d.explanation,
              examples: d.examples,
              category: d.category,
            })
            setBlocks(blocks)
            break
          }
          case 'error': {
            const d = event.data as ErrorSSEEvent
            // Mark the last pending tool_call as error
            const blocks = getBlocks()
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].kind === 'tool_call' && (blocks[i] as any).status === 'pending') {
                blocks[i] = { ...blocks[i], status: 'error' } as any
                break
              }
            }
            setBlocks(blocks)
            set({ error: d.message })
            break
          }
        }
      }

      // Debug: log blocks state after batch
      if (steps[activeIdx]) {
        console.log('[builder] blocks after batch:', steps[activeIdx].blocks.map(b => b.kind).join(' → '))
      }

      set({
        currentStreamText: streamText,
        processingText: procText,
        microSteps: steps,
        sectionStatuses: statuses,
        sectionContents: contents,
        prototypes: protos,
        dynamicSections: dynSections,
        activeSection: section,
        inputTokens: inTkn,
        outputTokens: outTkn,
      })

      const { workflow, projectPath, documentId } = get()
      debouncedSaveSteps(steps, workflow, projectPath, documentId ?? undefined)
    })

    try {
      // Read learning mode from localStorage
      const learningMode = localStorage.getItem('learning_mode') === 'true'

      const stream = streamSSE({
        url: '/api/v2/studio/chat',
        body: {
          message,
          agent: state.workflow.agents.primary,
          workflow_id: state.workflow.id,
          document_id: state.documentId || '',
          section_focus: options.sectionFocus || state.activeSection || '',
          language: options.language || 'en',
          project_path: state.projectPath,
          learning_mode: learningMode,
        },
        signal: abortController.signal,
      })

      for await (const event of stream) {
        batcher.push(event)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('[builder] SSE stream error:', (e as Error).message)
        set({ error: (e as Error).message })
      }
    } finally {
      batcher.destroy()
      set({ isProcessing: false, processingText: '' })
    }
  }

  return {
    ...INITIAL_STATE,

    initWorkflow: async (workflow, projectPath, docIdOverride) => {
      abortController?.abort()
      stepCounter = 0
      const persona = AGENT_PERSONAS[workflow.agents.primary] || {
        id: workflow.agents.primary,
        name: workflow.agents.primary,
        emoji: '🤖',
      }
      // Set initial active section to the first section
      const firstSectionId = workflow.sections[0]?.id || null

      // Default doc_id = workflow.id (stable, reusable across sessions).
      // Caller passes a timestamped docIdOverride when they explicitly want a new doc.
      const docId = docIdOverride ?? workflow.id

      set({
        ...INITIAL_STATE,
        workflow,
        projectPath,
        agent: persona,
        activeSection: firstSectionId,
        documentId: docId,
      })

      // Check if a document already exists for this workflow
      let existingSectionStatuses: Record<string, SectionStatus> = {}
      let existingSectionContents: Record<string, string> = {}
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
          // Parse .md content into sectionContents
          const mdContent = data?.content || ''
          if (mdContent) {
            let currentId = ''
            let currentLines: string[] = []
            for (const line of mdContent.split('\n')) {
              if (line.match(/^#{1,2} /)) {
                if (currentId) {
                  const text = currentLines.join('\n').trim()
                  if (text) existingSectionContents[currentId] = text
                }
                currentId = line.replace(/^#+\s*/, '').trim().toLowerCase().replace(/\s+/g, '-')
                currentLines = []
              } else if (currentId) {
                currentLines.push(line)
              }
            }
            if (currentId) {
              const text = currentLines.join('\n').trim()
              if (text) existingSectionContents[currentId] = text
            }
          }
          if (Object.keys(existingSectionStatuses).length > 0 || Object.keys(existingSectionContents).length > 0) {
            set({ sectionStatuses: existingSectionStatuses, sectionContents: existingSectionContents })
          }
          set({ documentContent: data?.content || '' })
        }
      } catch { /* ignore — document may not exist yet */ }

      // Load existing micro-steps — if found, restore and skip init message
      try {
        const stepsRes = await fetch(
          `/api/v2/studio/steps/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`
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
      // Build context-rich init message
      const sectionList = workflow.sections
        .map(s => `- ${s.name}${s.required ? ' (required)' : ' (optional)'}`)
        .join('\n')

      // Fetch project context
      let projectContext = ''
      try {
        const ctxRes = await fetch(`/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`)
        if (ctxRes.ok) {
          const ctxData = await ctxRes.json()
          projectContext = ctxData.content || ''
        }
      } catch { /* ignore */ }

      // Fetch all documents with summaries
      let docsInfo = ''
      try {
        const docsRes = await fetch(`/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`)
        if (docsRes.ok) {
          const docsData = await docsRes.json()
          const docs = docsData.documents || []
          const docLines = docs.map((d: any) => {
            const status = d.meta?.status || 'empty'
            const summary = d.meta?.index?.summary || d.meta?.summary || ''
            const isRef = (d.meta?.tags || []).includes('reference')
            const prefix = isRef ? '📎' : '📄'
            return `- ${prefix} ${d.name} (${status})${summary ? ' — ' + summary : ''}`
          })
          if (docLines.length > 0) docsInfo = docLines.join('\n')
        }
      } catch { /* ignore */ }

      const hasContext = projectContext || docsInfo || Object.keys(existingSectionStatuses).length > 0

      const initMessage = [
        `[WORKFLOW_START]`,
        `Workflow: ${workflow.name}`,
        `Description: ${workflow.description}`,
        `Sections to fill:\n${sectionList}`,
        ``,
        `## Project State`,
        projectContext ? projectContext : 'Empty — no project context yet.',
        ``,
        docsInfo ? `## Available Documents\n${docsInfo}` : '',
        ``,
        `## Instructions`,
        `IMPORTANT: ALL sections of this document are empty and need to be filled. Even if the project context has relevant info, you MUST review each section with the user before writing it.`,
        hasContext
          ? `The project context above is a REFERENCE — use it to propose content for each section, but always ask the user to validate before calling edit_content. Start from the first section.`
          : `This is a new project with no existing context. Introduce yourself with your persona and start the workflow.`,
        `First, ask if the user has documents to upload. Then work through sections one by one.`,
        `Respond with exactly ONE text message followed by ONE show_interaction call with a step_title.`,
      ].filter(Boolean).join('\n')

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
      const { activeSection, workflow, microSteps, activeMicroStepIndex } = get()
      if (!activeSection || !workflow) return
      // Mark current micro-step as skipped
      const steps = [...microSteps]
      const activeStep = steps[activeMicroStepIndex]
      if (activeStep && activeStep.status === 'active') {
        steps[activeMicroStepIndex] = { ...activeStep, status: 'skipped' }
      }
      // Mark current section as skipped (todo), move to next
      set(s => ({
        sectionStatuses: { ...s.sectionStatuses, [activeSection]: 'todo' },
        microSteps: steps,
      }))
      sendToSSE(`[SKIP_SECTION] User skipped the "${activeSection}" section. Move to the next section.`, { hidden: true })
    },

    goBack: () => {
      const { activeMicroStepIndex, microSteps } = get()
      if (activeMicroStepIndex <= 0) return
      // Skip ghost steps (no text, no interaction) when going back
      let prevIdx = activeMicroStepIndex - 1
      while (prevIdx > 0) {
        const step = microSteps[prevIdx]
        const hasContent = step.blocks.some(b => b.kind === 'text' || b.kind === 'streaming' || b.kind === 'interaction')
        if (hasContent) break
        prevIdx--
      }
      // Just navigate — don't change the step's status (it stays answered/skipped)
      set({ activeMicroStepIndex: prevIdx })
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

    proposeModification: (stepIndex: number) => {
      const state = get()
      const oldStep = state.microSteps[stepIndex]
      if (!oldStep || !oldStep.userResponse) return

      const agentText = oldStep.blocks
        .filter(b => b.kind === 'text')
        .map(b => b.content)
        .join('\n')
        .slice(0, 200)

      const modMessage = [
        `I want to modify my previous answer.`,
        `Original question: "${agentText.slice(0, 150)}"`,
        `My previous answer was: "${oldStep.userResponse.slice(0, 150)}"`,
        `I'd like to change this.`,
      ].join('\n')

      // Jump to end and submit
      set({ activeMicroStepIndex: state.microSteps.length - 1 })
      get().submitResponse(modMessage)
    },

    requestEditFromPreview: (sectionId: string, selectedText: string, prompt: string) => {
      const editMessage = [
        `[EDIT_REQUEST] Section: ${sectionId}`,
        `Selected text: "${selectedText}"`,
        `Requested change: ${prompt}`,
      ].join('\n')

      const state = get()
      set({ activeMicroStepIndex: state.microSteps.length - 1 })
      get().submitResponse(editMessage)
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
