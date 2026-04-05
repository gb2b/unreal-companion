import { useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MicroStep } from '@/types/studio'
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
  const [textValue, setTextValue] = useState('')
  const [selectedChoices, setSelectedChoices] = useState<string[]>([])
  const [agentReaction, setAgentReaction] = useState<string | null>(null)
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // All text blocks accumulated in this micro-step
  const prompts = microStep?.agentPrompts || []
  // The last prompt is the main one (with the interaction), others are "thinking"
  const mainPrompt = prompts.length > 0 ? prompts[prompts.length - 1] : ''
  const thinkingPrompts = prompts.length > 1 ? prompts.slice(0, -1) : []
  // During streaming, show the streaming text; after text_done, show the main prompt
  const displayText = mainPrompt || streamingText
  const hasContent = displayText.length > 0 || thinkingPrompts.length > 0
  const hasInteraction = !!microStep?.interactionType && !!microStep?.interactionData
  const showInput = !isProcessing && hasContent
  const hasSelection = selectedChoices.length > 0
  const hasTextInput = textValue.trim().length > 0
  const hasResponse = hasSelection || hasTextInput

  // Dynamic placeholder
  const placeholder = hasSelection
    ? 'Add details about your selection (optional)...'
    : 'Describe your choice or type freely...'

  const handleInteractionSelect = useCallback(
    (response: string) => {
      // response is a comma-separated list of IDs from InteractionRenderer
      if (response) {
        const ids = response.split(',').map(s => s.trim()).filter(Boolean)
        setSelectedChoices(ids)
      } else {
        setSelectedChoices([])
      }
      // Show brief agent reaction on selection
      if (response) {
        const reactions = ['👍', '✨', '💡', '🎯', '🔥']
        setAgentReaction(reactions[Math.floor(Math.random() * reactions.length)])
        if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current)
        reactionTimerRef.current = setTimeout(() => setAgentReaction(null), 1000)
      }
    },
    [],
  )

  // Continue = submit selection + text to the LLM
  const handleContinue = useCallback(() => {
    if (!hasResponse) return

    // Build the response: selected choices labels + optional text
    const parts: string[] = []

    if (hasSelection) {
      // Find the labels for selected IDs from the interaction data
      const choicesData = microStep?.interactionData as any
      const options = choicesData?.options || []
      const labels = selectedChoices
        .map(id => options.find((o: any) => o.id === id)?.label || id)
      parts.push(`Selected: ${labels.join(', ')}`)
    }

    if (hasTextInput) {
      parts.push(textValue.trim())
    }

    const response = parts.join('\n')
    setTextValue('')
    setSelectedChoices([])
    onSubmitResponse(response)
  }, [hasResponse, hasSelection, hasTextInput, selectedChoices, textValue, microStep, onSubmitResponse])

  const handleSubmitKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (hasResponse && !isProcessing) {
          handleContinue()
        }
      }
    },
    [hasResponse, isProcessing, handleContinue],
  )

  return (
    <div data-tour="step-slide" className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">

          {/* Processing state — shown when working and no content yet */}
          {isProcessing && !hasContent && (
            <ProcessingState
              text={processingText}
              agentName={agentName}
              agentEmoji={agentEmoji}
            />
          )}

          {/* Thinking prompts — collapsible previous text blocks */}
          {thinkingPrompts.map((text, i) => (
            <ThinkingBlock key={i} content={text} />
          ))}

          {/* Agent Prompt — rendered as markdown, even during streaming */}
          {(displayText || streamingText) && (
            <div className="relative">
              <AgentPrompt
                content={displayText || streamingText}
                agentName={agentName}
                agentEmoji={agentEmoji}
                isStreaming={isProcessing && prompts.length === 0}
              />
              {agentReaction && (
                <span className="absolute -right-2 -top-2 animate-bounce text-lg">
                  {agentReaction}
                </span>
              )}
            </div>
          )}

          {/* Thinking indicator — shown when LLM is processing between text blocks */}
          {isProcessing && hasContent && !streamingText && !hasInteraction && (
            <ProcessingState
              text={processingText}
              agentName={agentName}
              agentEmoji={agentEmoji}
            />
          )}

          {/* Interaction Component — only after streaming is done */}
          {hasInteraction && !isProcessing && (
            <div className="choice-stagger">
              <InteractionRenderer
                type={microStep!.interactionType!}
                data={microStep!.interactionData!}
                onResponse={handleInteractionSelect}
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Text Input — only visible when ready to respond */}
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
              <p className="text-xs text-muted-foreground/50">
                Press Enter to submit · Shift+Enter for new line
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Navigation — fixed at bottom */}
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
