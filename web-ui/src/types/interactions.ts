// web-ui/src/types/interactions.ts

export interface ChoiceOption {
  id: string
  label: string
  description?: string
  /** Frontend action to trigger when this choice is selected. */
  action?: 'attach_documents' | 'open_editor' | 'open_preview' | 'open_reference' | 'open_prototype' | 'start_workflow'
}

export interface ChoicesData {
  options: ChoiceOption[]
  multi?: boolean
}

export interface SliderData {
  min: number
  max: number
  step: number
  label: string
  default?: number
}

export interface RatingData {
  max: number
  label: string
}

export interface UploadData {
  accept?: string
  label: string
}

export interface ConfirmData {
  message: string
}

export type InteractionData = ChoicesData | SliderData | RatingData | UploadData | ConfirmData

export type InteractionBlockType = 'choices' | 'slider' | 'rating' | 'upload' | 'confirm'

/** A block rendered in the immersive zone */
export type StreamBlock =
  | { kind: 'agent_text'; content: string }
  | { kind: 'interaction'; blockType: InteractionBlockType; data: InteractionData }
  | { kind: 'user_response'; content: string }
  | { kind: 'tool_call'; id: string; name: string }
  | { kind: 'tool_result'; id: string; result: string }
  | { kind: 'thinking'; content: string }
