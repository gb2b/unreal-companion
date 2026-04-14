// web-ui/src/components/studio/Dashboard/ProjectContextDiffDialog.tsx
import { createPortal } from 'react-dom'
import { UnifiedDiff } from '@/components/ui/UnifiedDiff'

interface ProjectContextDiffDialogProps {
  isOpen: boolean
  currentContent: string
  proposedContent: string
  deletedDocName: string
  onApply: (finalContent: string) => void
  onSkip: () => void
}

export function ProjectContextDiffDialog({
  isOpen,
  currentContent,
  proposedContent,
  deletedDocName,
  onApply,
  onSkip,
}: ProjectContextDiffDialogProps) {
  if (!isOpen) return null

  const hasChanges = currentContent !== proposedContent

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onSkip}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-3 border-b border-border/50">
          <h2 className="text-base font-semibold mb-1">Update Project Context</h2>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deletedDocName}&rdquo; was deleted. Review proposed changes to the project context:
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-3">
          {hasChanges ? (
            <UnifiedDiff
              oldText={currentContent}
              newText={proposedContent}
              oldLabel="Current"
              newLabel="Proposed"
              maxHeight="50vh"
            />
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No changes detected in the project context.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border/50 p-4">
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => onApply(proposedContent)}
            disabled={!hasChanges}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Apply changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
