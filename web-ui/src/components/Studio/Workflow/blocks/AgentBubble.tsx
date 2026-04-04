interface AgentBubbleProps {
  content: string
  agentName?: string
}

export function AgentBubble({ content, agentName = 'Agent' }: AgentBubbleProps) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {agentName.charAt(0).toUpperCase()}
      </div>
      <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}
