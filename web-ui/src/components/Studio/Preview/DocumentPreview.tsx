// web-ui/src/components/Studio/Preview/DocumentPreview.tsx
import type { WorkflowSection, SectionStatus } from '@/types/studio'

interface DocumentPreviewProps {
  documentContent: string
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  onSectionClick: (sectionId: string) => void
}

function statusBadge(status: SectionStatus): string {
  switch (status) {
    case 'complete': return 'text-green-400'
    case 'in_progress': return 'text-yellow-400'
    case 'todo': return 'text-orange-400'
    default: return 'text-muted-foreground/50'
  }
}

export function DocumentPreview({ sections, sectionStatuses, onSectionClick }: DocumentPreviewProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold text-foreground">Document</h3>
      <div className="flex flex-col gap-2">
        {sections.map(section => {
          const status = sectionStatuses[section.id] || 'empty'
          return (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className="flex items-start gap-2 rounded-md p-2 text-left transition-colors hover:bg-muted"
            >
              <span className={`mt-0.5 text-sm ${statusBadge(status)}`}>
                {status === 'complete' ? '\u2713' : status === 'in_progress' ? '\u25CB' : '\u2014'}
              </span>
              <div>
                <span className="text-sm font-medium text-foreground">{section.name}</span>
                {status === 'todo' && (
                  <span className="ml-2 text-xs text-orange-400">[TODO]</span>
                )}
                {status === 'empty' && (
                  <p className="text-xs text-muted-foreground">[To be completed]</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
