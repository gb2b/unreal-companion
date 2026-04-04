import { useState, useCallback } from 'react'

interface InputBarProps {
  onSend: (message: string) => void
  onSkip: () => void
  isStreaming: boolean
  activeSection?: string | null
}

export function InputBar({ onSend, onSkip, isStreaming, activeSection }: InputBarProps) {
  const [text, setText] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setText('')
  }, [text, isStreaming, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="border-t border-border/30 bg-background px-4 py-3">
      {activeSection && (
        <div className="mb-2 text-xs text-muted-foreground">
          Working on: <span className="font-medium text-foreground">{activeSection}</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
          disabled={isStreaming}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border/50 bg-card px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={onSkip}
          disabled={isStreaming}
          className="shrink-0 rounded-lg border border-border/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={handleSend}
          disabled={isStreaming || !text.trim()}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
