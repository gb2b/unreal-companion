import { useState, useEffect, useCallback, useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'
import { AgentPrompt } from './AgentPrompt'
import { InteractionRenderer } from './InteractionRenderer'
import { StepNavigation } from './StepNavigation'
import { AttachModal } from './AttachModal'
import type { AttachResult } from './AttachModal'

interface AttachedFile {
  file: File
  name: string
  type: 'local'
}

interface AttachedDoc {
  docId: string
  name: string
  summary?: string
  type: 'library'
}

// Tools whose spinner/card should not be shown — the result speaks for itself
const HIDDEN_TOOLS = ['show_interaction', 'show_prototype', 'report_progress', 'ask_user', 'step_done']

/** Tool call card — only shown for meaningful tools, hidden for show_interaction */
/** Extract timestamp from step id: step-{n}-{Date.now()} */
function getStepTime(step: MicroStep): number {
  const parts = step.id.split('-')
  const ts = parseInt(parts[parts.length - 1], 10)
  return isNaN(ts) ? 0 : ts
}

const THINKING_MESSAGES = [
  'Gathering mana...',
  'Rolling for initiative...',
  'Consulting the design doc...',
  'Spawning ideas...',
  'Loading next level...',
  'Crafting response...',
  'Parsing the lore...',
  'Buffing creativity...',
  'Compiling shaders...',
  'Optimizing fun...',
  'Balancing the meta...',
  'Checking the wiki...',
  'Casting inspiration...',
  'Mining for gems...',
  'Rendering thoughts...',
  'Unlocking achievement...',
  'Searching the backlog...',
  'Polishing pixels...',
  'Tuning the loop...',
  'Respawning ideas...',
  'Equipping knowledge...',
  'Exploring the design space...',
  'Debugging creativity...',
  'Playtesting concepts...',
  'Iterating...',
]

function ThinkingIndicator() {
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * THINKING_MESSAGES.length))

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => {
        let next = Math.floor(Math.random() * THINKING_MESSAGES.length)
        while (next === prev) next = Math.floor(Math.random() * THINKING_MESSAGES.length)
        return next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground/50 mt-2">
      <span className="h-3 w-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
      <span className="transition-opacity duration-300">{THINKING_MESSAGES[msgIndex]}</span>
      <ElapsedTimer />
    </div>
  )
}

/** Pretty tool name for display */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  doc_scan: 'Scan',
  doc_read_summary: 'Read',
  doc_read_section: 'Read',
  doc_grep: 'Search',
  update_document: 'Write',
  mark_section_complete: 'Complete',
  update_project_context: 'Context',
  update_session_memory: 'Memory',
  read_project_document: 'Read',
  rename_document: 'Rename',
  show_interaction: 'Question',
  show_prototype: 'Prototype',
  report_progress: 'Progress',
}

function ToolCallCard({ name, label, status, startTime, endTime, result }: {
  name: string; label: string; status: 'pending' | 'done' | 'error'; startTime?: number; endTime?: number; result?: string
}) {
  if (HIDDEN_TOOLS.includes(name)) return null
  const [expanded, setExpanded] = useState(false)
  const displayName = TOOL_DISPLAY_NAMES[name] || name
  const hasResult = result && (status === 'done' || status === 'error')

  return (
    <div className="py-0.5">
      {/* Line 1: Icon — Tool Name — Description — Timer */}
      <button
        onClick={() => hasResult && setExpanded(v => !v)}
        className={`flex w-full items-center gap-1.5 text-left text-[11px] ${hasResult ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Status icon */}
        {status === 'pending' && <span className="h-3 w-3 shrink-0 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />}
        {status === 'done' && <span className="text-accent text-[10px] shrink-0">&#10003;</span>}
        {status === 'error' && <span className="text-red-400 text-[10px] shrink-0">&#10007;</span>}

        {/* Tool name badge */}
        <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${
          status === 'error' ? 'bg-red-500/10 text-red-400/70' : 'bg-muted/50 text-muted-foreground/60'
        }`}>
          {displayName}
        </span>

        {/* LLM description */}
        <span className={`flex-1 truncate ${
          status === 'error' ? 'text-red-400/60 line-through' : 'text-muted-foreground/50'
        }`}>
          {label}
        </span>

        {/* Timer */}
        {status === 'pending' && <ElapsedTimer startTime={startTime} />}
        {(status === 'done' || status === 'error') && startTime && <FinalDuration startTime={startTime} endTime={endTime} />}

        {/* Expand indicator */}
        {hasResult && (
          <span className="text-[9px] text-muted-foreground/30 shrink-0">
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </button>

      {/* Line 2: Expanded result */}
      {expanded && result && (
        <div className={`ml-5 mt-1 mb-1 rounded-md px-2.5 py-1.5 text-[10px] leading-relaxed ${
          status === 'error'
            ? 'bg-red-500/5 border border-red-500/10 text-red-400/70'
            : 'bg-muted/30 border border-border/20 text-muted-foreground/50'
        }`}>
          {result}
        </div>
      )}
    </div>
  )
}

/** Live elapsed timer */
function ElapsedTimer({ startTime }: { startTime?: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const base = startTime || Date.now()
    const tick = () => setElapsed(Math.floor((Date.now() - base) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startTime])
  return <span className="text-[9px] text-muted-foreground/30 tabular-nums">{formatDuration(elapsed)}</span>
}

/** Static duration after completion */
function FinalDuration({ startTime, endTime }: { startTime: number; endTime?: number }) {
  const duration = Math.floor(((endTime || Date.now()) - startTime) / 1000)
  return <span className="text-[9px] text-muted-foreground/30 tabular-nums">{formatDuration(duration)}</span>
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m${(secs % 60).toString().padStart(2, '0')}s`
}

interface StepSlideProps {
  microStep: MicroStep | null
  streamingText: string
  isProcessing: boolean
  processingText: string
  agentName: string
  agentEmoji: string
  activeMicroStepIndex: number
  totalMicroSteps: number
  onSubmitResponse: (response: string) => void
  onBack: () => void
  onSkip: () => void
  onProposeModification: (stepIndex: number) => void
  projectPath?: string
  previousUserResponse?: string | null
}

export function StepSlide({
  microStep,
  streamingText: _streamingText,
  isProcessing,
  processingText: _processingText,
  agentName,
  agentEmoji,
  activeMicroStepIndex,
  totalMicroSteps,
  onSubmitResponse,
  onBack,
  onSkip,
  onProposeModification,
  projectPath,
  previousUserResponse,
}: StepSlideProps) {
  const { language } = useI18n()
  const [textValue, setTextValue] = useState('')
  const [selectedChoices, setSelectedChoices] = useState<string[]>([])
  const [agentReaction, setAgentReaction] = useState<string | null>(null)
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [attachments, setAttachments] = useState<Array<AttachedFile | AttachedDoc>>([])
  const [attachModalOpen, setAttachModalOpen] = useState(false)

  // === Derived state from blocks ===
  const blocks = microStep?.blocks ?? []
  const hasInteraction = blocks.some(b => b.kind === 'interaction')
  const isStreaming = blocks.some(b => b.kind === 'streaming')
  const stepReady = !isProcessing && blocks.length > 0

  // Show input when step is done processing
  const showInput = stepReady

  const hasSelection = selectedChoices.length > 0
  const hasTextInput = textValue.trim().length > 0
  const hasAttachments = attachments.length > 0
  const hasResponse = hasSelection || hasTextInput || hasAttachments
  const isReadonly = microStep?.status === 'answered' && activeMicroStepIndex < totalMicroSteps - 1

  // Dynamic placeholder
  const placeholder = hasSelection
    ? (language === 'fr' ? 'Ajoutez des détails sur votre sélection (optionnel)...' : 'Add details about your selection (optional)...')
    : (language === 'fr' ? 'Décrivez votre choix ou tapez librement...' : 'Describe your choice or type freely...')
  const enterHint = language === 'fr' ? 'Entrée pour envoyer · Maj+Entrée pour retour à la ligne' : 'Press Enter to submit · Shift+Enter for new line'

  const handleInteractionSelect = useCallback(
    (response: string) => {
      if (response) {
        const ids = response.split(',').map(s => s.trim()).filter(Boolean)
        setSelectedChoices(ids)
      } else {
        setSelectedChoices([])
      }
      if (response) {
        const reactions = ['👍', '✨', '💡', '🎯', '🔥']
        setAgentReaction(reactions[Math.floor(Math.random() * reactions.length)])
        if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current)
        reactionTimerRef.current = setTimeout(() => setAgentReaction(null), 1000)
      }
    },
    [],
  )

  const handleContinue = useCallback(async () => {
    if (!hasResponse) return
    const parts: string[] = []

    // 1. Choices
    if (hasSelection) {
      const choicesData = microStep?.interactionData as any
      const options = choicesData?.options || []
      const labels = selectedChoices.map(id => options.find((o: any) => o.id === id)?.label || id)
      const cleanLabels = labels.map((l: string) => l.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim())
      parts.push(cleanLabels.join(', '))
    }

    // 2. Text
    if (hasTextInput) {
      parts.push(textValue.trim())
    }

    // 3. Attachments — save local files to references/ (no scan), tell LLM to scan via tools
    if (hasAttachments) {
      for (const att of attachments) {
        if (att.type === 'local') {
          // Quick upload — just save to references/, no scan (LLM will scan via doc_scan tool)
          try {
            const formData = new FormData()
            formData.append('file', att.file)
            formData.append('project_path', projectPath || '')
            formData.append('skip_scan', 'true')
            const res = await fetch('/api/v2/studio/upload', { method: 'POST', body: formData })
            if (res.ok) {
              const data = await res.json()
              parts.push(`[DOCUMENT_ATTACHED] ${data.doc_id}\nFilename: ${data.filename}\nUse doc_scan and doc_read_summary to analyze this document.`)
            }
          } catch { /* ignore */ }
        } else if (att.type === 'library') {
          parts.push(`[DOCUMENT_LINKED] ${att.docId}\nName: ${att.name}\nUse doc_read_summary to review this document.`)
        }
      }
    }

    setTextValue('')
    setSelectedChoices([])
    setAttachments([])
    onSubmitResponse(parts.join('\n\n'))
  }, [hasResponse, hasSelection, hasTextInput, hasAttachments, selectedChoices, textValue, attachments, microStep, projectPath, onSubmitResponse])

  const handleSubmitKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (hasResponse && !isProcessing) handleContinue()
      }
    },
    [hasResponse, isProcessing, handleContinue],
  )

  // Attach from modal (file or library doc)
  const handleAttachFromModal = useCallback((result: AttachResult) => {
    if (result.type === 'upload' && result.file) {
      // Local file — will be uploaded on Continue
      setAttachments(prev => [...prev, { file: result.file!, name: result.name, type: 'local' }])
    } else {
      // Library doc — already on disk
      setAttachments(prev => [...prev, { docId: result.docId, name: result.name, summary: result.summary, type: 'library' }])
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Handle actions from interaction choices (e.g., attach_documents, open_editor)
  const handleAction = useCallback((action: string) => {
    switch (action) {
      case 'attach_documents':
        setAttachModalOpen(true)
        break
      // Future actions can be added here
      default:
        console.log('[builder] Unknown action:', action)
    }
  }, [])

  return (
    <div data-tour="step-slide" className="flex flex-1 flex-col overflow-hidden h-full">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">

          {/* User's previous response — shown as a right-aligned bubble with context tags */}
          {previousUserResponse && (() => {
            const lines = previousUserResponse.split('\n').filter(l => l.trim())
            const attachments = lines.filter(l => l.startsWith('[DOCUMENT_ATTACHED]') || l.startsWith('[DOCUMENT_LINKED]'))
            const textLines = lines.filter(l => !l.startsWith('[DOCUMENT_') && !l.startsWith('Filename:') && !l.startsWith('Summary:') && !l.startsWith('Use doc_'))
            const mainText = textLines.join(', ').slice(0, 120)

            return (
              <div className="flex flex-col items-end gap-1 mb-3">
                {/* Context tags: attached files */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {attachments.map((a, i) => {
                      const name = a.replace(/\[DOCUMENT_\w+\]\s*/, '').replace(/references\//, '').split('\n')[0]
                      return (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-border/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                          📎 {name}
                        </span>
                      )
                    })}
                  </div>
                )}
                {/* Main response bubble */}
                {mainText && (
                  <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary/10 border border-primary/20 px-4 py-2">
                    <p className="text-sm text-foreground/80">{mainText}</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Render all blocks in order — additive, nothing disappears */}
          {blocks.map((block, i) => {
            switch (block.kind) {
              case 'tool_call':
                return <ToolCallCard key={i} name={block.name} label={block.label} status={block.status} startTime={(block as any).startTime} endTime={(block as any).endTime} result={(block as any).result} />
              case 'text':
                return (
                  <div key={i} className={i === blocks.length - 1 && !hasInteraction ? 'relative' : undefined}>
                    <AgentPrompt
                      content={block.content}
                      agentName={agentName}
                      agentEmoji={agentEmoji}
                    />
                    {i === blocks.length - 1 && agentReaction && (
                      <span className="absolute -right-2 -top-2 animate-bounce text-lg">
                        {agentReaction}
                      </span>
                    )}
                  </div>
                )
              case 'streaming':
                return (
                  <div key={i} className="relative">
                    <AgentPrompt
                      content={block.content}
                      agentName={agentName}
                      agentEmoji={agentEmoji}
                      isStreaming
                    />
                    {agentReaction && (
                      <span className="absolute -right-2 -top-2 animate-bounce text-lg">
                        {agentReaction}
                      </span>
                    )}
                  </div>
                )
              case 'interaction':
                return (
                  <div key={i} className="choice-stagger">
                    <InteractionRenderer
                      type={block.type}
                      data={block.data}
                      onResponse={handleInteractionSelect}
                      onAction={handleAction}
                      disabled={isProcessing || !!isReadonly}
                    />
                  </div>
                )
              case 'thinking':
                // Thinking blocks are transient — don't render as persistent blocks
                return null
              default:
                return null
            }
          })}

          {/* Readonly: compact indicator for answered steps — only if step has agent content */}
          {isReadonly && microStep?.userResponse && blocks.some(b => b.kind === 'text' || b.kind === 'interaction') && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-accent">✓</span>
              <span className="text-xs text-muted-foreground/50 truncate max-w-md">
                {microStep.userResponse.length > 80 ? microStep.userResponse.slice(0, 77) + '…' : microStep.userResponse}
              </span>
              <button
                onClick={() => onProposeModification(activeMicroStepIndex)}
                className="ml-auto shrink-0 text-[10px] text-primary/50 hover:text-primary underline underline-offset-2"
              >
                {language === 'fr' ? 'Modifier' : 'Edit'}
              </button>
            </div>
          )}

          {/* Thinking indicator — fun game-dev themed messages */}
          {isProcessing && !isStreaming && !blocks.some(
            b => b.kind === 'tool_call' && b.status === 'pending' && !HIDDEN_TOOLS.includes(b.name)
          ) && !blocks.some(b => b.kind === 'interaction') && (
            <ThinkingIndicator />
          )}

          {/* Step footer — shows after step_done with title + stats */}
          {(() => {
            const step = microStep as any
            if (!step?.stepDoneAt) return null
            const startTime = getStepTime(microStep!)
            const duration = startTime ? Math.floor((step.stepDoneAt - startTime) / 1000) : 0
            const tokensIn = step.stepTokensIn || 0
            const tokensOut = step.stepTokensOut || 0
            return (
              <div className="mt-4 pt-3 border-t border-border/20">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40">
                  {duration > 0 && <span>{formatDuration(duration)}</span>}
                  {duration > 0 && (tokensIn > 0 || tokensOut > 0) && <span>·</span>}
                  {(tokensIn > 0 || tokensOut > 0) && (
                    <span>{tokensIn > 0 ? `${Math.round(tokensIn / 1000)}k` : '0'} in / {tokensOut > 0 ? `${Math.round(tokensOut / 1000)}k` : '0'} out</span>
                  )}
                </div>
              </div>
            )
          })()}

        </div>
      </div>

      {/* Pinned input zone — outside the scroll area */}
      {showInput && !isReadonly && (
        <div className="border-t border-border/30 px-6 py-4">
          <div className="mx-auto w-full max-w-2xl flex flex-col gap-1.5">
            {/* Attachment pills */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[150px] truncate">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2">
              {/* Attach button — opens modal */}
              <button
                onClick={() => setAttachModalOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={language === 'fr' ? 'Joindre un fichier' : 'Attach file'}
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                onKeyDown={handleSubmitKey}
                disabled={isProcessing}
                placeholder={placeholder}
                rows={2}
                data-autofocus
                className="w-full resize-none rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-muted-foreground/50">{enterHint}</p>
          </div>
        </div>
      )}

      <StepNavigation
        onBack={onBack}
        onSkip={onSkip}
        onContinue={handleContinue}
        canGoBack={activeMicroStepIndex > 0}
        isProcessing={isProcessing}
        hasResponse={hasResponse}
      />

      {/* Attach modal — pick from computer or library */}
      <AttachModal
        isOpen={attachModalOpen}
        onClose={() => setAttachModalOpen(false)}
        onAttach={(result) => { handleAttachFromModal(result); setAttachModalOpen(false) }}
        projectPath={projectPath || ''}
      />
    </div>
  )
}
