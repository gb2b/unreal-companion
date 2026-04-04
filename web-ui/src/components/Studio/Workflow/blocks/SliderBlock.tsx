import { useState } from 'react'
import type { SliderData } from '@/types/interactions'

interface SliderBlockProps {
  data: SliderData
  onSubmit: (value: number) => void
  disabled?: boolean
}

export function SliderBlock({ data, onSubmit, disabled = false }: SliderBlockProps) {
  const [value, setValue] = useState(data.default ?? data.min)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-4">
      <label className="text-sm font-medium text-foreground">{data.label}</label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={data.min}
          max={data.max}
          step={data.step}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          disabled={disabled}
          className="flex-1"
        />
        <span className="min-w-[3ch] text-right text-sm font-mono text-foreground">{value}</span>
      </div>
      <button
        onClick={() => onSubmit(value)}
        disabled={disabled}
        className="self-end rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Confirm
      </button>
    </div>
  )
}
