// web-ui/src/components/studio/Dashboard/DocumentsDashboard.tsx
// Workshop tab — shows flows (tools) for creating documents
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { OnboardingHero } from './OnboardingHero'
import { FlowsView } from './FlowsView'
import { ProgressRing } from '@/components/studio/Builder/ProgressRing'
import type { StudioDocument } from '@/types/studio'
import type { BuilderBannerConfig } from '@/components/studio/Builder/BuilderView'

interface DocumentsDashboardProps {
  projectPath: string
  onOpenDocument: (docId: string) => void
  onSelectWorkflow: (workflowId: string, bannerConfig: BuilderBannerConfig | null) => void
}

export function DocumentsDashboard({
  projectPath,
  onOpenDocument,
  onSelectWorkflow,
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

  const handleSelectFlow = (
    workflowId: string,
    existingDoc: StudioDocument | null,
    repeatable: boolean
  ) => {
    if (!existingDoc) {
      // No existing doc — go straight to builder, no banner
      onSelectWorkflow(workflowId, null)
      return
    }
    if (repeatable) {
      // Repeatable flow — always create new, show info banner
      const existingCount = documents.filter(d => d.meta?.workflow_id === workflowId).length
      onSelectWorkflow(workflowId, {
        type: 'repeatable',
        flowName: existingDoc.meta?.workflow_id?.replace(/-/g, ' ') ?? workflowId,
        existingCount,
        repeatable: true,
      })
      return
    }
    // Non-repeatable with existing doc — resume with banner
    onSelectWorkflow(workflowId, {
      type: 'resume',
      documentName: existingDoc.meta?.name || existingDoc.name || workflowId,
      documentId: existingDoc.id,
    })
  }

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
          onStartGameBrief={() => {
            const existingGameBrief = documents.find(d => d.meta?.workflow_id === 'game-brief') ?? null
            handleSelectFlow('game-brief', existingGameBrief, false)
          }}
          projectName={projectPath ? projectPath.split('/').pop() : undefined}
        />
      )}
      <FlowsView
        documents={documents}
        onSelectFlow={handleSelectFlow}
        onOpenDocument={onOpenDocument}
      />
    </div>
  )
}
