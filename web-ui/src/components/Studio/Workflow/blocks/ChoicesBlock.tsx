import { useState, useEffect } from 'react'
import type { ChoicesData } from '@/types/interactions'

interface ChoicesBlockProps {
  data: ChoicesData
  onSelect: (selectedIds: string[]) => void
  onAction?: (action: string) => void
  disabled?: boolean
}

export function ChoicesBlock({ data, onSelect, onAction, disabled = false }: ChoicesBlockProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const isMulti = data.multi ?? false

  const toggleChoice = (option: { id: string; action?: string }) => {
    if (disabled) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(option.id)) {
        next.delete(option.id)
      } else {
        if (!isMulti) next.clear()
        next.add(option.id)
      }
      return next
    })
    // Fire action if the option has one
    if (option.action && onAction) {
      onAction(option.action)
    }
  }

  // Notify parent whenever selection changes
  useEffect(() => {
    onSelect(Array.from(selected))
  }, [selected])

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.options.map(option => {
          const isSelected = selected.has(option.id)
          return (
            <button
              key={option.id}
              disabled={disabled}
              onClick={() => toggleChoice(option)}
              className={`relative rounded-lg border px-4 py-3 text-left transition-all disabled:opacity-50 ${
                isSelected
                  ? 'border-primary/60 bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border/50 bg-card hover:border-primary/30 hover:bg-primary/[0.02]'
              }`}
            >
              {isSelected && (
                <span className="absolute right-2 top-2 text-xs text-accent font-bold">✓</span>
              )}
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              {option.description && (
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
              )}
            </button>
          )
        })}
      </div>
      {isMulti && (
        <p className="text-xs text-muted-foreground/60">
          Select one or more options
        </p>
      )}
    </div>
  )
}
