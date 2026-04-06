import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/i18n/useI18n'

interface SelectionPromptProps {
  selectedText: string
  sectionId: string
  position: { top: number; left: number }
  onSubmit: (sectionId: string, selectedText: string, prompt: string) => void
  onCancel: () => void
}

export function SelectionPrompt({ selectedText, sectionId, position, onSubmit, onCancel }: SelectionPromptProps) {
  const { language } = useI18n()
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!prompt.trim()) return
    onSubmit(sectionId, selectedText, prompt.trim())
    setPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      className="absolute z-50 w-72 rounded-lg border border-border bg-card shadow-lg p-3"
      style={{ top: position.top, left: position.left }}
    >
      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
        {language === 'fr' ? 'Modifier la sélection' : 'Edit selection'}
      </p>
      <p className="mb-2 max-h-16 overflow-y-auto rounded bg-muted/50 px-2 py-1 text-xs text-foreground/70 italic">
        &quot;{selectedText.length > 120 ? selectedText.slice(0, 117) + '...' : selectedText}&quot;
      </p>
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={language === 'fr' ? 'Que voulez-vous changer ?' : 'What do you want to change?'}
        rows={2}
        className="w-full resize-none rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {language === 'fr' ? 'Annuler' : 'Cancel'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim()}
          className="rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {language === 'fr' ? 'Envoyer' : 'Send'}
        </button>
      </div>
    </div>
  )
}
