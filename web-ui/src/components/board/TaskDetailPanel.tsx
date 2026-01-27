import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Check,
  RotateCcw,
  Clock,
  ChevronRight,
  Target,
  Code,
  Palette,
  Map,
  Plus,
  ArrowRight,
  History,
  Link as LinkIcon,
  Unlink,
  Sparkles,
  Edit3,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudioStore, Task } from '@/stores/studioStore'
import { cn } from '@/lib/utils'
import { HistoryEntry } from '@/types/tasks'

interface TaskDetailPanelProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onAddSubtask?: (parentTask: Task) => void
  onLaunchTask?: (task: Task) => void
}

const QUEUE_ICONS: Record<string, React.ElementType> = {
  Target,
  Code,
  Palette,
  Map,
}

const STATUS_CONFIG = {
  locked: { label: 'Locked', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ready: { label: 'Ready', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  in_progress: { label: 'In Progress', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  done: { label: 'Done', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
}

const HISTORY_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  started: Play,
  done: Check,
  reopened: RotateCcw,
  moved: ArrowRight,
  updated: Edit3,
  dependency_added: LinkIcon,
  dependency_removed: Unlink,
  subtask_added: Plus,
}

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onAddSubtask,
  onLaunchTask,
}: TaskDetailPanelProps) {
  const {
    queues,
    tasks,
    startTask,
    completeTask,
    reopenTask,
    moveTask,
    removeTask,
    removeDependency,
  } = useStudioStore()

  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!task) return null

  const queue = queues.find(q => q.id === task.sector)
  const QueueIcon = queue ? (QUEUE_ICONS[queue.icon] || Target) : Target
  const statusConfig = STATUS_CONFIG[task.status]

  // Get subtasks if this is a parent task
  const subtasks = task.is_parent
    ? tasks.filter(t => t.parent_id === task.id)
    : []

  // Get dependency tasks
  const dependencyTasks = task.requires
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean) as Task[]

  // Get tasks that depend on this task
  const dependentTasks = tasks.filter(t => t.requires.includes(task.id))

  const handleMove = (toSector: string) => {
    moveTask(task.id, toSector, 'user')
    setShowMoveMenu(false)
  }

  const handleDelete = () => {
    removeTask(task.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatHistoryAction = (entry: HistoryEntry) => {
    switch (entry.action) {
      case 'created': return 'Created'
      case 'started': return 'Started'
      case 'done': return 'Completed'
      case 'reopened': return 'Reopened'
      case 'moved': return `Moved to ${entry.to_sector}`
      case 'updated': return 'Updated'
      case 'dependency_added': return entry.notes || 'Dependency added'
      case 'dependency_removed': return entry.notes || 'Dependency removed'
      case 'subtask_added': return 'Subtask added'
      default: return entry.action
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    statusConfig.bg,
                    statusConfig.color
                  )}>
                    {statusConfig.label}
                  </span>
                  {task.priority !== 'medium' && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs",
                      task.priority === 'critical' && 'bg-red-500/20 text-red-400',
                      task.priority === 'high' && 'bg-orange-500/20 text-orange-400',
                      task.priority === 'low' && 'bg-slate-500/20 text-slate-400',
                    )}>
                      {task.priority}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold truncate">{task.title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <QueueIcon className="h-4 w-4" />
                  <span>{queue?.name || task.sector}</span>
                  {task.agent && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <Sparkles className="h-3 w-3" />
                      <span>{task.agent}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Description */}
              {task.description && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {task.status === 'ready' && (
                  <Button
                    size="sm"
                    onClick={() => startTask(task.id)}
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Task
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={() => completeTask(task.id)}
                    className="bg-gradient-to-r from-emerald-500 to-green-500"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
                {task.status === 'done' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reopenTask(task.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reopen
                  </Button>
                )}
                {task.status === 'ready' && onLaunchTask && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLaunchTask(task)}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Launch in Editor
                  </Button>
                )}
                {onAddSubtask && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddSubtask(task)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subtask
                  </Button>
                )}
              </div>

              {/* Move to sector */}
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMoveMenu(!showMoveMenu)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Move to sector
                  </span>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    showMoveMenu && "rotate-90"
                  )} />
                </Button>

                {showMoveMenu && (
                  <div className="mt-2 p-2 rounded-lg border border-border bg-muted/30">
                    {queues.filter(q => q.id !== task.sector).map(q => {
                      const Icon = QUEUE_ICONS[q.icon] || Target
                      return (
                        <button
                          key={q.id}
                          onClick={() => handleMove(q.id)}
                          className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors text-left"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{q.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Dependencies */}
              {dependencyTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Depends on ({dependencyTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {dependencyTasks.map(dep => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            dep.status === 'done' ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="text-sm">{dep.title}</span>
                        </div>
                        <button
                          onClick={() => removeDependency(task.id, dep.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependents */}
              {dependentTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Blocks ({dependentTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {dependentTasks.map(dep => (
                      <div
                        key={dep.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30"
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          STATUS_CONFIG[dep.status].color.replace('text-', 'bg-').replace('-400', '-500')
                        )} />
                        <span className="text-sm">{dep.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks */}
              {subtasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Subtasks ({subtasks.length})
                  </h3>
                  <div className="space-y-2">
                    {subtasks.map(sub => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            STATUS_CONFIG[sub.status].color.replace('text-', 'bg-').replace('-400', '-500')
                          )} />
                          <span className="text-sm">{sub.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {queues.find(q => q.id === sub.sector)?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </h3>
                <div className="space-y-2">
                  {task.history.slice().reverse().map((entry, i) => {
                    const Icon = HISTORY_ICONS[entry.action] || Clock
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2 rounded-lg border border-border bg-muted/30"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{formatHistoryAction(entry)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.date)} • by {entry.by}
                          </p>
                          {entry.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              "{entry.reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {formatDate(task.created_at)}</p>
                {task.started_at && <p>Started: {formatDate(task.started_at)}</p>}
                {task.completed_at && <p>Completed: {formatDate(task.completed_at)}</p>}
                <p>Iteration: {task.iteration}</p>
              </div>

              {/* Delete */}
              <div className="pt-4 border-t border-border">
                {!showDeleteConfirm ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Task
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDelete}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      Confirm Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
