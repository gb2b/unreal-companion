import { useEffect, useState } from 'react'
import { api } from '@/services/api'

interface ProjectContextCardProps {
  projectPath: string
  onOpen: () => void
  documents: Array<{ id: string; name: string; meta: { status: string; tags?: string[] } }>
}

export function ProjectContextCard({ projectPath, onOpen, documents }: ProjectContextCardProps) {
  const [content, setContent] = useState('')
  const [updated, setUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (!projectPath) return
    api.get<{ content: string; updated: string | null }>(
      `/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`
    ).then(data => {
      setContent(data.content || '')
      setUpdated(data.updated || null)
    }).catch(() => {})
  }, [projectPath])

  const summary = content
    .split('\n')
    .map(l => l.replace(/^#+\s*/, '').trim())
    .find(l => l.length > 10) || ''

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const statusDot = (s: string) => {
    if (s === 'complete') return 'bg-accent'
    if (s === 'in_progress') return 'bg-primary'
    return 'bg-muted-foreground/30'
  }

  const workflowDocs = documents.filter(d => !(d.meta?.tags ?? []).includes('reference'))

  if (!content && documents.length === 0) return null

  return (
    <button
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-[10px] border border-[hsl(173_80%_50%/0.12)] bg-gradient-to-br from-[hsl(173_80%_50%/0.03)] via-card to-[hsl(160_84%_45%/0.02)] px-5 py-[18px] text-left transition-all hover:border-[hsl(173_80%_50%/0.25)] hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Glow */}
      <div className="absolute -top-10 -right-10 h-[120px] w-[120px] rounded-full bg-primary/[0.06] blur-[40px]" />

      {/* Arrow */}
      <span className="absolute top-[18px] right-5 text-base text-muted-foreground/35 transition-all group-hover:translate-x-[3px] group-hover:text-primary">
        ›
      </span>

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-2">
        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[15px]">
          🧠
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-none mb-[3px]">Project Memory</div>
          {updated && (
            <div className="text-[10px] text-muted-foreground/35">Updated {formatRelative(updated)} ago</div>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <p className="relative text-[12px] text-muted-foreground/60 leading-[1.5] mb-2.5 line-clamp-1">{summary}</p>
      )}

      {!content && (
        <p className="relative text-[11px] text-muted-foreground/35 italic mb-2.5">
          Memory will be created when an agent starts working.
        </p>
      )}

      {/* Doc pills */}
      {workflowDocs.length > 0 && (
        <div className="relative flex flex-wrap gap-1.5">
          {workflowDocs.slice(0, 5).map(doc => (
            <span
              key={doc.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(220_20%_10%)] border border-border px-2.5 py-[3px] text-[10px] text-muted-foreground"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot(doc.meta.status)}`} />
              {doc.name}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
