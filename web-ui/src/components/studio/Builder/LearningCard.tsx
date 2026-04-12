import { useState } from 'react'

interface LearningCardProps {
  term: string
  explanation: string
  examples: Array<{ game: string; how: string }>
  category?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  design: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  production: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  technical: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  art: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  audio: 'bg-green-500/20 text-green-300 border-green-500/30',
  narrative: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

export function LearningCard({ term, explanation, examples, category = 'design' }: LearningCardProps) {
  const [expanded, setExpanded] = useState(true)
  const categoryStyle = CATEGORY_COLORS[category] || CATEGORY_COLORS.design

  return (
    <div className="my-2 rounded-lg border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-violet-500/10"
      >
        <span className="text-sm">🎓</span>
        <span className="flex-1 text-xs font-semibold text-violet-200">{term}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${categoryStyle}`}>
          {category}
        </span>
        <span className="text-[10px] text-muted-foreground/40">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-violet-500/10 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-foreground/70 mb-2">
            {explanation}
          </p>

          {examples.length > 0 && (
            <div className="space-y-1">
              {examples.map((ex, i) => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="font-semibold text-violet-300 shrink-0">
                    {ex.game}
                  </span>
                  <span className="text-muted-foreground/60">
                    {ex.how}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
