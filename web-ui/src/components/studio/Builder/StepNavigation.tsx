import { ArrowLeft, ArrowRight } from 'lucide-react'

interface StepNavigationProps {
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  canGoBack: boolean
  isProcessing: boolean
  hasResponse: boolean
  /** When viewing a past step (answered/skipped), hide Skip and Continue */
  isReadonly?: boolean
  /** Jump to the latest step (the real active one) */
  onJumpToLatest?: () => void
}

export function StepNavigation({
  onBack,
  onSkip,
  onContinue,
  canGoBack,
  isProcessing,
  hasResponse,
  isReadonly,
  onJumpToLatest,
}: StepNavigationProps) {
  return (
    <div className="mt-auto flex shrink-0 items-center justify-between border-t border-border/30 bg-background/80 px-6 py-3 backdrop-blur">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={!canGoBack || isProcessing}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {isReadonly ? (
        /* Viewing a past step — show "Back to current" instead of Skip/Continue */
        <button
          onClick={onJumpToLatest}
          className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Back to current
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <>
          {/* Skip */}
          <button
            onClick={onSkip}
            disabled={isProcessing}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            Skip for now
          </button>

          {/* Continue */}
          <button
            onClick={onContinue}
            disabled={isProcessing || !hasResponse}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
