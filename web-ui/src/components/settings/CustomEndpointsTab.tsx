import { useState } from 'react'
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Server,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLLMStore } from '@/stores/llmStore'
import { cn, generateId } from '@/lib/utils'

// Preset endpoints for quick setup
const PRESET_ENDPOINTS = [
  { 
    name: 'LM Studio', 
    baseUrl: 'http://localhost:1234/v1', 
    description: 'Local LLM server',
    icon: '🖥️'
  },
  { 
    name: 'Together AI', 
    baseUrl: 'https://api.together.xyz/v1', 
    description: 'Cloud inference',
    icon: '☁️'
  },
  { 
    name: 'Groq', 
    baseUrl: 'https://api.groq.com/openai/v1', 
    description: 'Ultra-fast inference',
    icon: '⚡'
  },
  { 
    name: 'Fireworks', 
    baseUrl: 'https://api.fireworks.ai/inference/v1', 
    description: 'Optimized models',
    icon: '🎆'
  },
  { 
    name: 'Mistral AI', 
    baseUrl: 'https://api.mistral.ai/v1', 
    description: 'Mistral models',
    icon: '🌬️'
  },
]

interface CustomEndpoint {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  defaultModel: string
  isConnected?: boolean
}

export function CustomEndpointsTab() {
  const { customEndpoints, addCustomEndpoint, removeCustomEndpoint, testCustomEndpoint } = useLLMStore()
  
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    defaultModel: ''
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const handlePresetClick = (preset: typeof PRESET_ENDPOINTS[0]) => {
    setFormData({
      ...formData,
      name: preset.name,
      baseUrl: preset.baseUrl
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.baseUrl) return
    
    await addCustomEndpoint({
      id: generateId(),
      name: formData.name,
      baseUrl: formData.baseUrl,
      apiKey: formData.apiKey,
      defaultModel: formData.defaultModel
    })
    
    setFormData({ name: '', baseUrl: '', apiKey: '', defaultModel: '' })
    setShowForm(false)
  }

  const handleTest = async (endpoint: CustomEndpoint) => {
    setTesting(endpoint.id)
    try {
      await testCustomEndpoint(endpoint.id)
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <h3 className="font-medium mb-2">Custom OpenAI-Compatible Endpoints</h3>
        <p className="text-sm text-muted-foreground">
          Add any LLM service that supports the OpenAI API format. This includes local servers 
          like LM Studio, Ollama with OpenAI compatibility, and cloud services like Together AI, Groq, etc.
        </p>
      </div>

      {/* Quick Setup Presets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Setup</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRESET_ENDPOINTS.map(preset => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 transition-all card-lift text-left"
            >
              <span className="text-xl">{preset.icon}</span>
              <div>
                <p className="font-medium text-sm">{preset.name}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Add Custom Form */}
      {showForm ? (
        <section className="space-y-4 p-4 rounded-xl border border-primary/50 bg-primary/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Endpoint</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
          
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My LLM Server"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Base URL</label>
              <Input
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be OpenAI-compatible (e.g., /v1/chat/completions)
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">API Key (optional)</label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Default Model</label>
              <Input
                value={formData.defaultModel}
                onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                placeholder="e.g., llama-3.2-70b, mixtral-8x7b"
              />
            </div>
            
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.baseUrl}>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </div>
        </section>
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Endpoint
        </Button>
      )}

      {/* Configured Endpoints */}
      {customEndpoints.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Configured Endpoints</h2>
          <div className="space-y-2">
            {customEndpoints.map(endpoint => (
              <div
                key={endpoint.id}
                className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  endpoint.isConnected 
                    ? "border-green-500/30 bg-green-500/5" 
                    : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    endpoint.isConnected 
                      ? "bg-green-500/10 text-green-500" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{endpoint.name}</p>
                    <p className="text-xs text-muted-foreground">{endpoint.baseUrl}</p>
                    {endpoint.defaultModel && (
                      <p className="text-xs text-primary">Model: {endpoint.defaultModel}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    endpoint.isConnected ? "bg-green-500" : "bg-muted-foreground"
                  )} />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(endpoint)}
                    disabled={testing === endpoint.id}
                  >
                    {testing === endpoint.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomEndpoint(endpoint.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Help */}
      <section className="p-4 rounded-xl border border-dashed border-border">
        <h3 className="font-medium mb-2">Need Help?</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• LM Studio: Start the server and use http://localhost:1234/v1</li>
          <li>• Together AI: Get your API key from <a href="https://together.ai" target="_blank" className="text-primary hover:underline">together.ai</a></li>
          <li>• Groq: Sign up at <a href="https://console.groq.com" target="_blank" className="text-primary hover:underline">console.groq.com</a></li>
        </ul>
      </section>
    </div>
  )
}
