import { useEffect, useRef, useState } from 'react'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

interface SessionHistoryProps {
  microSteps: MicroStep[]
  activeMicroStepIndex: number
  onStepClick: (index: number) => void
}

/** Extract timestamp from step id: step-{n}-{Date.now()} */
function getStepTime(step: MicroStep): number {
  const parts = step.id.split('-')
  const ts = parseInt(parts[parts.length - 1], 10)
  return isNaN(ts) ? 0 : ts
}

/** Get the label for a step — only from step_done summary */
function getStepLabel(step: MicroStep): string | null {
  if (step.summary && step.summary !== 'Step') {
    return step.summary
  }
  return null
}

/** Get the current tool name being processed */
function getActiveToolName(step: MicroStep): string | null {
  const pending = step.blocks.find(b => b.kind === 'tool_call' && (b as any).status === 'pending')
  if (pending) return (pending as any).name || null
  return null
}

const TOOL_LABELS: Record<string, string> = {
  doc_scan: 'Reading document...',
  doc_read_summary: 'Reading summary...',
  doc_read_section: 'Reading section...',
  doc_grep: 'Searching...',
  update_document: 'Updating document...',
  mark_section_complete: 'Completing section...',
  update_project_context: 'Updating context...',
  update_session_memory: 'Saving memory...',
  show_interaction: 'Preparing question...',
  rename_document: 'Renaming...',
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
  if (d.toDateString() === today.toDateString()) return language === 'fr' ? "Aujourd'hui" : 'Today'
  if (d.toDateString() === yesterday.toDateString()) return language === 'fr' ? 'Hier' : 'Yesterday'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Elapsed timer for active steps */
function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(interval)
  }, [])
  if (elapsed < 2) return null
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return (
    <span className="text-[9px] text-muted-foreground/40 tabular-nums">
      {mins > 0 ? `${mins}m${secs.toString().padStart(2, '0')}s` : `${secs}s`}
    </span>
  )
}

export function SessionHistory({ microSteps, activeMicroStepIndex, onStepClick }: SessionHistoryProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  const { language } = useI18n()

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeMicroStepIndex])

  // Filter ghost steps
  const visibleSteps = microSteps
    .map((step, i) => ({ step, index: i, timestamp: getStepTime(step) }))
    .filter(({ step }) => {
      const hasText = step.blocks.some(b => b.kind === 'text' || b.kind === 'streaming')
      const hasInteraction = step.blocks.some(b => b.kind === 'interaction')
      return hasText || hasInteraction || step.status === 'active'
    })

  // Collapse old steps — show last 4 by default
  const VISIBLE_RECENT = 4
  const [showAll, setShowAll] = useState(false)
  const hiddenCount = Math.max(0, visibleSteps.length - VISIBLE_RECENT)
  const displayedSteps = showAll || hiddenCount === 0
    ? visibleSteps
    : visibleSteps.slice(-VISIBLE_RECENT)

  // Group by day
  const groups: Array<{ dayLabel: string; steps: typeof visibleSteps }> = []
  let currentDay = ''
  for (const vs of displayedSteps) {
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
      <div className="shrink-0 border-b border-border/20 px-3 py-2">
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          {language === 'fr' ? 'Historique' : 'History'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visibleSteps.length === 0 ? (
          <p className="px-3 py-4 text-[10px] text-muted-foreground/40 text-center">
            {language === 'fr' ? 'La conversation apparaitra ici.' : 'Conversation will appear here.'}
          </p>
        ) : (
          <>
          {/* "Show more" button when steps are collapsed */}
          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors border-b border-border/10"
            >
              <span className="flex flex-col gap-[2px]">
                <span className="block h-[2px] w-[2px] rounded-full bg-current" />
                <span className="block h-[2px] w-[2px] rounded-full bg-current" />
                <span className="block h-[2px] w-[2px] rounded-full bg-current" />
              </span>
              <span>{hiddenCount} {language === 'fr' ? 'précédentes' : 'earlier'}</span>
            </button>
          )}
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.dayLabel && (
                <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border/10 px-3 py-1">
                  <span className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                    {group.dayLabel}
                  </span>
                </div>
              )}

              {group.steps.map(({ step, index, timestamp }) => {
                const isActive = index === activeMicroStepIndex
                const isProcessing = step.status === 'active'
                const label = getStepLabel(step)
                const activeTool = isProcessing ? getActiveToolName(step) : null
                const toolLabel = activeTool ? TOOL_LABELS[activeTool] || activeTool : null

                return (
                  <div key={step.id} ref={isActive ? activeRef : undefined}>
                    <button
                      onClick={() => onStepClick(index)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-all border-l-2 ${
                        isActive
                          ? 'bg-primary/10 border-primary'
                          : 'border-transparent hover:bg-muted/30'
                      }`}
                    >
                      {/* Status icon */}
                      <span className="text-[10px] leading-none shrink-0">
                        {isProcessing
                          ? <span className="animate-pulse text-primary">&#9679;</span>
                          : step.status === 'answered'
                            ? <span className="text-accent">&#10003;</span>
                            : <span className="text-muted-foreground/40">&#9675;</span>}
                      </span>

                      {/* Label */}
                      <span className="flex-1 min-w-0">
                        {!label ? (
                          <span className="text-[11px] text-primary/70 italic truncate block">
                            {toolLabel || (language === 'fr' ? 'En cours...' : 'Processing...')}
                          </span>
                        ) : (
                          <span className="flex flex-col">
                            <span className="text-[11px] text-foreground/80 truncate">
                              {label}
                            </span>
                            {step.status === 'answered' && step.userResponse && (
                              <span className="text-[10px] text-muted-foreground/40 truncate">
                                → {step.userResponse.split('\n')[0].replace(/\[DOCUMENT_ATTACHED\].*/, '📎').replace(/\[DOCUMENT_LINKED\].*/, '🔗').slice(0, 35)}
                              </span>
                            )}
                          </span>
                        )}
                      </span>

                      {/* Time or elapsed timer */}
                      {isProcessing ? (
                        <ElapsedTimer />
                      ) : timestamp > 0 ? (
                        <span className="shrink-0 text-[9px] text-muted-foreground/30">
                          {formatTime(timestamp)}
                        </span>
                      ) : null}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
          </>
        )}
      </div>
    </div>
  )
}
