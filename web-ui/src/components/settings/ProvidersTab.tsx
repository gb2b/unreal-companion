import { useState } from 'react'
import {
  Brain,
  Server,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLLMStore, LLMProvider } from '@/stores/llmStore'
import { useTranslation } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

const PROVIDERS: { id: LLMProvider; name: string; icon: string; reactIcon: React.ElementType; description: string }[] = [
  { 
    id: 'anthropic', 
    name: 'Anthropic', 
    icon: '🧠',
    reactIcon: Brain,
    description: 'Claude Opus 4.5, Sonnet 4'
  },
  { 
    id: 'openai', 
    name: 'OpenAI', 
    icon: '🤖',
    reactIcon: Sparkles,
    description: 'Codex 5.2, GPT-5'
  },
  { 
    id: 'google', 
    name: 'Google', 
    icon: '✨',
    reactIcon: Sparkles,
    description: 'Gemini 3 Pro, Flash'
  },
  { 
    id: 'ollama', 
    name: 'Ollama', 
    icon: '🏠',
    reactIcon: Server,
    description: 'Llama 4, Mistral, local'
  },
]

export function ProvidersTab() {
  const {
    currentProvider,
    ollamaUrl,
    hasAnthropicKey,
    hasOpenAIKey,
    hasGoogleKey,
    isLoading,
    setProvider,
    setApiKey,
    setOllamaUrl,
    fetchModels,
    testConnection
  } = useLLMStore()
  const { t } = useTranslation()

  const [showKey, setShowKey] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const hasKey = currentProvider === 'anthropic' ? hasAnthropicKey : 
                 currentProvider === 'openai' ? hasOpenAIKey : 
                 currentProvider === 'google' ? hasGoogleKey :
                 true

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return
    await setApiKey(currentProvider, keyInput)
    setKeyInput('')
    setTestResult({ success: true, message: 'API key saved' })
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection()
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('providersTab.selectProvider')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PROVIDERS.map(provider => {
            const isActive = currentProvider === provider.id
            const providerHasKey = provider.id === 'anthropic' ? hasAnthropicKey :
                                   provider.id === 'openai' ? hasOpenAIKey :
                                   provider.id === 'google' ? hasGoogleKey :
                                   true
            return (
              <button
                key={provider.id}
                onClick={() => setProvider(provider.id)}
                disabled={isLoading}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all card-lift relative",
                  isActive 
                    ? "border-primary bg-primary/5 glow-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                {providerHasKey && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 absolute top-2 right-2" />
                )}
                <div className={cn(
                  "p-3 rounded-xl text-2xl",
                  isActive 
                    ? "bg-primary/10" 
                    : "bg-muted"
                )}>
                  {provider.icon}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </div>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* API Key or Ollama URL */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {currentProvider === 'ollama' ? t('providersTab.ollamaConfig') : t('providers.apiKey')}
        </h2>

        {currentProvider === 'ollama' ? (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t('providersTab.ollamaUrl')}</label>
            <div className="flex gap-2">
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder={t('providersTab.ollamaUrlPlaceholder')}
              />
              <Button variant="outline" onClick={() => fetchModels('ollama')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('providersTab.ollamaDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                {currentProvider === 'anthropic' ? 'Anthropic' :
                 currentProvider === 'google' ? 'Google AI' : 'OpenAI'} {t('providers.apiKey')}
              </label>
              {hasKey && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {t('providersTab.configured')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={hasKey ? '••••••••••••••••' :
                    currentProvider === 'anthropic' ? 'sk-ant-...' :
                    currentProvider === 'google' ? 'AIza...' : 'sk-...'}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveKey} disabled={!keyInput.trim() || isLoading}>
                {t('common.save')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {hasKey ? t('providersTab.enterNewKey') : t('providersTab.keyStoredLocally')}
            </p>
          </div>
        )}
      </section>

      {/* Test Connection */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('providersTab.testConnection')}</h2>
          <Button
            onClick={handleTest}
            disabled={testing || (!hasKey && currentProvider !== 'ollama')}
            variant="outline"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('providers.test')}
          </Button>
        </div>
        
        {testResult && (
          <div className={cn(
            "p-4 rounded-lg border flex items-center gap-3",
            testResult.success 
              ? "border-green-500/30 bg-green-500/5 text-green-500" 
              : "border-red-500/30 bg-red-500/5 text-red-500"
          )}>
            {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {testResult.message}
          </div>
        )}
      </section>
    </div>
  )
}
