// web-ui/src/components/studio/DocumentViewer.tsx
// Read-only document viewer — shown at /studio/doc/:docId

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock, User, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import type { StudioDocument } from '@/types/studio'

interface DocumentViewerProps {
  docId: string
  projectPath: string
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  complete: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  empty: 'bg-muted/60 text-muted-foreground border border-border/30',
  draft: 'bg-muted/60 text-muted-foreground border border-border/30',
}

const STATUS_LABELS: Record<string, string> = {
  complete: 'Complete',
  in_progress: 'In progress',
  empty: 'Empty',
  draft: 'Draft',
}

export function DocumentViewer({ docId, projectPath }: DocumentViewerProps) {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<StudioDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!docId || !projectPath) {
      setLoading(false)
      setError('Missing document ID or project path.')
      return
    }

    setLoading(true)
    setError(null)

    api
      .get<StudioDocument>(
        `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`
      )
      .then(data => {
        setDoc(data)
      })
      .catch(err => {
        console.error('Failed to load document:', err)
        setError('Failed to load document.')
      })
      .finally(() => setLoading(false))
  }, [docId, projectPath])

  const workflowId = doc?.meta?.workflow_id
  const status = doc?.meta?.status ?? 'empty'
  const agent = doc?.meta?.agent
  const updated = doc?.meta?.updated
  const tags = doc?.meta?.tags || []
  const isReference = tags.includes('reference')
  const isImage = tags.includes('image')
  const isPdf = doc?.meta?.content_type === 'application/pdf' || doc?.path?.endsWith('.pdf')
  // Parse content into sections: ## Title\ncontent blocks
  const parseSections = (content: string): Array<{ title: string; content: string }> => {
    if (!content) return []
    const lines = content.split('\n')
    const sections: Array<{ title: string; content: string }> = []
    let current: { title: string; lines: string[] } | null = null

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (current) {
          sections.push({ title: current.title, content: current.lines.join('\n').trim() })
        }
        current = { title: line.slice(3).trim(), lines: [] }
      } else if (current) {
        current.lines.push(line)
      }
    }
    if (current) {
      sections.push({ title: current.title, content: current.lines.join('\n').trim() })
    }

    return sections
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm">Loading document…</span>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold">{error ?? 'Document not found'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted or the project path is incorrect.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/studio/library')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
      </div>
    )
  }

  const sections = parseSections(doc.content ?? '')

  // If no sections parsed but there is content, show raw content as one block
  const hasStructuredSections = sections.length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-2 backdrop-blur">
        <button
          onClick={() => navigate('/studio/library')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Library
        </button>

        <span className="text-muted-foreground/40">/</span>

        <span className="text-sm font-medium">{doc.name}</span>

        {/* Status badge */}
        <span
          className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.empty}`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meta info */}
        {agent && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{agent}</span>
          </div>
        )}
        {updated && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(updated)}</span>
          </div>
        )}

        {/* CTA */}
        {workflowId && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
            onClick={() => navigate(`/studio/build/${workflowId}`)}
          >
            Continue in Workshop
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Document body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Document title */}
          <h1 className="mb-6 text-2xl font-bold">{doc.name}</h1>

          {/* Reference file viewer */}
          {isReference && (
            <div className="flex flex-col gap-4">
              {isImage && (
                <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/20">
                  <img
                    src={`/api/v2/studio/references/${encodeURIComponent(doc.name)}?project_path=${encodeURIComponent(projectPath)}`}
                    alt={doc.name}
                    className="w-full object-contain"
                  />
                </div>
              )}
              {isPdf && (
                <div className="flex flex-col gap-3">
                  <a
                    href={`/api/v2/studio/references/${encodeURIComponent(doc.name)}?project_path=${encodeURIComponent(projectPath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-primary hover:bg-muted/40"
                  >
                    Open PDF
                  </a>
                  <iframe
                    src={`/api/v2/studio/references/${encodeURIComponent(doc.name)}?project_path=${encodeURIComponent(projectPath)}`}
                    className="h-[600px] w-full rounded-xl border border-border/50"
                    title={doc.name}
                  />
                </div>
              )}
              {!isImage && !isPdf && (
                <div className="rounded-xl border border-border/50 bg-card p-6">
                  <p className="text-sm text-muted-foreground">
                    This file cannot be previewed directly.
                  </p>
                  <a
                    href={`/api/v2/studio/references/${encodeURIComponent(doc.name)}?project_path=${encodeURIComponent(projectPath)}`}
                    download={doc.name}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-primary hover:bg-muted/40"
                  >
                    Download {doc.name}
                  </a>
                </div>
              )}
              {/* Upload metadata */}
              <div className="rounded-xl border border-border/50 bg-card/50 px-5 py-4 text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                  {doc.meta.content_type && <span>Type: {doc.meta.content_type}</span>}
                  {doc.meta.size_bytes != null && (
                    <span>
                      Size:{' '}
                      {doc.meta.size_bytes < 1024 * 1024
                        ? `${(doc.meta.size_bytes / 1024).toFixed(1)} KB`
                        : `${(doc.meta.size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  )}
                  {doc.meta.created && <span>Uploaded: {formatDate(doc.meta.created)}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Markdown document sections (only for non-reference docs) */}
          {!isReference && (
            hasStructuredSections ? (
              <div className="flex flex-col gap-8">
                {sections.map((section, i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card p-5">
                    <h2 className="mb-3 text-base font-semibold text-foreground">{section.title}</h2>
                    {section.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">[To be completed]</p>
                    )}
                  </div>
                ))}
              </div>
            ) : doc.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80">
                <ReactMarkdown>{doc.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
                This document has no content yet.
                {workflowId && (
                  <span>
                    {' '}
                    <button
                      onClick={() => navigate(`/studio/build/${workflowId}`)}
                      className="text-primary underline hover:no-underline"
                    >
                      Open in Workshop
                    </button>{' '}
                    to start filling it in.
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
