interface ProcessingStateProps {
  text: string
  agentName: string
  agentEmoji: string
}

export function ProcessingState({ text, agentName, agentEmoji }: ProcessingStateProps) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm">
          {agentEmoji}
        </div>
        <span className="text-sm font-medium text-foreground">
          {agentName} is working...
        </span>
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-1.5">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-primary"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-primary"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-primary"
          style={{ animationDelay: '300ms' }}
        />
      </div>

      {/* Processing text */}
      {(text || 'Thinking...') && (
        <p className="mt-3 text-xs text-muted-foreground">
          {text || 'Thinking...'}
        </p>
      )}
    </div>
  )
}
