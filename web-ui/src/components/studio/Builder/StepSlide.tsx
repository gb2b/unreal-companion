import { useState, useCallback, useRef } from 'react'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'
import { AgentPrompt } from './AgentPrompt'
import { InteractionRenderer } from './InteractionRenderer'
import { StepNavigation } from './StepNavigation'

// Tools whose spinner/card should not be shown — the result speaks for itself
const HIDDEN_TOOLS = ['show_interaction', 'show_prototype', 'report_progress', 'ask_user']

/** Tool call card — only shown for meaningful tools, hidden for show_interaction */
function ToolCallCard({ name, label, status }: { name: string; label: string; status: 'pending' | 'done' | 'error' }) {
  if (HIDDEN_TOOLS.includes(name)) return null

  return (
    <div className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground/50">
      {status === 'pending' && <span className="h-3 w-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />}
      {status === 'done' && <span className="text-accent text-[10px]">✓</span>}
      {status === 'error' && <span className="text-red-400 text-[10px]">✗</span>}
      <span>{label}</span>
    </div>
  )
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
}: StepSlideProps) {
  const { language } = useI18n()
  const [textValue, setTextValue] = useState('')
  const [selectedChoices, setSelectedChoices] = useState<string[]>([])
  const [agentReaction, setAgentReaction] = useState<string | null>(null)
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // === Derived state from blocks ===
  const blocks = microStep?.blocks ?? []
  const hasInteraction = blocks.some(b => b.kind === 'interaction')
  const isStreaming = blocks.some(b => b.kind === 'streaming')
  const stepReady = !isProcessing && blocks.length > 0

  // Show input when step is done processing
  const showInput = stepReady

  const hasSelection = selectedChoices.length > 0
  const hasTextInput = textValue.trim().length > 0
  const hasResponse = hasSelection || hasTextInput
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

  const handleContinue = useCallback(() => {
    if (!hasResponse) return
    const parts: string[] = []
    if (hasSelection) {
      const choicesData = microStep?.interactionData as any
      const options = choicesData?.options || []
      const labels = selectedChoices.map(id => options.find((o: any) => o.id === id)?.label || id)
      // Clean format: strip emojis from labels for the LLM message
      const cleanLabels = labels.map((l: string) => l.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim())
      parts.push(cleanLabels.join(', '))
    }
    if (hasTextInput) {
      parts.push(textValue.trim())
    }
    setTextValue('')
    setSelectedChoices([])
    onSubmitResponse(parts.join('\n'))
  }, [hasResponse, hasSelection, hasTextInput, selectedChoices, textValue, microStep, onSubmitResponse])

  const handleSubmitKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (hasResponse && !isProcessing) handleContinue()
      }
    },
    [hasResponse, isProcessing, handleContinue],
  )

  return (
    <div data-tour="step-slide" className="flex flex-1 flex-col overflow-hidden h-full">
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">

          {/* Render all blocks in order — additive, nothing disappears */}
          {blocks.map((block, i) => {
            switch (block.kind) {
              case 'tool_call':
                return <ToolCallCard key={i} name={block.name} label={block.label} status={block.status} />
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

          {/* Simple "Thinking..." — only when no VISIBLE tool_call spinner is pending and not streaming */}
          {isProcessing && !isStreaming && !blocks.some(
            b => b.kind === 'tool_call' && b.status === 'pending' && !HIDDEN_TOOLS.includes(b.name)
          ) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
              <span className="animate-pulse">●</span>
              Thinking...
            </div>
          )}

        </div>
      </div>

      {/* Pinned input zone — outside the scroll area */}
      {showInput && !isReadonly && (
        <div className="border-t border-border/30 px-6 py-4">
          <div className="mx-auto w-full max-w-2xl flex flex-col gap-1.5">
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
    </div>
  )
}
