import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Play,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Code,
  Palette,
  Image,
  Music,
  FolderOpen,
  Target,
  Map,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudioStore, Task, TaskPriority } from '@/stores/studioStore'
import { cn } from '@/lib/utils'

// Icon mapping
const QUEUE_ICONS: Record<string, React.ElementType> = {
  Code,
  Palette,
  Image,
  Music,
  FolderOpen,
  Target,
  Map,
}

// Priority order for sorting
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

interface ProductionBoardProps {
  onTaskClick?: (task: Task) => void
}

export function ProductionBoard({ onTaskClick }: ProductionBoardProps) {
  const { queues, tasks, startTask, completeTask, reopenTask, reorderQueue } = useStudioStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expandedQueues, setExpandedQueues] = useState<Record<string, boolean>>(
    Object.fromEntries(queues.map(q => [q.id, true]))
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activeTask = tasks.find(t => t.id === active.id)
      const overTask = tasks.find(t => t.id === over.id)

      if (activeTask && overTask && activeTask.sector === overTask.sector) {
        const queueTasks = tasks
          .filter(t => t.sector === activeTask.sector && t.status === 'ready')
          .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

        const oldIndex = queueTasks.findIndex(t => t.id === active.id)
        const newIndex = queueTasks.findIndex(t => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(queueTasks, oldIndex, newIndex)
          reorderQueue(activeTask.sector, newOrder.map(t => t.id))
        }
      }
    }

    setActiveId(null)
  }

  const toggleQueue = (queueId: string) => {
    setExpandedQueues(prev => ({
      ...prev,
      [queueId]: !prev[queueId]
    }))
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {queues.map(queue => {
          const queueTasks = tasks.filter(t => t.sector === queue.id && !t.parent_id)
          const activeTasks = queueTasks.filter(t => t.status === 'in_progress')
          const readyTasks = queueTasks
            .filter(t => t.status === 'ready')
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
          const lockedTasks = queueTasks.filter(t => t.status === 'locked')
          const doneTasks = queueTasks.filter(t => t.status === 'done')
          const isExpanded = expandedQueues[queue.id]

          const QueueIcon = QUEUE_ICONS[queue.icon] || FolderOpen

          return (
            <div
              key={queue.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Queue Header */}
              <button
                onClick={() => toggleQueue(queue.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    `bg-${queue.color}-500/20 text-${queue.color}-400`
                  )}>
                    <QueueIcon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">{queue.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {activeTasks.length > 0 && `${activeTasks.length} active, `}
                      {readyTasks.length} ready
                      {lockedTasks.length > 0 && `, ${lockedTasks.length} locked`}
                      , {doneTasks.length} done
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Queue Content */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Active Task */}
                  {activeTasks.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Play className="h-3 w-3" /> In Progress
                      </p>
                      {activeTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={() => completeTask(task.id)}
                          onClick={() => onTaskClick?.(task)}
                          isActive
                        />
                      ))}
                    </div>
                  )}

                  {/* Ready Queue */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Ready</p>
                    <SortableContext
                      items={readyTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {readyTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic py-4 text-center">
                            No tasks ready
                          </p>
                        ) : (
                          readyTasks.map(task => (
                            <SortableTaskCard
                              key={task.id}
                              task={task}
                              onStart={() => startTask(task.id)}
                              onClick={() => onTaskClick?.(task)}
                            />
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </div>

                  {/* Locked Tasks */}
                  {lockedTasks.length > 0 && (
                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {lockedTasks.length} waiting on dependencies
                      </summary>
                      <div className="mt-2 space-y-2 opacity-60">
                        {lockedTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick?.(task)}
                            isLocked
                          />
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Done (collapsed by default) */}
                  {doneTasks.length > 0 && (
                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                        <Check className="h-3 w-3" /> {doneTasks.length} completed
                      </summary>
                      <div className="mt-2 space-y-2 opacity-60">
                        {doneTasks.slice(0, 5).map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onReopen={() => reopenTask(task.id)}
                            onClick={() => onTaskClick?.(task)}
                            isDone
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// Sortable Task Card
function SortableTaskCard({
  task,
  onStart,
  onClick,
}: {
  task: Task
  onStart?: () => void
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard
        task={task}
        onStart={onStart}
        onClick={onClick}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  onStart,
  onComplete,
  onReopen,
  onClick,
  dragHandleProps,
  isDragging,
  isActive,
  isDone,
  isLocked,
}: {
  task: Task
  onStart?: () => void
  onComplete?: () => void
  onReopen?: () => void
  onClick?: () => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
  isActive?: boolean
  isDone?: boolean
  isLocked?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        isDragging && "opacity-50 shadow-lg scale-105",
        isActive && "border-cyan-500 bg-cyan-500/10",
        isDone && "border-border bg-muted/30",
        isLocked && "border-amber-500/30 bg-amber-500/5",
        !isActive && !isDone && !isLocked && "border-border bg-card hover:border-cyan-500/30"
      )}
    >
      {/* Drag Handle */}
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Locked Icon */}
      {isLocked && (
        <Lock className="h-4 w-4 text-amber-500" />
      )}

      {/* Task Info */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <p className={cn(
          "font-medium truncate",
          isDone && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
        )}
        {task.agent && (
          <p className="text-xs text-cyan-400 mt-1">
            <Sparkles className="h-3 w-3 inline mr-1" />
            {task.agent}
          </p>
        )}
        {task.requires && task.requires.length > 0 && isLocked && (
          <p className="text-xs text-amber-400 mt-1">
            Waiting on {task.requires.length} task{task.requires.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Priority Badge */}
      {task.priority !== 'medium' && (
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full",
          task.priority === 'critical' && "bg-red-500/20 text-red-400",
          task.priority === 'high' && "bg-orange-500/20 text-orange-400",
          task.priority === 'low' && "bg-slate-500/20 text-slate-400",
        )}>
          {task.priority}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onStart && !isLocked && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onStart(); }}
            className="h-8 w-8 p-0"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
        {onComplete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onComplete(); }}
            className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        {onReopen && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onReopen(); }}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Add Task Button
export function AddTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-cyan-500/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-4 w-4" />
      Add Task
    </button>
  )
}
