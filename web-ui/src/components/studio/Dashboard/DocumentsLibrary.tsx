// web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx
import { useState, useMemo } from 'react'
import { Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import { DocumentCard } from './DocumentCard'
import { TagFilter } from './TagFilter'
import { TagManager } from './TagManager'
import { ProjectContextCard } from './ProjectContextCard'
import { AttachModal } from '../Builder/AttachModal'
import type { StudioDocument } from '@/types/studio'

interface DocumentsLibraryProps {
  documents: StudioDocument[]
  onOpenDocument: (docId: string) => void
  onGoToWorkshop?: () => void
  projectPath?: string
  onRefresh?: () => void
  onOpenProjectContext?: () => void
}

type SortMode = 'recent' | 'name' | 'status'

export function DocumentsLibrary({ documents, onOpenDocument, onGoToWorkshop, projectPath = '', onRefresh, onOpenProjectContext }: DocumentsLibraryProps) {
  const [sortBy, setSortBy] = useState<SortMode>('recent')
  const [filter, setFilter] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagManagerDocId, setTagManagerDocId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const tagManagerDoc = tagManagerDocId ? documents.find(d => d.id === tagManagerDocId) : null

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // Collect all unique tags from all documents
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    documents.forEach(doc => {
      ;(doc.meta?.tags || []).forEach(t => tagSet.add(t))
    })
    return Array.from(tagSet).sort()
  }, [documents])

  // Filter: text search + tag AND logic
  const filtered = documents.filter(doc => {
    if (filter) {
      const q = filter.toLowerCase()
      const matchesText =
        doc.name?.toLowerCase().includes(q) ||
        doc.id?.toLowerCase().includes(q) ||
        doc.meta?.workflow_id?.toLowerCase().includes(q)
      if (!matchesText) return false
    }
    if (selectedTags.length > 0) {
      const docTags = doc.meta?.tags || []
      return selectedTags.every(t => docTags.includes(t))
    }
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'recent') {
      return (b.meta?.updated || '').localeCompare(a.meta?.updated || '')
    }
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '')
    }
    if (sortBy === 'status') {
      const order = { complete: 0, in_progress: 1, draft: 2, empty: 3 }
      return (order[a.meta?.status as keyof typeof order] ?? 3) - (order[b.meta?.status as keyof typeof order] ?? 3)
    }
    return 0
  })

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar — top row */}
      <div className="flex items-center gap-3">
        {onGoToWorkshop && (
          <button
            onClick={onGoToWorkshop}
            className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            + New
          </button>
        )}
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 rounded-lg border border-border/30 bg-card px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
        />
        <div className="flex items-center gap-1 rounded-lg border border-border/30 p-0.5">
          {(['recent', 'name', 'status'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                sortBy === mode
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'recent' ? 'Recent' : mode === 'name' ? 'Name' : 'Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter row */}
      {allTags.length > 0 && (
        <TagFilter
          availableTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClearAll={() => setSelectedTags([])}
        />
      )}

      {/* Project Context — header card */}
      {projectPath && onOpenProjectContext && (
        <ProjectContextCard
          projectPath={projectPath}
          onOpen={onOpenProjectContext}
          documents={documents}
        />
      )}

      {/* Documents grid or empty state */}
      {sorted.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <DocumentCard
                document={doc}
                onClick={onOpenDocument}
                projectPath={projectPath}
                onRenamed={onRefresh}
                onDeleted={onRefresh}
                onManageTags={projectPath ? (docId) => setTagManagerDocId(docId) : undefined}
              />
            </motion.div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-4 text-5xl opacity-40">📚</span>
          <h3 className="text-lg font-semibold">Your library is empty</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Documents you create in the Workshop will appear here.
          </p>
          {onGoToWorkshop && (
            <button
              onClick={onGoToWorkshop}
              className="mt-4 rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Open Workshop →
            </button>
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {selectedTags.length > 0
            ? `No documents match the selected tag${selectedTags.length > 1 ? 's' : ''}`
            : `No documents match "${filter}"`}
        </p>
      )}

      {/* Tag Manager Modal */}
      {tagManagerDoc && projectPath && (
        <TagManager
          isOpen={true}
          onClose={() => setTagManagerDocId(null)}
          documentId={tagManagerDoc.id}
          currentTags={tagManagerDoc.meta.tags || []}
          projectPath={projectPath}
          onTagsUpdated={() => {
            setTagManagerDocId(null)
            onRefresh?.()
          }}
        />
      )}

      {/* Upload Modal */}
      {uploadOpen && projectPath && (
        <AttachModal
          isOpen={true}
          onClose={() => { setUploadOpen(false); onRefresh?.() }}
          onAttach={() => { setUploadOpen(false); onRefresh?.() }}
          projectPath={projectPath}
        />
      )}
    </div>
  )
}
