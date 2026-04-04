// web-ui/src/stores/providerStore.ts
/**
 * Provider Store -- multi-provider LLM configuration.
 * Simplified from llmStore, focused on streaming-aware provider management.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/services/api'

export type ProviderName = 'anthropic' | 'openai' | 'ollama'

interface ProviderModel {
  id: string
  name: string
  tier?: string
}

interface ProviderState {
  currentProvider: ProviderName
  currentModel: string
  availableModels: ProviderModel[]
  hasKey: Record<ProviderName, boolean>
  isLoading: boolean

  // Actions
  fetchConfig: () => Promise<void>
  setProvider: (provider: ProviderName) => Promise<void>
  setModel: (model: string) => Promise<void>
  saveApiKey: (provider: ProviderName, key: string) => Promise<void>
  testConnection: () => Promise<{ success: boolean; message: string }>
}

export const useProviderStore = create<ProviderState>()(
  persist(
    (set, get) => ({
      currentProvider: 'anthropic',
      currentModel: '',
      availableModels: [],
      hasKey: { anthropic: false, openai: false, ollama: true },
      isLoading: false,

      fetchConfig: async () => {
        try {
          const config = await api.get<{
            provider: ProviderName
            model: string
            has_anthropic_key: boolean
            has_openai_key: boolean
          }>('/api/llm/config')
          set({
            currentProvider: config.provider,
            currentModel: config.model,
            hasKey: {
              anthropic: config.has_anthropic_key,
              openai: config.has_openai_key,
              ollama: true,
            },
          })
        } catch (error) {
          console.error('Failed to fetch provider config:', error)
        }
      },

      setProvider: async (provider) => {
        set({ isLoading: true })
        try {
          await api.post('/api/llm/config', { provider })
          const models = await api.get<{ models: ProviderModel[] }>(`/api/llm/models/${provider}`)
          set({
            currentProvider: provider,
            currentModel: '',
            availableModels: models.models || [],
          })
        } finally {
          set({ isLoading: false })
        }
      },

      setModel: async (model) => {
        await api.post('/api/llm/config', { model })
        set({ currentModel: model })
      },

      saveApiKey: async (provider, key) => {
        const payload: Record<string, string> = {}
        if (provider === 'anthropic') payload.anthropic_key = key
        else if (provider === 'openai') payload.openai_key = key
        await api.post('/api/llm/config', payload)
        set(s => ({
          hasKey: { ...s.hasKey, [provider]: !!key },
        }))
      },

      testConnection: async () => {
        const { currentProvider } = get()
        try {
          const result = await api.post<{ ok: boolean; error?: string }>(`/api/llm/test?provider=${currentProvider}`)
          return {
            success: result.ok,
            message: result.ok ? `Connected to ${currentProvider}` : (result.error || 'Failed'),
          }
        } catch (e) {
          return { success: false, message: (e as Error).message }
        }
      },
    }),
    {
      name: 'provider-store',
      partialize: (s) => ({
        currentProvider: s.currentProvider,
        currentModel: s.currentModel,
      }),
    }
  )
)
