import { useEffect, useRef } from 'react'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

interface HistoryPanelProps {
  microSteps: MicroStep[]
  activeMicroStepIndex: number
  onStepClick: (index: number) => void
}

function getStepSummary(step: MicroStep, index: number): string {
  const firstText = step.blocks.find(b => b.kind === 'text') as { kind: 'text'; content: string } | undefined
  if (firstText) {
    const text = firstText.content
    const lines = text.split('\n').filter(l => l.trim())
    const question = lines.find(l => l.includes('?'))
    const target = question || lines[lines.length - 1] || text
    const clean = target.replace(/^[#*>\-\s]+/, '').trim()
    return clean.length <= 60 ? clean : clean.slice(0, 59) + '...'
  }
  if (step.summary) return step.summary
  return `Step ${index + 1}`
}

export function TimelineSommaire({
  microSteps,
  activeMicroStepIndex,
  onStepClick,
}: HistoryPanelProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  const { language } = useI18n()

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeMicroStepIndex])

  // Filter out ghost steps (only tool calls, no text or interaction)
  const visibleSteps = microSteps
    .map((step, i) => ({ step, index: i }))
    .filter(({ step }) => {
      const hasText = step.blocks.some(b => b.kind === 'text' || b.kind === 'streaming')
      const hasInteraction = step.blocks.some(b => b.kind === 'interaction')
      return hasText || hasInteraction || step.status === 'active'
    })

  return (
    <div data-tour="timeline" className="flex w-56 shrink-0 flex-col border-r border-border/30 bg-card/30 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 border-b border-border/20 px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {language === 'fr' ? 'Historique' : 'History'}
        </span>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto py-1">
        {visibleSteps.length === 0 ? (
          <p className="px-3 py-4 text-[10px] text-muted-foreground/40 text-center">
            {language === 'fr' ? 'La conversation apparaitra ici.' : 'Conversation will appear here.'}
          </p>
        ) : (
          visibleSteps.map(({ step, index }, i) => {
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
                        ? <span className="animate-pulse text-primary">●</span>
                        : step.status === 'answered'
                          ? <span className="text-accent">✓</span>
                          : <span className="text-muted-foreground/40">○</span>}
                    </span>
                    <span className="flex-1 truncate text-[11px] text-foreground/80">
                      {getStepSummary(step, i)}
                    </span>
                  </div>

                  {step.status === 'answered' && step.userResponse && (
                    <p className="ml-5 truncate text-[10px] text-muted-foreground/50">
                      {step.userResponse}
                    </p>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
