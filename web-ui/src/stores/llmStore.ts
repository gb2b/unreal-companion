import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/services/api'

export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'ollama' | 'custom'

interface LLMConfig {
  provider: LLMProvider
  model: string
  custom_model?: string
  ollama_url: string
  has_anthropic_key: boolean
  has_openai_key: boolean
  has_google_key: boolean
}

interface LLMModel {
  id: string
  name: string
  tier?: string
  installed?: boolean
}

export interface CustomEndpoint {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  defaultModel: string
  isConnected?: boolean
}

export interface AutoModeRule {
  id: string
  taskType: string
  preferredModel: string
  fallbackModel: string
  keywords: string[]
}

interface LLMStore {
  currentProvider: LLMProvider
  currentModel: string
  customModel: string
  ollamaUrl: string
  hasAnthropicKey: boolean
  hasOpenAIKey: boolean
  hasGoogleKey: boolean
  availableModels: LLMModel[]
  supportsCustom: boolean
  isLoading: boolean
  
  // Custom Endpoints
  customEndpoints: CustomEndpoint[]
  
  // Auto Mode
  autoModeEnabled: boolean
  autoModeRules: AutoModeRule[]
  
  // Actions
  fetchConfig: () => Promise<void>
  setProvider: (provider: LLMProvider) => Promise<void>
  setModel: (model: string) => Promise<void>
  setCustomModel: (model: string) => Promise<void>
  setApiKey: (provider: LLMProvider, key: string) => Promise<void>
  saveApiKey: (provider: LLMProvider, key: string) => Promise<void> // Alias for setApiKey
  setOllamaUrl: (url: string) => Promise<void>
  fetchModels: (provider: LLMProvider) => Promise<void>
  fetchModelsFromAPI: (provider: LLMProvider) => Promise<void> // Fetch from provider API
  testConnection: () => Promise<{ success: boolean; message: string }>
  
  // Custom Endpoints Actions
  addCustomEndpoint: (endpoint: CustomEndpoint) => Promise<void>
  removeCustomEndpoint: (id: string) => Promise<void>
  testCustomEndpoint: (id: string) => Promise<void>
  
  // Auto Mode Actions
  setAutoModeEnabled: (enabled: boolean) => void
  updateAutoModeRules: (rules: AutoModeRule[]) => void
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      currentProvider: 'anthropic',
      currentModel: '',
      customModel: '',
      ollamaUrl: 'http://localhost:11434',
      hasAnthropicKey: false,
      hasOpenAIKey: false,
      hasGoogleKey: false,
      availableModels: [],
      supportsCustom: true,
      isLoading: false,
      
      // Custom Endpoints
      customEndpoints: [],
      
      // Auto Mode
      autoModeEnabled: false,
      autoModeRules: [],
      
      fetchConfig: async () => {
        try {
          const config = await api.get<LLMConfig>('/api/llm/config')
          set({
            currentProvider: config.provider,
            currentModel: config.model,
            customModel: config.custom_model || '',
            ollamaUrl: config.ollama_url,
            hasAnthropicKey: config.has_anthropic_key,
            hasOpenAIKey: config.has_openai_key,
            hasGoogleKey: config.has_google_key,
          })
          // Fetch models for current provider
          await get().fetchModels(config.provider)
        } catch (error) {
          console.error('Failed to fetch LLM config:', error)
        }
      },
      
      setProvider: async (provider) => {
        set({ isLoading: true })
        try {
          await api.post('/api/llm/config', { provider })
          set({ currentProvider: provider, currentModel: '', customModel: '' })
          await get().fetchModels(provider)
        } finally {
          set({ isLoading: false })
        }
      },
      
      setModel: async (model) => {
        try {
          await api.post('/api/llm/config', { model })
          set({ currentModel: model, customModel: '' })
        } catch (error) {
          console.error('Failed to set model:', error)
        }
      },
      
      setCustomModel: async (model) => {
        try {
          await api.post('/api/llm/config', { custom_model: model })
          set({ customModel: model, currentModel: model })
        } catch (error) {
          console.error('Failed to set custom model:', error)
        }
      },
      
      setApiKey: async (provider, key) => {
        set({ isLoading: true })
        try {
          const payload: Record<string, string> = {}
          if (provider === 'anthropic') {
            payload.anthropic_key = key
          } else if (provider === 'openai') {
            payload.openai_key = key
          } else if (provider === 'google') {
            payload.google_key = key
          }
          
          const config = await api.post<LLMConfig>('/api/llm/config', payload)
          set({
            hasAnthropicKey: config.has_anthropic_key,
            hasOpenAIKey: config.has_openai_key,
            hasGoogleKey: config.has_google_key,
          })
        } finally {
          set({ isLoading: false })
        }
      },
      
      // Alias for setApiKey
      saveApiKey: async (provider, key) => {
        return get().setApiKey(provider, key)
      },
      
      setOllamaUrl: async (url) => {
        try {
          await api.post('/api/llm/config', { ollama_url: url })
          set({ ollamaUrl: url })
        } catch (error) {
          console.error('Failed to set Ollama URL:', error)
        }
      },
      
      fetchModels: async (provider) => {
        try {
          const result = await api.get<{ models: LLMModel[]; supports_custom?: boolean; error?: string }>(
            `/api/llm/models/${provider}`
          )
          set({ 
            availableModels: result.models || [],
            supportsCustom: result.supports_custom ?? true
          })
        } catch (error) {
          console.error('Failed to fetch models:', error)
          set({ availableModels: [] })
        }
      },
      
      // Fetch models directly from provider API (requires API key)
      fetchModelsFromAPI: async (provider) => {
        try {
          const result = await api.get<{ models: LLMModel[]; supports_custom?: boolean; error?: string }>(
            `/api/llm/models/${provider}/live`
          )
          set({ 
            availableModels: result.models || [],
            supportsCustom: result.supports_custom ?? true
          })
        } catch (error) {
          console.error('Failed to fetch models from API:', error)
          // Fallback to static list
          await get().fetchModels(provider)
        }
      },
      
      testConnection: async () => {
        const { currentProvider, currentModel } = get()
        
        if (!currentModel) {
          return { success: false, message: 'Please select a model' }
        }
        
        try {
          const result = await api.post<{ ok: boolean; error?: string; model?: string }>(
            `/api/llm/test?provider=${currentProvider}`
          )
          
          if (result.ok) {
            return { 
              success: true, 
              message: `Connected to ${currentProvider}${result.model ? ` (${result.model})` : ''}` 
            }
          }
          return { 
            success: false, 
            message: result.error || 'Connection failed' 
          }
        } catch (error) {
          return { 
            success: false, 
            message: error instanceof Error ? error.message : 'Connection failed' 
          }
        }
      },
      
      // Custom Endpoints Actions
      addCustomEndpoint: async (endpoint) => {
        try {
          await api.post('/api/llm/custom-endpoints', endpoint)
          set(state => ({
            customEndpoints: [...state.customEndpoints, endpoint]
          }))
        } catch (error) {
          console.error('Failed to add custom endpoint:', error)
        }
      },
      
      removeCustomEndpoint: async (id) => {
        try {
          await api.delete(`/api/llm/custom-endpoints/${id}`)
          set(state => ({
            customEndpoints: state.customEndpoints.filter(e => e.id !== id)
          }))
        } catch (error) {
          console.error('Failed to remove custom endpoint:', error)
        }
      },
      
      testCustomEndpoint: async (id) => {
        try {
          const result = await api.post<{ ok: boolean }>(`/api/llm/custom-endpoints/${id}/test`)
          set(state => ({
            customEndpoints: state.customEndpoints.map(e => 
              e.id === id ? { ...e, isConnected: result.ok } : e
            )
          }))
        } catch (error) {
          console.error('Failed to test custom endpoint:', error)
          set(state => ({
            customEndpoints: state.customEndpoints.map(e => 
              e.id === id ? { ...e, isConnected: false } : e
            )
          }))
        }
      },
      
      // Auto Mode Actions
      setAutoModeEnabled: (enabled) => {
        set({ autoModeEnabled: enabled })
        // Persist to backend
        api.post('/api/llm/auto-mode', { enabled }).catch(console.error)
      },
      
      updateAutoModeRules: (rules) => {
        set({ autoModeRules: rules })
        // Persist to backend
        api.post('/api/llm/auto-mode/rules', { rules }).catch(console.error)
      },
    }),
    { 
      name: 'llm-store',
      partialize: (state) => ({
        // Only persist UI preferences, not config (comes from backend)
        currentProvider: state.currentProvider,
        currentModel: state.currentModel,
        customModel: state.customModel,
        ollamaUrl: state.ollamaUrl,
        // Also persist custom endpoints and auto mode locally
        customEndpoints: state.customEndpoints,
        autoModeEnabled: state.autoModeEnabled,
        autoModeRules: state.autoModeRules,
      })
    }
  )
)
