import type { WorkflowSection, SectionStatus } from '@/types/studio'

interface SectionBarProps {
  sections: WorkflowSection[]
  statuses: Record<string, SectionStatus>
  activeSection: string | null
  onSectionClick: (sectionId: string) => void
}

function statusIndicator(status: SectionStatus, isActive: boolean): string {
  if (isActive) return 'animate-pulse bg-primary'
  switch (status) {
    case 'complete': return 'bg-green-500'
    case 'in_progress': return 'bg-yellow-500'
    case 'todo': return 'bg-orange-400/60 ring-1 ring-orange-400/30'  // skipped visual
    case 'empty': return 'bg-muted-foreground/30'
    default: return 'bg-muted-foreground/30'
  }
}

export function SectionBar({ sections, statuses, activeSection, onSectionClick }: SectionBarProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border/30 px-4 py-2">
      {sections.map(section => {
        const status = statuses[section.id] || 'empty'
        const isActive = activeSection === section.id

        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${statusIndicator(status, isActive)}`} />
            {section.name}
          </button>
        )
      })}
    </div>
  )
}
