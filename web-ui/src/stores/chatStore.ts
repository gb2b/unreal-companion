import { create } from 'zustand'
import { api } from '@/services/api'
import { useProjectStore } from './projectStore'
import { generateId } from '@/lib/utils'

export interface ImageData {
  type: 'image'
  media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  data: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  agent?: string
  toolCalls?: ToolCall[]
  images?: ImageData[]
  plan?: ExecutionPlan
  createdAt: Date
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  duration?: number  // execution time in ms
  status?: 'pending' | 'running' | 'success' | 'error'
}

export interface PlannedAction {
  id: string
  name: string
  description: string
  category: string
  status: 'planned' | 'running' | 'done' | 'error'
  duration?: number
}

export interface ExecutionPlan {
  id: string
  summary: string
  actions: PlannedAction[]
  status: 'planning' | 'ready' | 'executing' | 'complete' | 'error'
  currentStep: number
}

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  currentAgent: string
  conversationId: string | null
  currentConversationId: string | null
  
  addMessage: (msg: Omit<Message, 'id' | 'createdAt'>) => void
  sendMessage: (content: string, images?: ImageData[]) => Promise<void>
  clearMessages: () => void
  setAgent: (agent: string) => void
  setConversation: (id: string | null) => void
  setConversationId: (id: string | null) => void
  loadConversation: (projectId: string, conversationId: string) => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  currentAgent: 'game-dev',
  conversationId: null,
  currentConversationId: null,
  
  addMessage: (msg) => set(state => ({
    messages: [...state.messages, { 
      ...msg, 
      id: generateId(),
      createdAt: new Date() 
    }]
  })),
  
  sendMessage: async (content, images) => {
    const { currentAgent, addMessage, conversationId } = get()
    const projectId = useProjectStore.getState().currentProject?.id
    
    if (!projectId) {
      console.error('[Chat] No project selected')
      addMessage({ 
        role: 'assistant', 
        content: 'Error: No project selected. Please select or create a project first.'
      })
      return
    }
    
    // Add user message with images
    addMessage({ role: 'user', content, images })
    set({ isLoading: true })
    
    console.log('[Chat] Sending message:', { projectId, agent: currentAgent, conversationId })
    
    try {
      const response = await api.post<{
        response: string
        tool_calls: ToolCall[]
        plan: ExecutionPlan | null
        conversation_id: string
      }>(`/api/projects/${projectId}/chat`, {
        message: content,
        agent: currentAgent,
        conversation_id: conversationId,
        images: images,
        enable_planning: true
      })
      
      console.log('[Chat] Response received:', { 
        hasResponse: !!response.response, 
        toolCalls: response.tool_calls?.length || 0,
        conversationId: response.conversation_id
      })
      
      // Convert plan from snake_case to camelCase if present
      let plan: ExecutionPlan | undefined
      if (response.plan) {
        plan = {
          id: response.plan.id,
          summary: response.plan.summary,
          status: response.plan.status as ExecutionPlan['status'],
          currentStep: (response.plan as any).current_step ?? 0,
          actions: response.plan.actions.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            category: a.category,
            status: a.status as PlannedAction['status'],
            duration: a.duration
          }))
        }
      }
      
      addMessage({ 
        role: 'assistant', 
        content: response.response,
        agent: currentAgent,
        toolCalls: response.tool_calls,
        plan
      })
      
      if (!conversationId) {
        set({ conversationId: response.conversation_id })
      }
    } catch (error) {
      console.error('[Chat] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      addMessage({ 
        role: 'assistant', 
        content: `Error: ${errorMessage}\n\nPlease check:\n- Your API key is configured in Settings\n- The selected model is available\n- Your network connection is working`
      })
    } finally {
      set({ isLoading: false })
    }
  },
  
  clearMessages: () => set({ messages: [], conversationId: null, currentConversationId: null }),
  setAgent: (agent) => set({ currentAgent: agent }),
  setConversation: (id) => set({ conversationId: id }),
  setConversationId: (id) => set({ conversationId: id, currentConversationId: id }),
  
  loadConversation: async (projectId, conversationId) => {
    set({ isLoading: true })
    try {
      const response = await api.get<{ messages: any[] }>(
        `/api/projects/${projectId}/conversations/${conversationId}`
      )
      
      const messages: Message[] = response.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agent: m.agent,
        toolCalls: m.tool_calls,
        createdAt: new Date(m.created_at)
      }))
      
      set({ 
        messages, 
        conversationId, 
        currentConversationId: conversationId 
      })
    } catch (error) {
      console.error('Failed to load conversation:', error)
    } finally {
      set({ isLoading: false })
    }
  },
}))
