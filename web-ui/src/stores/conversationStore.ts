// web-ui/src/stores/conversationStore.ts
/**
 * Conversation Store -- manages the active SSE stream, messages, and interaction state.
 */
import { create } from 'zustand'
import { streamSSE, StreamBatcher } from '@/services/sse'
import type { SSEEvent, TextDeltaEvent, TextDoneEvent, InteractionBlockEvent, DocumentUpdateEvent, ToolCallEvent, ToolResultEvent, PrototypeReadyEvent, SectionCompleteEvent, UsageEvent, ErrorSSEEvent, ThinkingEvent } from '@/types/sse'
import type { StreamBlock, InteractionBlockType, InteractionData } from '@/types/interactions'
import type { SectionStatus, Prototype } from '@/types/studio'

interface ConversationState {
  // Stream state
  isStreaming: boolean
  error: string | null

  // Blocks displayed in the immersive zone
  blocks: StreamBlock[]

  // Current streamed text (accumulator for text_delta)
  currentText: string

  // Section statuses (updated via document_update / section_complete)
  sectionStatuses: Record<string, SectionStatus>

  // Active section (which section the LLM is working on)
  activeSection: string | null

  // Prototypes received during this conversation
  prototypes: Prototype[]

  // Token usage
  inputTokens: number
  outputTokens: number

  // Actions
  sendMessage: (message: string, options?: { agent?: string; workflowId?: string; sectionFocus?: string }) => Promise<void>
  addUserBlock: (content: string) => void
  reset: () => void
}

export const useConversationStore = create<ConversationState>()((set, get) => {
  let abortController: AbortController | null = null

  return {
    isStreaming: false,
    error: null,
    blocks: [],
    currentText: '',
    sectionStatuses: {},
    activeSection: null,
    prototypes: [],
    inputTokens: 0,
    outputTokens: 0,

    sendMessage: async (message, options = {}) => {
      // Abort any existing stream
      abortController?.abort()
      abortController = new AbortController()

      // Add user message as a block
      set(s => ({
        blocks: [...s.blocks, { kind: 'user_response' as const, content: message }],
        isStreaming: true,
        error: null,
        currentText: '',
      }))

      const batcher = new StreamBatcher<SSEEvent>((batch) => {
        const state = get()
        let newText = state.currentText
        const newBlocks = [...state.blocks]
        let newStatuses = { ...state.sectionStatuses }
        let newPrototypes = [...state.prototypes]
        let newActiveSection = state.activeSection
        let inputTokens = state.inputTokens
        let outputTokens = state.outputTokens

        for (const event of batch) {
          switch (event.type) {
            case 'text_delta': {
              const d = event.data as TextDeltaEvent
              newText += d.content
              break
            }
            case 'text_done': {
              const d = event.data as TextDoneEvent
              newBlocks.push({ kind: 'agent_text', content: d.content })
              newText = ''
              break
            }
            case 'interaction_block': {
              const d = event.data as InteractionBlockEvent
              newBlocks.push({
                kind: 'interaction',
                blockType: d.block_type as InteractionBlockType,
                data: d.data as InteractionData,
              })
              break
            }
            case 'document_update': {
              const d = event.data as DocumentUpdateEvent
              newStatuses[d.section_id] = d.status as SectionStatus
              if (d.status === 'in_progress') {
                newActiveSection = d.section_id
              }
              break
            }
            case 'section_complete': {
              const d = event.data as SectionCompleteEvent
              newStatuses[d.section_id] = 'complete'
              break
            }
            case 'tool_call': {
              const d = event.data as ToolCallEvent
              newBlocks.push({ kind: 'tool_call', id: d.id, name: d.name })
              break
            }
            case 'tool_result': {
              const d = event.data as ToolResultEvent
              newBlocks.push({ kind: 'tool_result', id: d.id, result: d.result })
              break
            }
            case 'prototype_ready': {
              const d = event.data as PrototypeReadyEvent
              newPrototypes.push({ title: d.title, html: d.html })
              break
            }
            case 'thinking': {
              const d = event.data as ThinkingEvent
              newBlocks.push({ kind: 'thinking', content: d.content })
              break
            }
            case 'usage': {
              const d = event.data as UsageEvent
              inputTokens = d.input_tokens
              outputTokens += d.output_tokens
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
          currentText: newText,
          blocks: newBlocks,
          sectionStatuses: newStatuses,
          prototypes: newPrototypes,
          activeSection: newActiveSection,
          inputTokens,
          outputTokens,
        })
      })

      try {
        const stream = streamSSE({
          url: '/api/v2/studio/chat',
          body: {
            message,
            agent: options.agent || 'game-designer',
            workflow_id: options.workflowId || '',
            section_focus: options.sectionFocus || '',
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
        set({ isStreaming: false })
      }
    },

    addUserBlock: (content) => {
      set(s => ({
        blocks: [...s.blocks, { kind: 'user_response' as const, content }],
      }))
    },

    reset: () => {
      abortController?.abort()
      set({
        isStreaming: false,
        error: null,
        blocks: [],
        currentText: '',
        sectionStatuses: {},
        activeSection: null,
        prototypes: [],
        inputTokens: 0,
        outputTokens: 0,
      })
    },
  }
})
