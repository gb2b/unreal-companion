import { useState, useEffect } from 'react'
import { ChevronDown, Check, Wand2, Cpu } from 'lucide-react'
import { useLLMStore } from '@/stores/llmStore'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  // For per-message override
  value?: string
  onChange?: (model: string) => void
  compact?: boolean
}

// Provider icons
const PROVIDER_ICONS: Record<string, string> = {
  anthropic: '🧠',
  openai: '🤖',
  google: '✨',
  ollama: '🏠',
  custom: '🔗',
}

export function ModelSelector({ value, onChange, compact = false }: ModelSelectorProps) {
  const { 
    currentProvider, 
    currentModel, 
    availableModels,
    autoModeEnabled,
    hasAnthropicKey,
    hasOpenAIKey,
    hasGoogleKey,
    setModel 
  } = useLLMStore()
  
  // Check if any provider is configured
  const hasAnyKey = hasAnthropicKey || hasOpenAIKey || hasGoogleKey || currentProvider === 'ollama'
  
  const [isOpen, setIsOpen] = useState(false)
  
  // Use prop value or store value
  const selectedModel = value ?? currentModel
  const selectedModelData = availableModels.find(m => m.id === selectedModel)
  
  const handleSelect = (modelId: string) => {
    if (onChange) {
      onChange(modelId)
    } else {
      setModel(modelId)
    }
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false)
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs",
            "border border-border hover:border-primary/50 transition-colors",
            "bg-muted/50 hover:bg-muted"
          )}
        >
          {autoModeEnabled ? (
            <>
              <Wand2 className="h-3 w-3 text-primary" />
              <span className="text-primary">Auto</span>
            </>
          ) : (
            <>
              <span>{PROVIDER_ICONS[currentProvider] || '🤖'}</span>
              <span className="max-w-20 truncate">
                {selectedModelData?.name || selectedModel?.split('-').slice(0, 2).join('-') || 'Model'}
              </span>
            </>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
        
        {isOpen && (
          <div 
            className="absolute top-full mt-1 right-0 z-50 min-w-48 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Auto Mode Option */}
            <button
              onClick={() => {
                // Toggle auto mode via store
                useLLMStore.getState().setAutoModeEnabled(!autoModeEnabled)
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                autoModeEnabled && "bg-primary/10"
              )}
            >
              <Wand2 className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Auto Mode</p>
                <p className="text-xs text-muted-foreground">Smart model selection</p>
              </div>
              {autoModeEnabled && <Check className="h-4 w-4 text-primary" />}
            </button>
            
            <div className="border-t border-border" />
            
            {/* Available Models */}
            {availableModels.map(model => (
              <button
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                  selectedModel === model.id && !autoModeEnabled && "bg-primary/10"
                )}
              >
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{model.name}</p>
                  {model.tier && (
                    <p className="text-xs text-muted-foreground capitalize">{model.tier}</p>
                  )}
                </div>
                {selectedModel === model.id && !autoModeEnabled && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full version for header
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl",
          "border border-border hover:border-primary/50 transition-all",
          "bg-card hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2">
          {autoModeEnabled ? (
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wand2 className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-muted">
              <span className="text-sm">{PROVIDER_ICONS[currentProvider] || '🤖'}</span>
            </div>
          )}
          <div className="text-left">
            <p className="text-sm font-medium">
              {autoModeEnabled ? 'Auto Mode' : hasAnyKey ? (selectedModelData?.name || 'Select Model') : 'Not configured'}
            </p>
            <p className="text-xs text-muted-foreground">
              {autoModeEnabled ? 'Smart routing' : hasAnyKey ? currentProvider : 'Add API key in Settings'}
            </p>
          </div>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full mt-2 left-0 z-50 w-64 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          {/* Auto Mode */}
          <div className="p-2 border-b border-border">
            <button
              onClick={() => {
                useLLMStore.getState().setAutoModeEnabled(!autoModeEnabled)
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                autoModeEnabled 
                  ? "bg-primary/10 border border-primary/30" 
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                autoModeEnabled ? "bg-primary/20" : "bg-muted"
              )}>
                <Wand2 className={cn(
                  "h-4 w-4",
                  autoModeEnabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <p className="font-medium">Auto Mode</p>
                <p className="text-xs text-muted-foreground">
                  Automatically select best model
                </p>
              </div>
              {autoModeEnabled && <Check className="h-4 w-4 text-primary" />}
            </button>
          </div>
          
          {/* Models */}
          <div className="p-2 space-y-1">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {currentProvider} Models
            </p>
            {availableModels.map(model => (
              <button
                key={model.id}
                onClick={() => handleSelect(model.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                  selectedModel === model.id && !autoModeEnabled 
                    ? "bg-primary/10" 
                    : "hover:bg-muted"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{model.name}</p>
                  {model.tier && (
                    <p className="text-xs text-muted-foreground capitalize">{model.tier}</p>
                  )}
                </div>
                {selectedModel === model.id && !autoModeEnabled && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
