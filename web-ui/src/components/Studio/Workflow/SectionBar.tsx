import type { WorkflowSection, SectionStatus } from '@/types/studio'

interface SectionBarProps {
  sections: WorkflowSection[]
  statuses: Record<string, SectionStatus>
  activeSection: string | null
  onSectionClick: (sectionId: string) => void
  displayNames?: Record<string, string>
}

const SECTION_TOOLTIPS: Record<string, string> = {
  identity: 'Game name, genre, tagline, and platform',
  vision: 'The core experience players will feel',
  pillars: '3-5 guiding principles for every design decision',
  references: 'Games, media, and art that inspire your project',
  audience: 'Who will play your game and why',
  scope: 'Platform, team size, timeline, and MVP scope',
  review: 'Review and finalize the complete document',
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

export function SectionBar({ sections, statuses, activeSection, onSectionClick, displayNames }: SectionBarProps) {
  return (
    <div data-tour="section-bar" className="flex gap-1 overflow-x-auto border-b border-border/30 px-4 py-2">
      {sections.map(section => {
        const status = statuses[section.id] || 'empty'
        const isActive = activeSection === section.id
        const label = displayNames?.[section.id] || section.name

        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            title={SECTION_TOOLTIPS[section.id] || section.name}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              isActive
                ? 'bg-primary/10 text-primary section-pulse'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${statusIndicator(status, isActive)}`} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
