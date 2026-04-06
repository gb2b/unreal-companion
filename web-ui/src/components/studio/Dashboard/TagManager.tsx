// web-ui/src/components/studio/Dashboard/TagManager.tsx
import { useState, useEffect, useRef } from 'react'

interface TagManagerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  currentTags: string[]
  projectPath: string
  onTagsUpdated: (tags: string[]) => void
}

const SYSTEM_TAGS = [
  'concept', 'design', 'technical', 'production',
  'document', 'reference', 'image', 'asset-3d',
  'complete', 'in-progress', 'draft',
]

export function TagManager({
  isOpen,
  onClose,
  documentId,
  currentTags,
  projectPath,
  onTagsUpdated,
}: TagManagerProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags)
  const [customTags, setCustomTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load custom tags when modal opens
  useEffect(() => {
    if (!isOpen || !projectPath) return
    fetch(`/api/v2/studio/tags?project_path=${encodeURIComponent(projectPath)}`)
      .then(r => r.json())
      .then(data => {
        setCustomTags(data.custom_tags || [])
      })
      .catch(() => {})
  }, [isOpen, projectPath])

  // Reset selection when document changes
  useEffect(() => {
    setSelectedTags(currentTags)
  }, [currentTags, documentId])

  if (!isOpen) return null

  const allDisplayTags = [...SYSTEM_TAGS, ...customTags.filter(t => !SYSTEM_TAGS.includes(t))]

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleCreateTag() {
    const name = newTagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!name) return
    try {
      const res = await fetch('/api/v2/studio/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath, name }),
      })
      const data = await res.json()
      if (data.success) {
        const tag = data.tag || name
        setCustomTags(prev => (prev.includes(tag) ? prev : [...prev, tag]))
        setSelectedTags(prev => (prev.includes(tag) ? prev : [...prev, tag]))
        setNewTagInput('')
        inputRef.current?.focus()
      }
    } catch {
      // silently ignore
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateTag()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/v2/studio/documents/${encodeURIComponent(documentId)}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_path: projectPath, tags: selectedTags }),
      })
      onTagsUpdated(selectedTags)
    } catch {
      // silently ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    /* Modal overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
          <h2 className="text-sm font-semibold">Manage tags</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Tag grid */}
        <div className="max-h-64 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {allDisplayTags.map(tag => {
              const isSelected = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-all ${
                    isSelected
                      ? 'border-primary/50 bg-primary/15 text-primary font-medium'
                      : 'border-border/30 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Create new tag */}
        <div className="border-t border-border/30 px-4 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New tag name..."
              className="flex-1 rounded-lg border border-border/30 bg-background px-3 py-1.5 text-sm placeholder-muted-foreground outline-none focus:border-primary/50"
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTagInput.trim()}
              className="rounded-lg border border-border/30 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              + Add
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border/30 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
