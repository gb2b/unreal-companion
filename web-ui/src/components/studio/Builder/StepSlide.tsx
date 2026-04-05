import { useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MicroStep } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'
import { AgentPrompt } from './AgentPrompt'
import { InteractionRenderer } from './InteractionRenderer'
import { ProcessingState } from './ProcessingState'
import { StepNavigation } from './StepNavigation'

/** Collapsible thinking block — shows previous text from the LLM in this step */
function ThinkingBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  const preview = content.replace(/[#*_`\n]/g, ' ').trim().slice(0, 80)

  return (
    <div className="rounded-lg border border-border/20 bg-card/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="flex-1 truncate">{open ? 'Agent thinking' : preview + '...'}</span>
      </button>
      {open && (
        <div className="border-t border-border/10 px-3 py-2 text-xs text-muted-foreground/60">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
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
  streamingText,
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

  // === State derivation ===
  const prompts = microStep?.agentPrompts || []
  const mainPrompt = prompts.length > 0 ? prompts[prompts.length - 1] : ''
  const thinkingPrompts = prompts.length > 1 ? prompts.slice(0, -1) : []
  const hasInteraction = !!microStep?.interactionType && !!microStep?.interactionData

  // What text to display — streaming text takes priority during streaming
  const isActivelyStreaming = isProcessing && streamingText.length > 0
  const displayText = isActivelyStreaming ? streamingText : mainPrompt

  // Is the step complete (all content received, ready for user input)?
  const stepReady = !isProcessing && (mainPrompt.length > 0 || hasInteraction)

  // Show textarea only when step is ready
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

  // === Rendering logic ===
  // Simple rule: while isProcessing, ALWAYS show thinking at the bottom
  // UNLESS we are actively streaming text (then show the text being typed)
  const showThinking = isProcessing && !isActivelyStreaming

  return (
    <div data-tour="step-slide" className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">

          {/* Previous text blocks (thinking/collapsed) */}
          {thinkingPrompts.map((text, i) => (
            <ThinkingBlock key={i} content={text} />
          ))}

          {/* Main text — agent prompt or streaming text */}
          {displayText && (
            <div className="relative">
              <AgentPrompt
                content={displayText}
                agentName={agentName}
                agentEmoji={agentEmoji}
                isStreaming={isActivelyStreaming}
              />
              {agentReaction && (
                <span className="absolute -right-2 -top-2 animate-bounce text-lg">
                  {agentReaction}
                </span>
              )}
            </div>
          )}

          {/* Thinking indicator — ALWAYS shown during processing when not streaming text */}
          {showThinking && (
            <ProcessingState
              text={processingText}
              agentName={agentName}
              agentEmoji={agentEmoji}
            />
          )}

          {/* Interaction — only when step is complete (not processing) */}
          {hasInteraction && stepReady && (
            <div className="choice-stagger">
              <InteractionRenderer
                type={microStep!.interactionType!}
                data={microStep!.interactionData!}
                onResponse={handleInteractionSelect}
                disabled={isProcessing}
              />
            </div>
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
