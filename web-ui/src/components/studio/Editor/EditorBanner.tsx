// web-ui/src/components/studio/Editor/EditorBanner.tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentActionMenu } from '../Dashboard/DocumentActionMenu'

interface EditorBannerProps {
  docId: string
  docName: string
  description: string
  workflowId?: string
  projectPath?: string
  updated?: string
  status?: string
  onRenamed?: () => void
}

const STATUS_STYLES: Record<string, string> = {
  complete: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  empty: 'bg-muted/60 text-muted-foreground border border-border/30',
}

export function EditorBanner({ docId, docName, workflowId, projectPath, updated, status, onRenamed }: EditorBannerProps) {
  const navigate = useNavigate()
  const isProjectContext = docId === '__project-context__'

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-2 backdrop-blur">
      <button
        onClick={() => navigate('/studio/library')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Library
      </button>

      <span className="text-muted-foreground/40">/</span>
      <span className="text-sm font-medium">{docName}</span>

      {status && (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.empty}`}>
          {status}
        </span>
      )}

      <div className="flex-1" />

      {updated && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(updated)}</span>
        </div>
      )}

      {workflowId && (
        <Button
          size="sm"
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          onClick={() => navigate(`/studio/build/${encodeURIComponent(workflowId)}/${encodeURIComponent(docId)}`)}
        >
          Workflow assisté
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}

      {!isProjectContext && projectPath && (
        <DocumentActionMenu
          docId={docId}
          workflowId={workflowId || ''}
          projectPath={projectPath}
          onDeleted={() => navigate('/studio/library')}
          onRenamed={() => onRenamed?.()}
        />
      )}
    </div>
  )
}
