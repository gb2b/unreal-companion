// web-ui/src/components/studio/Builder/AttachModal.tsx
// Modal with two tabs: upload from computer (drag-drop) or link from library

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Upload, Library, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import type { StudioDocument } from '@/types/studio'

export interface AttachResult {
  type: 'upload' | 'library'
  docId: string
  name: string
  summary?: string
}

interface AttachModalProps {
  isOpen: boolean
  onClose: () => void
  onAttach: (result: AttachResult) => void
  projectPath: string
  sourceDocument?: string
}

type Tab = 'upload' | 'library'
type UploadPhase = 'idle' | 'uploading' | 'analyzing'

const ACCEPTED = '.pdf,.docx,.doc,.md,.txt,.png,.jpg,.jpeg,.gif,.webp,.svg'

function docEmoji(tags: string[]): string {
  if (tags.includes('image')) return '🖼️'
  if (tags.includes('asset-3d')) return '📦'
  if (tags.includes('pdf')) return '📄'
  if (tags.includes('markdown')) return '📝'
  return '📄'
}

export function AttachModal({ isOpen, onClose, onAttach, projectPath, sourceDocument }: AttachModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<StudioDocument[]>([])
  const [libSearch, setLibSearch] = useState('')
  const [libLoading, setLibLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load documents when Library tab is active
  useEffect(() => {
    if (activeTab === 'library' && isOpen && projectPath) {
      setLibLoading(true)
      api
        .get<{ documents: StudioDocument[] }>(
          `/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`
        )
        .then(data => setDocuments(data.documents || []))
        .catch(() => setDocuments([]))
        .finally(() => setLibLoading(false))
    }
  }, [activeTab, isOpen, projectPath])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUploadPhase('idle')
      setUploadError(null)
      setLibSearch('')
      setActiveTab('upload')
    }
  }, [isOpen])

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!projectPath) return
      setUploadPhase('uploading')
      setUploadError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('project_path', projectPath)
        if (sourceDocument) {
          form.append('source_document', sourceDocument)
        }

        const res = await fetch('/api/v2/studio/upload', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
          throw new Error(err.detail || 'Upload failed')
        }
        const data = await res.json()

        // Show "Analyzing document..." while we wait for index/scan
        setUploadPhase('analyzing')

        // Extract summary from index if available
        let summary: string | undefined
        if (data.index) {
          summary = data.index.summary ?? data.index.description ?? undefined
        }
        if (!summary && data.summary) {
          summary = data.summary
        }

        onAttach({
          type: 'upload',
          docId: data.doc_id,
          name: data.filename || file.name,
          summary,
        })
        onClose()
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Upload failed')
        setUploadPhase('idle')
      }
    },
    [projectPath, sourceDocument, onAttach, onClose]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleUploadFile(file)
    },
    [handleUploadFile]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUploadFile(file)
      // Reset so the same file can be re-selected
      e.target.value = ''
    },
    [handleUploadFile]
  )

  const handleLibrarySelect = (doc: StudioDocument) => {
    onAttach({
      type: 'library',
      docId: doc.id,
      name: doc.name,
      summary: doc.meta?.summary,
    })
    onClose()
  }

  const filteredDocs = documents.filter(doc => {
    if (!libSearch) return true
    const q = libSearch.toLowerCase()
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.id?.toLowerCase().includes(q) ||
      (doc.meta?.tags || []).some(t => t.toLowerCase().includes(q))
    )
  })

  const isUploading = uploadPhase === 'uploading' || uploadPhase === 'analyzing'

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Attach Document</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            From computer
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'library'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="h-3.5 w-3.5" />
            From library
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {uploadPhase === 'uploading' ? 'Uploading…' : 'Analyzing document…'}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Drop a file here</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        or{' '}
                        <span className="text-primary underline underline-offset-2">
                          browse files
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        PDF, DOCX, MD, TXT, PNG, JPG, GIF, WEBP, SVG
                      </p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {uploadError}
                </p>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={libSearch}
                onChange={e => setLibSearch(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                autoFocus
              />

              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {libLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </div>
                )}
                {!libLoading && filteredDocs.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {libSearch ? `No documents match "${libSearch}"` : 'No documents in library'}
                  </p>
                )}
                {!libLoading &&
                  filteredDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => handleLibrarySelect(doc)}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="mt-0.5 text-base leading-none">
                        {docEmoji(doc.meta?.tags || [])}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{doc.name}</p>
                        {doc.meta?.summary && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                            {doc.meta.summary}
                          </p>
                        )}
                        {!doc.meta?.summary && (doc.meta?.tags || []).length > 0 && (
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                            {(doc.meta.tags || []).slice(0, 3).join(' · ')}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
