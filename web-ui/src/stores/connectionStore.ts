import { create } from 'zustand'
import { api } from '@/services/api'

interface StatusResponse {
  mcp_connected: boolean
  unreal_connected: boolean
  unreal_host: string
  unreal_port: number
  unreal_error?: string
  llm_ready: boolean
  llm_provider: string
  llm_model: string
}

interface ConnectionStore {
  unrealConnected: boolean
  mcpConnected: boolean
  wsConnected: boolean
  unrealHost: string
  unrealPort: number
  unrealError: string | null
  llmReady: boolean
  isLoading: boolean
  
  fetchStatus: () => Promise<void>
  setWsConnected: (connected: boolean) => void
  setStatus: (status: { unreal_connected?: boolean; mcp_connected?: boolean }) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  unrealConnected: false,
  mcpConnected: false,
  wsConnected: false,
  unrealHost: '127.0.0.1',
  unrealPort: 55557,
  unrealError: null,
  llmReady: false,
  isLoading: false,
  
  fetchStatus: async () => {
    set({ isLoading: true })
    try {
      const status = await api.get<StatusResponse>('/api/status')
      set({
        mcpConnected: status.mcp_connected,
        unrealConnected: status.unreal_connected,
        unrealHost: status.unreal_host,
        unrealPort: status.unreal_port,
        unrealError: status.unreal_error || null,
        llmReady: status.llm_ready,
      })
    } catch (error) {
      console.error('Failed to fetch status:', error)
      set({
        mcpConnected: false,
        unrealConnected: false,
        unrealError: 'Failed to connect to backend',
      })
    } finally {
      set({ isLoading: false })
    }
  },
  
  setWsConnected: (connected) => set({ wsConnected: connected }),
  
  setStatus: (status) => set({
    unrealConnected: status.unreal_connected ?? false,
    mcpConnected: status.mcp_connected ?? false,
  }),
}))
