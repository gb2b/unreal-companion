// web-ui/src/components/Studio/Preview/PreviewPanel.tsx
import { useState } from 'react'
import { DocumentPreview } from './DocumentPreview'
import type { WorkflowSection, SectionStatus, Prototype } from '@/types/studio'

interface PreviewPanelProps {
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  sectionContents?: Record<string, string>
  documentContent: string
  documents: unknown[]
  prototypes: Prototype[]
  onSectionClick: (sectionId: string) => void
  onDocumentClick: (docId: string) => void
}

export function PreviewPanel({
  sections,
  sectionStatuses,
  sectionContents,
  documentContent,
  prototypes,
  onSectionClick,
}: PreviewPanelProps) {
  const [viewingPrototype, setViewingPrototype] = useState(false)

  // Always use the latest prototype
  const latestPrototype = prototypes.length > 0 ? prototypes[prototypes.length - 1] : null
  const hasPrototype = latestPrototype !== null

  return (
    <div className="flex h-full flex-col">
      {/* Header bar — show View Prototype button when one is available */}
      {hasPrototype && (
        <div className="flex items-center justify-between border-b border-border/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">
            {viewingPrototype ? latestPrototype!.title : '📄 Document'}
          </span>
          {viewingPrototype ? (
            <button
              onClick={() => setViewingPrototype(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Document
            </button>
          ) : (
            <button
              onClick={() => setViewingPrototype(true)}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              🎮 View Prototype
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewingPrototype && latestPrototype ? (
          <iframe
            srcDoc={latestPrototype.html}
            title={latestPrototype.title}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <DocumentPreview
              documentContent={documentContent}
              sections={sections}
              sectionStatuses={sectionStatuses}
              sectionContents={sectionContents}
              onSectionClick={onSectionClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
