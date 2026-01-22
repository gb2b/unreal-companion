import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/services/api'

export interface Project {
  id: string
  name: string
  slug: string
  unreal_host: string
  unreal_port: number
  unreal_project_name?: string // Name of linked Unreal project
  default_agent: string
  // Studio fields
  uproject_path?: string       // Full path to .uproject file
  companion_path?: string      // Path to .unreal-companion/ folder
  docs_path?: string           // Path to docs/ folder in UE project
  last_session?: {
    timestamp: string
    workflow_id?: string
    workflow_step?: number
    task_id?: string
  }
}

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  currentProjectId: string | null  // Only persist the ID, not the full object
  isLoading: boolean
  
  fetchProjects: () => Promise<void>
  setCurrentProject: (project: Project | null) => void
  createProject: (data: Partial<Project>) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  clearLocalData: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      currentProjectId: null,
      isLoading: false,
      
      fetchProjects: async () => {
        set({ isLoading: true })
        try {
          const projects = await api.get<Project[]>('/api/projects')
          set({ projects })
          
          // Sync currentProject with actual DB data
          const { currentProjectId } = get()
          if (currentProjectId) {
            const found = projects.find(p => p.id === currentProjectId)
            if (found) {
              set({ currentProject: found })
            } else {
              // Project no longer exists, clear it
              set({ currentProject: null, currentProjectId: null })
            }
          } else if (projects.length > 0) {
            // Auto-select first project if none selected
            set({ currentProject: projects[0], currentProjectId: projects[0].id })
          }
        } catch (error) {
          console.error('Failed to fetch projects:', error)
          set({ projects: [], currentProject: null, currentProjectId: null })
        } finally {
          set({ isLoading: false })
        }
      },
      
      setCurrentProject: (project) => set({ 
        currentProject: project,
        currentProjectId: project?.id || null
      }),
      
      createProject: async (data) => {
        const project = await api.post<Project>('/api/projects', data)
        set(s => ({ 
          projects: [...s.projects, project],
          currentProject: project,
          currentProjectId: project.id
        }))
        return project
      },
      
      updateProject: async (id, data) => {
        const response = await api.put<Project>(`/api/projects/${id}`, data)
        set(s => ({
          projects: s.projects.map(p => p.id === id ? response : p),
          currentProject: s.currentProject?.id === id ? response : s.currentProject
        }))
      },
      
      deleteProject: async (id) => {
        try {
          await api.delete(`/api/projects/${id}`)
          const { projects } = get()
          const remainingProjects = projects.filter(p => p.id !== id)
          const newCurrent = remainingProjects.length > 0 ? remainingProjects[0] : null
          
          set({ 
            projects: remainingProjects,
            currentProject: newCurrent,
            currentProjectId: newCurrent?.id || null
          })
        } catch (error) {
          console.error('Failed to delete project:', error)
          throw error
        }
      },
      
      clearLocalData: () => {
        set({ projects: [], currentProject: null, currentProjectId: null })
        // Also clear from localStorage
        localStorage.removeItem('project-store')
      },
    }),
    { 
      name: 'project-store', 
      partialize: (state) => ({ currentProjectId: state.currentProjectId }) 
    }
  )
)
