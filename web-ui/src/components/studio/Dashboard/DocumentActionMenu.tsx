// web-ui/src/components/studio/Dashboard/DocumentActionMenu.tsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProjectContextDiffDialog } from './ProjectContextDiffDialog'
import { api } from '@/services/api'

interface DocumentActionMenuProps {
  docId: string
  workflowId: string
  projectPath: string
  onDeleted: () => void
  onRenamed: () => void
  onManageTags?: () => void
}

type DialogState =
  | { type: 'none' }
  | { type: 'delete' }
  | { type: 'reset' }
  | { type: 'rename' }
  | { type: 'context-diff'; currentContent: string; proposedContent: string }

export function DocumentActionMenu({
  docId,
  workflowId,
  projectPath,
  onDeleted,
  onRenamed,
  onManageTags,
}: DocumentActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  // true = align right edge of dropdown with button (default), false = align left edge
  const [alignRight, setAlignRight] = useState(true)
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Check if dropdown overflows the left edge of the viewport and flip if needed
  useEffect(() => {
    if (!open || !dropdownRef.current) return
    const rect = dropdownRef.current.getBoundingClientRect()
    if (rect.left < 0) {
      setAlignRight(false)
    } else {
      setAlignRight(true)
    }
  }, [open])

  function stopProp(e: React.MouseEvent) {
    e.stopPropagation()
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(v => !v)
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    navigate(`/studio/doc/${encodeURIComponent(docId)}`)
  }

  function handleContinue(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    navigate(`/studio/build/${encodeURIComponent(workflowId)}`)
  }

  function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    setDialog({ type: 'rename' })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    setDialog({ type: 'delete' })
  }

  function handleManageTags(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    onManageTags?.()
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    setDialog({ type: 'reset' })
  }

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
    onDeleted()
  }

  async function handleDiffApply(finalContent: string) {
    await api.put('/api/v2/studio/project-context', {
      project_path: projectPath,
      content: finalContent,
    })
    setDialog({ type: 'none' })
    onDeleted()
  }

  function handleDiffSkip() {
    setDialog({ type: 'none' })
    onDeleted()
  }

  async function confirmReset() {
    setDialog({ type: 'none' })
    await fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`,
      { method: 'DELETE' }
    )
    navigate(`/studio/build/${encodeURIComponent(workflowId)}`)
  }

  async function confirmRename(newName?: string) {
    setDialog({ type: 'none' })
    if (!newName?.trim()) return
    await fetch(`/api/v2/studio/documents/${encodeURIComponent(docId)}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), project_path: projectPath }),
    })
    onRenamed()
  }

  return (
    <div ref={ref} className="relative" onClick={stopProp}>
      <button
        onClick={handleToggle}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Document actions"
      >
        ⋯
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`absolute top-7 z-50 min-w-[160px] rounded-lg border border-border/50 bg-card py-1 shadow-lg shadow-black/10 ${alignRight ? 'right-0' : 'left-0'}`}
        >
          <MenuItem onClick={handleOpen} label="Open" />
          <MenuItem onClick={handleContinue} label="Continue workflow" />
          <div className="my-1 h-px bg-border/30" />
          <MenuItem onClick={handleRename} label="Rename" />
          {onManageTags && <MenuItem onClick={handleManageTags} label="Manage tags" />}
          <MenuItem onClick={handleReset} label="Reset" className="text-amber-500 hover:text-amber-400" />
          <MenuItem onClick={handleDelete} label="Delete" className="text-destructive hover:text-destructive/80" />
        </div>
      )}

      {/* Rename dialog */}
      <ConfirmDialog
        isOpen={dialog.type === 'rename'}
        title="Rename document"
        message="Enter a new name for this document."
        inputLabel="New name"
        inputPlaceholder="Document name"
        confirmLabel="Rename"
        onConfirm={confirmRename}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        isOpen={dialog.type === 'delete'}
        title="Delete document"
        message="Delete this document? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {/* Reset dialog */}
      <ConfirmDialog
        isOpen={dialog.type === 'reset'}
        title="Reset document"
        message="Reset this document? All content will be deleted and the workflow will restart fresh."
        confirmLabel="Reset"
        destructive
        onConfirm={confirmReset}
        onCancel={() => setDialog({ type: 'none' })}
      />

      {/* Context diff dialog */}
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

      {/* Loading overlay while checking context */}
      {deletePending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 shadow-2xl border border-border">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-sm text-muted-foreground">Checking project context…</span>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick,
  label,
  className = '',
}: {
  onClick: (e: React.MouseEvent) => void
  label: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted ${className}`}
    >
      {label}
    </button>
  )
}
