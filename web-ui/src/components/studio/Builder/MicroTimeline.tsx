import { useEffect, useRef } from 'react'
import type { MicroStep } from '@/types/studio'
import { MicroStepCard } from './MicroStepCard'

interface MicroTimelineProps {
  steps: MicroStep[]
  activeIndex: number
  onStepClick: (index: number) => void
  sectionName?: string
}

export function MicroTimeline({ steps, activeIndex, onStepClick, sectionName }: MicroTimelineProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeIndex])

  return (
    <div data-tour="timeline" className="flex w-64 shrink-0 flex-col border-r border-border/30 bg-card/30 overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {sectionName ?? 'Timeline'}
        </p>
      </div>

      {/* Cards with connecting line */}
      <div className="relative flex flex-col gap-1 px-3 pb-3">
        {/* Vertical timeline line */}
        {steps.length > 1 && (
          <div className="pointer-events-none absolute left-[19px] top-0 h-full w-px bg-border/30" />
        )}

        {steps.map((step, i) => (
          <div key={step.id} ref={i === activeIndex ? activeRef : undefined}>
            <MicroStepCard
              step={step}
              index={i}
              isActive={i === activeIndex}
              onClick={() => onStepClick(i)}
            />
          </div>
        ))}

        {steps.length === 0 && (
          <p className="text-xs text-muted-foreground/60">No steps yet</p>
        )}
      </div>
    </div>
  )
}
