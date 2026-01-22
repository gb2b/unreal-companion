import React, { useState } from 'react'
import { 
  Settings, 
  Server,
  Gamepad2,
  Zap,
  Sparkles,
  FolderOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTranslation } from '@/i18n/useI18n'

export type MainSection = 'editor' | 'workspace'

interface SidebarProps {
  currentSection: MainSection
  onSectionChange: (section: MainSection) => void
  onDashboardClick: () => void
  onSettingsClick: () => void
  onNewProject: () => void
  showDashboard?: boolean
  showSettings?: boolean
}

export function Sidebar({ 
  currentSection,
  onSectionChange,
  onDashboardClick,
  onSettingsClick,
  onNewProject,
  showDashboard = false,
  showSettings = false,
}: SidebarProps) {
  const { unrealConnected, mcpConnected } = useConnectionStore()
  const { projects, currentProject, setCurrentProject } = useProjectStore()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const unrealProjectLinked = unrealConnected && currentProject?.unreal_project_name

  return (
    <div className={cn(
      "h-full flex flex-col border-r border-border bg-gradient-to-b from-card to-background transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className={cn("p-2 border-b border-border", collapsed ? "px-2" : "p-4")}>
        <button 
          onClick={onDashboardClick}
          className={cn(
            "w-full flex items-center rounded-xl transition-all",
            collapsed ? "justify-center p-2" : "justify-between p-2",
            showDashboard
              ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30"
              : "hover:bg-muted"
          )}
          title={collapsed ? "Unreal Companion" : undefined}
        >
          {collapsed ? (
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          ) : (
            <>
              <div className="text-left">
                <p className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Unreal Companion
                </p>
                <p className="text-[10px] text-muted-foreground">AI-Powered Development</p>
              </div>
              {showDashboard && <LayoutDashboard className="h-4 w-4 text-cyan-400" />}
            </>
          )}
        </button>
      </div>

      {/* Project Selector */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border">
          <ProjectSelector 
            projects={projects}
            currentProject={currentProject}
            onSelect={setCurrentProject}
            onNewProject={onNewProject}
          />
        </div>
      )}

      {/* Main Sections */}
      <div className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3 space-y-2")}>
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
            Sections
          </p>
        )}
        
        {/* Editor Section */}
        <SectionButton
          active={currentSection === 'editor' && !showDashboard && !showSettings}
          onClick={() => onSectionChange('editor')}
          icon={Zap}
          label={t('nav.editor')}
          description={t('nav.editorDesc')}
          gradient="from-cyan-500 to-blue-500"
          collapsed={collapsed}
        />
        
        {/* Studio Section */}
        <SectionButton
          active={currentSection === 'workspace' && !showDashboard && !showSettings}
          onClick={() => onSectionChange('workspace')}
          icon={Sparkles}
          label="Studio"
          description="Production & docs"
          gradient="from-emerald-500 to-cyan-500"
          collapsed={collapsed}
        />
      </div>

      {/* Connection Status */}
      <div className={cn("space-y-1 border-t border-border", collapsed ? "p-2" : "p-3 space-y-2")}>
        {!collapsed && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">
            Status
          </p>
        )}
        
        {/* MCP Server */}
        <StatusIndicator
          icon={Server}
          label={t('sidebar.mcpServer')}
          connected={mcpConnected}
          statusText={mcpConnected ? t('sidebar.connected') : t('sidebar.disconnected')}
          color="emerald"
          collapsed={collapsed}
        />
        
        {/* Unreal Engine */}
        <StatusIndicator
          icon={Gamepad2}
          label={t('sidebar.unrealEngine')}
          connected={unrealConnected}
          statusText={
            unrealConnected 
              ? unrealProjectLinked 
                ? t('sidebar.projectLinked')
                : t('sidebar.projectNotLinked')
              : t('sidebar.disconnected')
          }
          color={unrealConnected ? (unrealProjectLinked ? "blue" : "amber") : undefined}
          collapsed={collapsed}
        />
      </div>

      {/* Settings & Collapse */}
      <div className={cn("border-t border-border", collapsed ? "p-2" : "p-3")}>
        <button
          onClick={onSettingsClick}
          className={cn(
            "w-full flex items-center rounded-lg text-sm transition-all",
            collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
            showSettings
              ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-400 border border-cyan-500/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title={collapsed ? t('nav.settings') : undefined}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span>{t('nav.settings')}</span>}
        </button>
        
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function ProjectSelector({
  projects,
  currentProject,
  onSelect,
  onNewProject,
}: {
  projects: { id: string; name: string; unreal_host: string; unreal_port: number }[]
  currentProject: { id: string; name: string } | null
  onSelect: (project: any) => void
  onNewProject: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <FolderOpen className="h-4 w-4 text-cyan-400 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium truncate">
          {currentProject?.name || t('project.select')}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          open && "rotate-180"
        )} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="max-h-48 overflow-y-auto p-1">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelect(project)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors",
                    currentProject?.id === project.id
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  {currentProject?.id === project.id && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-1 border-t border-border">
              <button
                onClick={() => {
                  setOpen(false)
                  onNewProject()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{t('project.new')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SectionButton({
  active,
  onClick,
  icon: Icon,
  label,
  description,
  gradient,
  collapsed,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  description: string
  gradient: string
  collapsed: boolean
}) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center justify-center p-2 rounded-xl transition-all",
          active
            ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30"
            : "hover:bg-muted border border-transparent"
        )}
        title={label}
      >
        <div className={cn(
          "p-2 rounded-lg bg-gradient-to-br text-white",
          active ? gradient : "from-muted to-muted text-muted-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all",
        active
          ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30"
          : "hover:bg-muted border border-transparent"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg bg-gradient-to-br text-white",
        active ? gradient : "from-muted to-muted text-muted-foreground"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          active ? "text-cyan-400" : "text-foreground"
        )}>
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {description}
        </p>
      </div>
    </button>
  )
}

function StatusIndicator({
  icon: Icon,
  label,
  connected,
  statusText,
  color,
  collapsed,
}: {
  icon: React.ElementType
  label: string
  connected: boolean
  statusText: string
  color?: 'emerald' | 'blue' | 'amber'
  collapsed: boolean
}) {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      dot: 'bg-emerald-500',
      icon: 'text-emerald-400',
      text: 'text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10 border-blue-500/20',
      dot: 'bg-blue-500',
      icon: 'text-blue-400',
      text: 'text-blue-400',
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/20',
      dot: 'bg-amber-500',
      icon: 'text-amber-400',
      text: 'text-amber-400',
    },
  }

  const colors = color && connected ? colorClasses[color] : {
    bg: 'bg-muted/50',
    dot: 'bg-muted-foreground',
    icon: 'text-muted-foreground',
    text: 'text-muted-foreground',
  }

  if (collapsed) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center p-2 rounded-lg border transition-all relative",
          colors.bg
        )}
        title={`${label}: ${statusText}`}
      >
        <Icon className={cn("h-4 w-4", colors.icon)} />
        <div className={cn(
          "absolute top-1 right-1 w-2 h-2 rounded-full",
          colors.dot,
          connected && "status-dot-pulse"
        )} />
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
      colors.bg
    )}>
      <div className={cn(
        "w-2 h-2 rounded-full flex-shrink-0",
        colors.dot,
        connected && "status-dot-pulse"
      )} />
      <Icon className={cn("h-4 w-4 flex-shrink-0", colors.icon)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        <p className={cn("text-[10px] truncate", colors.text)}>
          {statusText}
        </p>
      </div>
    </div>
  )
}
