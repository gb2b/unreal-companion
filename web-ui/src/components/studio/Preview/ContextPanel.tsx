import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MermaidBlock } from '../Editor/MermaidBlock'
import { useI18n } from '@/i18n/useI18n'

interface ContextPanelProps {
  projectPath?: string
}

export function ContextPanel({ projectPath }: ContextPanelProps) {
  const { language } = useI18n()
  const [content, setContent] = useState('')
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    if (!projectPath) return
    const fetchContext = async () => {
      try {
        const resp = await fetch(`/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`)
        if (resp.ok) {
          const data = await resp.json()
          setContent(data.content || '')
          setLastUpdate(data.updated || null)
        }
      } catch { /* ignore */ }
    }
    fetchContext()
    const interval = setInterval(fetchContext, 5000)
    return () => clearInterval(interval)
  }, [projectPath])

  return (
    <div className="flex h-full flex-col">
      {/* Header — visually distinct from Document tab */}
      <div className="shrink-0 border-b border-primary/10 bg-primary/[0.03] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" />
            <span className="text-xs font-semibold text-primary/80">
              {language === 'fr' ? 'Memoire projet' : 'Project Memory'}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-[10px] text-muted-foreground/40">
              {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground/50 leading-relaxed">
          {language === 'fr'
            ? "Vue d'ensemble du projet — se met a jour automatiquement avec chaque document integre."
            : 'Project overview — automatically updated with every integrated document.'}
        </p>
      </div>

      {/* Content */}
      {content ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <article className="md-preview md-preview-compact md-preview-context">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  if (match && match[1] === 'mermaid') {
                    return <MermaidBlock code={String(children).replace(/\n$/, '')} />
                  }
                  return <code className={className} {...props}>{children}</code>
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <span className="text-3xl opacity-20 mb-2 block">&#x1f9e0;</span>
            <p className="text-xs text-muted-foreground/40">
              {language === 'fr'
                ? "La memoire projet sera creee quand l'agent commencera a travailler."
                : 'Project memory will be created when the agent starts working.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
