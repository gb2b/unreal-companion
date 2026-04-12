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
  workflowTypeName?: string
  onDocIdChanged?: (newId: string) => void
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
  workflowTypeName,
  onDocIdChanged,
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
                {documentId && (
                  <EditableDocBanner
                    docId={documentId}
                    workflowTypeName={workflowTypeName || ''}
                    projectPath={projectPath || ''}
                    onIdChanged={onDocIdChanged}
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


/** Inline editor for project-memory.md within the Builder. */
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


/** Editable document folder id banner — click to rename the folder on disk. */
function EditableDocBanner({
  docId,
  workflowTypeName,
  projectPath,
  onIdChanged,
}: {
  docId: string
  workflowTypeName: string
  projectPath: string
  onIdChanged?: (newId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(docId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setValue(docId); setError(null) }, [docId])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === docId) {
      setEditing(false)
      setError(null)
      return
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setError('Only letters, digits, dash, underscore, dot')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `/api/v2/studio/documents/${encodeURIComponent(docId)}/rename-folder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_id: trimmed, project_path: projectPath }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // FastAPI 422 errors return `detail` as an array of validation objects;
        // plain HTTPException returns it as a string. Normalise to a string.
        let msg = 'Rename failed'
        if (typeof data.detail === 'string') {
          msg = data.detail
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          msg = data.detail[0]?.msg || msg
        }
        setError(msg)
        return
      }
      const data = await res.json()
      onIdChanged?.(data.new_id)
      setEditing(false)
      setError(null)
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(docId)
    setError(null)
    setEditing(false)
  }

  return (
    <div className="shrink-0 border-b border-border/20 bg-muted/20 px-4 py-2.5">
      {workflowTypeName && (
        <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          {workflowTypeName}
        </div>
      )}
      {editing ? (
        <div>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={value}
              onChange={e => { setValue(e.target.value); setError(null) }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
              disabled={saving}
              className="flex-1 rounded border border-primary bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              placeholder="folder-name"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? '...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded border border-border/50 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && <div className="mt-1 text-[10px] text-destructive">{error}</div>}
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="group flex w-full items-center gap-2 rounded border border-dashed border-border/50 bg-background/40 px-2 py-1 text-left font-mono text-xs text-foreground/80 transition-colors hover:border-primary/60 hover:bg-background hover:text-foreground"
          title="Click to rename folder"
        >
          <span className="flex-1 truncate">{docId}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      )}
    </div>
  )
}
