import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Key,
  FolderOpen,
  Zap,
  ExternalLink,
  Palette,
  Loader2,
  AlertCircle,
  FolderPlus,
  Search
} from 'lucide-react'

interface DiscoveredProject {
  name: string
  path: string
  uproject_path: string
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLLMStore, LLMProvider } from '@/stores/llmStore'
import { useProjectStore } from '@/stores/projectStore'
import { useThemeStore, THEME_PRESETS, ThemePreset } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

type Step = 'welcome' | 'project' | 'providers' | 'theme' | 'ready'

const STEPS: { id: Step; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'project', label: 'Project' },
  { id: 'providers', label: 'AI Provider' },
  { id: 'theme', label: 'Appearance' },
  { id: 'ready', label: 'Ready' },
]

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Project state
  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState('')
  
  // Provider state
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('anthropic')
  const [apiKey, setApiKey] = useState('')
  const [providerConfigured, setProviderConfigured] = useState(false)
  
  // Theme state
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>('cyber')
  
  // Discovered projects
  const [discoveredProjects, setDiscoveredProjects] = useState<DiscoveredProject[]>([])
  const [isDiscovering, setIsDiscovering] = useState(false)
  
  const { saveApiKey, setProvider: setLLMProvider, fetchModels, hasAnthropicKey, hasOpenAIKey, hasGoogleKey } = useLLMStore()
  const { createProject, fetchProjects } = useProjectStore()
  const { setTheme, applyTheme } = useThemeStore()
  
  // Check if a provider is already configured
  useEffect(() => {
    if (hasAnthropicKey || hasOpenAIKey || hasGoogleKey) {
      setProviderConfigured(true)
    }
  }, [hasAnthropicKey, hasOpenAIKey, hasGoogleKey])
  
  // Discover projects when reaching the project step
  useEffect(() => {
    if (step === 'project' && discoveredProjects.length === 0) {
      discoverProjects()
    }
  }, [step])
  
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
    setProjectName(project.name.replace(/([A-Z])/g, ' $1').trim())
    setError('')
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === step)
  
  const handleNext = async () => {
    setError('')
    
    switch (step) {
      case 'welcome':
        setStep('project')
        break
        
      case 'project':
        if (!projectName.trim() && !projectPath.trim()) {
          setError('Please enter a project name or select a folder')
          return
        }
        setIsLoading(true)
        try {
          if (projectPath.trim()) {
            // Initialize with Unreal project folder
            const response = await fetch('/api/projects/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ project_path: projectPath.trim() })
            })
            
            if (!response.ok) {
              const data = await response.json()
              throw new Error(data.detail || 'Failed to initialize project')
            }
          } else {
            // Create project without path
            await createProject({ 
              name: projectName.trim(),
              slug: projectName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
              unreal_host: '127.0.0.1',
              unreal_port: 55557,
            })
          }
          await fetchProjects()
          setStep('providers')
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to create project')
        } finally {
          setIsLoading(false)
        }
        break
        
      case 'providers':
        if (apiKey.trim()) {
          setIsLoading(true)
          try {
            await saveApiKey(selectedProvider, apiKey.trim())
            await setLLMProvider(selectedProvider)
            await fetchModels(selectedProvider)
            setProviderConfigured(true)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save API key')
            setIsLoading(false)
            return
          } finally {
            setIsLoading(false)
          }
        }
        setStep('theme')
        break
        
      case 'theme':
        setTheme(selectedTheme)
        applyTheme()
        setStep('ready')
        break
        
      case 'ready':
        onComplete()
        break
    }
  }
  
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].id)
      setError('')
    }
  }
  
  const handleSkip = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].id)
      setError('')
    }
  }
  
  
  // Preview theme
  const handleThemePreview = (theme: ThemePreset) => {
    setSelectedTheme(theme)
    setTheme(theme)
    applyTheme()
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/50">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg">Unreal Companion</span>
        </div>
        
        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                step === s.id ? "bg-primary text-primary-foreground scale-110" :
                currentStepIndex > i 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              )}>
                {currentStepIndex > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 hidden sm:block",
                  currentStepIndex > i ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
        
        <div className="w-32" /> {/* Spacer for alignment */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-8">
        <div className="w-full max-w-2xl">
          {/* STEP: Welcome */}
          {step === 'welcome' && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto shadow-2xl shadow-primary/20">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-4">Welcome to Unreal Companion</h1>
                <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                  Your AI-powered game development studio. Let's get you set up in a few simple steps.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 max-w-md mx-auto pt-4">
                <FeatureCard icon={FolderOpen} label="Link Project" />
                <FeatureCard icon={Key} label="Connect AI" />
                <FeatureCard icon={Palette} label="Personalize" />
              </div>
            </div>
          )}

          {/* STEP: Project */}
          {step === 'project' && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Create Your Studio</h2>
                <p className="text-muted-foreground">
                  Link an Unreal project or create a new workspace
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What's your game called?
                  </label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Game"
                    className="text-lg h-12"
                    autoFocus
                  />
                </div>

                {/* Discovered Projects */}
                {(discoveredProjects.length > 0 || isDiscovering) && (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="h-4 w-4 text-primary" />
                      <label className="text-sm font-medium">
                        Detected Unreal Projects
                      </label>
                      {isDiscovering && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {discoveredProjects.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {discoveredProjects.map((project) => (
                          <button
                            key={project.uproject_path}
                            type="button"
                            onClick={() => handleSelectDiscovered(project)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-colors",
                              projectPath === project.path
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card hover:border-primary/50"
                            )}
                          >
                            <p className="text-sm font-medium">{project.name}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{project.path}</p>
                          </button>
                        ))}
                      </div>
                    ) : isDiscovering ? (
                      <p className="text-sm text-muted-foreground">Scanning for projects...</p>
                    ) : null}
                  </div>
                )}

                {/* Project Folder - Manual entry */}
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderPlus className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">
                      {discoveredProjects.length > 0 ? 'Or enter path manually' : 'Unreal Project Folder'}
                    </label>
                    <span className="text-xs text-muted-foreground">(optional)</span>
                  </div>
                  <Input
                    value={projectPath}
                    onChange={(e) => {
                      setProjectPath(e.target.value)
                      if (error.includes('selected')) setError('')
                      // Auto-suggest name from path
                      if (!projectName && e.target.value) {
                        const folderName = e.target.value.split('/').filter(Boolean).pop() || ''
                        if (folderName && !folderName.includes('.')) {
                          setProjectName(folderName.replace(/([A-Z])/g, ' $1').trim())
                        }
                      }
                    }}
                    placeholder="/Users/you/UnrealProjects/MyGame"
                    className="font-mono text-sm"
                  />
                  {projectPath && !projectPath.startsWith('Selected:') && !error.includes('selected') && (
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                      <FolderPlus className="h-3 w-3" />
                      Will create: <code className="bg-muted px-1 rounded">{projectPath.replace(/\/$/, '')}/.unreal-companion/</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP: Providers */}
          {step === 'providers' && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Key className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Your AI Provider</h2>
                <p className="text-muted-foreground">
                  Add an API key to power the AI features
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">Select a provider</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'anthropic' as LLMProvider, name: 'Anthropic', desc: 'Claude models', color: 'from-orange-500 to-amber-500' },
                      { id: 'openai' as LLMProvider, name: 'OpenAI', desc: 'GPT models', color: 'from-emerald-500 to-teal-500' },
                      { id: 'google' as LLMProvider, name: 'Google', desc: 'Gemini models', color: 'from-blue-500 to-indigo-500' },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProvider(p.id)}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all text-left",
                          selectedProvider === p.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2",
                          p.color
                        )}>
                          <Key className="h-4 w-4 text-white" />
                        </div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">API Key</label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter your ${selectedProvider} API key`}
                    className="font-mono"
                  />
                  <a 
                    href={
                      selectedProvider === 'anthropic' ? 'https://console.anthropic.com/settings/keys' :
                      selectedProvider === 'openai' ? 'https://platform.openai.com/api-keys' :
                      'https://aistudio.google.com/apikey'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                  >
                    Get an API key
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {providerConfigured && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                    <Check className="h-4 w-4" />
                    A provider is already configured. You can skip this step or add another.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP: Theme */}
          {step === 'theme' && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Palette className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Choose Your Theme</h2>
                <p className="text-muted-foreground">
                  Match your studio to your game's genre
                </p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {Object.entries(THEME_PRESETS)
                  .filter(([id]) => id !== 'custom')
                  .map(([id, theme]) => (
                    <button
                      key={id}
                      onClick={() => handleThemePreview(id as ThemePreset)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-center",
                        selectedTheme === id 
                          ? "border-primary bg-primary/5 scale-105" 
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-2xl mb-2 block">{theme.emoji}</span>
                      <p className="font-medium text-sm">{theme.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {theme.suggestedGenres.slice(0, 2).join(', ')}
                      </p>
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* STEP: Ready */}
          {step === 'ready' && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">You're all set!</h2>
                <p className="text-xl text-muted-foreground max-w-md mx-auto">
                  Start exploring your AI-powered game development studio
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 text-left max-w-md mx-auto">
                <h3 className="font-medium mb-4">Quick tips:</h3>
                <ul className="text-sm text-muted-foreground space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Cmd+1</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Cmd+2</kbd> to switch between Studio and Editor
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Cmd+K</kbd> to open the command palette
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Start with the "Getting Started" flow to create your game documents
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Connect Unreal Engine to use AI-powered editing
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-border">
        <div>
          {currentStepIndex > 0 && step !== 'ready' && (
            <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {step !== 'welcome' && step !== 'ready' && (
            <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
              Skip for now
            </Button>
          )}
          
          <Button 
            onClick={handleNext}
            disabled={isLoading}
            className="min-w-[120px]"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === 'ready' ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Enter Studio
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border text-center">
      <Icon className="h-8 w-8 mx-auto mb-3 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}
