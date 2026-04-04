// web-ui/src/components/Studio/Dashboard/DocumentCard.tsx
import type { StudioDocument } from '@/types/studio'

interface DocumentCardProps {
  document: StudioDocument
  onClick: (docId: string) => void
}

function completionRatio(doc: StudioDocument): string {
  const sections = Object.values(doc.meta.sections)
  if (sections.length === 0) return ''
  const done = sections.filter(s => s.status === 'complete').length
  return `${done}/${sections.length}`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'yesterday'
  return `${diffD} days ago`
}

export function DocumentCard({ document: doc, onClick }: DocumentCardProps) {
  const ratio = completionRatio(doc)

  return (
    <button
      onClick={() => onClick(doc.id)}
      className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {doc.meta.status === 'complete' ? 'Done' : doc.meta.status === 'in_progress' ? ratio : 'Empty'}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{doc.name}</h3>
      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>{doc.meta.agent || 'No agent'}</span>
        <span>{formatDate(doc.meta.updated)}</span>
      </div>
    </button>
  )
}
