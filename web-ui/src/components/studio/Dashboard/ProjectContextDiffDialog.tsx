// web-ui/src/components/studio/Dashboard/ProjectContextDiffDialog.tsx
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

interface DiffBlock {
  id: number
  type: 'unchanged' | 'modified' | 'removed' | 'added'
  oldText: string
  newText: string
}

interface ProjectContextDiffDialogProps {
  isOpen: boolean
  currentContent: string
  proposedContent: string
  deletedDocName: string
  onApply: (finalContent: string) => void
  onSkip: () => void
}

function splitBlocks(text: string): string[] {
  const blocks: string[] = []
  let current: string[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('## ') && current.length > 0) {
      blocks.push(current.join('\n').trim())
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    const t = current.join('\n').trim()
    if (t) blocks.push(t)
  }
  return blocks
}

function computeBlockDiff(oldBlocks: string[], newBlocks: string[]): DiffBlock[] {
  const result: DiffBlock[] = []
  let id = 0
  const newUsed = new Set<number>()

  for (const oldBlock of oldBlocks) {
    const oldHeader = oldBlock.split('\n')[0]
    const matchIdx = newBlocks.findIndex((nb, i) => !newUsed.has(i) && nb.split('\n')[0] === oldHeader)
    if (matchIdx >= 0) {
      newUsed.add(matchIdx)
      const newBlock = newBlocks[matchIdx]
      if (oldBlock === newBlock) {
        result.push({ id: id++, type: 'unchanged', oldText: oldBlock, newText: newBlock })
      } else {
        result.push({ id: id++, type: 'modified', oldText: oldBlock, newText: newBlock })
      }
    } else {
      result.push({ id: id++, type: 'removed', oldText: oldBlock, newText: '' })
    }
  }
  for (let i = 0; i < newBlocks.length; i++) {
    if (!newUsed.has(i)) {
      result.push({ id: id++, type: 'added', oldText: '', newText: newBlocks[i] })
    }
  }
  return result
}

export function ProjectContextDiffDialog({
  isOpen,
  currentContent,
  proposedContent,
  deletedDocName,
  onApply,
  onSkip,
}: ProjectContextDiffDialogProps) {
  const blocks = useMemo(() => {
    const oldBlocks = splitBlocks(currentContent)
    const newBlocks = splitBlocks(proposedContent)
    return computeBlockDiff(oldBlocks, newBlocks)
  }, [currentContent, proposedContent])

  const [accepted, setAccepted] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    blocks.forEach(b => { init[b.id] = true })
    return init
  })

  const toggleBlock = (id: number) => {
    setAccepted(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleApply = () => {
    const parts: string[] = []
    for (const block of blocks) {
      if (block.type === 'unchanged') {
        parts.push(block.oldText)
      } else if (block.type === 'modified') {
        parts.push(accepted[block.id] ? block.newText : block.oldText)
      } else if (block.type === 'removed') {
        if (!accepted[block.id]) parts.push(block.oldText)
      } else if (block.type === 'added') {
        if (accepted[block.id]) parts.push(block.newText)
      }
    }
    onApply(parts.join('\n\n'))
  }

  const changedBlocks = blocks.filter(b => b.type !== 'unchanged')
  const unchangedCount = blocks.filter(b => b.type === 'unchanged').length

  if (!isOpen) return null

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

        <div className="flex-1 overflow-y-auto p-6 pt-3 flex flex-col gap-3">
          {changedBlocks.map(block => (
            <div
              key={block.id}
              className={`rounded-lg border p-3 transition-all ${
                accepted[block.id]
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/30 bg-muted/20 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleBlock(block.id)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                    accepted[block.id]
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <div className="flex-1 text-sm space-y-1">
                  {block.type === 'removed' && (
                    <div className="text-destructive/80 line-through whitespace-pre-wrap">{block.oldText}</div>
                  )}
                  {block.type === 'added' && (
                    <div className="text-emerald-500 whitespace-pre-wrap">{block.newText}</div>
                  )}
                  {block.type === 'modified' && (
                    <>
                      <div className="text-destructive/60 line-through whitespace-pre-wrap text-xs">{block.oldText}</div>
                      <div className="text-emerald-500 whitespace-pre-wrap">{block.newText}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {unchangedCount > 0 && (
            <div className="rounded-lg border border-border/20 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
              {unchangedCount} unchanged block{unchangedCount > 1 ? 's' : ''}
            </div>
          )}

          {changedBlocks.length === 0 && (
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
            onClick={handleApply}
            disabled={changedBlocks.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Apply selected changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
