// web-ui/src/components/Studio/Preview/PrototypeViewer.tsx
import { useState } from 'react'
import type { Prototype } from '@/types/studio'

interface PrototypeViewerProps {
  prototypes: Prototype[]
}

export function PrototypeViewer({ prototypes }: PrototypeViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (prototypes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">No prototypes yet. They will appear here when the agent generates them.</p>
      </div>
    )
  }

  const active = prototypes[activeIndex]

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      {prototypes.length > 1 && (
        <div className="flex gap-1 border-b border-border/30 px-2 py-1">
          {prototypes.map((proto, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                i === activeIndex ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {proto.title}
            </button>
          ))}
        </div>
      )}
      {/* Iframe */}
      <iframe
        srcDoc={active.html}
        sandbox="allow-scripts"
        className="flex-1 border-none"
        title={active.title}
      />
    </div>
  )
}
