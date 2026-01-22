import { useState } from 'react'
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  XCircle,
  ChevronRight,
  Sparkles,
  Zap,
  Play,
  Clock
} from 'lucide-react'
import { ExecutionPlan, PlannedAction } from '@/stores/chatStore'
import { cn } from '@/lib/utils'

interface PlanningViewProps {
  plan: ExecutionPlan
  onExecute?: () => void
  isExecuting?: boolean
}

// Category icons for visual variety
const CATEGORY_ICONS: Record<string, string> = {
  blueprint: '⚡',
  world: '🌍',
  asset: '📦',
  material: '🎨',
  light: '💡',
  viewport: '📷',
  meshy: '✨',
  graph: '🔗',
  level: '🗺️',
  spawn: '🎯',
  create: '➕',
  modify: '✏️',
  delete: '🗑️',
  setup: '⚙️',
  default: '🔧'
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  blueprint: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  world: 'from-green-500/20 to-green-600/10 border-green-500/30',
  asset: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  material: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  meshy: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  default: 'from-primary/20 to-primary/10 border-primary/30'
}

function getIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] || CATEGORY_ICONS.default
}

function getColor(category: string): string {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.default
}

export function PlanningView({ plan, onExecute, isExecuting }: PlanningViewProps) {
  const [expanded, setExpanded] = useState(true)
  
  const completedCount = plan.actions.filter(a => a.status === 'done').length
  const totalCount = plan.actions.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  
  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden shadow-lg animate-scale-in particles">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  {plan.status === 'planning' ? 'Planning...' :
                   plan.status === 'ready' ? 'Plan Ready' :
                   plan.status === 'executing' ? 'Executing' :
                   plan.status === 'complete' ? 'Complete' : 'Error'}
                </h3>
                {plan.status === 'planning' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">{plan.summary}</p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {plan.status === 'complete' ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                {completedCount}/{totalCount} ✓
              </span>
            ) : plan.status === 'executing' ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                {completedCount}/{totalCount}
              </span>
            ) : plan.status === 'ready' && onExecute ? (
              <button
                onClick={onExecute}
                disabled={isExecuting}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Play className="h-3 w-3" />
                Execute
              </button>
            ) : null}
          </div>
        </div>
        
        {/* Progress Bar */}
        {(plan.status === 'executing' || plan.status === 'complete') && (
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500 ease-out",
                plan.status === 'executing' 
                  ? "progress-animated" 
                  : "bg-gradient-to-r from-primary to-green-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      {/* Action Grid */}
      <div className="p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-90"
          )} />
          {totalCount} actions planned
        </button>
        
        {expanded && (
          <div className="grid grid-cols-2 gap-2 stagger-in">
            {plan.actions.map((action, idx) => (
              <ActionCard 
                key={action.id} 
                action={action} 
                isCurrent={plan.currentStep === idx && plan.status === 'executing'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Individual action card in the plan grid
function ActionCard({ action, isCurrent }: { 
  action: PlannedAction
  isCurrent?: boolean 
}) {
  const icon = getIcon(action.category)
  const colorClass = getColor(action.category)
  
  return (
    <div className={cn(
      "relative rounded-xl border px-3 py-2.5 transition-all card-lift",
      "bg-gradient-to-br",
      colorClass,
      isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background pulse-glow",
      action.status === 'done' && "opacity-80",
      action.status === 'running' && "shimmer"
    )}>
      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        {action.status === 'done' ? (
          <div className="animate-bounce-in">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        ) : action.status === 'running' ? (
          <div className="sparkle">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        ) : action.status === 'error' ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex items-start gap-2 pr-6">
        <span className="text-lg mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{action.name}</p>
          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
        </div>
      </div>
      
      {/* Duration */}
      {action.duration && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {(action.duration / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  )
}

// Compact inline version for chat messages
export function PlanningInline({ plan }: { plan: ExecutionPlan }) {
  const completedCount = plan.actions.filter(a => a.status === 'done').length
  
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Execution Plan</span>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          plan.status === 'complete' 
            ? "bg-green-500/10 text-green-500" 
            : "bg-primary/10 text-primary"
        )}>
          {completedCount}/{plan.actions.length} {plan.status === 'complete' ? '✓' : ''}
        </span>
      </div>
      
      {/* Compact Action List */}
      <div className="p-3 flex flex-wrap gap-2">
        {plan.actions.map((action) => (
          <div
            key={action.id}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
              action.status === 'done' 
                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                : action.status === 'running'
                  ? "bg-primary/10 text-primary border-primary/20"
                  : action.status === 'error'
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-muted text-muted-foreground border-border"
            )}
          >
            {action.status === 'done' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : action.status === 'running' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : action.status === 'error' ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            <span>{getIcon(action.category)}</span>
            <span>{action.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
