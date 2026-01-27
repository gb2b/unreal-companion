/**
 * partyStore - State management for Party Mode (multi-agent conversations)
 *
 * Orchestrates conversations between 2-3 AI agents discussing a topic.
 * Features:
 * - Turn-based conversation flow
 * - Agent selection and configuration
 * - Conversation history with agent attribution
 * - Session management and persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type PartyStatus =
  | 'idle'           // No active party
  | 'configuring'    // Setting up agents and topic
  | 'active'         // Conversation in progress
  | 'waiting'        // Waiting for user input
  | 'paused'         // User paused the conversation
  | 'completed'      // Conversation ended

export interface PartyAgent {
  id: string
  name: string
  role: string           // e.g., "Game Designer", "Technical Architect"
  avatar?: string
  color: string          // Accent color for UI
  personality?: string   // Personality prompt modifier
  expertise: string[]    // Areas of expertise
}

export interface MessageReaction {
  type: 'agree' | 'disagree' | 'question' | 'build'
  fromAgentId: string
}

export interface PartyMessage {
  id: string
  agentId: string
  content: string
  timestamp: string
  reactions?: MessageReaction[]
  referencesMessageId?: string  // If replying to specific message
  isHighlighted?: boolean       // User marked as important
}

export interface PartyTurn {
  agentId: string
  messageId: string
  turnNumber: number
}

export interface PartySession {
  id: string
  projectId: string
  topic: string
  topicContext?: string
  agents: PartyAgent[]
  messages: PartyMessage[]
  turns: PartyTurn[]
  currentTurn: number
  maxTurns: number
  status: PartyStatus
  createdAt: string
  updatedAt: string
  summary?: string          // AI-generated summary
  actionItems?: string[]    // Extracted action items
}

export interface AgentTemplate {
  id: string
  name: string
  role: string
  defaultColor: string
  expertise: string[]
  personality: string
}

// =============================================================================
// Default Agent Templates
// =============================================================================

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'game-designer',
    name: 'Alex',
    role: 'Game Designer',
    defaultColor: '#8b5cf6', // violet
    expertise: ['game mechanics', 'player experience', 'balancing', 'progression'],
    personality: 'Creative and player-focused, always thinks about the fun factor'
  },
  {
    id: 'technical-architect',
    name: 'Sam',
    role: 'Technical Architect',
    defaultColor: '#06b6d4', // cyan
    expertise: ['system architecture', 'performance', 'scalability', 'blueprints'],
    personality: 'Pragmatic and detail-oriented, considers technical implications'
  },
  {
    id: 'narrative-designer',
    name: 'Jordan',
    role: 'Narrative Designer',
    defaultColor: '#f59e0b', // amber
    expertise: ['storytelling', 'world-building', 'dialogue', 'character arcs'],
    personality: 'Imaginative and story-driven, focuses on emotional impact'
  },
  {
    id: 'art-director',
    name: 'Morgan',
    role: 'Art Director',
    defaultColor: '#ec4899', // pink
    expertise: ['visual style', 'mood', 'color theory', 'asset direction'],
    personality: 'Visually creative, thinks about aesthetic coherence and mood'
  },
  {
    id: 'level-designer',
    name: 'Casey',
    role: 'Level Designer',
    defaultColor: '#10b981', // emerald
    expertise: ['level layout', 'pacing', 'environmental storytelling', 'flow'],
    personality: 'Spatial thinker, considers player journey and exploration'
  }
]

// =============================================================================
// Store Interface
// =============================================================================

interface PartyStore {
  // Current session
  currentSession: PartySession | null
  setCurrentSession: (session: PartySession | null) => void

  // All sessions
  sessions: PartySession[]
  loadSessions: (projectId: string) => PartySession[]
  saveSession: (session: PartySession) => void
  deleteSession: (sessionId: string) => void

  // Session lifecycle
  startParty: (projectId: string, topic: string, agentIds: string[], maxTurns?: number) => PartySession
  pauseParty: () => void
  resumeParty: () => void
  endParty: () => void

  // Conversation
  addMessage: (agentId: string, content: string) => PartyMessage
  addReaction: (messageId: string, reaction: MessageReaction) => void
  highlightMessage: (messageId: string) => void
  unhighlightMessage: (messageId: string) => void

  // Turn management
  nextTurn: () => string | null  // Returns next agent ID
  getCurrentAgent: () => PartyAgent | null
  getNextAgent: () => PartyAgent | null
  skipTurn: () => void

  // Agent management
  availableAgents: PartyAgent[]
  addAgent: (agentId: string) => void
  removeAgent: (agentId: string) => void
  updateAgentConfig: (agentId: string, updates: Partial<PartyAgent>) => void

  // AI orchestration
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  streamingContent: string
  setStreamingContent: (content: string) => void
  generateNextResponse: () => Promise<void>

  // Summary and extraction
  generateSummary: () => Promise<string>
  extractActionItems: () => Promise<string[]>

  // User intervention
  userInterjection: (message: string) => void
  askForClarification: () => void
}

// =============================================================================
// Store Implementation
// =============================================================================

export const usePartyStore = create<PartyStore>()(
  persist(
    (set, get) => ({
      // Current session
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),

      // Sessions storage
      sessions: [],
      loadSessions: (projectId) => {
        return get().sessions.filter(s => s.projectId === projectId)
      },

      saveSession: (session) => {
        const updated = { ...session, updatedAt: new Date().toISOString() }
        set(s => {
          const index = s.sessions.findIndex(sess => sess.id === session.id)
          const newSessions = [...s.sessions]
          if (index >= 0) {
            newSessions[index] = updated
          } else {
            newSessions.push(updated)
          }
          return {
            sessions: newSessions,
            currentSession: s.currentSession?.id === session.id ? updated : s.currentSession
          }
        })
      },

      deleteSession: (sessionId) => {
        set(s => ({
          sessions: s.sessions.filter(sess => sess.id !== sessionId),
          currentSession: s.currentSession?.id === sessionId ? null : s.currentSession
        }))
      },

      // Session lifecycle
      startParty: (projectId, topic, agentIds, maxTurns = 10) => {
        // Get agents from templates
        const agents: PartyAgent[] = agentIds
          .map(id => AGENT_TEMPLATES.find(t => t.id === id))
          .filter(Boolean)
          .map(template => ({
            id: generateId(),
            name: template!.name,
            role: template!.role,
            color: template!.defaultColor,
            expertise: template!.expertise,
            personality: template!.personality
          }))

        if (agents.length < 2) {
          throw new Error('Party mode requires at least 2 agents')
        }

        const now = new Date().toISOString()
        const session: PartySession = {
          id: generateId(),
          projectId,
          topic,
          agents,
          messages: [],
          turns: [],
          currentTurn: 0,
          maxTurns,
          status: 'active',
          createdAt: now,
          updatedAt: now
        }

        get().saveSession(session)
        set({ currentSession: session })
        return session
      },

      pauseParty: () => {
        const session = get().currentSession
        if (!session) return
        get().saveSession({ ...session, status: 'paused' })
      },

      resumeParty: () => {
        const session = get().currentSession
        if (!session || session.status !== 'paused') return
        get().saveSession({ ...session, status: 'active' })
      },

      endParty: () => {
        const session = get().currentSession
        if (!session) return
        get().saveSession({ ...session, status: 'completed' })
      },

      // Conversation
      addMessage: (agentId, content) => {
        const session = get().currentSession
        if (!session) throw new Error('No active session')

        const message: PartyMessage = {
          id: generateId(),
          agentId,
          content,
          timestamp: new Date().toISOString()
        }

        const turn: PartyTurn = {
          agentId,
          messageId: message.id,
          turnNumber: session.currentTurn
        }

        const updated = {
          ...session,
          messages: [...session.messages, message],
          turns: [...session.turns, turn],
          currentTurn: session.currentTurn + 1
        }

        // Check if max turns reached
        if (updated.currentTurn >= session.maxTurns) {
          updated.status = 'completed'
        }

        get().saveSession(updated)
        return message
      },

      addReaction: (messageId, reaction) => {
        const session = get().currentSession
        if (!session) return

        const messages = session.messages.map(m => {
          if (m.id === messageId) {
            return {
              ...m,
              reactions: [...(m.reactions || []), reaction]
            }
          }
          return m
        })

        get().saveSession({ ...session, messages })
      },

      highlightMessage: (messageId) => {
        const session = get().currentSession
        if (!session) return

        const messages = session.messages.map(m =>
          m.id === messageId ? { ...m, isHighlighted: true } : m
        )
        get().saveSession({ ...session, messages })
      },

      unhighlightMessage: (messageId) => {
        const session = get().currentSession
        if (!session) return

        const messages = session.messages.map(m =>
          m.id === messageId ? { ...m, isHighlighted: false } : m
        )
        get().saveSession({ ...session, messages })
      },

      // Turn management
      nextTurn: () => {
        const session = get().currentSession
        if (!session || session.status !== 'active') return null

        // Round-robin through agents
        const agentIndex = session.currentTurn % session.agents.length
        return session.agents[agentIndex].id
      },

      getCurrentAgent: () => {
        const session = get().currentSession
        if (!session) return null

        const agentIndex = session.currentTurn % session.agents.length
        return session.agents[agentIndex]
      },

      getNextAgent: () => {
        const session = get().currentSession
        if (!session) return null

        const nextTurn = session.currentTurn + 1
        const agentIndex = nextTurn % session.agents.length
        return session.agents[agentIndex]
      },

      skipTurn: () => {
        const session = get().currentSession
        if (!session) return

        get().saveSession({
          ...session,
          currentTurn: session.currentTurn + 1
        })
      },

      // Agent management
      availableAgents: AGENT_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        role: t.role,
        color: t.defaultColor,
        expertise: t.expertise,
        personality: t.personality
      })),

      addAgent: (agentId) => {
        const session = get().currentSession
        if (!session) return

        const template = AGENT_TEMPLATES.find(t => t.id === agentId)
        if (!template) return

        // Max 3 agents
        if (session.agents.length >= 3) return

        const newAgent: PartyAgent = {
          id: generateId(),
          name: template.name,
          role: template.role,
          color: template.defaultColor,
          expertise: template.expertise,
          personality: template.personality
        }

        get().saveSession({
          ...session,
          agents: [...session.agents, newAgent]
        })
      },

      removeAgent: (agentId) => {
        const session = get().currentSession
        if (!session) return

        // Must keep at least 2 agents
        if (session.agents.length <= 2) return

        get().saveSession({
          ...session,
          agents: session.agents.filter(a => a.id !== agentId)
        })
      },

      updateAgentConfig: (agentId, updates) => {
        const session = get().currentSession
        if (!session) return

        const agents = session.agents.map(a =>
          a.id === agentId ? { ...a, ...updates } : a
        )
        get().saveSession({ ...session, agents })
      },

      // AI orchestration
      isGenerating: false,
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      streamingContent: '',
      setStreamingContent: (content) => set({ streamingContent: content }),

      generateNextResponse: async () => {
        const session = get().currentSession
        if (!session || session.status !== 'active') return

        const currentAgent = get().getCurrentAgent()
        if (!currentAgent) return

        set({ isGenerating: true, streamingContent: '' })

        try {
          // Build conversation context for the agent
          const context = {
            topic: session.topic,
            topicContext: session.topicContext,
            agent: currentAgent,
            conversationHistory: session.messages.map(m => ({
              agent: session.agents.find(a => a.id === m.agentId)?.name || 'Unknown',
              content: m.content
            })),
            turnNumber: session.currentTurn,
            maxTurns: session.maxTurns
          }

          // This would call the actual LLM API
          // For now, simulate with a placeholder
          const response = await simulateAgentResponse(context)

          get().addMessage(currentAgent.id, response)
        } finally {
          set({ isGenerating: false, streamingContent: '' })
        }
      },

      // Summary and extraction
      generateSummary: async () => {
        const session = get().currentSession
        if (!session || session.messages.length === 0) return ''

        // Would call LLM to generate summary
        const summary = `Discussion about "${session.topic}" between ${session.agents.map(a => a.name).join(', ')}. Key points discussed...`

        get().saveSession({ ...session, summary })
        return summary
      },

      extractActionItems: async () => {
        const session = get().currentSession
        if (!session || session.messages.length === 0) return []

        // Would call LLM to extract action items
        const actionItems = [
          'Review the discussed mechanics',
          'Create prototype based on suggestions'
        ]

        get().saveSession({ ...session, actionItems })
        return actionItems
      },

      // User intervention
      userInterjection: (message) => {
        const session = get().currentSession
        if (!session) return

        // Add user message as a special "user" agent
        const userMessage: PartyMessage = {
          id: generateId(),
          agentId: 'user',
          content: message,
          timestamp: new Date().toISOString()
        }

        get().saveSession({
          ...session,
          messages: [...session.messages, userMessage]
        })
      },

      askForClarification: () => {
        const session = get().currentSession
        if (!session) return

        get().saveSession({ ...session, status: 'waiting' })
      }
    }),
    {
      name: 'party-store',
      partialize: (state) => ({
        sessions: state.sessions
      })
    }
  )
)

// =============================================================================
// Helper: Simulate agent response (placeholder for actual LLM call)
// =============================================================================

async function simulateAgentResponse(context: {
  topic: string
  agent: PartyAgent
  conversationHistory: { agent: string; content: string }[]
  turnNumber: number
}): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // This is a placeholder - would be replaced with actual LLM call
  const responses = [
    `As the ${context.agent.role}, I think we should consider the player perspective here. What about...`,
    `Building on what was said, from a ${context.agent.role.toLowerCase()} standpoint, I'd suggest...`,
    `Interesting point! My expertise in ${context.agent.expertise[0]} makes me think...`,
    `I agree with some of that, but let me offer an alternative view from my perspective as ${context.agent.role}...`
  ]

  return responses[context.turnNumber % responses.length]
}

export default usePartyStore
