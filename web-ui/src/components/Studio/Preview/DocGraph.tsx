// web-ui/src/components/Studio/Preview/DocGraph.tsx
/**
 * Document dependency graph.
 * Nodes = documents, Edges = dependencies.
 * Color-coded by status: green (done), yellow (in progress), gray (not started).
 * Upgrade to React Flow (@xyflow/react) for full graph visualization.
 */
import type { StudioDocument } from '@/types/studio'

interface DocGraphProps {
  documents: StudioDocument[]
  onNodeClick: (docId: string) => void
}

export function DocGraph({ documents, onNodeClick }: DocGraphProps) {
  const statusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'border-green-500 bg-green-500/10'
      case 'in_progress': return 'border-yellow-500 bg-yellow-500/10'
      default: return 'border-muted-foreground/30 bg-muted/10'
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Document Graph</h3>
      <div className="flex flex-col gap-2">
        {documents.map(doc => (
          <button
            key={doc.id}
            onClick={() => onNodeClick(doc.id)}
            className={`rounded-lg border-2 px-3 py-2 text-left transition-all hover:shadow-sm ${statusColor(doc.meta.status)}`}
          >
            <span className="text-sm font-medium text-foreground">{doc.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">{doc.meta.status}</span>
          </button>
        ))}
      </div>
      {documents.length === 0 && (
        <p className="text-xs text-muted-foreground">No documents to display.</p>
      )}
    </div>
  )
}
