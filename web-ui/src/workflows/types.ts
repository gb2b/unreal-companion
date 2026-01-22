// Workflow Types

export interface WorkflowOption {
  id: string
  label: string
  description?: string
  // If true, this option allows custom text input (e.g., "Other")
  allowCustom?: boolean
}

export interface WorkflowQuestion {
  id: string
  type: 'single' | 'multiple' | 'text' | 'textarea' | 'scale'
  prompt: string
  description?: string
  options?: WorkflowOption[]
  placeholder?: string
  required: boolean
  min?: number // for scale
  max?: number // for scale
  
  // Conditional display
  showIf?: {
    questionId: string
    value: string | string[]
  }
  
  // Adaptive suggestions (LLM can provide based on context)
  suggestionsKey?: string // e.g., 'references_by_genre'
}

export interface WorkflowStep {
  id: string
  title: string
  agentMessage: string
  questions: WorkflowQuestion[]
  celebration?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  icon: string
  color: string
  agent: string
  estimatedTime: string
  steps: WorkflowStep[]
  outputTemplate: string // Template for the generated document
  outputPath: string // Where to save the document (relative to docs/)
  
  // Dynamic workflow options
  dynamicPrompts?: boolean // If true, LLM generates questions/messages in real-time
  systemPrompt?: string // System prompt for dynamic generation
}

// Dynamic content from LLM
export interface DynamicWorkflowContent {
  stepTitle: string
  agentMessage: string
  questions: Array<{
    id: string
    prompt: string
    description?: string
    options?: Array<{ id: string; label: string; description?: string }>
    placeholder?: string
  }>
}

export interface WorkflowResponse {
  questionId: string
  value: string | string[]
  // For options with allowCustom, this contains the custom text
  customValue?: string
}

export interface WorkflowState {
  workflowId: string
  currentStep: number
  responses: WorkflowResponse[]
  startedAt: string
  completedAt?: string
}
