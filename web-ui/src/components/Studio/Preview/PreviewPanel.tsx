// web-ui/src/components/Studio/Preview/PreviewPanel.tsx
import { useState } from 'react'
import { DocumentPreview } from './DocumentPreview'
import { DocGraph } from './DocGraph'
import { PrototypeViewer } from './PrototypeViewer'
import type { WorkflowSection, SectionStatus, StudioDocument, Prototype } from '@/types/studio'

type PreviewTab = 'document' | 'graph' | 'prototype'

interface PreviewPanelProps {
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  documentContent: string
  documents: StudioDocument[]
  prototypes: Prototype[]
  onSectionClick: (sectionId: string) => void
  onDocumentClick: (docId: string) => void
}

const TAB_LABELS: Record<PreviewTab, string> = {
  document: '\uD83D\uDCC4 Doc',
  graph: '\uD83D\uDDFA\uFE0F Graph',
  prototype: '\uD83C\uDFAE Proto',
}

export function PreviewPanel({
  sections,
  sectionStatuses,
  documentContent,
  documents,
  prototypes,
  onSectionClick,
  onDocumentClick,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('document')

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border/30">
        {(Object.keys(TAB_LABELS) as PreviewTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'document' && (
          <DocumentPreview
            documentContent={documentContent}
            sections={sections}
            sectionStatuses={sectionStatuses}
            onSectionClick={onSectionClick}
          />
        )}
        {activeTab === 'graph' && (
          <DocGraph documents={documents} onNodeClick={onDocumentClick} />
        )}
        {activeTab === 'prototype' && (
          <PrototypeViewer prototypes={prototypes} />
        )}
      </div>
    </div>
  )
}
