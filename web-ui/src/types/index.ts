export interface Project {
  id: string
  name: string
  slug: string
  unreal_host: string
  unreal_port: number
  default_agent: string
  settings?: Record<string, unknown>
  created_at?: string
  last_opened?: string
}

export interface Conversation {
  id: string
  project_id: string
  agent: string
  title?: string
  created_at: string
  updated_at?: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_result?: unknown
  created_at: string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface Agent {
  id: string
  name: string
  description: string
  icon: string
}

export interface ContextFile {
  id: string
  project_id: string
  name: string
  path: string
  type: 'markdown' | 'text' | 'image' | 'pdf'
  size_bytes: number
  include_in_prompt: boolean
  created_at: string
}
