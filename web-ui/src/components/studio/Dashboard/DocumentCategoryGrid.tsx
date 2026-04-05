// web-ui/src/components/studio/Dashboard/DocumentCategoryGrid.tsx
import { motion } from 'framer-motion'
import { DocumentCard } from './DocumentCard'
import type { StudioDocument } from '@/types/studio'

// ── Types ────────────────────────────────────────────────────────────────────

interface CategoryWorkflow {
  workflowId: string
  name: string
  icon: string
  document?: StudioDocument
  repeatable: boolean
}

interface DocumentCategory {
  id: string
  name: string
  icon: string
  workflows: CategoryWorkflow[]
}

interface DocumentCategoryGridProps {
  categories: DocumentCategory[]
  onOpenDocument: (docId: string) => void
  onNewDocument: (workflowId: string) => void
}

// ── Default categories ────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: DocumentCategory[] = [
  {
    id: 'concept',
    name: 'Concept',
    icon: '💡',
    workflows: [
      { workflowId: 'game-brief',    name: 'Game Brief',    icon: '🎮', repeatable: false },
      { workflowId: 'brainstorming', name: 'Brainstorming', icon: '📝', repeatable: true  },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    icon: '🎨',
    workflows: [
      { workflowId: 'gdd',           name: 'GDD',           icon: '📖', repeatable: false },
      { workflowId: 'level-design',  name: 'Level Design',  icon: '🗺️', repeatable: false },
      { workflowId: 'art-direction', name: 'Art Direction', icon: '🎨', repeatable: false },
      { workflowId: 'audio-design',  name: 'Audio Design',  icon: '🎵', repeatable: false },
      { workflowId: 'narrative',     name: 'Narrative',     icon: '📜', repeatable: false },
    ],
  },
  {
    id: 'technical',
    name: 'Technical',
    icon: '🏗️',
    workflows: [
      { workflowId: 'game-architecture', name: 'Game Architecture', icon: '🏛️', repeatable: false },
      { workflowId: 'diagrams',          name: 'Diagrams',          icon: '📊', repeatable: false },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    icon: '📋',
    workflows: [
      { workflowId: 'sprint-planning', name: 'Sprint Planning', icon: '🗓️', repeatable: true },
      { workflowId: 'dev-stories',     name: 'Dev Stories',     icon: '📝', repeatable: true },
      { workflowId: 'code-review',     name: 'Code Review',     icon: '🔍', repeatable: true },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentCategoryGrid({
  categories,
  onOpenDocument,
  onNewDocument,
}: DocumentCategoryGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {categories.map((category, catIndex) => {
        const filled = category.workflows.filter(w => w.document).length
        const total  = category.workflows.length

        return (
          <motion.section
            key={category.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: catIndex * 0.07 }}
          >
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{category.icon}</span>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {filled}/{total}
                </span>
              </div>
              <button
                onClick={() => onNewDocument(category.workflows[0]?.workflowId ?? '')}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                + New
              </button>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {category.workflows.map(workflow => {
                if (workflow.document) {
                  return (
                    <DocumentCard
                      key={workflow.workflowId}
                      document={workflow.document}
                      onClick={onOpenDocument}
                    />
                  )
                }

                // Empty slot — dashed border
                return (
                  <button
                    key={workflow.workflowId}
                    onClick={() => onNewDocument(workflow.workflowId)}
                    className="flex min-h-[80px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="text-xl">{workflow.icon}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {workflow.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.section>
        )
      })}
    </div>
  )
}
