import { useEffect, useRef } from 'react'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

interface SessionHistoryProps {
  microSteps: MicroStep[]
  activeMicroStepIndex: number
  onStepClick: (index: number) => void
}

/** Extract timestamp from step id format: step-{n}-{Date.now()} */
function getStepTime(step: MicroStep): number {
  const parts = step.id.split('-')
  const ts = parseInt(parts[parts.length - 1], 10)
  return isNaN(ts) ? 0 : ts
}

/** Build a smart summary from the step content. */
function getStepLabel(step: MicroStep): string {
  // Check for interaction prompt first
  if (step.interactionData) {
    const data = step.interactionData as any
    const prompt = data.prompt || data.question || ''
    if (prompt) {
      const clean = prompt.replace(/^[#*>\-\s]+/, '').trim()
      return clean.length <= 55 ? clean : clean.slice(0, 54) + '...'
    }
  }

  // Look for a question in text blocks
  const textBlocks = step.blocks.filter(b => b.kind === 'text') as Array<{ kind: 'text'; content: string }>
  for (const block of textBlocks) {
    const lines = block.content.split('\n').filter(l => l.trim())
    const question = lines.find(l => l.includes('?'))
    if (question) {
      const clean = question.replace(/^[#*>\-\s]+/, '').trim()
      return clean.length <= 55 ? clean : clean.slice(0, 54) + '...'
    }
  }

  // Fallback: last meaningful line
  if (textBlocks.length > 0) {
    const lastBlock = textBlocks[textBlocks.length - 1]
    const lines = lastBlock.content.split('\n').filter(l => l.trim())
    const last = lines[lines.length - 1] || ''
    const clean = last.replace(/^[#*>\-\s]+/, '').trim()
    if (clean) return clean.length <= 55 ? clean : clean.slice(0, 54) + '...'
  }

  if (step.summary) return step.summary
  return 'Step'
}

function formatTime(ts: number): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDayHeader(ts: number, language: string): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) {
    return language === 'fr' ? "Aujourd'hui" : 'Today'
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return language === 'fr' ? 'Hier' : 'Yesterday'
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

interface VisibleStep {
  step: MicroStep
  index: number
  timestamp: number
}

export function SessionHistory({
  microSteps,
  activeMicroStepIndex,
  onStepClick,
}: SessionHistoryProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  const { language } = useI18n()

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeMicroStepIndex])

  // Filter ghost steps
  const visibleSteps: VisibleStep[] = microSteps
    .map((step, i) => ({ step, index: i, timestamp: getStepTime(step) }))
    .filter(({ step }) => {
      const hasText = step.blocks.some(b => b.kind === 'text' || b.kind === 'streaming')
      const hasInteraction = step.blocks.some(b => b.kind === 'interaction')
      return hasText || hasInteraction || step.status === 'active'
    })

  // Group by day
  const groups: Array<{ dayLabel: string; steps: VisibleStep[] }> = []
  let currentDay = ''
  for (const vs of visibleSteps) {
    const day = vs.timestamp ? new Date(vs.timestamp).toDateString() : ''
    if (day !== currentDay) {
      currentDay = day
      groups.push({ dayLabel: formatDayHeader(vs.timestamp, language), steps: [] })
    }
    groups[groups.length - 1]?.steps.push(vs)
  }
  if (groups.length === 0 && visibleSteps.length > 0) {
    groups.push({ dayLabel: '', steps: visibleSteps })
  }

  return (
    <div data-tour="session-history" className="flex w-56 shrink-0 flex-col border-r border-border/30 bg-card/30 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 border-b border-border/20 px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {language === 'fr' ? 'Historique' : 'History'}
        </span>
      </div>

      {/* Steps grouped by day */}
      <div className="flex-1 overflow-y-auto">
        {visibleSteps.length === 0 ? (
          <p className="px-3 py-4 text-[10px] text-muted-foreground/40 text-center">
            {language === 'fr' ? 'La conversation apparaitra ici.' : 'Conversation will appear here.'}
          </p>
        ) : (
          groups.map((group, gi) => (
            <div key={gi}>
              {/* Day separator */}
              {group.dayLabel && (
                <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border/10 px-3 py-1">
                  <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                    {group.dayLabel}
                  </span>
                </div>
              )}

              {group.steps.map(({ step, index, timestamp }) => {
                const isActive = index === activeMicroStepIndex

                return (
                  <div key={step.id} ref={isActive ? activeRef : undefined}>
                    <button
                      onClick={() => onStepClick(index)}
                      className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-all border-l-2 ${
                        isActive
                          ? 'bg-primary/10 border-primary'
                          : 'border-transparent hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] leading-none shrink-0">
                          {step.status === 'active'
                            ? <span className="animate-pulse text-primary">&#9679;</span>
                            : step.status === 'answered'
                              ? <span className="text-accent">&#10003;</span>
                              : <span className="text-muted-foreground/40">&#9675;</span>}
                        </span>
                        <span className="flex-1 truncate text-[11px] text-foreground/80">
                          {getStepLabel(step)}
                        </span>
                        {timestamp > 0 && (
                          <span className="shrink-0 text-[9px] text-muted-foreground/30">
                            {formatTime(timestamp)}
                          </span>
                        )}
                      </div>

                      {step.status === 'answered' && step.userResponse && (
                        <p className="ml-5 truncate text-[10px] text-muted-foreground/50">
                          {step.userResponse}
                        </p>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
