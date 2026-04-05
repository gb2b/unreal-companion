// web-ui/src/components/studio/Dashboard/FlowsView.tsx
import { motion } from 'framer-motion'
import type { StudioDocument } from '@/types/studio'

interface FlowsViewProps {
  documents: StudioDocument[]
  onNewDocument: (workflowId: string) => void
  onOpenDocument: (docId: string) => void
}

// ── Flow definitions ────────────────────────────────────────────────────────

interface FlowDef {
  workflowId: string
  name: string
  icon: string
  description: string
  repeatable: boolean
}

interface FlowCategory {
  id: string
  name: string
  icon: string
  flows: FlowDef[]
}

const ESSENTIAL_FLOWS: FlowDef[] = [
  {
    workflowId: 'game-brief',
    name: 'Game Brief',
    icon: '🎯',
    description: "Define your game's vision, identity, core pillars, and target audience. The foundation everything else builds on.",
    repeatable: false,
  },
  {
    workflowId: 'gdd',
    name: 'Game Design Document',
    icon: '📖',
    description: 'Complete game design specification — gameplay, mechanics, progression, narrative, and technical requirements.',
    repeatable: false,
  },
]

const FLOW_CATEGORIES: FlowCategory[] = [
  {
    id: 'design',
    name: 'Design',
    icon: '🎨',
    flows: [
      { workflowId: 'level-design', name: 'Level Design', icon: '🗺️', description: 'Design a level, map, or environment — layout, flow, pacing, and encounters.', repeatable: true },
      { workflowId: 'art-direction', name: 'Art Direction', icon: '🎨', description: 'Define your visual identity — style, colors, mood, and references.', repeatable: false },
      { workflowId: 'audio-design', name: 'Audio Design', icon: '🎵', description: 'Plan your soundscape — music, SFX, ambiance, and audio direction.', repeatable: false },
      { workflowId: 'narrative', name: 'Narrative', icon: '📜', description: 'Craft story elements — characters, lore, quests, dialogues.', repeatable: true },
    ],
  },
  {
    id: 'concept',
    name: 'Concept & Exploration',
    icon: '💡',
    flows: [
      { workflowId: 'brainstorming', name: 'Brainstorming', icon: '🧠', description: 'Free-form idea exploration on any topic — mechanics, systems, themes.', repeatable: true },
      { workflowId: 'mood-board', name: 'Mood Board', icon: '🎭', description: 'Collect and organize visual references and inspirations.', repeatable: true },
      { workflowId: 'mind-map', name: 'Mind Map', icon: '🕸️', description: 'Map out concepts and their connections visually.', repeatable: true },
    ],
  },
  {
    id: 'technical',
    name: 'Technical',
    icon: '🏗️',
    flows: [
      { workflowId: 'game-architecture', name: 'Game Architecture', icon: '🏛️', description: 'Design your technical architecture — systems, stack, and data flow.', repeatable: false },
      { workflowId: 'diagram', name: 'Diagrams', icon: '📊', description: 'Generate technical or flow diagrams for your systems.', repeatable: true },
    ],
  },
  {
    id: 'production',
    name: 'Production',
    icon: '📋',
    flows: [
      { workflowId: 'sprint-planning', name: 'Sprint Planning', icon: '🗓️', description: 'Plan your next development sprint with clear tasks.', repeatable: true },
      { workflowId: 'dev-story', name: 'Dev Story', icon: '📝', description: 'Break down a feature into implementable tasks.', repeatable: true },
      { workflowId: 'code-review', name: 'Code Review', icon: '🔍', description: 'Review Blueprint or code implementation.', repeatable: true },
    ],
  },
]

// ── Components ──────────────────────────────────────────────────────────────

function EssentialCard({
  flow,
  document,
  onNew,
  onOpen,
}: {
  flow: FlowDef
  document?: StudioDocument
  onNew: () => void
  onOpen: (id: string) => void
}) {
  const hasDoc = !!document
  const isComplete = document?.meta?.status === 'complete'
  const sections = document?.meta?.sections || {}
  const filled = Object.values(sections).filter(s => s.status === 'complete').length
  const total = Object.keys(sections).length

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => hasDoc ? onOpen(document!.id) : onNew()}
      className={`flex-1 rounded-xl border p-5 text-left transition-all hover:shadow-lg ${
        isComplete
          ? 'border-accent/30 bg-accent/5 hover:border-accent/50 hover:shadow-accent/10'
          : hasDoc
            ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-primary/10'
            : 'border-border/50 bg-card hover:border-primary/30 hover:shadow-primary/5'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{flow.icon}</span>
        {isComplete && (
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
            ✓ Complete
          </span>
        )}
        {hasDoc && !isComplete && total > 0 && (
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {filled}/{total} sections
          </span>
        )}
        {!hasDoc && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            Not started
          </span>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold">{flow.name}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{flow.description}</p>
      {hasDoc && !isComplete && total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(filled / total) * 100}%` }}
          />
        </div>
      )}
    </motion.button>
  )
}

function FlowCard({ flow, onNew }: { flow: FlowDef; onNew: () => void }) {
  return (
    <button
      onClick={onNew}
      className="flex items-start gap-3 rounded-lg border border-border/30 bg-card/50 p-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="mt-0.5 text-lg">{flow.icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{flow.name}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{flow.description}</div>
      </div>
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function FlowsView({ documents, onNewDocument, onOpenDocument }: FlowsViewProps) {
  // Match existing documents to essential flows
  const findDoc = (workflowId: string) =>
    documents.find(d => d.meta?.workflow_id === workflowId)

  return (
    <div className="flex flex-col gap-8">
      {/* Essentials — Game Brief + GDD */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Essentials
        </h3>
        <div className="flex gap-4">
          {ESSENTIAL_FLOWS.map(flow => (
            <EssentialCard
              key={flow.workflowId}
              flow={flow}
              document={findDoc(flow.workflowId)}
              onNew={() => onNewDocument(flow.workflowId)}
              onOpen={onOpenDocument}
            />
          ))}
        </div>
      </section>

      {/* Flow categories */}
      {FLOW_CATEGORIES.map((category, idx) => (
        <motion.section
          key={category.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + idx * 0.05 }}
        >
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>{category.icon}</span>
            {category.name}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {category.flows.map(flow => (
              <FlowCard
                key={flow.workflowId}
                flow={flow}
                onNew={() => onNewDocument(flow.workflowId)}
              />
            ))}
          </div>
        </motion.section>
      ))}
    </div>
  )
}
