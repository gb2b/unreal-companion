// web-ui/src/components/Studio/Dashboard/Dashboard.tsx
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { DocumentCard } from './DocumentCard'
import type { StudioDocument } from '@/types/studio'

interface DashboardProps {
  projectPath: string
  onOpenDocument: (docId: string) => void
}

export function Dashboard({ projectPath, onOpenDocument }: DashboardProps) {
  const [documents, setDocuments] = useState<StudioDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectPath) return
    setLoading(true)
    api
      .get<{ documents: StudioDocument[] }>(`/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`)
      .then(res => setDocuments(res.documents))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [projectPath])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-muted-foreground">Loading documents...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + New Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-12 text-center">
          <p className="text-muted-foreground">No documents yet. Start a workflow to create your first document.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map(doc => (
            <DocumentCard key={doc.id} document={doc} onClick={onOpenDocument} />
          ))}
        </div>
      )}
    </div>
  )
}
