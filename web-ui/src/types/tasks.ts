/**
 * Task System Types
 *
 * Supports the "Fast-Food Workflow" model:
 * - Parent tasks with subtasks that progress through sectors
 * - Dependencies between tasks (locked/ready computed status)
 * - Append-only history for audit trail
 */

// =============================================================================
// Task Types
// =============================================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export type TaskStatus = 'locked' | 'ready' | 'in_progress' | 'done'

export type TaskCreatedBy = 'user' | 'workflow' | 'editor'

export type HistoryAction =
  | 'created'
  | 'started'
  | 'done'
  | 'reopened'
  | 'moved'
  | 'updated'
  | 'dependency_added'
  | 'dependency_removed'
  | 'subtask_added'

export interface HistoryEntry {
  date: string
  action: HistoryAction
  by: TaskCreatedBy
  notes?: string
  session?: string
  reason?: string
  // For moved action
  from_sector?: string
  to_sector?: string
}

export interface Task {
  id: string
  title: string
  description: string

  // Current sector (can change via "Fast-Food Workflow")
  sector: string

  // Agent assigned
  agent: string

  // Priority
  priority: TaskPriority

  // Status - 'locked' and 'ready' are computed from dependencies
  status: TaskStatus

  // Parent task ID (null if root task)
  parent_id: string | null

  // Dependencies - task IDs that must be 'done' before this can start
  requires: string[]

  // Append-only history
  history: HistoryEntry[]

  // Iteration counter (incremented on reopen)
  iteration: number

  // Timestamps
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string

  // Who created this task
  created_by: TaskCreatedBy

  // For parent tasks
  is_parent?: boolean
  subtasks?: Task[]

  // Optional context
  context?: {
    workflow_id?: string
    document_path?: string
    conversation_id?: string
  }
}

// =============================================================================
// Queue/Sector Types
// =============================================================================

export interface Queue {
  id: string
  name: string
  icon: string       // Lucide icon name
  color: string      // Tailwind color
  description: string
  default_agent: string | null
  order: number
  is_default?: boolean
}

// Default sectors for production board (from P1.2 queues.yaml)
export const DEFAULT_QUEUES: Queue[] = [
  {
    id: 'concept',
    name: 'Concept',
    icon: 'Target',
    color: 'blue',
    description: 'Game design, mechanics, vision',
    default_agent: 'game-designer',
    order: 0,
    is_default: true,
  },
  {
    id: 'dev',
    name: 'Development',
    icon: 'Code',
    color: 'green',
    description: 'Blueprints, systems, code',
    default_agent: 'game-architect',
    order: 1,
    is_default: true,
  },
  {
    id: 'art',
    name: 'Art',
    icon: 'Palette',
    color: 'pink',
    description: 'Materials, textures, 3D assets',
    default_agent: '3d-artist',
    order: 2,
    is_default: true,
  },
  {
    id: 'levels',
    name: 'Level Design',
    icon: 'Map',
    color: 'amber',
    description: 'Levels, lighting, world building',
    default_agent: 'level-designer',
    order: 3,
    is_default: true,
  },
]

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateTaskInput {
  title: string
  description?: string
  sector: string
  agent?: string
  priority?: TaskPriority
  parent_id?: string
  requires?: string[]
  created_by?: TaskCreatedBy
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  sector?: string
  agent?: string
  priority?: TaskPriority
  status?: TaskStatus
  requires?: string[]
}

export interface AddHistoryInput {
  action: HistoryAction
  notes?: string
  reason?: string
}

export interface TasksResponse {
  tasks: Task[]
  queues: Queue[]
  updated_at: string
}

// =============================================================================
// Computed Types
// =============================================================================

export interface TasksByQueue {
  queue: Queue
  active: Task | null      // Task in_progress
  ready: Task[]            // Tasks ready to start
  locked: Task[]           // Tasks waiting on dependencies
  done: Task[]             // Completed tasks
}

export interface TodaySuggestion {
  task?: Task
  message: string
  alternatives?: Task[]
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Compute task status based on dependencies
 *
 * - If all dependencies are 'done' → 'ready'
 * - If at least one dependency is not 'done' → 'locked'
 * - If already 'in_progress' or 'done' → keep current status
 */
export function computeTaskStatus(task: Task, allTasks: Task[]): TaskStatus {
  // Keep active statuses
  if (task.status === 'in_progress' || task.status === 'done') {
    return task.status
  }

  // No dependencies = ready
  if (!task.requires || task.requires.length === 0) {
    return 'ready'
  }

  // Check all dependencies
  for (const depId of task.requires) {
    const dep = allTasks.find(t => t.id === depId)
    if (!dep || dep.status !== 'done') {
      return 'locked'
    }
  }

  return 'ready'
}

/**
 * Get all tasks that depend on a given task
 */
export function getDependents(taskId: string, allTasks: Task[]): Task[] {
  return allTasks.filter(t => t.requires?.includes(taskId))
}

/**
 * Check if a task can be started (is ready)
 */
export function canStartTask(task: Task, allTasks: Task[]): boolean {
  return computeTaskStatus(task, allTasks) === 'ready'
}

/**
 * Create a new history entry
 */
export function createHistoryEntry(
  action: HistoryAction,
  by: TaskCreatedBy,
  extra?: Partial<HistoryEntry>
): HistoryEntry {
  return {
    date: new Date().toISOString(),
    action,
    by,
    ...extra,
  }
}
