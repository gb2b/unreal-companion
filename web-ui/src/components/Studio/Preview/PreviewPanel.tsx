import { useState, useRef, useEffect } from 'react'
import { Eye, PenLine } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MermaidBlock } from '../Editor/MermaidBlock'
import { MarkdownEditor } from '../Editor/MarkdownEditor'
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
  documentName?: string
  onDocumentRenamed?: (newName: string) => void
}

export function PreviewPanel({
  sections,
  sectionStatuses,
  sectionContents,
  prototypes,
  onSectionClick: _onSectionClick,
  projectPath,
  documentId,
  onEditRequest,
  documentName,
  onDocumentRenamed,
}: PreviewPanelProps) {
  const { language } = useI18n()
  const [activeTab, setActiveTab] = useState<PreviewTab>('document')
  const [docMode, setDocMode] = useState<'preview' | 'editor'>('preview')
  const [contextMode, setContextMode] = useState<'preview' | 'editor'>('preview')
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
  const [_sectionVersionCounts, setSectionVersionCounts] = useState<Record<string, number>>({})
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

  const handleEditSubmit = (sectionId: string, selectedText: string, prompt: string) => {
    onEditRequest?.(sectionId, selectedText, prompt)
    setSelectionState(null)
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

        {/* Sub-toggle for document/context tabs */}
        {(activeTab === 'document' || activeTab === 'context') && (() => {
          const mode = activeTab === 'document' ? docMode : contextMode
          const setMode = activeTab === 'document' ? setDocMode : setContextMode
          return (
            <div className="ml-auto flex items-center gap-1">
              <div className="flex items-center rounded-md border border-border/30 p-0.5">
                <button
                  onClick={() => setMode('preview')}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    mode === 'preview' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <button
                  onClick={() => setMode('editor')}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    mode === 'editor' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PenLine className="h-3 w-3" />
                  Editor
                </button>
              </div>
              {activeTab === 'document' && hasPrototype && (
                <button
                  onClick={() => setViewingPrototype(!viewingPrototype)}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {viewingPrototype ? '← Doc' : '🎮'}
                </button>
              )}
            </div>
          )
        })()}
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
            ) : docMode === 'preview' ? (
              <div className="h-full flex flex-col">
                {documentName && (
                  <EditableDocBanner
                    name={documentName}
                    documentId={documentId || ''}
                    projectPath={projectPath || ''}
                    onRenamed={onDocumentRenamed}
                  />
                )}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                <article className="md-preview md-preview-compact">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        if (match && match[1] === 'mermaid') {
                          return <MermaidBlock code={String(children).replace(/\n$/, '')} />
                        }
                        return <code className={className} {...props}>{children}</code>
                      },
                    }}
                  >
                    {buildFullMarkdown(sections, sectionContents || {}, sectionStatuses)}
                  </ReactMarkdown>
                </article>
                </div>
              </div>
            ) : (
              <div className="h-full">
                <InlineDocEditor
                  sections={sections}
                  sectionContents={sectionContents || {}}
                  sectionStatuses={sectionStatuses}
                  projectPath={projectPath || ''}
                  documentId={documentId || ''}
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
          contextMode === 'preview' ? (
            <div className="h-full overflow-y-auto">
              <ContextPanel projectPath={projectPath} />
            </div>
          ) : (
            <div className="h-full">
              <InlineContextEditor projectPath={projectPath || ''} />
            </div>
          )
        )}
      </div>
    </div>
  )
}


/** Build full markdown from section contents for the preview. */
function buildFullMarkdown(
  sections: WorkflowSection[],
  sectionContents: Record<string, string>,
  sectionStatuses: Record<string, SectionStatus>,
): string {
  const parts: string[] = []
  for (const section of sections) {
    const content = sectionContents[section.id]
    const status = sectionStatuses[section.id] || 'empty'
    parts.push(`## ${section.name}`)
    if (content?.trim()) {
      parts.push(content)
    } else if (status === 'todo') {
      parts.push('*[Skipped]*')
    } else {
      parts.push('*[To be completed]*')
    }
    parts.push('')
  }
  return parts.join('\n\n')
}


/** Inline markdown editor for the document within the Builder. */
function InlineDocEditor({
  sections,
  sectionContents,
  sectionStatuses,
  projectPath,
  documentId,
}: {
  sections: WorkflowSection[]
  sectionContents: Record<string, string>
  sectionStatuses: Record<string, SectionStatus>
  projectPath: string
  documentId: string
}) {
  const fullMd = buildFullMarkdown(sections, sectionContents, sectionStatuses)
  const [content, setContent] = useState(fullMd)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync when sections update from the LLM
  useEffect(() => {
    setContent(buildFullMarkdown(sections, sectionContents, sectionStatuses))
  }, [sections, sectionContents, sectionStatuses])

  const handleSave = async () => {
    if (!projectPath || !documentId) return
    setSaving(true)
    try {
      await fetch(`/api/v2/studio/documents/${encodeURIComponent(documentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, project_path: projectPath }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/30 bg-card/40 px-3 py-1 text-xs text-muted-foreground">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
        </button>
        <span className="text-muted-foreground/50">Edit the document markdown directly</span>
      </div>
      <div className="flex-1 min-h-0">
        <MarkdownEditor content={content} onChange={setContent} placeholder="Document content..." editorOnly />
      </div>
    </div>
  )
}


/** Inline editor for project-context.md within the Builder. */
function InlineContextEditor({ projectPath }: { projectPath: string }) {
  const { language } = useI18n()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!projectPath) return
    fetch(`/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`)
      .then(r => r.json())
      .then(d => setContent(d.content || ''))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectPath])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/v2/studio/project-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath, content }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading...</div>

  return (
    <div className="flex h-full flex-col bg-primary/[0.02]">
      <div className="flex items-center gap-2 border-b border-primary/10 bg-primary/[0.03] px-3 py-1.5 text-xs">
        <span className="h-2 w-2 rounded-full bg-primary/40" />
        <span className="text-primary/60 font-medium flex-1">
          {language === 'fr' ? 'Memoire projet' : 'Project Memory'}
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <MarkdownEditor content={content} onChange={setContent} placeholder="Project context..." editorOnly />
      </div>
    </div>
  )
}


/** Editable document name banner — click to rename inline. */
function EditableDocBanner({
  name,
  documentId,
  projectPath,
  onRenamed,
}: {
  name: string
  documentId: string
  projectPath: string
  onRenamed?: (newName: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setValue(name) }, [name])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === name) { setEditing(false); return }
    setSaving(true)
    try {
      await fetch(`/api/v2/studio/documents/${encodeURIComponent(documentId)}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, project_path: projectPath }),
      })
      onRenamed?.(trimmed)
    } catch { /* ignore */ }
    finally { setSaving(false); setEditing(false) }
  }

  return (
    <div className="shrink-0 border-b border-border/20 bg-muted/20 px-4 py-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={handleSave}
            disabled={saving}
            className="flex-1 rounded border border-primary/30 bg-background px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary/60"
          />
        </div>
      ) : (
        <div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
            title="Click to rename"
          >
            {name}
            <span className="ml-1.5 text-[9px] text-muted-foreground/40">&#9998;</span>
          </button>
          {documentId && (
            <div className="text-[10px] text-muted-foreground/40 mt-0.5">{documentId}</div>
          )}
        </div>
      )}
    </div>
  )
}
