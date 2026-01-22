import { useState, useEffect } from 'react'
import { X, Settings2, Trash2, Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore, Project } from '@/stores/projectStore'

interface ProjectSettingsProps {
  project: Project
  isOpen: boolean
  onClose: () => void
}

export function ProjectSettings({ project, isOpen, onClose }: ProjectSettingsProps) {
  const { updateProject, deleteProject, setCurrentProject } = useProjectStore()
  const [name, setName] = useState(project.name)
  const [unrealHost, setUnrealHost] = useState(project.unreal_host)
  const [unrealPort, setUnrealPort] = useState(project.unreal_port.toString())
  const [defaultAgent, setDefaultAgent] = useState(project.default_agent)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setName(project.name)
    setUnrealHost(project.unreal_host)
    setUnrealPort(project.unreal_port.toString())
    setDefaultAgent(project.default_agent)
  }, [project])

  const handleSave = async () => {
    setError('')
    setIsLoading(true)
    
    try {
      await updateProject(project.id, {
        name,
        unreal_host: unrealHost,
        unreal_port: parseInt(unrealPort, 10),
        default_agent: defaultAgent,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      return
    }
    
    try {
      await deleteProject(project.id)
      setCurrentProject(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
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
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Project Settings</h2>
              <p className="text-xs text-muted-foreground">{project.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project Name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unreal Host</label>
              <Input
                value={unrealHost}
                onChange={(e) => setUnrealHost(e.target.value)}
                placeholder="127.0.0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Port</label>
              <Input
                type="number"
                value={unrealPort}
                onChange={(e) => setUnrealPort(e.target.value)}
                placeholder="55557"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Default Agent</label>
            <select
              value={defaultAgent}
              onChange={(e) => setDefaultAgent(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="game-dev">Game Developer</option>
              <option value="game-designer">Game Designer</option>
              <option value="game-architect">Technical Architect</option>
              <option value="3d-artist">3D Artist</option>
              <option value="level-designer">Level Designer</option>
            </select>
          </div>
          
          <div className="flex justify-between pt-4 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={handleDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
