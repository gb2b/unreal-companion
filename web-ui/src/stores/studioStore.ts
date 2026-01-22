import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

// Task status
export type TaskStatus = 'queued' | 'in_progress' | 'done'

// A task in the production board
export interface Task {
  id: string
  title: string
  description?: string
  sector_id: string
  status: TaskStatus
  priority: number // Lower = higher priority in queue
  agent_id?: string // Which agent is working on this
  created_at: string
  started_at?: string
  completed_at?: string
  context?: {
    workflow_id?: string
    document_path?: string
    conversation_id?: string
  }
}

// A sector (category) of tasks
export interface Sector {
  id: string
  name: string
  icon: string // Lucide icon name
  color: string // Tailwind color
  order: number
}

// Default sectors for a new project
export const DEFAULT_SECTORS: Sector[] = [
  { id: 'dev', name: 'Development', icon: 'Code', color: 'blue', order: 0 },
  { id: 'design', name: 'Design', icon: 'Palette', color: 'purple', order: 1 },
  { id: 'art', name: 'Art & Assets', icon: 'Image', color: 'pink', order: 2 },
  { id: 'audio', name: 'Audio', icon: 'Music', color: 'amber', order: 3 },
]

// Today's suggestion
export interface TodaySuggestion {
  task?: Task
  message: string
  alternatives?: Task[]
}

interface StudioStore {
  // Sectors
  sectors: Sector[]
  setSectors: (sectors: Sector[]) => void
  addSector: (sector: Omit<Sector, 'id' | 'order'>) => void
  removeSector: (id: string) => void
  reorderSectors: (sectorIds: string[]) => void
  
  // Tasks
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'status' | 'priority'>) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  
  // Task queue operations
  startTask: (id: string, agent_id?: string) => void
  completeTask: (id: string) => void
  reopenTask: (id: string) => void
  reorderQueue: (sector_id: string, taskIds: string[]) => void
  
  // Getters (computed)
  getTasksBySector: (sector_id: string) => { active: Task | null, queue: Task[], done: Task[] }
  getSuggestedTask: () => TodaySuggestion
  
  // History
  completedTasks: Task[]
  
  // Sync with filesystem
  currentProjectPath: string | null
  setCurrentProjectPath: (path: string | null) => void
  loadFromProject: (uprojectPath: string) => Promise<void>
  syncToProject: () => Promise<void>
}

export const useStudioStore = create<StudioStore>()(
  persist(
    (set, get) => ({
      sectors: DEFAULT_SECTORS,
      tasks: [],
      completedTasks: [],
      
      setSectors: (sectors) => set({ sectors }),
      
      addSector: (sector) => set(s => ({
        sectors: [...s.sectors, {
          ...sector,
          id: generateId(),
          order: s.sectors.length,
        }]
      })),
      
      removeSector: (id) => set(s => ({
        sectors: s.sectors.filter(sec => sec.id !== id),
        tasks: s.tasks.filter(t => t.sector_id !== id),
      })),
      
      reorderSectors: (sectorIds) => set(s => ({
        sectors: sectorIds.map((id, i) => {
          const sector = s.sectors.find(sec => sec.id === id)
          return sector ? { ...sector, order: i } : null
        }).filter(Boolean) as Sector[]
      })),
      
      setTasks: (tasks) => set({ tasks }),
      
      addTask: (taskData) => {
        const { tasks } = get()
        const sectorTasks = tasks.filter(t => t.sector_id === taskData.sector_id && t.status === 'queued')
        const newTask: Task = {
          ...taskData,
          id: generateId(),
          status: 'queued',
          priority: sectorTasks.length, // Add at end of queue
          created_at: new Date().toISOString(),
        }
        set(s => ({ tasks: [...s.tasks, newTask] }))
        return newTask
      },
      
      updateTask: (id, updates) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      
      removeTask: (id) => set(s => ({
        tasks: s.tasks.filter(t => t.id !== id)
      })),
      
      startTask: (id, agent_id) => set(s => ({
        tasks: s.tasks.map(t => t.id === id ? {
          ...t,
          status: 'in_progress' as TaskStatus,
          started_at: new Date().toISOString(),
          agent_id,
        } : t)
      })),
      
      completeTask: (id) => {
        const task = get().tasks.find(t => t.id === id)
        if (!task) return
        
        const completedTask: Task = {
          ...task,
          status: 'done',
          completed_at: new Date().toISOString(),
        }
        
        set(s => ({
          tasks: s.tasks.filter(t => t.id !== id),
          completedTasks: [completedTask, ...s.completedTasks],
        }))
      },
      
      reopenTask: (id) => {
        const task = get().completedTasks.find(t => t.id === id)
        if (!task) return
        
        const reopenedTask: Task = {
          ...task,
          status: 'queued',
          priority: 0, // Put at top of queue
          started_at: undefined,
          completed_at: undefined,
        }
        
        set(s => ({
          completedTasks: s.completedTasks.filter(t => t.id !== id),
          tasks: [reopenedTask, ...s.tasks],
        }))
      },
      
      reorderQueue: (sector_id, taskIds) => set(s => ({
        tasks: s.tasks.map(t => {
          if (t.sector_id !== sector_id || t.status !== 'queued') return t
          const newPriority = taskIds.indexOf(t.id)
          return newPriority >= 0 ? { ...t, priority: newPriority } : t
        })
      })),
      
      getTasksBySector: (sector_id) => {
        const { tasks } = get()
        const sectorTasks = tasks.filter(t => t.sector_id === sector_id)
        
        const active = sectorTasks.find(t => t.status === 'in_progress') || null
        const queue = sectorTasks
          .filter(t => t.status === 'queued')
          .sort((a, b) => a.priority - b.priority)
        const done = sectorTasks.filter(t => t.status === 'done')
        
        return { active, queue, done }
      },
      
      getSuggestedTask: () => {
        const { tasks, sectors } = get()
        
        // Find first queued task from each sector, prioritize by sector order
        const queuedTasks = tasks
          .filter(t => t.status === 'queued')
          .sort((a, b) => {
            const sectorA = sectors.find(s => s.id === a.sector_id)
            const sectorB = sectors.find(s => s.id === b.sector_id)
            if (!sectorA || !sectorB) return 0
            // First by sector order, then by task priority
            if (sectorA.order !== sectorB.order) return sectorA.order - sectorB.order
            return a.priority - b.priority
          })
        
        // Check if any task is in progress
        const inProgress = tasks.find(t => t.status === 'in_progress')
        
        if (inProgress) {
          return {
            task: inProgress,
            message: `Continue working on "${inProgress.title}"`,
            alternatives: queuedTasks.slice(0, 3),
          }
        }
        
        if (queuedTasks.length > 0) {
          return {
            task: queuedTasks[0],
            message: `Ready to start "${queuedTasks[0].title}"?`,
            alternatives: queuedTasks.slice(1, 4),
          }
        }
        
        return {
          message: "No tasks in queue. Add some tasks or start a workflow!",
        }
      },
      
      // Sync with filesystem
      currentProjectPath: null,
      
      setCurrentProjectPath: (path) => set({ currentProjectPath: path }),
      
      loadFromProject: async (uprojectPath: string) => {
        try {
          const response = await fetch(`/api/studio/tasks?uproject_path=${encodeURIComponent(uprojectPath)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.sectors && data.sectors.length > 0) {
              set({ 
                sectors: data.sectors.map((s: Sector, i: number) => ({ ...s, order: s.order ?? i })),
                currentProjectPath: uprojectPath 
              })
            }
            if (data.tasks) {
              set({ tasks: data.tasks })
            }
          }
        } catch (error) {
          console.error('Failed to load tasks from project:', error)
        }
      },
      
      syncToProject: async () => {
        const { currentProjectPath, sectors, tasks } = get()
        if (!currentProjectPath) return
        
        try {
          await fetch('/api/studio/tasks/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tasks,
              sectors,
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
        sectors: state.sectors,
        tasks: state.tasks,
        completedTasks: state.completedTasks.slice(0, 100), // Keep last 100
        currentProjectPath: state.currentProjectPath,
      }),
    }
  )
)
