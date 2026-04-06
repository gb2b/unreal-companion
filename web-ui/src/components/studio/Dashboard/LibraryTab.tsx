// web-ui/src/components/studio/Dashboard/LibraryTab.tsx
// Wrapper for the Library tab — loads StudioDocument[] from the API
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/services/api'
import { DocumentsLibrary } from './DocumentsLibrary'
import type { StudioDocument } from '@/types/studio'

interface LibraryTabProps {
  projectPath: string
  onOpenDocument: (docId: string) => void
  onGoToWorkshop?: () => void
}

export function LibraryTab({ projectPath, onOpenDocument, onGoToWorkshop }: LibraryTabProps) {
  const [documents, setDocuments] = useState<StudioDocument[]>([])
  const [loading, setLoading] = useState(true)

  const loadDocuments = useCallback(() => {
    if (!projectPath) { setLoading(false); return }
    setLoading(true)
    api
      .get<{ documents: StudioDocument[] }>(
        `/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`
      )
      .then(res => setDocuments(res.documents ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [projectPath])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/30 bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <DocumentsLibrary
      documents={documents}
      onOpenDocument={onOpenDocument}
      onGoToWorkshop={onGoToWorkshop}
      projectPath={projectPath}
      onRefresh={loadDocuments}
      onOpenProjectContext={() => onOpenDocument('__project-context__')}
    />
  )
}
