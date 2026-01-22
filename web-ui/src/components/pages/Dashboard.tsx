import { useEffect, useState } from 'react'
import { 
  FolderOpen, 
  Plus, 
  Cpu, 
  MessageSquare, 
  FileText, 
  Terminal,
  Settings2,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useLLMStore } from '@/stores/llmStore'
import { NewProjectModal } from '@/components/projects/NewProjectModal'
import { ProjectSettings } from '@/components/projects/ProjectSettings'
import { useTranslation } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

interface DashboardProps {
  onNavigate?: (page: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { projects, currentProject, fetchProjects, setCurrentProject } = useProjectStore()
  const { unrealConnected, mcpConnected } = useConnectionStore()
  const { currentProvider, currentModel } = useLLMStore()
  const { t } = useTranslation()
  const [showNewProject, setShowNewProject] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>
          <Button 
            className="gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600" 
            onClick={() => setShowNewProject(true)}
          >
            <Plus className="h-4 w-4" />
            {t('project.new')}
          </Button>
        </div>

        {/* Quick Actions - Always visible */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 to-emerald-500/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{t('dashboard.quickActions')}</h2>
            {currentProject && (
              <span className="text-sm text-muted-foreground">
                {currentProject.name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionCard 
              icon={MessageSquare} 
              label={t('dashboard.startChat')}
              gradient="from-cyan-500 to-blue-500"
              onClick={() => onNavigate?.('editor')}
            />
            <QuickActionCard 
              icon={FileText} 
              label={t('dashboard.openWorkspace')}
              gradient="from-emerald-500 to-teal-500"
              onClick={() => onNavigate?.('workspace')}
            />
            <QuickActionCard 
              icon={Terminal} 
              label={t('dashboard.viewLogs')}
              gradient="from-amber-500 to-orange-500"
              onClick={() => onNavigate?.('editor')}
            />
            <QuickActionCard 
              icon={Settings2} 
              label={t('dashboard.settings')}
              gradient="from-violet-500 to-purple-500"
              onClick={() => onNavigate?.('settings')}
            />
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            icon={Cpu}
            title={t('sidebar.mcpServer')}
            status={mcpConnected ? t('sidebar.connected') : t('sidebar.disconnected')}
            connected={mcpConnected}
          />
          <StatusCard
            icon={Sparkles}
            title={t('sidebar.unrealEngine')}
            status={unrealConnected ? t('sidebar.connected') : t('sidebar.disconnected')}
            connected={unrealConnected}
            subtitle={currentProject?.unreal_project_name}
          />
          <StatusCard
            icon={MessageSquare}
            title="LLM"
            status={currentModel || 'Not configured'}
            connected={!!currentModel}
            subtitle={currentProvider}
          />
        </div>

        {/* Projects Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Projects</h2>
          {projects.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">Create your first project to get started</p>
              <Button onClick={() => setShowNewProject(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isActive={currentProject?.id === project.id}
                  onClick={() => setCurrentProject(project)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Current Project Details */}
        {currentProject && (
          <div className="border border-border rounded-xl p-6 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{currentProject.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {currentProject.unreal_host}:{currentProject.unreal_port}
                  {currentProject.unreal_project_name && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs">
                      {currentProject.unreal_project_name}
                    </span>
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                {t('nav.settings')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewProjectModal 
        isOpen={showNewProject} 
        onClose={() => setShowNewProject(false)} 
      />
      
      {currentProject && (
        <ProjectSettings
          project={currentProject}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

function StatusCard({ 
  icon: Icon, 
  title, 
  status, 
  connected,
  subtitle 
}: { 
  icon: React.ElementType
  title: string
  status: string
  connected: boolean
  subtitle?: string
}) {
  return (
    <div className={cn(
      "border rounded-xl p-4 bg-card transition-all",
      connected ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          connected ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn(
            "font-medium",
            connected ? "text-emerald-400" : "text-muted-foreground"
          )}>
            {status}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ 
  project, 
  isActive, 
  onClick 
}: { 
  project: { id: string; name: string; slug: string; unreal_project_name?: string }
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border rounded-xl p-4 text-left transition-all hover-lift",
        isActive 
          ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-emerald-500/10" 
          : "border-border bg-card hover:border-cyan-500/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isActive ? "bg-cyan-500/20 text-cyan-400" : "bg-muted text-muted-foreground"
        )}>
          <FolderOpen className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{project.name}</p>
          <p className="text-xs text-muted-foreground truncate">{project.slug}</p>
          {project.unreal_project_name && (
            <p className="text-xs text-cyan-400 mt-1">→ {project.unreal_project_name}</p>
          )}
        </div>
      </div>
    </button>
  )
}

function QuickActionCard({ 
  icon: Icon, 
  label,
  gradient,
  onClick 
}: { 
  icon: React.ElementType
  label: string
  gradient: string
  onClick?: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border border-border bg-card",
        "hover:border-transparent hover:shadow-lg transition-all group hover-lift"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg bg-gradient-to-br",
        gradient,
        "text-white"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
