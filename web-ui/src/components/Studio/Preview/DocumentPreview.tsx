// web-ui/src/components/Studio/Preview/DocumentPreview.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { WorkflowSection, SectionStatus } from '@/types/studio'

interface DocumentPreviewProps {
  documentContent: string
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  sectionContents?: Record<string, string>
  onSectionClick: (sectionId: string) => void
}

function statusIcon(status: SectionStatus): { icon: string; color: string } {
  switch (status) {
    case 'complete': return { icon: '✓', color: 'text-accent' }
    case 'in_progress': return { icon: '●', color: 'text-primary' }
    case 'todo': return { icon: '○', color: 'text-orange-400' }
    default: return { icon: '—', color: 'text-muted-foreground/30' }
  }
}

export function DocumentPreview({
  sections,
  sectionStatuses,
  sectionContents = {},
  onSectionClick,
}: DocumentPreviewProps) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Document</h3>

      {sections.map(section => {
        const status = sectionStatuses[section.id] || 'empty'
        const content = sectionContents[section.id]
        const { icon, color } = statusIcon(status)
        const hasContent = !!content?.trim()

        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`flex flex-col gap-1 rounded-lg p-2.5 text-left transition-all hover:bg-muted/50 ${
              status === 'in_progress' ? 'bg-primary/5 border-l-2 border-primary' :
              status === 'complete' ? 'border-l-2 border-accent/50' :
              ''
            }`}
          >
            {/* Section header */}
            <div className="flex items-center gap-2">
              <span className={`text-xs ${color}`}>{icon}</span>
              <span className="text-sm font-medium text-foreground">{section.name}</span>
              {status === 'todo' && (
                <span className="text-[10px] text-orange-400">[TODO]</span>
              )}
            </div>

            {/* Section content — rendered as markdown */}
            {hasContent && (
              <div className="ml-5 prose prose-xs prose-invert max-w-none text-muted-foreground [&_p]:my-0.5 [&_p]:text-xs [&_p]:leading-relaxed [&_strong]:text-foreground/80 [&_ul]:my-0.5 [&_li]:text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content!.length > 300 ? content!.slice(0, 297) + '...' : content!}
                </ReactMarkdown>
              </div>
            )}

            {/* Empty state */}
            {!hasContent && status === 'empty' && (
              <span className="ml-5 text-[10px] text-muted-foreground/40">[To be completed]</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
