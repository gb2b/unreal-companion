import { useState } from 'react'
import type { RatingData } from '@/types/interactions'

interface RatingBlockProps {
  data: RatingData
  onSubmit: (value: number) => void
  disabled?: boolean
}

export function RatingBlock({ data, onSubmit, disabled = false }: RatingBlockProps) {
  const [hoveredStar, setHoveredStar] = useState(0)
  const [selected, setSelected] = useState(0)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-4">
      <label className="text-sm font-medium text-foreground">{data.label}</label>
      <div className="flex gap-1">
        {Array.from({ length: data.max }, (_, i) => i + 1).map(star => (
          <button
            key={star}
            disabled={disabled}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => {
              setSelected(star)
              onSubmit(star)
            }}
            className="text-2xl transition-transform hover:scale-110"
          >
            {star <= (hoveredStar || selected) ? '★' : '☆'}
          </button>
        ))}
      </div>
    </div>
  )
}
