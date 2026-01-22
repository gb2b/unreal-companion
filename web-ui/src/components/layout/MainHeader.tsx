import { useState } from 'react'
import { 
  Sparkles, 
  Zap,
  Settings,
  FolderOpen,
  ChevronDown,
  Check,
  Plus
} from 'lucide-react'
// Note: Sparkles kept for ModeButton icon
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'

export type AppMode = 'studio' | 'editor'

interface MainHeaderProps {
  mode: AppMode
  onModeChange: (mode: AppMode) => void
  onSettingsClick: () => void
  onNewProject: () => void
}

export function MainHeader({ 
  mode, 
  onModeChange, 
  onSettingsClick,
  onNewProject,
  onLogoClick,
}: MainHeaderProps & { onLogoClick?: () => void }) {
  const { projects, currentProject, setCurrentProject } = useProjectStore()

  return (
    <header className="h-14 border-b border-border bg-gradient-to-r from-card to-background flex items-center px-4">
      {/* Left section - fixed width for symmetry */}
      <div className="flex items-center gap-4 w-[280px]">
        {/* Title - clickable */}
        <button
          onClick={onLogoClick}
          className="font-bold text-lg theme-gradient-text whitespace-nowrap hover:opacity-80 transition-opacity"
        >
          Unreal Companion
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Project Selector */}
        <ProjectSelector
          projects={projects}
          currentProject={currentProject}
          onSelect={setCurrentProject}
          onNewProject={onNewProject}
        />
      </div>

      {/* Center: Mode Toggle - truly centered */}
      <div className="flex-1 flex justify-center">
        <ModeToggle mode={mode} onModeChange={onModeChange} />
      </div>

      {/* Right section - fixed width for symmetry */}
      <div className="flex items-center justify-end gap-2 w-[280px]">
        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}

// ============ MODE TOGGLE ============

function ModeToggle({ 
  mode, 
  onModeChange 
}: { 
  mode: AppMode
  onModeChange: (mode: AppMode) => void 
}) {
  return (
    <div className="flex items-center bg-muted rounded-xl p-1">
      <ModeButton
        active={mode === 'studio'}
        onClick={() => onModeChange('studio')}
        icon={Sparkles}
        label="Studio"
        description="Plan & organize"
      />
      <ModeButton
        active={mode === 'editor'}
        onClick={() => onModeChange('editor')}
        icon={Zap}
        label="Editor"
        description="Build & code"
      />
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
  description
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
        active 
          ? "bg-background shadow-md" 
          : "hover:bg-background/50"
      )}
    >
      <Icon className={cn(
        "h-4 w-4",
        active ? "text-primary" : "text-muted-foreground"
      )} />
      <div className="text-left">
        <p className={cn(
          "text-sm font-medium leading-none",
          active ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground hidden md:block">
          {description}
        </p>
      </div>
    </button>
  )
}

// ============ PROJECT SELECTOR ============

function ProjectSelector({
  projects,
  currentProject,
  onSelect,
  onNewProject,
}: {
  projects: { id: string; name: string }[]
  currentProject: { id: string; name: string } | null
  onSelect: (project: any) => void
  onNewProject: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left max-w-[200px]"
      >
        <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium truncate">
          {currentProject?.name || 'Select project'}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-scale-in">
            {/* Projects List */}
            <div className="max-h-64 overflow-y-auto p-1">
              {projects.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No projects yet
                </p>
              ) : (
                projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => {
                      onSelect(project)
                      setOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors",
                      currentProject?.id === project.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <span className="truncate">{project.name}</span>
                    {currentProject?.id === project.id && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
            
            {/* New Project */}
            <div className="p-1 border-t border-border">
              <button
                onClick={() => {
                  setOpen(false)
                  onNewProject()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
