import { useMemo, useState, useCallback } from 'react'
import { diffLines } from 'diff'

interface UnifiedDiffProps {
  oldText: string
  newText: string
  oldLabel?: string
  newLabel?: string
  contextLines?: number
  maxHeight?: string
}

interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  oldNum?: number
  newNum?: number
}

interface DiffHunk {
  lines: DiffLine[]
  collapsedCount?: number
  collapsedStart?: number
}

export function UnifiedDiff({
  oldText,
  newText,
  oldLabel,
  newLabel,
  contextLines = 3,
  maxHeight = '400px',
}: UnifiedDiffProps) {
  const [expandedHunks, setExpandedHunks] = useState<Set<number>>(new Set())

  const { lines, added, removed } = useMemo(() => {
    const changes = diffLines(oldText, newText)
    const allLines: DiffLine[] = []
    let oldNum = 1
    let newNum = 1
    let addCount = 0
    let removeCount = 0

    for (const change of changes) {
      const rawLines = change.value.replace(/\n$/, '').split('\n')
      if (change.added) {
        addCount += rawLines.length
        for (const line of rawLines) {
          allLines.push({ type: 'add', content: line, newNum: newNum++ })
        }
      } else if (change.removed) {
        removeCount += rawLines.length
        for (const line of rawLines) {
          allLines.push({ type: 'remove', content: line, oldNum: oldNum++ })
        }
      } else {
        for (const line of rawLines) {
          allLines.push({ type: 'context', content: line, oldNum: oldNum++, newNum: newNum++ })
        }
      }
    }
    return { lines: allLines, added: addCount, removed: removeCount }
  }, [oldText, newText])

  const hunks = useMemo(() => {
    if (lines.length === 0) return []

    // Find ranges of changed lines
    const changedIndices = new Set<number>()
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].type !== 'context') {
        for (let j = Math.max(0, i - contextLines); j <= Math.min(lines.length - 1, i + contextLines); j++) {
          changedIndices.add(j)
        }
      }
    }

    // If no changes, show a message
    if (changedIndices.size === 0) {
      return [{ lines, collapsedCount: undefined, collapsedStart: undefined }] as DiffHunk[]
    }

    // Build hunks: visible lines + collapsed sections
    const result: DiffHunk[] = []
    let i = 0
    while (i < lines.length) {
      if (changedIndices.has(i)) {
        // Visible chunk
        const hunkLines: DiffLine[] = []
        while (i < lines.length && changedIndices.has(i)) {
          hunkLines.push(lines[i])
          i++
        }
        result.push({ lines: hunkLines })
      } else {
        // Collapsed chunk
        const start = i
        while (i < lines.length && !changedIndices.has(i)) {
          i++
        }
        const count = i - start
        result.push({
          lines: lines.slice(start, i),
          collapsedCount: count,
          collapsedStart: start,
        })
      }
    }
    return result
  }, [lines, contextLines])

  const toggleHunk = useCallback((idx: number) => {
    setExpandedHunks(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const maxOldNum = lines.reduce((m, l) => Math.max(m, l.oldNum ?? 0), 0)
  const maxNewNum = lines.reduce((m, l) => Math.max(m, l.newNum ?? 0), 0)
  const gutterWidth = Math.max(String(maxOldNum).length, String(maxNewNum).length, 2)

  return (
    <div className="rounded-lg border border-border/40 bg-background overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-3 text-[11px]">
          {oldLabel && <span className="text-muted-foreground/60">{oldLabel}</span>}
          {newLabel && (
            <>
              {oldLabel && <span className="text-muted-foreground/30">-&gt;</span>}
              <span className="text-muted-foreground/60">{newLabel}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {added > 0 && <span className="text-emerald-400">+{added}</span>}
          {removed > 0 && <span className="text-red-400">-{removed}</span>}
          {added === 0 && removed === 0 && <span className="text-muted-foreground/40">No changes</span>}
        </div>
      </div>

      {/* Diff body */}
      <div className="overflow-y-auto font-mono leading-5" style={{ maxHeight }}>
        {hunks.map((hunk, hunkIdx) => {
          // Collapsed section
          if (hunk.collapsedCount !== undefined && !expandedHunks.has(hunkIdx)) {
            return (
              <button
                key={hunkIdx}
                onClick={() => toggleHunk(hunkIdx)}
                className="w-full px-3 py-0.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-muted/20 transition-colors text-center border-y border-border/10"
              >
                ··· {hunk.collapsedCount} unchanged line{hunk.collapsedCount > 1 ? 's' : ''} ···
              </button>
            )
          }

          // Visible lines (or expanded collapsed section)
          const linesToRender = hunk.lines
          return (
            <div key={hunkIdx}>
              {hunk.collapsedCount !== undefined && expandedHunks.has(hunkIdx) && (
                <button
                  onClick={() => toggleHunk(hunkIdx)}
                  className="w-full px-3 py-0.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-muted/20 transition-colors text-center border-y border-border/10"
                >
                  ··· collapse ···
                </button>
              )}
              {linesToRender.map((line, lineIdx) => (
                <div
                  key={lineIdx}
                  className={
                    line.type === 'add'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : line.type === 'remove'
                        ? 'bg-red-500/10 text-red-300'
                        : 'text-muted-foreground/50'
                  }
                >
                  <div className="flex">
                    {/* Old line number */}
                    <span className="shrink-0 select-none text-right text-muted-foreground/20 pr-1 border-r border-border/10"
                      style={{ width: `${gutterWidth + 0.5}ch` }}
                    >
                      {line.type !== 'add' ? line.oldNum : ''}
                    </span>
                    {/* New line number */}
                    <span className="shrink-0 select-none text-right text-muted-foreground/20 pr-1 border-r border-border/10"
                      style={{ width: `${gutterWidth + 0.5}ch` }}
                    >
                      {line.type !== 'remove' ? line.newNum : ''}
                    </span>
                    {/* Prefix */}
                    <span className="shrink-0 select-none w-4 text-center">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    </span>
                    {/* Content */}
                    <span className="flex-1 whitespace-pre-wrap break-all pr-2">
                      {line.content || '\u00A0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
