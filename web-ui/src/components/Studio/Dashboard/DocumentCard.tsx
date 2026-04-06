// web-ui/src/components/Studio/Dashboard/DocumentCard.tsx
import { DocumentActionMenu } from './DocumentActionMenu'
import type { StudioDocument } from '@/types/studio'

interface DocumentCardProps {
  document: StudioDocument
  onClick: (docId: string) => void
  projectPath?: string
  onRenamed?: () => void
  onDeleted?: () => void
  onManageTags?: (docId: string) => void
}

function getFileTypeIcon(tags: string[]): string {
  if (tags.includes('image')) return '🖼️'
  if (tags.includes('asset-3d')) return '📦'
  return '📄'
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const AGENT_EMOJI: Record<string, string> = {
  'game-designer': '🎲',
  'game-architect': '🏗️',
  'game-dev': '💻',
  'solo-dev': '⚡',
  'level-designer': '🗺️',
  '3d-artist': '🎨',
  'game-qa': '🔍',
  'scrum-master': '📋',
  'unreal-agent': '🎮',
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

export function DocumentCard({
  document: doc,
  onClick,
  projectPath = '',
  onRenamed,
  onDeleted,
  onManageTags,
}: DocumentCardProps) {
  const ratio = completionRatio(doc)
  const agentEmoji = AGENT_EMOJI[doc.meta.agent] || '🤖'
  const tags = doc.meta.tags || []
  const isReference = tags.includes('reference')
  const isImage = tags.includes('image')
  const visibleTags = tags.slice(0, 3)
  const extraCount = tags.length - visibleTags.length

  return (
    <button
      onClick={() => onClick(doc.id)}
      className="relative flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/5"
    >
      {/* Header row: status badge or file icon + menu */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {isReference
            ? getFileTypeIcon(tags)
            : doc.meta.status === 'complete'
              ? 'Done'
              : doc.meta.status === 'in_progress'
                ? ratio
                : 'Empty'}
        </span>
        {projectPath && !isReference && (
          <DocumentActionMenu
            docId={doc.id}
            workflowId={doc.meta.workflow_id}
            projectPath={projectPath}
            onDeleted={onDeleted ?? (() => {})}
            onRenamed={onRenamed ?? (() => {})}
            onManageTags={onManageTags ? () => onManageTags(doc.id) : undefined}
          />
        )}
      </div>

      {/* Image thumbnail for reference images */}
      {isImage && (
        <div className="aspect-video overflow-hidden rounded-md bg-muted/30">
          <img
            src={`/api/v2/studio/references/${encodeURIComponent(doc.name)}`}
            alt={doc.name}
            className="h-full w-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground">{doc.name}</h3>

      {/* Summary (markdown docs only) */}
      {!isReference && doc.meta.summary && (
        <p className="text-xs text-muted-foreground line-clamp-1">{doc.meta.summary}</p>
      )}

      {/* Tag pills */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map(tag => (
            <span
              key={tag}
              className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {extraCount > 0 && (
            <span className="text-[10px] text-muted-foreground">+{extraCount}</span>
          )}
        </div>
      )}

      {/* Footer: file size for references, agent emoji for docs */}
      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        {isReference ? (
          <span>{formatBytes(doc.meta.size_bytes)}</span>
        ) : (
          <span title={doc.meta.agent}>{agentEmoji}</span>
        )}
        <span>{formatDate(doc.meta.updated)}</span>
      </div>
    </button>
  )
}
