import { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  Trash2, 
  Save,
  AlertTriangle,
  Check,
  RefreshCw,
  ExternalLink,
  Palette,
  FolderSync,
  HelpCircle,
  Plug
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProjectStore } from '@/stores/projectStore'
import { useThemeStore, THEME_PRESETS, ThemePreset } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

export function ProjectSettingsTab() {
  const { currentProject, updateProject, deleteProject, fetchProjects } = useProjectStore()
  const { currentTheme, setTheme } = useThemeStore()
  
  // Local state - initialized from currentProject
  const [editedName, setEditedName] = useState('')
  const [editedPath, setEditedPath] = useState('')
  const [projectTheme, setProjectTheme] = useState<ThemePreset>('cyber')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Sync local state with currentProject
  useEffect(() => {
    if (currentProject) {
      setEditedName(currentProject.name || '')
      setEditedPath(currentProject.uproject_path || '')
      // Load project theme from settings or use global
      setProjectTheme(currentTheme)
    }
  }, [currentProject, currentTheme])

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
        <p className="text-muted-foreground mb-4">
          Select a project from the header to configure it
        </p>
      </div>
    )
  }

  // Capture project ID for async operations
  const projectId = currentProject.id
  const projectName = currentProject.name

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    
    try {
      await updateProject(projectId, {
        name: editedName,
      })
      // Apply theme for this project
      setTheme(projectTheme)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    console.log('Deleting project:', projectId)
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      await deleteProject(projectId)
      console.log('Project deleted successfully')
      setShowDeleteConfirm(false)
      // Refresh the project list
      await fetchProjects()
    } catch (error) {
      console.error('Failed to delete:', error)
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const hasChanges = editedName !== currentProject.name || projectTheme !== currentTheme

  return (
    <div className="space-y-8">
      {/* Project Info */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Project Information</h2>
        </div>

        <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Project Name</label>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="My Game Project"
            />
          </div>

          {/* Project ID (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">Project ID</label>
            <Input
              value={projectId}
              disabled
              className="font-mono text-xs bg-muted"
            />
          </div>

          {/* Project Path */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">Project Folder</label>
              <div className="group relative">
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs">
                  The folder containing your Unreal Engine project. The <code className="bg-muted px-1 rounded">.unreal-companion</code> folder is stored here.
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={editedPath}
                onChange={(e) => setEditedPath(e.target.value)}
                placeholder="/path/to/UnrealProject"
                className="font-mono text-xs flex-1"
              />
              {currentProject.uproject_path && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    const path = currentProject.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || currentProject.uproject_path
                    if (path) {
                      // Try to open in system file manager
                      window.open(`file://${path}`)
                    }
                  }}
                  title="Open in Finder"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            {editedPath !== currentProject.uproject_path && editedPath && (
              <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                <div className="flex items-start gap-2">
                  <FolderSync className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">Path Change Detected</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Changing the path will create a new <code className="bg-muted px-1 rounded">.unreal-companion</code> folder at the new location. 
                      The old folder will remain at its current location.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Companion Path (read-only) */}
          {currentProject.companion_path && (
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Companion Folder</label>
              <Input
                value={currentProject.companion_path}
                disabled
                className="font-mono text-xs bg-muted"
              />
            </div>
          )}
        </div>
      </section>

      {/* Project Appearance */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Project Appearance</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose a theme that matches your game's genre
        </p>

        <div className="grid grid-cols-4 gap-2">
          {Object.values(THEME_PRESETS).filter(t => t.id !== 'custom').map(theme => (
            <button
              key={theme.id}
              onClick={() => setProjectTheme(theme.id)}
              className={cn(
                "p-3 rounded-xl border-2 text-center transition-all hover:scale-105",
                projectTheme === theme.id 
                  ? "border-primary shadow-lg" 
                  : "border-transparent bg-muted/50 hover:bg-muted"
              )}
              style={{
                background: projectTheme === theme.id 
                  ? `linear-gradient(135deg, hsl(${theme.colors.gradientFrom}), hsl(${theme.colors.gradientTo}))`
                  : undefined
              }}
            >
              <span className="text-2xl">{theme.emoji}</span>
              <p className={cn(
                "text-xs font-medium mt-1",
                projectTheme === theme.id ? "text-white" : ""
              )}>{theme.name}</p>
            </button>
          ))}
        </div>

        {/* Custom colors button */}
        <Button variant="outline" size="sm" className="w-full" disabled>
          <Palette className="h-4 w-4 mr-2" />
          Custom Colors (coming soon)
        </Button>
      </section>

      {/* MCP Connection Info */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">MCP Connection</h2>
        </div>
        
        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
          <p className="text-sm text-muted-foreground">
            The MCP (Model Context Protocol) server connects to your Unreal Engine editor to execute commands. 
            These settings are configured automatically when you run the Unreal plugin.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Host:</span>
              <span className="ml-2 font-mono">{currentProject.unreal_host || '127.0.0.1'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Port:</span>
              <span className="ml-2 font-mono">{currentProject.unreal_port || 55557}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-sm text-emerald-500 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Error saving
            </span>
          )}
        </div>
        
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>

        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Project</p>
                <p className="text-sm text-muted-foreground">
                  Remove this project from Companion (files are not deleted)
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Are you sure?</p>
                  <p className="text-sm text-muted-foreground">
                    This will remove "{projectName}" from Companion.
                    Your files will not be deleted.
                  </p>
                </div>
              </div>
              {deleteError && (
                <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                  Error: {deleteError}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Project'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
