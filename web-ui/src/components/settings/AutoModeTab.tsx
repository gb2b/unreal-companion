import { useState } from 'react'
import { 
  Wand2, 
  Code, 
  Image, 
  Zap, 
  Brain,
  ChevronDown
} from 'lucide-react'
import { useLLMStore } from '@/stores/llmStore'
import { cn } from '@/lib/utils'

interface AutoRule {
  id: string
  taskType: string
  icon: React.ElementType
  description: string
  preferredModel: string
  fallbackModel: string
  keywords: string[]
}

const DEFAULT_RULES: AutoRule[] = [
  {
    id: 'creative',
    taskType: 'Brainstorming & Creative',
    icon: Wand2,
    description: 'Idéation, storytelling, écriture créative',
    preferredModel: 'gemini-3-pro',
    fallbackModel: 'claude-opus-4-5-20260115',
    keywords: ['brainstorm', 'imagine', 'create', 'idea', 'story', 'design']
  },
  {
    id: 'code',
    taskType: 'Code & Debug',
    icon: Code,
    description: 'Programmation, debugging, code review',
    preferredModel: 'codex-5.2',
    fallbackModel: 'claude-opus-4-5-20260115',
    keywords: ['code', 'debug', 'function', 'bug', 'error', 'implement', 'fix']
  },
  {
    id: 'vision',
    taskType: 'Images & Vision',
    icon: Image,
    description: 'Analyse d\'images, tâches visuelles',
    preferredModel: 'gemini-3-pro',
    fallbackModel: 'gpt-5-turbo',
    keywords: ['image', 'picture', 'screenshot', 'visual', 'see', 'look']
  },
  {
    id: 'simple',
    taskType: 'Tâches Rapides',
    icon: Zap,
    description: 'Questions simples, réponses rapides',
    preferredModel: 'gpt-5-mini',
    fallbackModel: 'claude-3-5-haiku-20241022',
    keywords: ['quick', 'simple', 'short', 'fast']
  },
  {
    id: 'complex',
    taskType: 'Raisonnement Complexe',
    icon: Brain,
    description: 'Analyse approfondie, problèmes complexes',
    preferredModel: 'claude-opus-4-5-20260115',
    fallbackModel: 'gpt-5-turbo',
    keywords: ['analyze', 'explain', 'complex', 'understand', 'detailed']
  },
]

// All available models for dropdown
const ALL_MODELS = [
  { id: 'claude-opus-4-5-20260115', name: 'Claude Opus 4.5', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku', provider: 'anthropic' },
  { id: 'codex-5.2', name: 'Codex 5.2', provider: 'openai' },
  { id: 'gpt-5-turbo', name: 'GPT-5 Turbo', provider: 'openai' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai' },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'google' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'google' },
  { id: 'llama4', name: 'Llama 4', provider: 'ollama' },
]

// Model dropdown component
function ModelDropdown({ 
  value, 
  onChange, 
  label,
  disabled 
}: { 
  value: string
  onChange: (v: string) => void 
  label: string
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = ALL_MODELS.find(m => m.id === value)

  return (
    <div className="relative">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left",
          disabled 
            ? "bg-muted/50 text-muted-foreground cursor-not-allowed" 
            : "bg-card hover:border-cyan-500/50",
          "border-border"
        )}
      >
        <span className="truncate">{selected?.name || value}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {ALL_MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => {
                  onChange(model.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between",
                  value === model.id && "bg-cyan-500/10 text-cyan-400"
                )}
              >
                <span>{model.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{model.provider}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AutoModeTab() {
  const { autoModeEnabled, setAutoModeEnabled, updateAutoModeRules } = useLLMStore()
  const [rules, setRules] = useState<AutoRule[]>(DEFAULT_RULES)

  const handleModelChange = (ruleId: string, field: 'preferredModel' | 'fallbackModel', value: string) => {
    const updated = rules.map(r => 
      r.id === ruleId ? { ...r, [field]: value } : r
    )
    setRules(updated)
    updateAutoModeRules(updated.map(r => ({
      id: r.id,
      taskType: r.taskType,
      preferredModel: r.preferredModel,
      fallbackModel: r.fallbackModel,
      keywords: r.keywords,
    })))
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Mode Auto
          </h2>
          <p className="text-sm text-muted-foreground">
            Sélection intelligente du modèle selon le contexte
          </p>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={() => setAutoModeEnabled(!autoModeEnabled)}
          className={cn(
            "relative w-14 h-8 rounded-full transition-all duration-300",
            autoModeEnabled 
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" 
              : "bg-muted"
          )}
        >
          <div className={cn(
            "absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg transition-all duration-300",
            autoModeEnabled ? "left-7" : "left-1"
          )}>
            {autoModeEnabled && (
              <Wand2 className="h-4 w-4 absolute top-1 left-1 text-violet-500" />
            )}
          </div>
        </button>
      </div>

      {/* Status Banner */}
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        autoModeEnabled 
          ? "border-violet-500/50 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10" 
          : "border-border bg-muted/30"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            autoModeEnabled ? "bg-violet-500/20" : "bg-muted"
          )}>
            <Wand2 className={cn(
              "h-5 w-5",
              autoModeEnabled ? "text-violet-400" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium">
              {autoModeEnabled ? "Mode Auto activé" : "Mode Auto désactivé"}
            </p>
            <p className="text-sm text-muted-foreground">
              {autoModeEnabled 
                ? "Le système analyse vos messages et choisit le meilleur modèle" 
                : "Vous utilisez un modèle fixe pour toutes les requêtes"}
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border">
        <h3 className="font-medium mb-2">Comment ça marche</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-xs">1</span>
            <span><strong>Mots-clés</strong> : détection du type de tâche (code, brainstorm, image...)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-xs">2</span>
            <span><strong>Images</strong> : si présentes, modèles vision prioritaires</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-xs">3</span>
            <span><strong>Complexité</strong> : analyse de la longueur et structure du message</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-xs">4</span>
            <span><strong>Fallback</strong> : si le modèle préféré n'est pas disponible</span>
          </li>
        </ul>
      </div>

      {/* Routing Rules */}
      <div className="space-y-4">
        <h3 className="font-medium">Règles de routage</h3>
        
        <div className="space-y-3">
          {rules.map(rule => {
            const Icon = rule.icon
            return (
              <div
                key={rule.id}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  autoModeEnabled 
                    ? "border-border hover:border-violet-500/30" 
                    : "border-border/50 opacity-60"
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{rule.taskType}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <ModelDropdown
                    label="Modèle préféré"
                    value={rule.preferredModel}
                    onChange={(v) => handleModelChange(rule.id, 'preferredModel', v)}
                    disabled={!autoModeEnabled}
                  />
                  <ModelDropdown
                    label="Fallback"
                    value={rule.fallbackModel}
                    onChange={(v) => handleModelChange(rule.id, 'fallbackModel', v)}
                    disabled={!autoModeEnabled}
                  />
                </div>
                
                <div className="mt-3 flex flex-wrap gap-1">
                  {rule.keywords.map(kw => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cost Optimization */}
      <div className="p-4 rounded-xl border border-border">
        <h3 className="font-medium mb-2">Optimisation des coûts</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Le mode auto privilégie les modèles économiques pour les tâches simples.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Zap className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-xs font-medium">Simple</p>
            <p className="text-[10px] text-muted-foreground">GPT-5 Mini</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Code className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <p className="text-xs font-medium">Standard</p>
            <p className="text-[10px] text-muted-foreground">Sonnet / Turbo</p>
          </div>
          <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Brain className="h-5 w-5 mx-auto text-violet-400 mb-1" />
            <p className="text-xs font-medium">Complexe</p>
            <p className="text-[10px] text-muted-foreground">Opus / Codex</p>
          </div>
        </div>
      </div>
    </div>
  )
}
