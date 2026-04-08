// web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx
import { useState, useMemo } from 'react'
import { DocumentCard } from './DocumentCard'
import { ReferenceCard } from './ReferenceCard'
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

function groupByDate(docs: StudioDocument[]): Array<{ label: string; docs: StudioDocument[] }> {
  const groups: Array<{ label: string; docs: StudioDocument[] }> = []
  const now = new Date()
  const today = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).getTime()

  const todayDocs: StudioDocument[] = []
  const yesterdayDocs: StudioDocument[] = []
  const thisWeekDocs: StudioDocument[] = []
  const olderDocs: StudioDocument[] = []

  for (const doc of docs) {
    const d = new Date(doc.meta?.updated || doc.meta?.created || '')
    if (d.toDateString() === today) todayDocs.push(doc)
    else if (d.toDateString() === yesterday) yesterdayDocs.push(doc)
    else if (d.getTime() > weekAgo) thisWeekDocs.push(doc)
    else olderDocs.push(doc)
  }

  if (todayDocs.length) groups.push({ label: 'Today', docs: todayDocs })
  if (yesterdayDocs.length) groups.push({ label: 'Yesterday', docs: yesterdayDocs })
  if (thisWeekDocs.length) groups.push({ label: 'Earlier this week', docs: thisWeekDocs })
  if (olderDocs.length) groups.push({ label: 'Older', docs: olderDocs })
  return groups
}

const CATEGORY_PILLS = ['concept', 'design', 'technical', 'production']
const STATUS_PILLS = ['in_progress', 'complete', 'empty'] as const
const STATUS_LABELS: Record<string, string> = { in_progress: 'In Progress', complete: 'Complete', empty: 'Empty' }
const REF_TYPE_PILLS = [
  { key: 'image', label: '\uD83C\uDFA8 Images' },
  { key: 'pdf', label: '\uD83D\uDCC4 PDFs' },
  { key: 'doc', label: '\uD83D\uDCC3 Documents' },
  { key: 'other', label: '\uD83D\uDCE6 Other' },
]

function detectRefType(doc: StudioDocument): string {
  const tags = doc.meta?.tags ?? []
  if (tags.includes('image')) return 'image'
  const name = doc.name.toLowerCase()
  const ct = doc.meta?.content_type ?? ''
  if (name.endsWith('.pdf') || ct.includes('pdf')) return 'pdf'
  if (name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.doc') || name.endsWith('.docx')) return 'doc'
  return 'other'
}

export function DocumentsLibrary({ documents, onOpenDocument, onGoToWorkshop, projectPath = '', onRefresh, onOpenProjectContext }: DocumentsLibraryProps) {
  const [sortBy, setSortBy] = useState<SortMode>('recent')
  const [filter, setFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'docs' | 'refs'>('docs')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedRefTypes, setSelectedRefTypes] = useState<string[]>([])
  const [tagManagerDocId, setTagManagerDocId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const tagManagerDoc = tagManagerDocId ? documents.find(d => d.id === tagManagerDocId) : null

  // Split documents vs references
  const workflowDocs = useMemo(() =>
    documents.filter(d => !(d.meta?.tags || []).includes('reference')),
    [documents]
  )
  const references = useMemo(() =>
    documents.filter(d => (d.meta?.tags || []).includes('reference')),
    [documents]
  )

  // Last worked on
  const lastWorkedId = useMemo(() =>
    workflowDocs
      .filter(d => d.meta?.status === 'in_progress')
      .sort((a, b) => (b.meta?.updated || '').localeCompare(a.meta?.updated || ''))
      [0]?.id || null,
    [workflowDocs]
  )

  // Filter + sort workflow docs
  const filteredDocs = useMemo(() => {
    let docs = workflowDocs
    if (filter) {
      const q = filter.toLowerCase()
      docs = docs.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.meta?.workflow_id?.toLowerCase().includes(q)
      )
    }
    if (selectedCategories.length > 0) {
      docs = docs.filter(d => {
        const tags = d.meta?.tags || []
        return selectedCategories.some(c => tags.includes(c))
      })
    }
    if (selectedStatuses.length > 0) {
      docs = docs.filter(d => selectedStatuses.includes(d.meta?.status || 'empty'))
    }
    return docs
  }, [workflowDocs, filter, selectedCategories, selectedStatuses])

  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      if (sortBy === 'recent') return (b.meta?.updated || '').localeCompare(a.meta?.updated || '')
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'status') {
        const order = { complete: 0, in_progress: 1, draft: 2, empty: 3 }
        return (order[a.meta?.status as keyof typeof order] ?? 3) - (order[b.meta?.status as keyof typeof order] ?? 3)
      }
      return 0
    })
  }, [filteredDocs, sortBy])

  const dateGroups = useMemo(() => groupByDate(sortedDocs), [sortedDocs])

  // Filter references
  const filteredRefs = useMemo(() => {
    let refs = references
    if (filter) {
      const q = filter.toLowerCase()
      refs = refs.filter(d => d.name?.toLowerCase().includes(q))
    }
    if (selectedRefTypes.length > 0) {
      refs = refs.filter(d => selectedRefTypes.includes(detectRefType(d)))
    }
    return refs
  }, [references, filter, selectedRefTypes])

  // Toggle helpers
  const toggleCategory = (c: string) =>
    setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const toggleStatus = (s: string) =>
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleRefType = (t: string) =>
    setSelectedRefTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const allCategoriesOff = selectedCategories.length === 0 && selectedStatuses.length === 0
  const allRefTypesOff = selectedRefTypes.length === 0

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-[10px] mb-5">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 bg-card border border-border rounded-lg px-3.5 py-[9px] text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40"
        />
        <div className="flex border border-border rounded-lg overflow-hidden">
          {(['recent', 'name', 'status'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              className={`border-none text-[11px] px-3 py-2 cursor-pointer transition-all duration-150 ${
                sortBy === mode
                  ? 'text-primary bg-primary/[0.08]'
                  : 'text-muted-foreground/50 hover:text-muted-foreground bg-transparent'
              }`}
            >
              {mode === 'recent' ? 'Recent' : mode === 'name' ? 'Name' : 'Status'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Project Context Card ── */}
      {projectPath && onOpenProjectContext && (
        <div className="mb-5">
          <ProjectContextCard
            projectPath={projectPath}
            onOpen={onOpenProjectContext}
            documents={documents}
          />
        </div>
      )}

      {/* ── Tabs Row ── */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveTab('docs')}
          className={`bg-transparent border-none text-[12px] font-semibold px-4 py-[10px] cursor-pointer transition-all duration-150 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'docs'
              ? 'text-primary border-b-primary'
              : 'text-muted-foreground/50 border-b-transparent hover:text-muted-foreground'
          }`}
        >
          {'\uD83D\uDCC4'} Documents
          <span className={`text-[10px] px-[7px] py-px rounded-[10px] ${
            activeTab === 'docs'
              ? 'bg-primary/[0.12] text-primary'
              : 'bg-border/40 text-muted-foreground/50'
          }`}>
            {workflowDocs.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('refs')}
          className={`bg-transparent border-none text-[12px] font-semibold px-4 py-[10px] cursor-pointer transition-all duration-150 border-b-2 flex items-center gap-1.5 ${
            activeTab === 'refs'
              ? 'text-primary border-b-primary'
              : 'text-muted-foreground/50 border-b-transparent hover:text-muted-foreground'
          }`}
        >
          {'\uD83D\uDCCE'} References
          <span className={`text-[10px] px-[7px] py-px rounded-[10px] ${
            activeTab === 'refs'
              ? 'bg-primary/[0.12] text-primary'
              : 'bg-border/40 text-muted-foreground/50'
          }`}>
            {references.length}
          </span>
        </button>
      </div>

      {/* ── Documents Tab ── */}
      {activeTab === 'docs' && (
        <div>
          {/* Filter row */}
          <div className="flex items-center gap-1.5 flex-wrap py-[10px] pb-3.5 border-b border-border/30 mb-3.5">
            <button
              onClick={() => { setSelectedCategories([]); setSelectedStatuses([]) }}
              className={`text-[10px] font-medium px-[10px] py-1 rounded-full border cursor-pointer transition-all duration-150 ${
                allCategoriesOff
                  ? 'text-primary border-primary/30 bg-primary/[0.06]'
                  : 'text-muted-foreground/50 border-border bg-transparent hover:text-muted-foreground hover:border-border/40'
              }`}
            >
              All
            </button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            {CATEGORY_PILLS.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`text-[10px] font-medium px-[10px] py-1 rounded-full border cursor-pointer transition-all duration-150 ${
                  selectedCategories.includes(cat)
                    ? 'text-primary border-primary/30 bg-primary/[0.06]'
                    : 'text-muted-foreground/50 border-border bg-transparent hover:text-muted-foreground hover:border-border/40'
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="w-px h-4 bg-border/40 mx-1" />
            {STATUS_PILLS.map(status => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`text-[10px] font-medium px-[10px] py-1 rounded-full border cursor-pointer transition-all duration-150 ${
                  selectedStatuses.includes(status)
                    ? 'text-primary border-primary/30 bg-primary/[0.06]'
                    : 'text-muted-foreground/50 border-border bg-transparent hover:text-muted-foreground hover:border-border/40'
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {/* New Document Banner */}
          {onGoToWorkshop && (
            <div
              onClick={onGoToWorkshop}
              className="flex items-center justify-center gap-[10px] px-5 py-3.5 mb-4 rounded-[10px] border-2 border-dashed border-border cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.03] group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[18px] text-primary font-light transition-all duration-200 group-hover:bg-primary/[0.18] group-hover:scale-105">
                +
              </div>
              <div className="text-[13px] font-semibold text-muted-foreground/50 transition-colors duration-200 group-hover:text-primary">
                New Document
              </div>
              <div className="text-[11px] text-muted-foreground/50 opacity-50 ml-auto">
                Start a new workflow in the Workshop
              </div>
            </div>
          )}

          {/* Date groups */}
          {dateGroups.length > 0 ? (
            dateGroups.map(group => (
              <div key={group.label} className="mt-5 first:mt-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50 mb-[10px] pl-0.5">
                  {group.label}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3">
                  {group.docs.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onClick={onOpenDocument}
                      projectPath={projectPath}
                      onRenamed={onRefresh}
                      onDeleted={onRefresh}
                      onManageTags={projectPath ? (docId) => setTagManagerDocId(docId) : undefined}
                      isLastWorked={doc.id === lastWorkedId}
                      onContinue={doc.id === lastWorkedId ? () => onOpenDocument(doc.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : workflowDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-4 text-5xl opacity-40">{'\uD83D\uDCDA'}</span>
              <h3 className="text-lg font-semibold">Your library is empty</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Documents you create in the Workshop will appear here.
              </p>
              {onGoToWorkshop && (
                <button
                  onClick={onGoToWorkshop}
                  className="mt-4 rounded-lg bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
                >
                  Open Workshop
                </button>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No documents match the current filters
            </p>
          )}
        </div>
      )}

      {/* ── References Tab ── */}
      {activeTab === 'refs' && (
        <div>
          {/* Filter row */}
          <div className="flex items-center gap-1.5 flex-wrap py-[10px] pb-3.5 border-b border-border/30 mb-3.5">
            <button
              onClick={() => setSelectedRefTypes([])}
              className={`text-[10px] font-medium px-[10px] py-1 rounded-full border cursor-pointer transition-all duration-150 ${
                allRefTypesOff
                  ? 'text-primary border-primary/30 bg-primary/[0.06]'
                  : 'text-muted-foreground/50 border-border bg-transparent hover:text-muted-foreground hover:border-border/40'
              }`}
            >
              All
            </button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            {REF_TYPE_PILLS.map(rt => (
              <button
                key={rt.key}
                onClick={() => toggleRefType(rt.key)}
                className={`text-[10px] font-medium px-[10px] py-1 rounded-full border cursor-pointer transition-all duration-150 ${
                  selectedRefTypes.includes(rt.key)
                    ? 'text-primary border-primary/30 bg-primary/[0.06]'
                    : 'text-muted-foreground/50 border-border bg-transparent hover:text-muted-foreground hover:border-border/40'
                }`}
              >
                {rt.label}
              </button>
            ))}
          </div>

          {/* References grid */}
          {filteredRefs.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[10px]">
              {filteredRefs.map(doc => (
                <ReferenceCard
                  key={doc.id}
                  document={doc}
                  projectPath={projectPath}
                  onClick={() => onOpenDocument(doc.id)}
                />
              ))}
            </div>
          ) : references.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No references uploaded yet
            </p>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No references match the current filters
            </p>
          )}

          {/* Upload zone */}
          {projectPath && (
            <div
              onClick={() => setUploadOpen(true)}
              className="border-2 border-dashed border-border rounded-[10px] px-6 py-6 text-center cursor-pointer transition-all duration-150 mt-3 hover:border-primary/30 hover:bg-primary/[0.02]"
            >
              <p className="text-[12px] text-muted-foreground/50">
                Drop files here or <span className="text-primary underline">browse</span>
              </p>
            </div>
          )}
        </div>
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
