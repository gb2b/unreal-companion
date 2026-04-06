// web-ui/src/types/studio.ts

import type { InteractionBlockType, InteractionData } from '@/types/interactions'

export type SectionStatus = 'empty' | 'in_progress' | 'complete' | 'todo'
export type DocumentStatus = 'empty' | 'in_progress' | 'complete'

export interface WorkflowSection {
  id: string
  name: string
  required: boolean
  hints: string
  interaction_types: string[]
}

export interface WorkflowV2 {
  id: string
  name: string
  description: string
  sections: WorkflowSection[]
  agents: {
    primary: string
    alternatives: string[]
    party_mode: boolean
  }
  briefing: string
  icon: string
  color: string
}

export interface SectionMeta {
  status: SectionStatus
  updated: string
  note: string
}

export interface DocumentMeta {
  workflow_id: string
  agent: string
  status: DocumentStatus
  created: string
  updated: string
  sections: Record<string, SectionMeta>
  input_documents: string[]
  prototypes: string[]
  conversation_id: string
  tags: string[]
  user_renamed: boolean
  name: string
  summary: string
  // Reference file fields (only present for uploads)
  content_type?: string
  size_bytes?: number
}

export interface StudioDocument {
  id: string
  path: string
  name: string
  content?: string
  meta: DocumentMeta
}

export interface Prototype {
  title: string
  html: string
}

// --- Builder types (micro-step paradigm) ---

export type MicroStepStatus = 'active' | 'answered' | 'skipped'

/** A block in the micro-step timeline — everything accumulates, nothing disappears */
export type StepBlock =
  | { kind: 'tool_call'; name: string; label: string; status: 'pending' | 'done' | 'error' }
  | { kind: 'text'; content: string }
  | { kind: 'streaming'; content: string }
  | { kind: 'interaction'; type: InteractionBlockType; data: InteractionData }
  | { kind: 'thinking'; content: string }

export interface MicroStep {
  id: string
  blocks: StepBlock[]            // ordered list of blocks — everything the LLM produced
  interactionType: InteractionBlockType | null   // shortcut to the last interaction block (if any)
  interactionData: InteractionData | null
  userResponse: string | null
  summary: string | null
  status: MicroStepStatus
}

export type SectionBarStatus = SectionStatus | 'skipped'

export interface AgentPersona {
  id: string
  name: string
  emoji: string
}
