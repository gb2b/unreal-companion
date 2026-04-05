import type { MicroStep } from '@/types/studio'

interface MicroStepCardProps {
  step: MicroStep
  index: number
  isActive: boolean
  onClick: () => void
}

function getFirstSentence(text: string, maxLen = 50): string {
  const dot = text.indexOf('.')
  const newline = text.indexOf('\n')
  let end = text.length
  if (dot !== -1) end = Math.min(end, dot)
  if (newline !== -1) end = Math.min(end, newline)
  const slice = text.slice(0, end).trim()
  if (slice.length <= maxLen) return slice
  return slice.slice(0, maxLen - 1) + '…'
}

export function MicroStepCard({ step, index, isActive, onClick }: MicroStepCardProps) {
  const statusIcon =
    step.status === 'active'
      ? <span className="animate-pulse text-primary">●</span>
      : step.status === 'answered'
        ? <span className="text-accent">✓</span>
        : <span className="text-orange-400">⊘</span>

  const containerClass = isActive
    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
    : 'border-border/30 bg-card/50 hover:border-border/60 hover:bg-card/80'

  const summary = step.summary
    ?? (step.agentPrompts.length > 0 ? getFirstSentence(step.agentPrompts[step.agentPrompts.length - 1]) : `Step ${index + 1}`)

  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col gap-1 rounded-lg border p-2 text-left transition-all ${containerClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs leading-none">{statusIcon}</span>
        <span className="flex-1 truncate text-xs font-medium text-foreground">{summary}</span>
      </div>

      {step.status === 'answered' && step.userResponse && (
        <p className="ml-4 truncate text-xs text-muted-foreground">
          → &ldquo;{step.userResponse}&rdquo;
        </p>
      )}
    </button>
  )
}
