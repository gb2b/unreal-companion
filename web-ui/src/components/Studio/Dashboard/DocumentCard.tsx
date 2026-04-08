// web-ui/src/components/Studio/Dashboard/DocumentCard.tsx
import { useNavigate } from 'react-router-dom'
import { DocumentActionMenu } from './DocumentActionMenu'
import type { StudioDocument } from '@/types/studio'

interface DocumentCardProps {
  document: StudioDocument
  onClick: (docId: string) => void
  projectPath?: string
  onRenamed?: () => void
  onDeleted?: () => void
  onManageTags?: (docId: string) => void
  isLastWorked?: boolean
  onContinue?: () => void
}

const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'game-brief': 'Identity, vision, pillars, audience, scope',
  'gdd': 'Detailed game design — mechanics and systems',
  'brainstorming': 'Creative ideation and concept exploration',
  'game-architecture': 'Technical architecture and system design',
  'sprint-planning': 'Sprint planning and task breakdown',
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
  if (diffD < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[d.getDay()]
  }
  return `${diffD} days ago`
}

/**
 * Simple markdown preview renderer — no full parser, just key patterns.
 * Returns an array of React-renderable spans.
 */
function renderPreviewContent(text: string): React.ReactNode[] {
  const preview = text.slice(0, 300)
  const lines = preview.split('\n')
  const result: React.ReactNode[] = []

  lines.forEach((line, i) => {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      result.push(
        <span key={i} className="text-primary font-semibold">{line}{'\n'}</span>
      )
    } else {
      // Replace **text** with bold spans
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={j} className="text-muted-foreground font-semibold">
              {part.slice(2, -2)}
            </span>
          )
        }
        return part
      })
      result.push(<span key={i}>{rendered}{'\n'}</span>)
    }
  })

  return result
}

export function DocumentCard({
  document: doc,
  onClick,
  projectPath = '',
  onRenamed,
  onDeleted,
  onManageTags,
  isLastWorked = false,
  onContinue,
}: DocumentCardProps) {
  const navigate = useNavigate()
  const ratio = completionRatio(doc)
  const tags = doc.meta.tags || []
  const isReference = tags.includes('reference')
  const status = doc.meta.status
  const hasContent = !isReference && doc.content && doc.content.trim().length > 0

  // Determine left border color
  const borderAccent =
    status === 'in_progress'
      ? 'border-l-[3px] border-l-primary'
      : status === 'complete'
        ? 'border-l-[3px] border-l-accent'
        : ''

  // Category: first non-reference tag or workflow_id
  const category = tags.find(t => t !== 'reference') ?? doc.meta.workflow_id ?? ''

  function handleContinueClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (onContinue) {
      onContinue()
    } else {
      navigate(`/studio/build/${encodeURIComponent(doc.meta.workflow_id)}`)
    }
  }

  const description =
    (doc.meta.workflow_id && WORKFLOW_DESCRIPTIONS[doc.meta.workflow_id]) ||
    doc.meta.summary ||
    ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(doc.id)}
      onKeyDown={e => e.key === 'Enter' && onClick(doc.id)}
      className={`relative rounded-[10px] border border-border bg-card cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-card/90 ${borderAccent}`}
    >
      {/* "Last worked on" badge */}
      {isLastWorked && (
        <span className="absolute top-2 right-2 z-10 text-[9px] font-semibold px-2 py-0.5 rounded bg-[hsl(173_80%_50%/0.15)] text-primary backdrop-blur-[4px] border border-[hsl(173_80%_50%/0.2)]">
          ● Last worked on
        </span>
      )}

      {/* Preview zone */}
      <div
        className="relative h-[100px] px-3.5 py-2.5 overflow-hidden border-b border-border rounded-t-[10px]"
        style={{ background: 'hsl(220 20% 5%)' }}
      >
        {hasContent ? (
          <>
            <pre className="text-[9px] leading-[1.5] text-dim font-mono whitespace-pre-wrap overflow-hidden">
              {renderPreviewContent(doc.content!)}
            </pre>
            {/* Gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-[10px] text-dim opacity-40">No content yet</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-3">
        {/* Top row: status badge + continue button + menu */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              status === 'in_progress'
                ? 'bg-primary/10 text-primary'
                : status === 'complete'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-muted text-dim'
            }`}
          >
            {status === 'in_progress' && ratio
              ? ratio
              : status === 'complete'
                ? 'Done'
                : 'Empty'}
          </span>

          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {status === 'in_progress' && (
              <button
                onClick={handleContinueClick}
                className="text-[10px] font-semibold text-primary bg-primary/[0.08] border border-primary/20 px-2.5 py-0.5 rounded-md transition-colors hover:bg-primary/[0.15]"
              >
                Continue ›
              </button>
            )}
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
        </div>

        {/* Doc name */}
        <div className="text-[13px] font-semibold text-foreground leading-snug mb-0.5">
          {doc.name}
        </div>

        {/* Description */}
        {description && (
          <div className="text-[11px] text-muted-foreground leading-[1.4] mb-2 line-clamp-1">
            {description}
          </div>
        )}

        {/* Footer: category pill + date */}
        <div className="flex items-center justify-between text-[10px] text-dim mt-2">
          {category ? (
            <span
              className="text-[9px] uppercase tracking-[0.06em] text-dim bg-border px-1.5 py-0.5 rounded-[3px]"
            >
              {category}
            </span>
          ) : (
            <span />
          )}
          <span>{formatDate(doc.meta.updated)}</span>
        </div>
      </div>
    </div>
  )
}
