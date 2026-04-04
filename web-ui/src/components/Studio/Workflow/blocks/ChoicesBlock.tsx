import type { ChoicesData } from '@/types/interactions'

interface ChoicesBlockProps {
  data: ChoicesData
  onSelect: (selectedIds: string[]) => void
  disabled?: boolean
}

export function ChoicesBlock({ data, onSelect, disabled = false }: ChoicesBlockProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {data.options.map(option => (
        <button
          key={option.id}
          disabled={disabled}
          onClick={() => onSelect([option.id])}
          className="rounded-lg border border-border/50 bg-card px-4 py-3 text-left transition-all hover:border-primary/50 hover:shadow-sm disabled:opacity-50"
        >
          <span className="text-sm font-medium text-foreground">{option.label}</span>
          {option.description && (
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
          )}
        </button>
      ))}
    </div>
  )
}
