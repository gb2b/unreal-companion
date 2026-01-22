import { useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { useProjectStore } from '@/stores/projectStore'

export function ProjectSelector() {
  const { projects, currentProject, setCurrentProject, fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <Select 
      value={currentProject?.id || ''} 
      onValueChange={(id) => {
        const project = projects.find(p => p.id === id)
        if (project) setCurrentProject(project)
      }}
    >
      <SelectTrigger className="w-48">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          <span>{currentProject?.name || 'Select project'}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {projects.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">No projects</div>
        ) : (
          projects.map(project => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
