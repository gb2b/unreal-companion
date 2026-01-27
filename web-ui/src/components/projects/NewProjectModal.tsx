import { useState, useEffect } from 'react'
import { X, FolderPlus, Sparkles, Folder, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/stores/projectStore'
import { useTranslation } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

interface DiscoveredProject {
  name: string
  path: string
  uproject_path: string
}

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const { createProject, setCurrentProject } = useProjectStore()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Discovered projects
  const [discoveredProjects, setDiscoveredProjects] = useState<DiscoveredProject[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [showDiscovered, setShowDiscovered] = useState(false)
  
  // Discover projects on mount
  useEffect(() => {
    if (isOpen && discoveredProjects.length === 0) {
      discoverProjects()
    }
  }, [isOpen])
  
  const discoverProjects = async () => {
    setIsDiscovering(true)
    try {
      const response = await fetch('/api/projects/discover')
      if (response.ok) {
        const data = await response.json()
        setDiscoveredProjects(data.projects || [])
      }
    } catch (e) {
      console.error('Failed to discover projects:', e)
    } finally {
      setIsDiscovering(false)
    }
  }
  
  const handleSelectDiscovered = (project: DiscoveredProject) => {
    setProjectPath(project.path)
    setName(project.name.replace(/([A-Z])/g, ' $1').trim())
    setShowDiscovered(false)
    setError('')
  }
  

  // Generate slug from name
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  
  // Companion path preview
  const companionPath = projectPath ? `${projectPath.replace(/\/$/, '')}/.unreal-companion/` : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) {
      setError(t('newProject.nameRequired'))
      return
    }
    
    setIsLoading(true)
    try {
      let project
      
      // If project path is provided, use the init endpoint
      if (projectPath.trim()) {
        const response = await fetch('/api/projects/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_path: projectPath.trim() })
        })
        
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.detail || 'Failed to initialize project')
        }
        
        const result = await response.json()
        project = result.project
        
        // Refresh the projects list
        await useProjectStore.getState().fetchProjects()
      } else {
        // No project path, just create in DB
        project = await createProject({
          name: name.trim(),
          slug: slug,
          unreal_host: '127.0.0.1',
          unreal_port: 55557,
        })
      }
      
      setCurrentProject(project)
      
      // Reset and close
      setName('')
      setProjectPath('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsLoading(false)
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
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 mb-4">
            <Sparkles className="h-8 w-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            {t('newProject.title')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('newProject.subtitle')}
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form - Simplified */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              error.includes('selected') 
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-500"
                : "bg-red-500/10 border border-red-500/30 text-red-500"
            )}>
              {error}
            </div>
          )}
          
          {/* Project Name - Main focus */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('newProject.nameLabel')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('newProject.namePlaceholder')}
              className="text-lg h-12"
              autoFocus
            />
          </div>
          
          {/* Unreal Project Folder - Optional but recommended */}
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium">{t('newProject.linkFolder')}</label>
                <span className="text-xs text-muted-foreground">({t('common.optional')})</span>
              </div>
              {discoveredProjects.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiscovered(!showDiscovered)}
                  className="text-xs h-7"
                >
                  <Search className="h-3 w-3 mr-1" />
                  {discoveredProjects.length} {t('newProject.found')}
                </Button>
              )}
              {isDiscovering && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('newProject.scanning')}
                </span>
              )}
            </div>

            {/* Discovered projects list */}
            {showDiscovered && discoveredProjects.length > 0 && (
              <div className="mb-3 p-2 rounded-lg bg-background border border-border max-h-40 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">{t('newProject.detectedProjects')}</p>
                <div className="space-y-1">
                  {discoveredProjects.map((project) => (
                    <button
                      key={project.uproject_path}
                      type="button"
                      onClick={() => handleSelectDiscovered(project)}
                      className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                    >
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{project.path}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Input
              value={projectPath}
              onChange={(e) => {
                setProjectPath(e.target.value)
                if (error.includes('selected')) setError('')
                // Auto-suggest name from path
                if (!name && e.target.value) {
                  const folderName = e.target.value.split('/').filter(Boolean).pop() || ''
                  if (folderName) {
                    setName(folderName.replace(/([A-Z])/g, ' $1').trim())
                  }
                }
              }}
              placeholder={t('newProject.pathPlaceholder')}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {discoveredProjects.length > 0
                ? t('newProject.selectOrPaste')
                : t('newProject.pastePath')}
            </p>
            {companionPath && !error.includes('selected') && (
              <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                <FolderPlus className="h-3 w-3" />
                {t('newProject.willCreate')} <code className="bg-muted px-1 rounded">{companionPath}</code>
              </p>
            )}
          </div>

          {/* What you get */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 border border-cyan-500/20">
            <p className="text-sm font-medium mb-2">{t('newProject.includesTitle')}</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> {t('newProject.includesBoard')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> {t('newProject.includesAgents')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> {t('newProject.includesWorkflows')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> {t('newProject.includesLocal')}
              </li>
            </ul>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading || !name.trim()}
            className={cn(
              "w-full h-12 text-lg font-semibold",
              "bg-gradient-to-r from-cyan-500 to-emerald-500",
              "hover:from-cyan-600 hover:to-emerald-600",
              "shadow-lg shadow-cyan-500/25"
            )}
          >
            {isLoading ? t('newProject.creating') : t('newProject.createButton')}
          </Button>
        </form>
      </div>
    </div>
  )
}
