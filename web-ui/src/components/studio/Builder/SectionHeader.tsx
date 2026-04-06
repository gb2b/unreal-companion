import type { SectionStatus } from '@/types/studio'

interface SectionHeaderProps {
  name: string
  status: SectionStatus
  isActive: boolean
  isExpanded: boolean
  stepCount: number
  onClick: () => void
}

function statusIcon(status: SectionStatus, isActive: boolean): { icon: string; color: string } {
  if (isActive) return { icon: '●', color: 'text-primary' }
  switch (status) {
    case 'complete': return { icon: '✓', color: 'text-accent' }
    case 'in_progress': return { icon: '●', color: 'text-yellow-500' }
    case 'todo': return { icon: '⊘', color: 'text-orange-400' }
    default: return { icon: '○', color: 'text-muted-foreground/40' }
  }
}

export function SectionHeader({ name, status, isActive, isExpanded, stepCount, onClick }: SectionHeaderProps) {
  const { icon, color } = statusIcon(status, isActive)

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <span className={`text-[10px] ${color}`}>{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {stepCount > 0 && (
        <span className="text-[10px] text-muted-foreground/50">
          {isExpanded ? '▾' : '▸'} {stepCount}
        </span>
      )}
    </button>
  )
}
