import { useEffect, useState, useCallback, useRef } from 'react'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { MarkdownEditor } from './MarkdownEditor'
import { EditorBanner } from './EditorBanner'
import type { StudioDocument } from '@/types/studio'

const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'game-brief': 'Defines the game identity, vision, pillars, audience, and scope',
  'gdd': 'Detailed game design document covering all mechanics and systems',
  'brainstorming': 'Creative ideation session to explore concepts and directions',
  'game-architecture': 'Technical architecture and system design for the game',
  'sprint-planning': 'Sprint planning and task breakdown for production',
}

const PROJECT_CONTEXT_DESCRIPTION = 'Living project memory — high-level overview, key decisions, and references to documents'

interface EditorViewProps {
  docId: string
  projectPath: string
}

export function EditorView({ docId, projectPath }: EditorViewProps) {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<StudioDocument | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isProjectContext = docId === '__project-context__'

  useEffect(() => {
    if (!projectPath) { setLoading(false); return }
    setLoading(true)
    setError(null)

    if (isProjectContext) {
      api.get<{ content: string; updated: string | null }>(
        `/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`
      ).then(data => {
        setContent(data.content || '')
        setDoc({
          id: '__project-context__',
          name: 'Project Context',
          path: '',
          content: data.content || '',
          meta: { status: 'in_progress', updated: data.updated || '', workflow_id: '', agent: '', created: '', sections: {}, tags: [], user_renamed: false, summary: '', input_documents: [], prototypes: [], conversation_id: '', name: '' },
        } as StudioDocument)
      }).catch(() => setError('Failed to load project context.'))
        .finally(() => setLoading(false))
    } else {
      api.get<StudioDocument>(
        `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`
      ).then(data => {
        setDoc(data)
        setContent(data.content ?? '')
      }).catch(() => setError('Failed to load document.'))
        .finally(() => setLoading(false))
    }
  }, [docId, projectPath, isProjectContext])

  const handleChange = useCallback((newContent: string) => {
    setContent(newContent)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        if (isProjectContext) {
          await api.put('/api/v2/studio/project-context', {
            project_path: projectPath,
            content: newContent,
          })
        } else {
          await api.put(`/api/v2/studio/documents/${encodeURIComponent(docId)}`, {
            project_path: projectPath,
            content: newContent,
          })
        }
      } catch (e) {
        console.error('Auto-save failed:', e)
      } finally {
        setSaving(false)
      }
    }, 1000)
  }, [docId, projectPath, isProjectContext])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="font-semibold">{error ?? 'Document not found'}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/studio/library')}>
          Back to Library
        </Button>
      </div>
    )
  }

  const workflowId = doc.meta?.workflow_id || undefined
  const description = isProjectContext
    ? PROJECT_CONTEXT_DESCRIPTION
    : (workflowId ? WORKFLOW_DESCRIPTIONS[workflowId] ?? '' : '')

  return (
    <div className="flex h-full flex-col">
      <EditorBanner
        docId={docId}
        docName={doc.name}
        description={description}
        workflowId={isProjectContext ? undefined : workflowId}
        updated={doc.meta?.updated}
        status={doc.meta?.status}
      />
      <div className="flex items-center gap-2 border-b border-border/30 bg-card/40 px-4 py-1 text-xs text-muted-foreground">
        {saving ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Saving…
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Saved
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <MarkdownEditor
          content={content}
          onChange={handleChange}
          placeholder="Start writing…"
        />
      </div>
    </div>
  )
}
