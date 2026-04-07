import ReactMarkdown from 'react-markdown'
import { MermaidBlock } from '../Editor/MermaidBlock'
import remarkGfm from 'remark-gfm'

interface AgentPromptProps {
  content: string
  agentName: string
  agentEmoji: string
  isStreaming?: boolean
}

export function AgentPrompt({
  content,
  agentName,
  agentEmoji,
}: AgentPromptProps) {

  return (
    <div className="flex flex-col gap-3">
      {/* Agent header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-sm">
          {agentEmoji}
        </div>
        <span className="text-xs font-semibold text-primary">{agentName}</span>
      </div>

      {/* Content — always render markdown, even during streaming */}
      <div className="prose prose-sm prose-invert max-w-none text-foreground">
        {(
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0 text-sm leading-relaxed text-foreground">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 ml-4 list-disc space-y-1 text-sm text-foreground">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 ml-4 list-decimal space-y-1 text-sm text-foreground">{children}</ol>
              ),
              li: ({ children }) => <li className="text-sm text-foreground">{children}</li>,
              code: ({ className, children }) => {
                const match = /language-(\w+)/.exec(className || '')
                if (match && match[1] === 'mermaid') {
                  return <MermaidBlock code={String(children).replace(/\n$/, '')} />
                }
                return (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">
                    {children}
                  </code>
                )
              },
              h1: ({ children }) => (
                <h1 className="mb-2 text-base font-bold text-foreground">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 text-sm font-bold text-foreground">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 text-sm font-semibold text-foreground">{children}</h3>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
        {/* No cursor — the "Thinking..." indicator below the blocks is sufficient */}
      </div>
    </div>
  )
}
