import { useState, useEffect, useCallback } from 'react'
import { Loader2, Sparkles, AlertTriangle, X } from 'lucide-react'
import { MainHeader, AppMode } from '@/components/layout/MainHeader'
import { StudioPage } from '@/components/pages/StudioPage'
import { EditorPage } from '@/components/pages/EditorPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { NewProjectModal } from '@/components/projects/NewProjectModal'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { Toaster } from '@/components/ui/Toaster'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useProjectStore } from '@/stores/projectStore'
import { useLLMStore } from '@/stores/llmStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useThemeStore } from '@/stores/themeStore'

function App() {
  const [mode, setMode] = useState<AppMode>('studio')
  const [showSettings, setShowSettings] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pageKey, setPageKey] = useState(0) // Used to reset pages to home
  const [llmWarningDismissed, setLlmWarningDismissed] = useState(false)

  const { currentProject, projects, fetchProjects } = useProjectStore()
  const { fetchConfig, hasAnthropicKey, hasOpenAIKey, hasGoogleKey } = useLLMStore()
  const { fetchStatus } = useConnectionStore()
  const { applyTheme } = useThemeStore()
  
  // Check if onboarding is needed
  const hasAnyApiKey = hasAnthropicKey || hasOpenAIKey || hasGoogleKey
  
  // Initialize stores on app load - non-blocking
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      
      // Run these in parallel for faster startup
      await Promise.all([
        fetchProjects().catch(console.error),
        fetchConfig().catch(console.error),
      ])
      
      // Non-blocking status check
      fetchStatus().catch(console.error)
      
      // Apply theme
      applyTheme()
      
      setIsInitialized(true)
      setIsLoading(false)
    }
    init()
    
    // Refresh status periodically - non-blocking
    const interval = setInterval(() => fetchStatus().catch(console.error), 10000)
    return () => clearInterval(interval)
  }, [fetchProjects, fetchConfig, fetchStatus, applyTheme])
  
  // Show onboarding if no projects (regardless of API key status)
  useEffect(() => {
    if (isInitialized && projects.length === 0) {
      setShowOnboarding(true)
    }
  }, [isInitialized, projects.length])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl + K: Toggle command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCommandPaletteOpen(v => !v)
    }
    // Cmd/Ctrl + ,: Settings
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault()
      setShowSettings(v => !v)
    }
    // Escape: Close overlays
    if (e.key === 'Escape') {
      if (showSettings) setShowSettings(false)
    }
    // Cmd/Ctrl + 1: Studio mode
    if ((e.metaKey || e.ctrlKey) && e.key === '1') {
      e.preventDefault()
      setMode('studio')
      setShowSettings(false)
    }
    // Cmd/Ctrl + 2: Editor mode
    if ((e.metaKey || e.ctrlKey) && e.key === '2') {
      e.preventDefault()
      setMode('editor')
      setShowSettings(false)
    }
  }, [showSettings])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  useWebSocket(currentProject?.id || null)

  // Handle navigation from command palette
  const handleNavigate = (page: string) => {
    if (page === 'settings') {
      setShowSettings(true)
    } else if (page === 'studio' || page === 'dashboard' || page === 'workspace') {
      setMode('studio')
      setShowSettings(false)
    } else if (page === 'editor' || page === 'chat') {
      setMode('editor')
      setShowSettings(false)
    }
  }

  // Show loading screen during initialization
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/50">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold">Unreal Companion</h1>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Show onboarding flow
  if (showOnboarding) {
    return (
      <>
        <OnboardingFlow onComplete={() => {
          setShowOnboarding(false)
          fetchProjects()
          fetchConfig()
        }} />
        <Toaster />
      </>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Main Header */}
      <MainHeader
        mode={mode}
        onModeChange={(newMode) => {
          setMode(newMode)
          setShowSettings(false)
        }}
        onSettingsClick={() => setShowSettings(!showSettings)}
        onNewProject={() => setNewProjectOpen(true)}
        onLogoClick={() => {
          // Return to home of current mode
          setShowSettings(false)
          setPageKey(k => k + 1) // Increment key to reset page state
        }}
      />

      {/* LLM Provider Warning Banner */}
      {!hasAnyApiKey && !llmWarningDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              No AI provider configured. AI features won't work until you add an API key in{' '}
              <button
                onClick={() => setShowSettings(true)}
                className="underline hover:no-underline font-medium"
              >
                Settings
              </button>.
            </span>
          </div>
          <button
            onClick={() => setLlmWarningDismissed(true)}
            className="p-1 hover:bg-amber-500/20 rounded transition-colors"
          >
            <X className="h-4 w-4 text-amber-500" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {showSettings ? (
            <SettingsPage onClose={() => setShowSettings(false)} />
          ) : mode === 'studio' ? (
            <StudioPage key={`studio-${pageKey}`} />
          ) : (
            <EditorPage key={`editor-${pageKey}`} />
          )}
        </ErrorBoundary>
      </main>
      
      {/* Modals */}
      <NewProjectModal 
        isOpen={newProjectOpen} 
        onClose={() => setNewProjectOpen(false)} 
      />
      
      <Toaster />
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  )
}

export default App
