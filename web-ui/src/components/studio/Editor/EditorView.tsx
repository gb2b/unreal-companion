import { useEffect, useState, useCallback, useRef } from 'react'
import { FileText, Save, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { useI18n } from '@/i18n/useI18n'
import { MarkdownEditor } from './MarkdownEditor'
import { EditorBanner } from './EditorBanner'
import type { StudioDocument } from '@/types/studio'

const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'game-brief': 'This document defines your game\'s identity, creative vision, design pillars, target audience, creative references, and project scope. It is the foundation that all other documents build upon.',
  'gdd': 'The Game Design Document details every mechanic, system, and feature of your game. It serves as the comprehensive technical and creative reference for the entire development team.',
  'brainstorming': 'A creative ideation space to freely explore concepts, directions, and possibilities before committing to a specific vision.',
  'game-architecture': 'Describes the technical architecture, engine systems, data structures, and infrastructure decisions that will support your game\'s design.',
  'sprint-planning': 'Organizes development work into sprints with prioritized tasks, milestones, and delivery targets.',
}

const PROJECT_CONTEXT_DESCRIPTION = 'The project context is the living memory of your project. It provides a high-level overview of the game, tracks key decisions made across all documents, and serves as a quick reference for any agent working on the project.'

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
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

  const doSave = useCallback(async (contentToSave: string) => {
    setSaving(true)
    try {
      if (isProjectContext) {
        await api.put('/api/v2/studio/project-context', {
          project_path: projectPath,
          content: contentToSave,
        })
      } else {
        await api.put(`/api/v2/studio/documents/${encodeURIComponent(docId)}`, {
          project_path: projectPath,
          content: contentToSave,
        })
      }
      setLastSaved(new Date())
      setDirty(false)
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }, [docId, projectPath, isProjectContext])

  const handleChange = useCallback((newContent: string) => {
    setContent(newContent)
    setDirty(true)
  }, [])

  // Auto-save: schedule save after 1s of inactivity
  const contentRef = useRef(content)
  contentRef.current = content
  const autoSaveRef = useRef(autoSave)
  autoSaveRef.current = autoSave

  useEffect(() => {
    if (!dirty || !autoSaveRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => doSave(contentRef.current), 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [dirty, content, doSave])

  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    doSave(content)
  }, [doSave, content])

  // Update "saved X ago" display
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeSince = (date: Date) => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000)
    if (secs < 5) return 'just now'
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  // Compute description (always, before early returns)
  const workflowId = doc?.meta?.workflow_id || undefined
  const description = isProjectContext
    ? PROJECT_CONTEXT_DESCRIPTION
    : (workflowId ? WORKFLOW_DESCRIPTIONS[workflowId] ?? '' : '')

  // Translate description based on user language
  const { language } = useI18n()
  const [translatedDesc, setTranslatedDesc] = useState(description)

  useEffect(() => {
    if (!description || language === 'en') {
      setTranslatedDesc(description)
      return
    }
    const cacheKey = `desc-full-${docId}-${language}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setTranslatedDesc(cached)
      return
    }
    api.post<{ translated: string }>('/api/v2/studio/translate', {
      text: description,
      target_language: language,
    }).then(res => {
      setTranslatedDesc(res.translated)
      localStorage.setItem(cacheKey, res.translated)
    }).catch(() => setTranslatedDesc(description))
  }, [description, language, docId])

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
      <div className="flex items-center gap-3 border-b border-border/30 bg-card/60 px-4 py-1.5 text-sm">
        {/* Save status */}
        {saving ? (
          <div className="flex items-center gap-2 text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Saving…</span>
          </div>
        ) : dirty ? (
          autoSave ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span>Unsaved changes</span>
            </div>
          ) : (
            <button
              onClick={handleManualSave}
              className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Save className="h-3.5 w-3.5" />
              <span className="font-medium">Save now</span>
            </button>
          )
        ) : lastSaved ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Saved {formatTimeSince(lastSaved)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">No changes</span>
        )}

        <div className="flex-1" />

        {/* Auto-save toggle */}
        <button
          onClick={() => setAutoSave(v => !v)}
          className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${autoSave ? 'bg-primary' : 'bg-muted'}`}>
            <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${autoSave ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </span>
          Auto-save
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <MarkdownEditor
          content={content}
          onChange={handleChange}
          placeholder="Start writing…"
          docName={doc.name}
          description={translatedDesc}
        />
      </div>
    </div>
  )
}
