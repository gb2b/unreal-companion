// web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import type { StudioDocument } from '@/types/studio'

interface ProjectContextCardProps {
  projectPath: string
  onOpen: () => void
  documents: StudioDocument[]
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
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const statusIcon = (s: string) => {
    if (s === 'complete') return '✓'
    if (s === 'in_progress') return '◐'
    return '○'
  }

  if (!content && documents.length === 0) return null

  return (
    <button
      onClick={onOpen}
      className="mb-3 w-full rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">Project Context</span>
            {updated && (
              <span className="text-xs text-muted-foreground">{formatRelative(updated)}</span>
            )}
          </div>
          {summary && (
            <p className="text-xs text-muted-foreground mb-2 truncate">{summary}</p>
          )}
          {documents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {documents.filter(d => !(d.meta?.tags ?? []).includes('reference')).slice(0, 6).map(doc => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {statusIcon(doc.meta.status)} {doc.name}
                </span>
              ))}
            </div>
          )}
          {!content && (
            <p className="text-xs text-muted-foreground italic">
              No project context yet — it will be created when an agent starts working.
            </p>
          )}
        </div>
        <span className="text-xs text-primary font-medium whitespace-nowrap">Open →</span>
      </div>
    </button>
  )
}
