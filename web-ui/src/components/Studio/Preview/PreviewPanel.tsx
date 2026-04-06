// web-ui/src/components/Studio/Preview/PreviewPanel.tsx
import { useState, useRef, useEffect } from 'react'
import { DocumentPreview } from './DocumentPreview'
import { SelectionPrompt } from './SelectionPrompt'
import { SectionDiff } from './SectionDiff'
import type { WorkflowSection, SectionStatus, Prototype, SectionVersion } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

interface PreviewPanelProps {
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  sectionContents?: Record<string, string>
  documentContent: string
  documents: unknown[]
  prototypes: Prototype[]
  onSectionClick: (sectionId: string) => void
  onDocumentClick: (docId: string) => void
  projectPath?: string
  documentId?: string
  onEditRequest?: (sectionId: string, selectedText: string, prompt: string) => void
}

export function PreviewPanel({
  sections,
  sectionStatuses,
  sectionContents,
  documentContent,
  prototypes,
  onSectionClick,
  projectPath,
  documentId,
  onEditRequest,
}: PreviewPanelProps) {
  const { language: _language } = useI18n()
  const [viewingPrototype, setViewingPrototype] = useState(false)
  const [selectionState, setSelectionState] = useState<{
    sectionId: string
    selectedText: string
    position: { top: number; left: number }
  } | null>(null)
  const [versionState, setVersionState] = useState<{
    sectionId: string
    versions: SectionVersion[]
  } | null>(null)
  const [sectionVersionCounts, setSectionVersionCounts] = useState<Record<string, number>>({})
  const previewRef = useRef<HTMLDivElement>(null)

  const latestPrototype = prototypes.length > 0 ? prototypes[prototypes.length - 1] : null
  const hasPrototype = latestPrototype !== null

  // Fetch version counts when sectionStatuses change
  useEffect(() => {
    if (!projectPath || !documentId) return
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      for (const section of sections) {
        try {
          const resp = await fetch(
            `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${section.id}/versions?project_path=${encodeURIComponent(projectPath)}`
          )
          if (resp.ok) {
            const versions = await resp.json()
            counts[section.id] = versions.length
          }
        } catch { /* ignore */ }
      }
      setSectionVersionCounts(counts)
    }
    fetchCounts()
  }, [sectionStatuses, projectPath, documentId, sections])

  const handleTextSelect = (sectionId: string, selectedText: string, rect: DOMRect) => {
    if (!previewRef.current) return
    const containerRect = previewRef.current.getBoundingClientRect()
    setSelectionState({
      sectionId,
      selectedText,
      position: {
        top: rect.bottom - containerRect.top + 4,
        left: Math.min(rect.left - containerRect.left, containerRect.width - 288),
      },
    })
  }

  const handleEditSubmit = (sectionId: string, selectedText: string, prompt: string) => {
    onEditRequest?.(sectionId, selectedText, prompt)
    setSelectionState(null)
  }

  const handleShowVersions = async (sectionId: string) => {
    if (!projectPath || !documentId) return
    try {
      const resp = await fetch(
        `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${sectionId}/versions?project_path=${encodeURIComponent(projectPath)}`
      )
      if (resp.ok) {
        const versions = await resp.json()
        setVersionState({ sectionId, versions })
      }
    } catch { /* ignore */ }
  }

  const handleRollback = async (version: number) => {
    if (!versionState || !projectPath || !documentId) return
    try {
      await fetch(
        `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${versionState.sectionId}/rollback/${version}?project_path=${encodeURIComponent(projectPath)}`,
        { method: 'POST' }
      )
      setVersionState(null)
    } catch { /* ignore */ }
  }

  return (
    <div className="flex h-full flex-col">
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

      <div className="flex-1 overflow-hidden relative" ref={previewRef}>
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
              onTextSelect={handleTextSelect}
              sectionVersionCounts={sectionVersionCounts}
              onShowVersions={handleShowVersions}
            />
          </div>
        )}

        {/* Floating selection prompt */}
        {selectionState && (
          <SelectionPrompt
            selectedText={selectionState.selectedText}
            sectionId={selectionState.sectionId}
            position={selectionState.position}
            onSubmit={handleEditSubmit}
            onCancel={() => setSelectionState(null)}
          />
        )}

        {/* Version diff overlay */}
        {versionState && (
          <div className="absolute bottom-2 left-2 right-2 z-40">
            <SectionDiff
              versions={versionState.versions}
              currentVersion={versionState.versions.length}
              onRollback={handleRollback}
              onClose={() => setVersionState(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
