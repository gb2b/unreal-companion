// web-ui/src/components/studio/NewDocumentModal.tsx
/**
 * NewDocumentModal — modal that lets the user pick a workflow to start a new document.
 * Wraps the existing WorkflowSelector with a dialog shell.
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/services/api'
import { WorkflowSelector } from '@/components/workflow/WorkflowSelector'

interface NewDocumentModalProps {
  isOpen: boolean
  projectPath: string
  onClose: () => void
  /** Called when user selects a workflow to start */
  onSelectWorkflow: (workflowId: string) => void
}

interface WorkflowInfo {
  id: string
  name: string
  description: string
  agent: string
  estimated_time: string
  icon?: string
  color?: string
  category?: string
  behavior?: string
  ui_visible?: boolean
  quick_action?: boolean
  document_order?: number
  suggested_after?: string[]
}

export function NewDocumentModal({
  isOpen,
  projectPath,
  onClose,
  onSelectWorkflow,
}: NewDocumentModalProps) {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    api
      .get<{ workflows: WorkflowInfo[] } | WorkflowInfo[]>(
        `/api/v2/studio/workflows?project_path=${encodeURIComponent(projectPath)}`
      )
      .then(data => {
        // API returns {workflows: [...]} object, not array directly
        const list = Array.isArray(data) ? data : (data as any).workflows ?? []
        setWorkflows(list)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen, projectPath])

  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">New Document</h2>
            <p className="text-sm text-muted-foreground">Choose a workflow to get started</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <WorkflowSelector
              workflows={workflows}
              onSelect={(workflowId) => {
                onSelectWorkflow(workflowId)
                onClose()
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
