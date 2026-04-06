// web-ui/src/components/studio/Dashboard/DocumentActionMenu.tsx
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface DocumentActionMenuProps {
  docId: string
  workflowId: string
  projectPath: string
  onDeleted: () => void
  onRenamed: () => void
}

export function DocumentActionMenu({
  docId,
  workflowId,
  projectPath,
  onDeleted,
  onRenamed,
}: DocumentActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
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

  async function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    const newName = window.prompt('New document name:')
    if (!newName?.trim()) return
    await fetch(`/api/v2/studio/documents/${encodeURIComponent(docId)}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), project_path: projectPath }),
    })
    onRenamed()
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    if (!window.confirm('Delete this document? This cannot be undone.')) return
    await fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`,
      { method: 'DELETE' }
    )
    onDeleted()
  }

  async function handleReset(e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    if (!window.confirm('Reset this document? All content will be deleted and the workflow will restart fresh.')) return
    await fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`,
      { method: 'DELETE' }
    )
    navigate(`/studio/build/${encodeURIComponent(workflowId)}`)
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
        <div className="absolute right-0 top-7 z-50 min-w-[160px] rounded-lg border border-border/50 bg-card py-1 shadow-lg shadow-black/10">
          <MenuItem onClick={handleOpen} label="Open" />
          <MenuItem onClick={handleContinue} label="Continue workflow" />
          <div className="my-1 h-px bg-border/30" />
          <MenuItem onClick={handleRename} label="Rename" />
          <MenuItem onClick={handleReset} label="Reset" className="text-amber-500 hover:text-amber-400" />
          <MenuItem onClick={handleDelete} label="Delete" className="text-destructive hover:text-destructive/80" />
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
