// web-ui/src/components/studio/Dashboard/UploadModal.tsx
// Upload modal with two tabs: "Upload file" (drag & drop) + "Choose from Library" (searchable doc list)

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Upload, Library, File, ImageIcon, FileText, Box } from 'lucide-react'
import { api } from '@/services/api'
import type { StudioDocument } from '@/types/studio'

export interface UploadResult {
  type: 'upload' | 'library'
  id: string
  name: string
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSelected: (result: UploadResult) => void
  projectPath: string
  accept?: string
}

type Tab = 'upload' | 'library'

function fileTypeIcon(tags: string[]) {
  if (tags.includes('image')) return <ImageIcon className="h-4 w-4 text-blue-400" />
  if (tags.includes('asset-3d')) return <Box className="h-4 w-4 text-purple-400" />
  return <FileText className="h-4 w-4 text-muted-foreground" />
}

function formatBytes(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadModal({ isOpen, onClose, onFileSelected, projectPath, accept }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!projectPath) return
      setUploading(true)
      setUploadError(null)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('project_path', projectPath)

        const res = await fetch('/api/v2/studio/upload', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
          throw new Error(err.detail || 'Upload failed')
        }
        const data = await res.json()
        onFileSelected({ type: 'upload', id: data.doc_id, name: data.filename })
        onClose()
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [projectPath, onFileSelected, onClose]
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
    },
    [handleUploadFile]
  )

  const handleLibrarySelect = (doc: StudioDocument) => {
    onFileSelected({ type: 'library', id: doc.id, name: doc.name })
    onClose()
  }

  const filteredDocs = documents.filter(doc => {
    if (!libSearch) return true
    const q = libSearch.toLowerCase()
    return (
      doc.name?.toLowerCase().includes(q) ||
      doc.id?.toLowerCase().includes(q) ||
      (doc.meta?.tags || []).some(t => t.includes(q))
    )
  })

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Add Reference</h2>
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
            Upload file
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
            Choose from Library
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
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                {uploading ? (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                    <p className="text-sm text-muted-foreground">Uploading…</p>
                  </>
                ) : (
                  <>
                    <File className="h-10 w-10 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Drop a file here</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        or click to browse — images, PDFs, 3D assets
                      </p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
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
                className="w-full rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                autoFocus
              />

              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {libLoading && (
                  <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
                )}
                {!libLoading && filteredDocs.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {libSearch ? `No documents match "${libSearch}"` : 'No documents in library'}
                  </p>
                )}
                {!libLoading &&
                  filteredDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => handleLibrarySelect(doc)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      {fileTypeIcon(doc.meta?.tags || [])}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{doc.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {(doc.meta?.tags || []).slice(0, 3).join(' · ')}
                          {doc.meta?.size_bytes ? ` · ${formatBytes(doc.meta.size_bytes)}` : ''}
                        </p>
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
