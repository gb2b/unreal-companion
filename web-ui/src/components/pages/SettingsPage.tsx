import { useState, useEffect } from 'react'
import { 
  Server, 
  Wand2,
  Settings,
  Box,
  X,
  FolderOpen,
  Globe,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLLMStore } from '@/stores/llmStore'
import { useProjectStore } from '@/stores/projectStore'
import { cn } from '@/lib/utils'

// Tab components
import { ProvidersModelsTab } from '@/components/settings/ProvidersModelsTab'
import { AutoModeTab } from '@/components/settings/AutoModeTab'
import { ExternalServicesTab } from '@/components/settings/ExternalServicesTab'
import { PreferencesTab } from '@/components/settings/PreferencesTab'
import { ProjectSettingsTab } from '@/components/settings/ProjectSettingsTab'

type SettingsSection = 'global' | 'project'
type GlobalTabId = 'providers' | 'auto' | 'external' | 'preferences'

interface Tab {
  id: GlobalTabId
  label: string
  icon: React.ElementType
}

const GLOBAL_TABS: Tab[] = [
  { id: 'providers', label: 'LLM Providers', icon: Server },
  { id: 'auto', label: 'Auto Mode', icon: Wand2 },
  { id: 'external', label: 'External Services', icon: Box },
  { id: 'preferences', label: 'Preferences', icon: Settings },
]

interface SettingsPageProps {
  onClose?: () => void
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const [section, setSection] = useState<SettingsSection>('global')
  const [activeTab, setActiveTab] = useState<GlobalTabId>('providers')
  const { fetchConfig, fetchModels, currentProvider } = useLLMStore()
  const { currentProject } = useProjectStore()

  useEffect(() => {
    fetchConfig()
    fetchModels(currentProvider)
  }, [fetchConfig, fetchModels, currentProvider])

  const renderGlobalTab = () => {
    switch (activeTab) {
      case 'providers':
        return <ProvidersModelsTab />
      case 'auto':
        return <AutoModeTab />
      case 'external':
        return <ExternalServicesTab />
      case 'preferences':
        return <PreferencesTab />
      default:
        return <ProvidersModelsTab />
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-card to-background">
        <div className="flex items-center gap-4">
          <Settings2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              {section === 'global' ? 'Global configuration' : `Project: ${currentProject?.name || 'None'}`}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Section Toggle */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
        <SectionButton
          active={section === 'global'}
          onClick={() => setSection('global')}
          icon={Globe}
          label="Global"
        />
        <SectionButton
          active={section === 'project'}
          onClick={() => setSection('project')}
          icon={FolderOpen}
          label="Project"
          badge={currentProject?.name}
        />
      </div>

      {/* Content */}
      {section === 'global' ? (
        <>
          {/* Global Tabs */}
          <div className="flex items-center gap-1 px-6 py-2 border-b border-border">
            {GLOBAL_TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Global Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {renderGlobalTab()}
            </div>
          </div>
        </>
      ) : (
        /* Project Settings */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <ProjectSettingsTab />
          </div>
        </div>
      )}
    </div>
  )
}

function SectionButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {badge && (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs",
          active ? "bg-primary-foreground/20" : "bg-muted"
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}
