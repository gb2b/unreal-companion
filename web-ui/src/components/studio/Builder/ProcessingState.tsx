import { useState, useEffect } from 'react'

interface ProcessingStateProps {
  agentName: string
  agentEmoji: string
  processingText?: string  // from SSE processing_status event
  sectionName?: string
  // Legacy prop — kept for backward compatibility
  text?: string
}

export function ProcessingState({ agentName, agentEmoji, processingText, sectionName, text }: ProcessingStateProps) {
  const [dotCount, setDotCount] = useState(0)
  const [fallbackIdx, setFallbackIdx] = useState(0)

  // Animated dots
  useEffect(() => {
    const timer = setInterval(() => setDotCount(d => (d + 1) % 4), 400)
    return () => clearInterval(timer)
  }, [])

  // Rotate fallback messages if no processingText from SSE
  const fallbackMessages = [
    `${agentEmoji} ${agentName} is thinking`,
    `Analyzing your response`,
    sectionName ? `Working on ${sectionName}` : `Preparing next question`,
    `Almost there`,
  ]
  useEffect(() => {
    const effectiveText = processingText || text
    if (effectiveText) return
    const timer = setInterval(() => setFallbackIdx(i => (i + 1) % fallbackMessages.length), 2500)
    return () => clearInterval(timer)
  }, [processingText, text, fallbackMessages.length])

  const effectiveText = processingText || text
  const displayText = effectiveText || fallbackMessages[fallbackIdx]
  const dots = '.'.repeat(dotCount)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/50 px-5 py-4">
      <div className="flex gap-1">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-muted-foreground transition-all duration-300">
        {displayText}{dots}
      </span>
    </div>
  )
}
