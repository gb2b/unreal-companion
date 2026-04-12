// web-ui/src/components/studio/Builder/BuilderHeaderActions.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProjectContextDiffDialog } from '@/components/studio/Dashboard/ProjectContextDiffDialog'
import { api } from '@/services/api'

interface BuilderHeaderActionsProps {
  docId: string
  workflowId: string
  projectPath: string
}

type DialogState =
  | { type: 'none' }
  | { type: 'delete' }
  | { type: 'reset' }
  | { type: 'context-diff'; currentContent: string; proposedContent: string }

export function BuilderHeaderActions({ docId, workflowId, projectPath }: BuilderHeaderActionsProps) {
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [deletePending, setDeletePending] = useState(false)
  const navigate = useNavigate()

  async function confirmDelete() {
    setDialog({ type: 'none' })
    setDeletePending(true)

    await fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`,
      { method: 'DELETE' }
    )

    try {
      const res = await api.post<{ current_content: string; proposed_content: string }>(
        '/api/v2/studio/project-context/propose-update',
        {
          project_path: projectPath,
          deleted_doc_id: docId,
          deleted_doc_name: docId.split('/').pop() || docId,
        }
      )
      if (res.current_content && res.proposed_content && res.current_content !== res.proposed_content) {
        setDeletePending(false)
        setDialog({
          type: 'context-diff',
          currentContent: res.current_content,
          proposedContent: res.proposed_content,
        })
        return
      }
    } catch {
      // No project context or LLM error — skip diff step
    }

    setDeletePending(false)
    navigate('/studio/library')
  }

  async function handleDiffApply(finalContent: string) {
    await api.put('/api/v2/studio/project-context', {
      project_path: projectPath,
      content: finalContent,
    })
    setDialog({ type: 'none' })
    navigate('/studio/library')
  }

  function handleDiffSkip() {
    setDialog({ type: 'none' })
    navigate('/studio/library')
  }

  async function confirmReset() {
    setDialog({ type: 'none' })
    await fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`,
      { method: 'DELETE' }
    )
    // Reload the builder page fresh
    navigate(`/studio/build/${encodeURIComponent(workflowId)}`, { replace: true })
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setDialog({ type: 'reset' })}
        className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-1 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/15"
        title="Reset document — delete content and restart workflow"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </button>
      <button
        onClick={() => setDialog({ type: 'delete' })}
        className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15"
        title="Delete document"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      <ConfirmDialog
        isOpen={dialog.type === 'delete'}
        title="Delete document"
        message="Delete this document? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDialog({ type: 'none' })}
      />

      <ConfirmDialog
        isOpen={dialog.type === 'reset'}
        title="Reset document"
        message="Reset this document? All content will be deleted and the workflow will restart fresh."
        confirmLabel="Reset"
        destructive
        onConfirm={confirmReset}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {dialog.type === 'context-diff' && (
        <ProjectContextDiffDialog
          isOpen={true}
          currentContent={dialog.currentContent}
          proposedContent={dialog.proposedContent}
          deletedDocName={docId.split('/').pop() || docId}
          onApply={handleDiffApply}
          onSkip={handleDiffSkip}
        />
      )}

      {deletePending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 shadow-2xl border border-border">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-sm text-muted-foreground">Checking project context…</span>
          </div>
        </div>
      )}
    </>
  )
}
