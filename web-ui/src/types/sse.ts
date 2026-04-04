// web-ui/src/types/sse.ts

/** SSE event types matching the backend events.py */
export type SSEEventType =
  | 'text_delta'
  | 'text_done'
  | 'interaction_block'
  | 'document_update'
  | 'tool_call'
  | 'tool_result'
  | 'prototype_ready'
  | 'section_complete'
  | 'thinking'
  | 'usage'
  | 'error'
  | 'done'
  | 'context_summarized'

export interface TextDeltaEvent {
  content: string
}

export interface TextDoneEvent {
  content: string
}

export interface InteractionBlockEvent {
  block_type: 'choices' | 'slider' | 'rating' | 'upload' | 'confirm'
  data: Record<string, unknown>
}

export interface DocumentUpdateEvent {
  section_id: string
  content: string
  status: 'in_progress' | 'complete' | 'todo'
}

export interface ToolCallEvent {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultEvent {
  id: string
  result: string
}

export interface PrototypeReadyEvent {
  html: string
  title: string
}

export interface SectionCompleteEvent {
  section_id: string
}

export interface ThinkingEvent {
  content: string
}

export interface UsageEvent {
  input_tokens: number
  output_tokens: number
}

export interface ErrorSSEEvent {
  message: string
}

export type SSEEventData =
  | TextDeltaEvent
  | TextDoneEvent
  | InteractionBlockEvent
  | DocumentUpdateEvent
  | ToolCallEvent
  | ToolResultEvent
  | PrototypeReadyEvent
  | SectionCompleteEvent
  | ThinkingEvent
  | UsageEvent
  | ErrorSSEEvent
  | Record<string, never> // done event

export interface SSEEvent {
  type: SSEEventType
  data: SSEEventData
}
