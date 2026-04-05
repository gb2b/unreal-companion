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

export interface MicroStep {
  id: string
  agentPrompts: string[]         // accumulated text blocks from the LLM (last = main, others = thinking/collapsed)
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
