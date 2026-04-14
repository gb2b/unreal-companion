// web-ui/src/components/ui/ConfirmDialog.tsx
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  /** When provided, renders a text input and passes its value to onConfirm */
  inputLabel?: string
  inputPlaceholder?: string
  inputDefaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Makes the confirm button red */
  destructive?: boolean
  onConfirm: (inputValue?: string) => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  inputLabel,
  inputPlaceholder,
  inputDefaultValue = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState(inputDefaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInputValue(inputDefaultValue)
      // Focus input or confirm button after mount
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, inputDefaultValue])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !inputLabel) onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, inputLabel, onCancel, onConfirm])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-xl border border-border bg-card shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>

        {inputLabel && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{inputLabel}</label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              onKeyDown={e => {
                if (e.key === 'Enter' && inputValue.trim()) onConfirm(inputValue.trim())
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(inputLabel ? inputValue.trim() : undefined)}
            disabled={inputLabel ? !inputValue.trim() : false}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
