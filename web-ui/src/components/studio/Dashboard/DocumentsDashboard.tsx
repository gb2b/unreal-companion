// web-ui/src/components/studio/Dashboard/DocumentsDashboard.tsx
// Workshop tab — shows flows (tools) for creating documents
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { OnboardingHero } from './OnboardingHero'
import { FlowsView } from './FlowsView'
import { ProgressRing } from '@/components/studio/Builder/ProgressRing'
import type { StudioDocument } from '@/types/studio'

interface DocumentsDashboardProps {
  projectPath: string
  onOpenDocument: (docId: string) => void
  onNewDocument: (workflowId: string) => void
}

export function DocumentsDashboard({
  projectPath,
  onOpenDocument,
  onNewDocument,
}: DocumentsDashboardProps) {
  const [documents, setDocuments] = useState<StudioDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

  // Calculate overall project progress
  const totalSections = documents.reduce((sum, doc) => sum + Object.keys(doc.meta?.sections || {}).length, 0)
  const completeSections = documents.reduce((sum, doc) =>
    sum + Object.values(doc.meta?.sections || {}).filter((s: any) => s.status === 'complete').length, 0
  )
  const projectPercent = totalSections > 0 ? (completeSections / totalSections) * 100 : 0

  const showHero = documents.length < 3

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-40 animate-pulse rounded-xl border border-border/30 bg-muted/40" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/30 bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Documents</h1>
        {projectPercent > 0 && <ProgressRing percent={projectPercent} />}
      </div>
      {showHero && (
        <OnboardingHero
          onStartGameBrief={() => onNewDocument('game-brief')}
          projectName={projectPath ? projectPath.split('/').pop() : undefined}
        />
      )}
      <FlowsView
        documents={documents}
        onNewDocument={onNewDocument}
        onOpenDocument={onOpenDocument}
      />
    </div>
  )
}
