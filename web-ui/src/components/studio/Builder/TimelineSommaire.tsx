import { useEffect, useRef, useState } from 'react'
import type { MicroStep, WorkflowSection, SectionStatus } from '@/types/studio'
import { SectionHeader } from './SectionHeader'

interface TimelineSommaireProps {
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  microSteps: MicroStep[]
  activeMicroStepIndex: number
  activeSection: string | null
  onStepClick: (index: number) => void
  onSectionClick: (sectionId: string) => void
}

function getStepSummary(step: MicroStep, index: number): string {
  if (step.summary) return step.summary
  const lastText = [...step.blocks].reverse().find(b => b.kind === 'text') as { kind: 'text'; content: string } | undefined
  if (lastText) {
    const text = lastText.content
    const dot = text.indexOf('.')
    const newline = text.indexOf('\n')
    let end = text.length
    if (dot !== -1) end = Math.min(end, dot)
    if (newline !== -1) end = Math.min(end, newline)
    const slice = text.slice(0, end).trim()
    return slice.length <= 50 ? slice : slice.slice(0, 49) + '…'
  }
  return `Step ${index + 1}`
}

export function TimelineSommaire({
  sections,
  sectionStatuses,
  microSteps,
  activeMicroStepIndex,
  activeSection,
  onStepClick,
  onSectionClick,
}: TimelineSommaireProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Auto-expand active section
  useEffect(() => {
    if (activeSection) {
      setExpandedSections(prev => {
        const next = new Set(prev)
        next.add(activeSection)
        return next
      })
    }
  }, [activeSection])

  // Auto-scroll to active step
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeMicroStepIndex])

  // Group steps by sectionId
  const stepsBySection: Record<string, { step: MicroStep; globalIndex: number }[]> = {}
  microSteps.forEach((step, i) => {
    const sid = step.sectionId || ''
    if (!stepsBySection[sid]) stepsBySection[sid] = []
    stepsBySection[sid].push({ step, globalIndex: i })
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId)
      return next
    })
  }

  return (
    <div data-tour="timeline" className="flex w-64 shrink-0 flex-col border-r border-border/30 bg-card/30 overflow-y-auto">
      {sections.map(section => {
        const status = sectionStatuses[section.id] || 'empty'
        const isActive = activeSection === section.id
        const sectionSteps = stepsBySection[section.id] || []
        const isExpanded = expandedSections.has(section.id)

        return (
          <div key={section.id}>
            <SectionHeader
              name={section.name}
              status={status}
              isActive={isActive}
              isExpanded={isExpanded}
              stepCount={sectionSteps.length}
              onClick={() => {
                if (sectionSteps.length > 0) {
                  toggleSection(section.id)
                } else {
                  onSectionClick(section.id)
                }
              }}
            />

            {/* Mini-steps under this section */}
            {isExpanded && sectionSteps.length > 0 && (
              <div className="relative ml-3 border-l border-border/20 pl-2 pb-1">
                {sectionSteps.map(({ step, globalIndex }) => {
                  const isStepActive = globalIndex === activeMicroStepIndex

                  return (
                    <div key={step.id} ref={isStepActive ? activeRef : undefined}>
                      <button
                        onClick={() => onStepClick(globalIndex)}
                        className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-all ${
                          isStepActive
                            ? 'bg-primary/10 border-l-2 border-primary -ml-[1px]'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] leading-none">
                            {step.status === 'active'
                              ? <span className="animate-pulse text-primary">●</span>
                              : step.status === 'answered'
                                ? <span className="text-accent">✓</span>
                                : <span className="text-orange-400">⊘</span>}
                          </span>
                          <span className="flex-1 truncate text-xs text-foreground">
                            {getStepSummary(step, globalIndex)}
                          </span>
                        </div>

                        {step.status === 'answered' && step.userResponse && (
                          <p className="ml-4 truncate text-[10px] text-muted-foreground/60">
                            → {step.userResponse}
                          </p>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
