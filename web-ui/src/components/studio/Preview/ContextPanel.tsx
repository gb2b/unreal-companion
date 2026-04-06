import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
    // Poll every 5s to catch LLM updates
    const interval = setInterval(fetchContext, 5000)
    return () => clearInterval(interval)
  }, [projectPath])

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {language === 'fr' ? 'Contexte projet' : 'Project Context'}
        </h3>
        {lastUpdate && (
          <span className="text-[10px] text-muted-foreground/40">
            {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/50">
        {language === 'fr'
          ? "Mémoire vivante de l'agent — mise à jour automatiquement à chaque étape."
          : 'Living memory of the agent — automatically updated at each step.'}
      </p>

      {content ? (
        <div className="rounded-lg border border-border/30 bg-card/50 p-3 prose prose-xs prose-invert max-w-none text-muted-foreground [&_p]:my-1 [&_p]:text-xs [&_strong]:text-foreground/80 [&_ul]:my-1 [&_li]:text-xs">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/30 p-4 text-center">
          <p className="text-xs text-muted-foreground/40">
            {language === 'fr'
              ? "Le contexte sera créé quand l'agent commencera à travailler."
              : 'Context will be created when the agent starts working.'}
          </p>
        </div>
      )}
    </div>
  )
}
