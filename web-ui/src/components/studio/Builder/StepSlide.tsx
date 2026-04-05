import { useState, useCallback, useRef } from 'react'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'
import { AgentPrompt } from './AgentPrompt'
import { InteractionRenderer } from './InteractionRenderer'
import { ProcessingState } from './ProcessingState'
import { StepNavigation } from './StepNavigation'

/** Collapsed card shown for tool calls */
function ToolCallCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/20 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground/70">
      <span className="text-accent">✓</span>
      {label}
    </div>
  )
}

/** Simple inline thinking indicator for a block */
function ThinkingIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/20 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground/60">
      <span className="animate-spin">⟳</span>
      <span className="truncate">{text || 'Thinking…'}</span>
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
  onSubmitResponse: (response: string) => void
  onBack: () => void
  onSkip: () => void
}

export function StepSlide({
  microStep,
  streamingText: _streamingText,
  isProcessing,
  processingText,
  agentName,
  agentEmoji,
  activeMicroStepIndex,
  onSubmitResponse,
  onBack,
  onSkip,
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
      parts.push(`Selected: ${labels.join(', ')}`)
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
    <div data-tour="step-slide" className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">

          {/* Render all blocks in order — additive, nothing disappears */}
          {blocks.map((block, i) => {
            switch (block.kind) {
              case 'tool_call':
                return <ToolCallCard key={i} label={block.label} />
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
                      disabled={isProcessing}
                    />
                  </div>
                )
              case 'thinking':
                return <ThinkingIndicator key={i} text={block.content} />
              default:
                return null
            }
          })}

          {/* Global processing indicator — shown while processing and not yet streaming */}
          {isProcessing && !isStreaming && (
            <ProcessingState
              text={processingText}
              agentName={agentName}
              agentEmoji={agentEmoji}
            />
          )}

          {/* Text input — only when step is ready */}
          {showInput && (
            <div className="flex flex-col gap-1.5">
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
          )}

        </div>
      </div>

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
