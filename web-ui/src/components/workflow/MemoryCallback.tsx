/**
 * MemoryCallback - Contextual reminders from previous sessions/answers
 *
 * Displays callbacks to previous user inputs to create a connected,
 * personalized experience. Shows the agent "remembers" what the user said.
 *
 * Use cases:
 * - Referencing earlier answers in the current workflow
 * - Connecting concepts from different documents (Brief → GDD)
 * - Showing continuity between sessions
 */

import React from 'react'
import { motion } from 'framer-motion'
import {
  Quote,
  Link2,
  Clock,
  FileText,
  MessageSquare,
  ArrowRight,
  Sparkles,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/useI18n'

export type MemorySourceType =
  | 'workflow_answer'    // Answer from current or previous workflow
  | 'document'           // Content from a document (brief, GDD, etc.)
  | 'conversation'       // From a chat conversation
  | 'session'            // From a previous session

interface SourceConfig {
  icon: React.ElementType
  label: string
  color: string
  bgColor: string
}

const SOURCE_CONFIGS: Record<MemorySourceType, SourceConfig> = {
  workflow_answer: {
    icon: MessageSquare,
    label: 'memory.source.workflow',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10'
  },
  document: {
    icon: FileText,
    label: 'memory.source.document',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10'
  },
  conversation: {
    icon: MessageSquare,
    label: 'memory.source.conversation',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10'
  },
  session: {
    icon: History,
    label: 'memory.source.session',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10'
  }
}

export interface MemoryItem {
  id: string
  content: string
  source: MemorySourceType
  sourceLabel?: string  // e.g., "Game Brief", "Step 3: Genre"
  timestamp?: string
  relevance?: string   // Why this memory is being shown
}

export interface MemoryCallbackProps {
  memories: MemoryItem[]
  intro?: string       // Intro text like "Based on what you mentioned..."
  variant?: 'inline' | 'card' | 'compact'
  onMemoryClick?: (memory: MemoryItem) => void
  className?: string
}

// Compact inline variant - single line reference
const MemoryInline: React.FC<{
  memory: MemoryItem
  onClick?: () => void
}> = ({ memory, onClick }) => {
  const config = SOURCE_CONFIGS[memory.source]
  const Icon = config.icon

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg",
        "text-xs font-medium",
        "bg-muted/50 hover:bg-muted",
        "border border-border/50 hover:border-border",
        "transition-colors cursor-pointer"
      )}
    >
      <Quote className="w-3 h-3 text-muted-foreground" />
      <span className="text-foreground/80 truncate max-w-[200px]">
        "{memory.content}"
      </span>
      <Icon className={cn("w-3 h-3", config.color)} />
    </motion.button>
  )
}

// Card variant - detailed view with context
const MemoryCard: React.FC<{
  memory: MemoryItem
  index: number
  onClick?: () => void
}> = ({ memory, index, onClick }) => {
  const { t } = useTranslation()
  const config = SOURCE_CONFIGS[memory.source]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        "group relative p-4 rounded-xl",
        "bg-gradient-to-br from-muted/30 to-muted/10",
        "border border-border/50 hover:border-border",
        "transition-all cursor-pointer",
        onClick && "hover:shadow-lg"
      )}
    >
      {/* Connection line indicator */}
      <div className={cn(
        "absolute left-0 top-4 bottom-4 w-1 rounded-full",
        config.bgColor.replace('/10', '/30')
      )} />

      <div className="pl-4">
        {/* Source header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
              <Icon className={cn("w-3.5 h-3.5", config.color)} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {memory.sourceLabel || t(config.label)}
            </span>
          </div>
          {memory.timestamp && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{memory.timestamp}</span>
            </div>
          )}
        </div>

        {/* Quote content */}
        <div className="relative">
          <Quote className="absolute -left-1 -top-1 w-4 h-4 text-muted-foreground/30" />
          <p className="pl-4 text-sm text-foreground/90 leading-relaxed italic">
            "{memory.content}"
          </p>
        </div>

        {/* Relevance explanation */}
        {memory.relevance && (
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Link2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{memory.relevance}</span>
          </div>
        )}

        {/* Hover action indicator */}
        {onClick && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Compact variant - minimal list
const MemoryCompact: React.FC<{
  memory: MemoryItem
  onClick?: () => void
}> = ({ memory, onClick }) => {
  const config = SOURCE_CONFIGS[memory.source]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-1.5",
        onClick && "cursor-pointer hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", config.color)} />
      <span className="text-sm text-foreground/80 truncate">
        "{memory.content}"
      </span>
      {memory.sourceLabel && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          — {memory.sourceLabel}
        </span>
      )}
    </motion.div>
  )
}

export const MemoryCallback: React.FC<MemoryCallbackProps> = ({
  memories,
  intro,
  variant = 'card',
  onMemoryClick,
  className = ''
}) => {
  if (memories.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-3", className)}
    >
      {/* Intro text */}
      {intro && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>{intro}</span>
        </div>
      )}

      {/* Memories list */}
      {variant === 'inline' && (
        <div className="flex flex-wrap gap-2">
          {memories.map((memory) => (
            <MemoryInline
              key={memory.id}
              memory={memory}
              onClick={() => onMemoryClick?.(memory)}
            />
          ))}
        </div>
      )}

      {variant === 'card' && (
        <div className="space-y-3">
          {memories.map((memory, index) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              index={index}
              onClick={() => onMemoryClick?.(memory)}
            />
          ))}
        </div>
      )}

      {variant === 'compact' && (
        <div className="space-y-1">
          {memories.map((memory) => (
            <MemoryCompact
              key={memory.id}
              memory={memory}
              onClick={() => onMemoryClick?.(memory)}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Helper to create a memory callback intro message
export function createMemoryIntro(
  context: 'continue' | 'reference' | 'connect',
  t: (key: string) => string
): string {
  const intros = {
    continue: t('memory.intro.continue'),   // "Picking up where we left off..."
    reference: t('memory.intro.reference'), // "Based on what you mentioned..."
    connect: t('memory.intro.connect')      // "This connects to your earlier answer..."
  }
  return intros[context]
}

export default MemoryCallback
