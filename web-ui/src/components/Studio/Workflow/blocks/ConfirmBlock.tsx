import type { ConfirmData } from '@/types/interactions'

interface ConfirmBlockProps {
  data: ConfirmData
  onConfirm: (confirmed: boolean) => void
  disabled?: boolean
}

export function ConfirmBlock({ data, onConfirm, disabled = false }: ConfirmBlockProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-4">
      <p className="text-sm text-foreground">{data.message}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onConfirm(true)}
          disabled={disabled}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Yes, approve
        </button>
        <button
          onClick={() => onConfirm(false)}
          disabled={disabled}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          No, revise
        </button>
      </div>
    </div>
  )
}
