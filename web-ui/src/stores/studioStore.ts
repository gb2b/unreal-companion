import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCreatedBy,
  Queue,
  HistoryEntry,
  HistoryAction,
  TodaySuggestion,
  TasksByQueue,
  CreateTaskInput,
  UpdateTaskInput,
  DEFAULT_QUEUES,
  computeTaskStatus,
  createHistoryEntry,
} from '@/types/tasks'

// Re-export types for convenience
export type { Task, TaskStatus, TaskPriority, Queue, TodaySuggestion, TasksByQueue }
export { DEFAULT_QUEUES }

// =============================================================================
// Store Interface
// =============================================================================

interface StudioStore {
  // Queues (sectors)
  queues: Queue[]
  setQueues: (queues: Queue[]) => void
  addQueue: (queue: Omit<Queue, 'id' | 'order'>) => void
  removeQueue: (id: string) => void
  reorderQueues: (queueIds: string[]) => void

  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (input: CreateTaskInput) => Task
  updateTask: (id: string, updates: UpdateTaskInput) => void
  removeTask: (id: string) => void

  // Task lifecycle
  startTask: (id: string, agent?: string) => void
  completeTask: (id: string) => void
  reopenTask: (id: string) => void

  // Dependencies
  addDependency: (taskId: string, dependsOnId: string) => void
  removeDependency: (taskId: string, dependsOnId: string) => void

  // Subtasks
  addSubtask: (parentId: string, input: CreateTaskInput) => Task

  // History
  addHistoryEntry: (taskId: string, action: HistoryAction, by: TaskCreatedBy, extra?: Partial<HistoryEntry>) => void

  // Move task between sectors (Fast-Food Workflow)
  moveTask: (taskId: string, toSector: string, by: TaskCreatedBy, reason?: string) => void

  // Recompute all locked/ready statuses
  recomputeStatuses: () => void

  // Queue operations
  reorderQueue: (queueId: string, taskIds: string[]) => void

  // Getters (computed)
  getTasksByQueue: (queueId: string) => TasksByQueue
  getSuggestedTask: () => TodaySuggestion
  getTaskWithSubtasks: (taskId: string) => Task | null

  // Sync with filesystem
  currentProjectPath: string | null
  setCurrentProjectPath: (path: string | null) => void
  loadFromProject: (uprojectPath: string) => Promise<void>
  syncToProject: () => Promise<void>
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      queues: DEFAULT_QUEUES,
      tasks: [],

      // =========================================================================
      // Queue Management
      // =========================================================================

      setQueues: (queues) => set({ queues }),

      addQueue: (queue) => set(s => ({
        queues: [...s.queues, {
          ...queue,
          id: generateId(),
          order: s.queues.length,
        }]
      })),

      removeQueue: (id) => set(s => ({
        queues: s.queues.filter(q => q.id !== id),
        tasks: s.tasks.filter(t => t.sector !== id),
      })),

      reorderQueues: (queueIds) => set(s => ({
        queues: queueIds.map((id, i) => {
          const queue = s.queues.find(q => q.id === id)
          return queue ? { ...queue, order: i } : null
        }).filter(Boolean) as Queue[]
      })),

      // =========================================================================
      // Task Management
      // =========================================================================

      setTasks: (tasks) => set({ tasks }),

      addTask: (input) => {
        const { queues } = get()
        const queue = queues.find(q => q.id === input.sector)

        // Compute initial status based on dependencies
        const initialStatus: TaskStatus = (!input.requires || input.requires.length === 0)
          ? 'ready'
          : 'locked'

        const now = new Date().toISOString()
        const newTask: Task = {
          id: generateId(),
          title: input.title,
          description: input.description || '',
          sector: input.sector,
          agent: input.agent || queue?.default_agent || '',
          priority: input.priority || 'medium',
          status: initialStatus,
          parent_id: input.parent_id || null,
          requires: input.requires || [],
          history: [createHistoryEntry('created', input.created_by || 'user')],
          iteration: 1,
          created_at: now,
          updated_at: now,
          created_by: input.created_by || 'user',
        }

        set(s => ({ tasks: [...s.tasks, newTask] }))

        // Recompute statuses after adding
        get().recomputeStatuses()

        return newTask
      },

      updateTask: (id, updates) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) return

        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === id ? {
            ...t,
            ...updates,
            updated_at: now,
            history: [
              ...t.history,
              createHistoryEntry('updated', 'user'),
            ],
          } : t)
        }))

        // Recompute if dependencies changed
        if (updates.requires) {
          get().recomputeStatuses()
        }
      },

      removeTask: (id) => {
        // Also remove from other tasks' dependencies
        set(s => ({
          tasks: s.tasks
            .filter(t => t.id !== id)
            .map(t => ({
              ...t,
              requires: t.requires.filter(depId => depId !== id),
            }))
        }))

        get().recomputeStatuses()
      },

      // =========================================================================
      // Task Lifecycle
      // =========================================================================

      startTask: (id, agent) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) return

        // Check if task can be started
        const status = computeTaskStatus(task, tasks)
        if (status !== 'ready') {
          console.warn(`Task ${id} cannot be started - status is ${status}`)
          return
        }

        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === id ? {
            ...t,
            status: 'in_progress' as TaskStatus,
            started_at: now,
            updated_at: now,
            agent: agent || t.agent,
            history: [
              ...t.history,
              createHistoryEntry('started', 'user'),
            ],
          } : t)
        }))
      },

      completeTask: (id) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === id)
        if (!task) return

        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === id ? {
            ...t,
            status: 'done' as TaskStatus,
            completed_at: now,
            updated_at: now,
            history: [
              ...t.history,
              createHistoryEntry('done', 'user'),
            ],
          } : t)
        }))

        // Recompute statuses - dependents might become ready
        get().recomputeStatuses()
      },

      reopenTask: (id) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === id)
        if (!task || task.status !== 'done') return

        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === id ? {
            ...t,
            status: 'ready' as TaskStatus,
            started_at: undefined,
            completed_at: undefined,
            updated_at: now,
            iteration: t.iteration + 1,
            history: [
              ...t.history,
              createHistoryEntry('reopened', 'user'),
            ],
          } : t)
        }))

        // Recompute - dependents might become locked again
        get().recomputeStatuses()
      },

      // =========================================================================
      // Dependencies
      // =========================================================================

      addDependency: (taskId, dependsOnId) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === taskId)
        const dependsOn = tasks.find(t => t.id === dependsOnId)

        if (!task || !dependsOn) return
        if (task.requires.includes(dependsOnId)) return

        // Prevent circular dependencies
        const wouldCreateCycle = (targetId: string, visited = new Set<string>()): boolean => {
          if (visited.has(targetId)) return true
          visited.add(targetId)
          const target = tasks.find(t => t.id === targetId)
          if (!target) return false
          return target.requires.some(depId => wouldCreateCycle(depId, visited))
        }

        if (wouldCreateCycle(dependsOnId, new Set([taskId]))) {
          console.warn('Cannot add dependency - would create circular dependency')
          return
        }

        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? {
            ...t,
            requires: [...t.requires, dependsOnId],
            updated_at: now,
            history: [
              ...t.history,
              createHistoryEntry('dependency_added', 'user', { notes: `Added dependency on ${dependsOn.title}` }),
            ],
          } : t)
        }))

        get().recomputeStatuses()
      },

      removeDependency: (taskId, dependsOnId) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === taskId)
        const dependsOn = tasks.find(t => t.id === dependsOnId)

        if (!task) return
        if (!task.requires.includes(dependsOnId)) return

        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? {
            ...t,
            requires: t.requires.filter(id => id !== dependsOnId),
            updated_at: now,
            history: [
              ...t.history,
              createHistoryEntry('dependency_removed', 'user', {
                notes: dependsOn ? `Removed dependency on ${dependsOn.title}` : undefined
              }),
            ],
          } : t)
        }))

        get().recomputeStatuses()
      },

      // =========================================================================
      // Subtasks
      // =========================================================================

      addSubtask: (parentId, input) => {
        const { tasks, addTask } = get()
        const parent = tasks.find(t => t.id === parentId)
        if (!parent) {
          throw new Error(`Parent task ${parentId} not found`)
        }

        // Mark parent as parent task
        if (!parent.is_parent) {
          set(s => ({
            tasks: s.tasks.map(t => t.id === parentId ? {
              ...t,
              is_parent: true,
              updated_at: new Date().toISOString(),
              history: [
                ...t.history,
                createHistoryEntry('subtask_added', input.created_by || 'user'),
              ],
            } : t)
          }))
        }

        // Create subtask with parent reference
        return addTask({
          ...input,
          parent_id: parentId,
        })
      },

      // =========================================================================
      // History
      // =========================================================================

      addHistoryEntry: (taskId, action, by, extra) => {
        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? {
            ...t,
            updated_at: new Date().toISOString(),
            history: [...t.history, createHistoryEntry(action, by, extra)],
          } : t)
        }))
      },

      // =========================================================================
      // Move Task (Fast-Food Workflow)
      // =========================================================================

      moveTask: (taskId, toSector, by, reason) => {
        const { tasks, queues } = get()
        const task = tasks.find(t => t.id === taskId)
        const toQueue = queues.find(q => q.id === toSector)

        if (!task || !toQueue) return
        if (task.sector === toSector) return

        const fromSector = task.sector
        const now = new Date().toISOString()

        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? {
            ...t,
            sector: toSector,
            agent: toQueue.default_agent || t.agent,
            updated_at: now,
            history: [
              ...t.history,
              createHistoryEntry('moved', by, {
                from_sector: fromSector,
                to_sector: toSector,
                reason,
              }),
            ],
          } : t)
        }))
      },

      // =========================================================================
      // Recompute Statuses
      // =========================================================================

      recomputeStatuses: () => {
        set(s => ({
          tasks: s.tasks.map(task => {
            // Only recompute for non-active tasks
            if (task.status === 'in_progress' || task.status === 'done') {
              return task
            }

            const newStatus = computeTaskStatus(task, s.tasks)
            if (newStatus !== task.status) {
              return { ...task, status: newStatus, updated_at: new Date().toISOString() }
            }
            return task
          })
        }))
      },

      // =========================================================================
      // Queue Operations
      // =========================================================================

      reorderQueue: (queueId, taskIds) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.sector !== queueId || t.status === 'done' || t.status === 'in_progress') return t
          const newOrder = taskIds.indexOf(t.id)
          // Use priority to represent order within queue
          return newOrder >= 0 ? { ...t, priority: newOrder === 0 ? 'critical' : newOrder === 1 ? 'high' : newOrder === 2 ? 'medium' : 'low' as TaskPriority } : t
        })
      })),

      // =========================================================================
      // Getters
      // =========================================================================

      getTasksByQueue: (queueId) => {
        const { tasks, queues } = get()
        const queue = queues.find(q => q.id === queueId)

        if (!queue) {
          return {
            queue: { id: queueId, name: 'Unknown', icon: 'HelpCircle', color: 'gray', description: '', default_agent: null, order: 0 },
            active: null,
            ready: [],
            locked: [],
            done: [],
          }
        }

        const queueTasks = tasks.filter(t => t.sector === queueId && !t.parent_id)

        return {
          queue,
          active: queueTasks.find(t => t.status === 'in_progress') || null,
          ready: queueTasks.filter(t => t.status === 'ready'),
          locked: queueTasks.filter(t => t.status === 'locked'),
          done: queueTasks.filter(t => t.status === 'done'),
        }
      },

      getSuggestedTask: () => {
        const { tasks, queues } = get()

        // Get all ready tasks sorted by queue order and priority
        const priorityOrder: Record<TaskPriority, number> = {
          critical: 0, high: 1, medium: 2, low: 3
        }

        const readyTasks = tasks
          .filter(t => t.status === 'ready' && !t.parent_id)
          .sort((a, b) => {
            const queueA = queues.find(q => q.id === a.sector)
            const queueB = queues.find(q => q.id === b.sector)
            if (!queueA || !queueB) return 0
            // First by queue order, then by priority
            if (queueA.order !== queueB.order) return queueA.order - queueB.order
            return priorityOrder[a.priority] - priorityOrder[b.priority]
          })

        // Check if any task is in progress
        const inProgress = tasks.find(t => t.status === 'in_progress')

        if (inProgress) {
          return {
            task: inProgress,
            message: `Continue working on "${inProgress.title}"`,
            alternatives: readyTasks.slice(0, 3),
          }
        }

        if (readyTasks.length > 0) {
          return {
            task: readyTasks[0],
            message: `Ready to start "${readyTasks[0].title}"?`,
            alternatives: readyTasks.slice(1, 4),
          }
        }

        const lockedCount = tasks.filter(t => t.status === 'locked').length
        if (lockedCount > 0) {
          return {
            message: `${lockedCount} tasks waiting on dependencies. Complete some tasks to unlock them!`,
          }
        }

        return {
          message: "No tasks in queue. Add some tasks or start a workflow!",
        }
      },

      getTaskWithSubtasks: (taskId) => {
        const { tasks } = get()
        const task = tasks.find(t => t.id === taskId)
        if (!task) return null

        if (!task.is_parent) return task

        const subtasks = tasks.filter(t => t.parent_id === taskId)
        return {
          ...task,
          subtasks,
        }
      },

      // =========================================================================
      // Sync with Filesystem
      // =========================================================================

      currentProjectPath: null,

      setCurrentProjectPath: (path) => set({ currentProjectPath: path }),

      loadFromProject: async (uprojectPath: string) => {
        try {
          const response = await fetch(`/api/studio/tasks?uproject_path=${encodeURIComponent(uprojectPath)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.queues && data.queues.length > 0) {
              set({
                queues: data.queues.map((q: Queue, i: number) => ({ ...q, order: q.order ?? i })),
                currentProjectPath: uprojectPath
              })
            }
            if (data.tasks) {
              set({ tasks: data.tasks })
              get().recomputeStatuses()
            }
          }
        } catch (error) {
          console.error('Failed to load tasks from project:', error)
        }
      },

      syncToProject: async () => {
        const { currentProjectPath, queues, tasks } = get()
        if (!currentProjectPath) return

        try {
          await fetch('/api/studio/tasks/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tasks,
              queues,
              uproject_path: currentProjectPath
            })
          })
        } catch (error) {
          console.error('Failed to sync tasks to project:', error)
        }
      },
    }),
    {
      name: 'studio-store',
      partialize: (state) => ({
        queues: state.queues,
        tasks: state.tasks,
        currentProjectPath: state.currentProjectPath,
      }),
    }
  )
)
