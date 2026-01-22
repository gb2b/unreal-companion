import { useState, useEffect } from 'react'
import { 
  FileText, 
  CheckSquare, 
  Box,
  X,
  Search,
  Plus,
  Check,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useStudioStore } from '@/stores/studioStore'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface Document {
  name: string
  path: string
  type: string
  size?: number
}

interface SelectedContext {
  type: 'document' | 'task' | 'asset'
  id: string
  name: string
  content?: string
}

interface ContextPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (contexts: SelectedContext[]) => void
  selectedContexts?: SelectedContext[]
}

export function ContextPicker({ isOpen, onClose, onSelect, selectedContexts = [] }: ContextPickerProps) {
  const { currentProject } = useProjectStore()
  const { tasks } = useStudioStore()
  const [tab, setTab] = useState<'documents' | 'tasks' | 'assets'>('documents')
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SelectedContext[]>(selectedContexts)

  useEffect(() => {
    if (!isOpen || !currentProject) return
    
    const fetchDocuments = async () => {
      setIsLoading(true)
      try {
        const data = await api.get<{ documents: Document[] }>(
          `/api/projects/${currentProject.id}/documents`
        )
        setDocuments(data.documents || [])
      } catch (error) {
        console.error('Failed to fetch documents:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDocuments()
  }, [isOpen, currentProject])

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelection = (context: SelectedContext) => {
    const exists = selected.find(s => s.id === context.id && s.type === context.type)
    if (exists) {
      setSelected(selected.filter(s => !(s.id === context.id && s.type === context.type)))
    } else {
      setSelected([...selected, context])
    }
  }

  const isSelected = (type: string, id: string) => 
    selected.some(s => s.id === id && s.type === type)

  const handleConfirm = () => {
    onSelect(selected)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Add Context</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-border">
          {[
            { id: 'documents', icon: FileText, label: 'Documents' },
            { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
            { id: 'assets', icon: Box, label: 'Assets' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                tab === t.id 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tab === 'documents' ? (
            filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No documents found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDocuments.map(doc => (
                  <button
                    key={doc.path}
                    onClick={() => toggleSelection({
                      type: 'document',
                      id: doc.path,
                      name: doc.name
                    })}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      isSelected('document', doc.path)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.type}</p>
                    </div>
                    {isSelected('document', doc.path) && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )
          ) : tab === 'tasks' ? (
            filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tasks found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => toggleSelection({
                      type: 'task',
                      id: task.id,
                      name: task.title,
                      content: task.description
                    })}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      isSelected('task', task.id)
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{task.status}</p>
                    </div>
                    {isSelected('task', task.id) && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Asset browser coming soon
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {selected.length} item{selected.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selected.length === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Add to Context
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version to show selected contexts
export function ContextBadges({ 
  contexts, 
  onRemove 
}: { 
  contexts: SelectedContext[]
  onRemove: (context: SelectedContext) => void 
}) {
  if (contexts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {contexts.map(ctx => (
        <div 
          key={`${ctx.type}-${ctx.id}`}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs"
        >
          {ctx.type === 'document' && <FileText className="h-3 w-3" />}
          {ctx.type === 'task' && <CheckSquare className="h-3 w-3" />}
          {ctx.type === 'asset' && <Box className="h-3 w-3" />}
          <span className="max-w-24 truncate">{ctx.name}</span>
          <button 
            onClick={() => onRemove(ctx)}
            className="hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
