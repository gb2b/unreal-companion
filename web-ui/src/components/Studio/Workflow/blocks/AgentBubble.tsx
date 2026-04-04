import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AgentBubbleProps {
  content: string
  agentName?: string
  agentEmoji?: string
}

export function AgentBubble({ content, agentName = 'Agent', agentEmoji = '🤖' }: AgentBubbleProps) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm">
        {agentEmoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold text-primary">
          {agentEmoji} {agentName}
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-foreground [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-primary/90 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
