import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  RefreshCw,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLLMStore } from '@/stores/llmStore'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface UsageData {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  requests: number
  estimatedCost: number
  date: string
}

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
  byModel: Record<string, {
    inputTokens: number
    outputTokens: number
    requests: number
    estimatedCost: number
  }>
  daily: UsageData[]
}

// Pricing per 1M tokens (approximate)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-5-20260115': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 },
  'codex-5.2': { input: 10, output: 30 },
  'gpt-5-turbo': { input: 5, output: 15 },
  'gpt-5-mini': { input: 0.15, output: 0.6 },
  'gemini-3-pro': { input: 1.25, output: 5 },
  'gemini-3-flash': { input: 0.075, output: 0.3 },
}

export function UsageTab() {
  const { hasAnthropicKey, hasOpenAIKey, hasGoogleKey } = useLLMStore()
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week')

  const fetchUsage = async () => {
    setLoading(true)
    try {
      const data = await api.get<UsageSummary>(`/api/usage?period=${period}`)
      setUsage(data)
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [period])

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  const formatCost = (c: number) => {
    return `$${c.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage Overview</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={period === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('today')}
          >
            Today
          </Button>
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            Week
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            Month
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchUsage} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Requests</span>
          </div>
          <p className="text-2xl font-bold">
            {usage ? formatNumber(usage.totalRequests) : '-'}
          </p>
        </div>
        
        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Input Tokens</span>
          </div>
          <p className="text-2xl font-bold">
            {usage ? formatNumber(usage.totalInputTokens) : '-'}
          </p>
        </div>
        
        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Output Tokens</span>
          </div>
          <p className="text-2xl font-bold">
            {usage ? formatNumber(usage.totalOutputTokens) : '-'}
          </p>
        </div>
        
        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Est. Cost</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {usage ? formatCost(usage.totalEstimatedCost) : '-'}
          </p>
        </div>
      </div>

      {/* By Provider */}
      {usage && Object.keys(usage.byProvider).length > 0 && (
        <section className="space-y-3">
          <h3 className="font-medium">By Provider</h3>
          <div className="space-y-2">
            {Object.entries(usage.byProvider).map(([provider, data]) => (
              <div
                key={provider}
                className="p-3 rounded-lg border border-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {provider === 'anthropic' ? '🧠' : 
                     provider === 'openai' ? '🤖' : 
                     provider === 'google' ? '✨' : '🏠'}
                  </span>
                  <div>
                    <p className="font-medium capitalize">{provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(data.requests)} requests
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCost(data.estimatedCost)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(data.inputTokens + data.outputTokens)} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* By Model */}
      {usage && Object.keys(usage.byModel).length > 0 && (
        <section className="space-y-3">
          <h3 className="font-medium">By Model</h3>
          <div className="space-y-2">
            {Object.entries(usage.byModel)
              .sort((a, b) => b[1].estimatedCost - a[1].estimatedCost)
              .slice(0, 5)
              .map(([model, data]) => {
                return (
                  <div
                    key={model}
                    className="p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm truncate">{model}</p>
                      <p className="font-medium text-sm">{formatCost(data.estimatedCost)}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatNumber(data.requests)} requests</span>
                      <span>
                        {formatNumber(data.inputTokens)} in / {formatNumber(data.outputTokens)} out
                      </span>
                    </div>
                    {/* Usage bar */}
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ 
                          width: `${Math.min(100, (data.estimatedCost / usage.totalEstimatedCost) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {/* API Usage Info */}
      <section className="p-4 rounded-xl border border-dashed border-border">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium mb-1">Usage Tracking</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Local tracking is always enabled. For real-time API usage from your provider dashboard:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Anthropic: Requires Admin API key (sk-ant-admin-...)
                {hasAnthropicKey && <span className="text-green-500 ml-1">✓ Key set</span>}
              </li>
              <li>
                • OpenAI: Requires Organization API access
                {hasOpenAIKey && <span className="text-green-500 ml-1">✓ Key set</span>}
              </li>
              <li>
                • Google: View in <a href="https://aistudio.google.com" target="_blank" className="text-primary hover:underline">AI Studio</a>
                {hasGoogleKey && <span className="text-green-500 ml-1">✓ Key set</span>}
              </li>
              <li>• Ollama: Local, no external tracking</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Reference */}
      <section className="space-y-3">
        <h3 className="font-medium">Pricing Reference (per 1M tokens)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(PRICING).slice(0, 6).map(([model, price]) => (
            <div key={model} className="p-2 rounded-lg bg-muted/50 flex justify-between">
              <span className="text-muted-foreground truncate">{model.split('-').slice(0, 2).join('-')}</span>
              <span>${price.input} / ${price.output}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
