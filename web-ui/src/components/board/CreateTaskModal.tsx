import { useState, useEffect } from 'react'
import { X, Plus, Target, Code, Palette, Map, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStudioStore, Task, TaskPriority } from '@/stores/studioStore'
import { cn } from '@/lib/utils'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  parentTask?: Task | null
}

const QUEUE_ICONS: Record<string, React.ElementType> = {
  Target,
  Code,
  Palette,
  Map,
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-slate-400' },
  { value: 'medium', label: 'Medium', color: 'text-muted-foreground' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
]

export function CreateTaskModal({ isOpen, onClose, parentTask }: CreateTaskModalProps) {
  const { queues, tasks, addTask, addSubtask } = useStudioStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sector, setSector] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dependencies, setDependencies] = useState<string[]>([])
  const [showDependencyPicker, setShowDependencyPicker] = useState(false)
  const [error, setError] = useState('')

  // Initialize sector with first queue
  useEffect(() => {
    if (isOpen && queues.length > 0 && !sector) {
      setSector(queues[0].id)
    }
  }, [isOpen, queues, sector])

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setSector('')
      setPriority('medium')
      setDependencies([])
      setError('')
    }
  }, [isOpen])

  const availableTasks = tasks.filter(t =>
    t.status !== 'done' &&
    !dependencies.includes(t.id) &&
    t.id !== parentTask?.id
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Task title is required')
      return
    }

    if (!sector) {
      setError('Please select a sector')
      return
    }

    try {
      if (parentTask) {
        addSubtask(parentTask.id, {
          title: title.trim(),
          description: description.trim(),
          sector,
          priority,
          requires: dependencies,
          created_by: 'user',
        })
      } else {
        addTask({
          title: title.trim(),
          description: description.trim(),
          sector,
          priority,
          requires: dependencies,
          created_by: 'user',
        })
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  const toggleDependency = (taskId: string) => {
    setDependencies(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">
              {parentTask ? `Add Subtask to "${parentTask.title}"` : 'New Task'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {parentTask ? 'Create a subtask for this parent task' : 'Add a new task to your board'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-500">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Create player controller..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="More details about what needs to be done..."
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-border bg-background",
                "text-sm resize-none h-20",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
            />
          </div>

          {/* Sector */}
          <div>
            <label className="block text-sm font-medium mb-2">Sector</label>
            <div className="grid grid-cols-2 gap-2">
              {queues.map(queue => {
                const Icon = QUEUE_ICONS[queue.icon] || Target
                const isSelected = sector === queue.id
                return (
                  <button
                    key={queue.id}
                    type="button"
                    onClick={() => setSector(queue.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-primary" : ""
                    )}>
                      {queue.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                    priority === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                    opt.color
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Dependencies <span className="text-muted-foreground font-normal">(optional)</span>
            </label>

            {/* Selected dependencies */}
            {dependencies.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {dependencies.map(depId => {
                  const dep = tasks.find(t => t.id === depId)
                  if (!dep) return null
                  return (
                    <span
                      key={depId}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs"
                    >
                      {dep.title}
                      <button
                        type="button"
                        onClick={() => toggleDependency(depId)}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Add dependency button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDependencyPicker(!showDependencyPicker)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add dependency
            </Button>

            {/* Dependency picker */}
            {showDependencyPicker && availableTasks.length > 0 && (
              <div className="mt-2 p-2 rounded-lg border border-border bg-muted/30 max-h-40 overflow-y-auto">
                {availableTasks.map(task => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleDependency(task.id)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors text-left",
                      dependencies.includes(task.id) && "bg-primary/10"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      dependencies.includes(task.id)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {dependencies.includes(task.id) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm truncate">{task.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {queues.find(q => q.id === task.sector)?.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showDependencyPicker && availableTasks.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 text-center py-4">
                No tasks available to add as dependencies
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500"
            >
              {parentTask ? 'Add Subtask' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
