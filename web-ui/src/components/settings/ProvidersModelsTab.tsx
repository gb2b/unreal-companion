import { useState, useEffect, useCallback } from 'react'
import { 
  Eye, 
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Server,
  ChevronDown,
  ChevronRight,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLLMStore, LLMProvider } from '@/stores/llmStore'
import { api } from '@/services/api'
import { cn, generateId } from '@/lib/utils'

// Provider definitions with branding
const PROVIDERS = [
  { 
    id: 'anthropic' as LLMProvider, 
    name: 'Anthropic', 
    icon: '🧠',
    gradient: 'from-orange-500/20 to-amber-500/20',
    accent: 'text-orange-400',
    description: 'Claude Opus 4.5, Sonnet 4, Haiku'
  },
  { 
    id: 'openai' as LLMProvider, 
    name: 'OpenAI', 
    icon: '🤖',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    accent: 'text-emerald-400',
    description: 'Codex 5.2, GPT-5 Turbo'
  },
  { 
    id: 'google' as LLMProvider, 
    name: 'Google', 
    icon: '✨',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    accent: 'text-blue-400',
    description: 'Gemini 3 Pro, Flash'
  },
  { 
    id: 'ollama' as LLMProvider, 
    name: 'Ollama (Local)', 
    icon: '🏠',
    gradient: 'from-purple-500/20 to-pink-500/20',
    accent: 'text-purple-400',
    description: 'Llama 4, Mistral, local models'
  },
]

interface UsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  totalEstimatedCost: number
  byProvider: Record<string, {
    inputTokens: number
    outputTokens: number
    requests: number
    estimatedCost: number
  }>
}

export function ProvidersModelsTab() {
  const { 
    currentProvider, 
    currentModel,
    ollamaUrl,
    hasAnthropicKey,
    hasOpenAIKey,
    hasGoogleKey,
    availableModels,
    customEndpoints,
    setProvider, 
    setModel,
    setApiKey,
    setOllamaUrl,
    fetchModels,
    fetchModelsFromAPI,
    testConnection,
    addCustomEndpoint,
    removeCustomEndpoint,
    testCustomEndpoint,
  } = useLLMStore()

  // Expanded sections
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set([currentProvider]))
  const [showApiKeyFor, setShowApiKeyFor] = useState<string | null>(null)
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  
  // Custom endpoint form
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ name: '', baseUrl: '', apiKey: '', defaultModel: '' })
  
  // Usage
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [showUsage, setShowUsage] = useState(false)

  const fetchUsage = useCallback(async () => {
    try {
      const data = await api.get<UsageSummary>('/api/usage?period=week')
      setUsage(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const toggleProvider = (providerId: string) => {
    const newSet = new Set(expandedProviders)
    if (newSet.has(providerId)) {
      newSet.delete(providerId)
    } else {
      newSet.add(providerId)
    }
    setExpandedProviders(newSet)
  }

  const hasKeyFor = (providerId: LLMProvider): boolean => {
    if (providerId === 'anthropic') return hasAnthropicKey
    if (providerId === 'openai') return hasOpenAIKey
    if (providerId === 'google') return hasGoogleKey
    if (providerId === 'ollama') return true
    return false
  }

  const handleSaveKey = async (providerId: LLMProvider) => {
    const key = keyInputs[providerId]
    if (!key?.trim()) return
    await setApiKey(providerId, key)
    setKeyInputs(prev => ({ ...prev, [providerId]: '' }))
    setTestResults(prev => ({ ...prev, [providerId]: { ok: true, message: 'Clé sauvegardée' } }))
    // Fetch live models from API after saving key
    await fetchModelsFromAPI(providerId)
  }

  const handleTest = async (providerId: LLMProvider) => {
    setTesting(providerId)
    try {
      const result = await testConnection()
      setTestResults(prev => ({ ...prev, [providerId]: { ok: result.success, message: result.message } }))
    } finally {
      setTesting(null)
    }
  }

  const handleAddCustomEndpoint = async () => {
    if (!customForm.name || !customForm.baseUrl) return
    await addCustomEndpoint({
      id: generateId(),
      name: customForm.name,
      baseUrl: customForm.baseUrl.replace(/\/$/, ''),
      apiKey: customForm.apiKey,
      defaultModel: customForm.defaultModel,
    })
    setCustomForm({ name: '', baseUrl: '', apiKey: '', defaultModel: '' })
    setShowCustomForm(false)
  }

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <div className="space-y-6">
      {/* Header with Usage Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Providers & Models
          </h2>
          <p className="text-sm text-muted-foreground">
            Configurez vos providers LLM et sélectionnez les modèles disponibles
          </p>
        </div>
        <Button 
          variant={showUsage ? "default" : "outline"} 
          size="sm"
          onClick={() => setShowUsage(!showUsage)}
          className={cn(showUsage && "bg-gradient-to-r from-cyan-500 to-emerald-500")}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Usage
        </Button>
      </div>

      {/* Usage Summary (collapsible) */}
      {showUsage && usage && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 animate-fade-in">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{formatNumber(usage.totalRequests)}</p>
              <p className="text-xs text-muted-foreground">Requêtes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {formatNumber(usage.totalInputTokens + usage.totalOutputTokens)}
              </p>
              <p className="text-xs text-muted-foreground">Tokens</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">${usage.totalEstimatedCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Coût estimé</p>
            </div>
          </div>
          
          {/* Per-provider usage */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(usage.byProvider || {}).map(([provider, data]) => (
              <div key={provider} className="px-3 py-1.5 rounded-lg bg-muted/50 text-xs">
                <span className="font-medium capitalize">{provider}</span>
                <span className="text-muted-foreground ml-2">
                  {formatNumber(data.requests)} req · ${data.estimatedCost.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Providers List */}
      <div className="space-y-3">
        {PROVIDERS.map(provider => {
          const isExpanded = expandedProviders.has(provider.id)
          const hasKey = hasKeyFor(provider.id)
          const isActive = currentProvider === provider.id
          const providerUsage = usage?.byProvider?.[provider.id]

          return (
            <div
              key={provider.id}
              className={cn(
                "rounded-xl border overflow-hidden transition-all",
                isActive 
                  ? "border-cyan-500/50 shadow-lg shadow-cyan-500/10" 
                  : "border-border hover:border-cyan-500/30"
              )}
            >
              {/* Provider Header */}
              <button
                onClick={() => toggleProvider(provider.id)}
                className={cn(
                  "w-full flex items-center justify-between p-4 text-left transition-colors",
                  `bg-gradient-to-r ${provider.gradient}`
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{provider.name}</p>
                      {hasKey && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {providerUsage && (
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(providerUsage.requests)} req
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 border-t border-border/50 space-y-4 bg-card/50">
                  {/* API Key / Ollama URL */}
                  {provider.id === 'ollama' ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ollama URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl(e.target.value)}
                          placeholder="http://localhost:11434"
                          className="flex-1"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => fetchModels('ollama')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">API Key</label>
                        {hasKey && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Configurée
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showApiKeyFor === provider.id ? 'text' : 'password'}
                            value={keyInputs[provider.id] || ''}
                            onChange={(e) => setKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                            placeholder={hasKey ? '••••••••' : 
                              provider.id === 'anthropic' ? 'sk-ant-...' :
                              provider.id === 'google' ? 'AIza...' : 'sk-...'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKeyFor(showApiKeyFor === provider.id ? null : provider.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKeyFor === provider.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button onClick={() => handleSaveKey(provider.id)} disabled={!keyInputs[provider.id]?.trim()}>
                          Sauvegarder
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Test Connection */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(provider.id)}
                      disabled={testing === provider.id || (!hasKey && provider.id !== 'ollama')}
                    >
                      {testing === provider.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Tester la connexion
                    </Button>
                    
                    {testResults[provider.id] && (
                      <span className={cn(
                        "text-xs flex items-center gap-1",
                        testResults[provider.id].ok ? "text-emerald-400" : "text-red-400"
                      )}>
                        {testResults[provider.id].ok ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {testResults[provider.id].message}
                      </span>
                    )}
                  </div>

                  {/* Models Selection */}
                  {(hasKey || provider.id === 'ollama') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Modèles disponibles</label>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            setProvider(provider.id)
                            // Fetch from live API if key is available
                            if (hasKey) {
                              await fetchModelsFromAPI(provider.id)
                            } else {
                              await fetchModels(provider.id)
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Actualiser depuis l'API
                        </Button>
                      </div>
                      
                      {currentProvider === provider.id && availableModels.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {availableModels.map(model => (
                            <button
                              key={model.id}
                              onClick={() => setModel(model.id)}
                              className={cn(
                                "p-2.5 rounded-lg border text-left text-sm transition-all",
                                currentModel === model.id
                                  ? "border-cyan-500 bg-cyan-500/10"
                                  : "border-border hover:border-cyan-500/50"
                              )}
                            >
                              <p className="font-medium truncate">{model.name}</p>
                              {model.tier && (
                                <p className="text-xs text-muted-foreground capitalize">{model.tier}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Cliquez sur "Actualiser" pour charger les modèles
                        </p>
                      )}
                    </div>
                  )}

                  {/* Set as Active */}
                  {!isActive && hasKey && (
                    <Button
                      onClick={() => setProvider(provider.id)}
                      className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600"
                    >
                      Utiliser {provider.name}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Custom Endpoints */}
        <div className="rounded-xl border border-dashed border-border overflow-hidden">
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="w-full flex items-center justify-between p-4 text-left bg-gradient-to-r from-pink-500/10 to-violet-500/10 hover:from-pink-500/20 hover:to-violet-500/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <p className="font-semibold">Custom Endpoints</p>
                <p className="text-xs text-muted-foreground">
                  LM Studio, Together AI, Groq, etc.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {customEndpoints.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs">
                  {customEndpoints.length}
                </span>
              )}
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>

          {/* Custom Endpoints List */}
          {customEndpoints.length > 0 && (
            <div className="p-4 border-t border-border/50 space-y-2">
              {customEndpoints.map(endpoint => (
                <div
                  key={endpoint.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{endpoint.name}</p>
                      <p className="text-xs text-muted-foreground">{endpoint.baseUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => testCustomEndpoint(endpoint.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomEndpoint(endpoint.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Form */}
          {showCustomForm && (
            <div className="p-4 border-t border-border/50 space-y-3 bg-card/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Nom</label>
                  <Input
                    value={customForm.name}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="LM Studio"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Modèle par défaut</label>
                  <Input
                    value={customForm.defaultModel}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, defaultModel: e.target.value }))}
                    placeholder="llama3.2"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Base URL</label>
                <Input
                  value={customForm.baseUrl}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="http://localhost:1234/v1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">API Key (optionnel)</label>
                <Input
                  type="password"
                  value={customForm.apiKey}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustomEndpoint} disabled={!customForm.name || !customForm.baseUrl}>
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
                <Button variant="ghost" onClick={() => setShowCustomForm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
