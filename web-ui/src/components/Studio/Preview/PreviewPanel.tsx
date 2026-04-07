import { useState, useRef, useEffect } from 'react'
import { DocumentPreview } from './DocumentPreview'
import { SelectionPrompt } from './SelectionPrompt'
import { SectionDiff } from './SectionDiff'
import { AssetsPanel } from './AssetsPanel'
import { ContextPanel } from './ContextPanel'
import type { WorkflowSection, SectionStatus, Prototype, SectionVersion } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

type PreviewTab = 'document' | 'assets' | 'context'

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
  const { language } = useI18n()
  const [activeTab, setActiveTab] = useState<PreviewTab>('document')
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
  const prevCountsRef = useRef<Record<string, number>>({})
  const previewRef = useRef<HTMLDivElement>(null)

  const latestPrototype = prototypes.length > 0 ? prototypes[prototypes.length - 1] : null
  const hasPrototype = latestPrototype !== null

  // Fetch version counts in a single batch call — auto-show diff on new versions
  useEffect(() => {
    if (!projectPath || !documentId || activeTab !== 'document') return
    const fetchCounts = async () => {
      try {
        const resp = await fetch(
          `/api/v2/studio/documents/${encodeURIComponent(documentId)}/section-version-counts?project_path=${encodeURIComponent(projectPath)}`
        )
        if (!resp.ok) return
        const counts: Record<string, number> = await resp.json()

        // Auto-show diff if a section got a new version (count increased)
        const prev = prevCountsRef.current
        for (const [sid, count] of Object.entries(counts)) {
          if (count > 1 && (prev[sid] ?? 0) < count) {
            try {
              const vResp = await fetch(
                `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${sid}/versions?project_path=${encodeURIComponent(projectPath)}`
              )
              if (vResp.ok) {
                const versions = await vResp.json()
                setVersionState({ sectionId: sid, versions })
              }
            } catch { /* ignore */ }
            break
          }
        }

        prevCountsRef.current = counts
        setSectionVersionCounts(counts)
      } catch { /* ignore */ }
    }
    fetchCounts()
  }, [sectionStatuses, projectPath, documentId, activeTab])

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

  const tabs: { id: PreviewTab; label: string; icon: string }[] = [
    { id: 'document', label: language === 'fr' ? 'Document' : 'Document', icon: '📄' },
    { id: 'assets', label: language === 'fr' ? 'Assets' : 'Assets', icon: '📎' },
    { id: 'context', label: language === 'fr' ? 'Contexte' : 'Context', icon: '🧠' },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border/30 px-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-[10px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        {/* Prototype button — only in document tab */}
        {activeTab === 'document' && hasPrototype && (
          <button
            onClick={() => setViewingPrototype(!viewingPrototype)}
            className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            {viewingPrototype ? '← Doc' : '🎮'}
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden relative" ref={previewRef}>
        {activeTab === 'document' && (
          <>
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

            {selectionState && (
              <SelectionPrompt
                selectedText={selectionState.selectedText}
                sectionId={selectionState.sectionId}
                position={selectionState.position}
                onSubmit={handleEditSubmit}
                onCancel={() => setSelectionState(null)}
              />
            )}

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
          </>
        )}

        {activeTab === 'assets' && (
          <div className="h-full overflow-y-auto">
            <AssetsPanel projectPath={projectPath} documentId={documentId} />
          </div>
        )}

        {activeTab === 'context' && (
          <div className="h-full overflow-y-auto">
            <ContextPanel projectPath={projectPath} />
          </div>
        )}
      </div>
    </div>
  )
}
