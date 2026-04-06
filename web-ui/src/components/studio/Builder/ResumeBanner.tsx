// web-ui/src/components/studio/Builder/ResumeBanner.tsx
// Banner shown at the top of BuilderView when opening a flow with existing document(s)

import { X } from 'lucide-react'

// ── Resume banner (non-repeatable flow with existing doc) ────────────────────

interface ResumeBannerProps {
  documentName: string
  documentId: string
  onNewDocument: () => void
  onViewInLibrary: () => void
  onDismiss: () => void
}

export function ResumeBanner({
  documentName,
  onNewDocument,
  onViewInLibrary,
  onDismiss,
}: ResumeBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-primary/20 bg-primary/5 px-4 py-2">
      <span className="text-sm text-muted-foreground">
        Resuming <span className="font-medium text-foreground">{documentName}</span>
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onNewDocument}
          className="rounded-md border border-border/50 bg-card px-3 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          + New
        </button>
        <button
          onClick={onViewInLibrary}
          className="rounded-md border border-border/50 bg-card px-3 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          View in Library
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Repeatable banner (flow already has previous docs) ───────────────────────

interface RepeatableBannerProps {
  flowName: string
  existingCount: number
  onViewInLibrary: () => void
  onDismiss: () => void
}

export function RepeatableBanner({
  flowName,
  existingCount,
  onViewInLibrary,
  onDismiss,
}: RepeatableBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 bg-muted/30 px-4 py-2">
      <span className="text-sm text-muted-foreground">
        You have{' '}
        <span className="font-medium text-foreground">
          {existingCount} previous {flowName}{existingCount !== 1 ? 's' : ''}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onViewInLibrary}
          className="rounded-md border border-border/50 bg-card px-3 py-1 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          View in Library
        </button>
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
