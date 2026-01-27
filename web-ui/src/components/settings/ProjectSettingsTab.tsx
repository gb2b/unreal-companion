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
import { useTranslation } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

export function ProjectSettingsTab() {
  const { currentProject, updateProject, deleteProject, fetchProjects } = useProjectStore()
  const { currentTheme, setTheme } = useThemeStore()
  const { t } = useTranslation()
  
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
        <h3 className="text-lg font-medium mb-2">{t('projectSettings.noProject')}</h3>
        <p className="text-muted-foreground mb-4">
          {t('projectSettings.noProjectDesc')}
        </p>
      </div>
    )
  }

  // Capture project ID for async operations
  const projectId = currentProject.id

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
          <h2 className="text-lg font-semibold">{t('projectSettings.info')}</h2>
        </div>

        <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/30">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('projectSettings.name')}</label>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder={t('projectSettings.namePlaceholder')}
            />
          </div>

          {/* Project ID (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('projectSettings.id')}</label>
            <Input
              value={projectId}
              disabled
              className="font-mono text-xs bg-muted"
            />
          </div>

          {/* Project Path */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">{t('projectSettings.folder')}</label>
              <div className="group relative">
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs">
                  {t('projectSettings.folderDesc')}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={editedPath}
                onChange={(e) => setEditedPath(e.target.value)}
                placeholder={t('projectSettings.folderPlaceholder')}
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
                  title={t('projectSettings.openFinder')}
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
                    <p className="font-medium text-amber-500">{t('projectSettings.pathChanged')}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {t('projectSettings.pathChangedDesc')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Companion Path (read-only) */}
          {currentProject.companion_path && (
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">{t('projectSettings.companionFolder')}</label>
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
          <h2 className="text-lg font-semibold">{t('projectSettings.appearance')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('projectSettings.chooseTheme')}
        </p>

        <div className="grid grid-cols-4 gap-2">
          {Object.values(THEME_PRESETS).filter(themePreset => themePreset.id !== 'custom').map(theme => (
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
          {t('projectSettings.customColors')}
        </Button>
      </section>

      {/* MCP Connection Info */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('projectSettings.mcpConnection')}</h2>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('projectSettings.mcpDesc')}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('projectSettings.host')}</span>
              <span className="ml-2 font-mono">{currentProject.unreal_host || '127.0.0.1'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('projectSettings.port')}</span>
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
              {t('projectSettings.saved')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {t('projectSettings.errorSaving')}
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
          {t('projectSettings.saveChanges')}
        </Button>
      </div>

      {/* Danger Zone */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-red-500">{t('projectSettings.dangerZone')}</h2>

        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('projectSettings.deleteProject')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('projectSettings.deleteProjectDesc')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('projectSettings.areYouSure')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('projectSettings.deleteConfirmDesc')}
                  </p>
                </div>
              </div>
              {deleteError && (
                <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                  {t('common.error')}: {deleteError}
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
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.deleting')}
                    </>
                  ) : (
                    t('projectSettings.yesDelete')
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
