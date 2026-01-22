import { useState, useEffect } from 'react'
import { Check, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLLMStore } from '@/stores/llmStore'
import { cn } from '@/lib/utils'

// Model tier badges
const TIER_BADGES: Record<string, { label: string; color: string }> = {
  flagship: { label: '🚀 Flagship', color: 'bg-primary/20 text-primary' },
  code: { label: '💻 Code', color: 'bg-blue-500/20 text-blue-400' },
  balanced: { label: '⚖️ Balanced', color: 'bg-green-500/20 text-green-400' },
  fast: { label: '⚡ Fast', color: 'bg-yellow-500/20 text-yellow-400' },
  large: { label: '🐘 Large', color: 'bg-purple-500/20 text-purple-400' },
  small: { label: '🐦 Small', color: 'bg-cyan-500/20 text-cyan-400' },
  legacy: { label: '📦 Legacy', color: 'bg-muted text-muted-foreground' },
  installed: { label: '✅ Installed', color: 'bg-green-500/20 text-green-400' },
}

export function ModelsTab() {
  const { 
    currentProvider,
    currentModel,
    customModel,
    availableModels,
    supportsCustom,
    setModel,
    setCustomModel,
  } = useLLMStore()

  const [customModelInput, setCustomModelInput] = useState('')

  useEffect(() => {
    setCustomModelInput(customModel)
  }, [customModel])

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available Models</h2>
          {availableModels.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {availableModels.length} models available
            </span>
          )}
        </div>
        
        {availableModels.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground">
            {currentProvider === 'ollama' 
              ? 'No models found. Make sure Ollama is running and has models installed.'
              : 'Loading models...'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {availableModels.map(model => {
              const tier = model.tier && TIER_BADGES[model.tier]
              const isSelected = currentModel === model.id && !customModel
              return (
                <button
                  key={model.id}
                  onClick={() => setModel(model.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all card-lift relative",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{model.name}</p>
                      {model.id !== model.name && (
                        <p className="text-xs text-muted-foreground truncate">{model.id}</p>
                      )}
                    </div>
                    {tier && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap",
                        tier.color
                      )}>
                        {tier.label}
                      </span>
                    )}
                  </div>
                  {model.installed && (
                    <div className="absolute bottom-2 right-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>
      
      {/* Custom Model Input */}
      {supportsCustom && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Custom Model</h2>
          <div className="p-4 rounded-xl border border-dashed border-border space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter any model name not listed above. Useful for new models or specific versions.
            </p>
            <div className="flex gap-2">
              <Input
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder={currentProvider === 'ollama' 
                  ? 'e.g., llama3.2:70b, codellama:13b' 
                  : currentProvider === 'anthropic'
                    ? 'e.g., claude-opus-4-5-20260115'
                    : currentProvider === 'google'
                      ? 'e.g., gemini-3-pro-latest'
                      : 'e.g., gpt-5-turbo-latest'}
                className={cn(
                  customModel && "border-primary"
                )}
              />
              <Button 
                onClick={() => setCustomModel(customModelInput)}
                disabled={!customModelInput.trim() || customModelInput === customModel}
                variant={customModel ? "default" : "outline"}
              >
                {customModel ? 'Update' : 'Use'}
              </Button>
            </div>
            {customModel && (
              <p className="text-xs text-primary flex items-center gap-1">
                <Check className="h-3 w-3" />
                Using custom model: {customModel}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Current Selection Summary */}
      <section className="p-4 rounded-xl border border-border bg-muted/30">
        <h3 className="font-medium mb-2">Current Selection</h3>
        <div className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Provider:</span> {currentProvider}</p>
          <p><span className="text-muted-foreground">Model:</span> {customModel || currentModel || 'Not set'}</p>
          {customModel && (
            <p className="text-xs text-primary">Using custom model</p>
          )}
        </div>
      </section>
    </div>
  )
}
