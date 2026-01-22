import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Search, 
  LayoutDashboard, 
  MessageSquare, 
  Terminal, 
  FileText, 
  Settings,
  Palette,
  Trash2,
  RefreshCw,
  FolderOpen
} from 'lucide-react'
import { useThemeStore, THEME_PRESETS } from '@/stores/themeStore'
import { useProjectStore } from '@/stores/projectStore'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/lib/utils'

interface Command {
  id: string
  name: string
  description?: string
  icon: React.ElementType
  shortcut?: string[]
  action: () => void
  category: 'navigation' | 'actions' | 'theme' | 'projects'
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: string) => void
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const { setTheme } = useThemeStore()
  const { projects, setCurrentProject } = useProjectStore()
  const { clearMessages } = useChatStore()

  const commands: Command[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', name: 'Go to Dashboard', icon: LayoutDashboard, shortcut: ['⌘', '1'], action: () => { onNavigate('dashboard'); onClose() }, category: 'navigation' },
    { id: 'nav-chat', name: 'Go to Chat', icon: MessageSquare, shortcut: ['⌘', '2'], action: () => { onNavigate('chat'); onClose() }, category: 'navigation' },
    { id: 'nav-logs', name: 'Go to Logs', icon: Terminal, shortcut: ['⌘', '3'], action: () => { onNavigate('logs'); onClose() }, category: 'navigation' },
    { id: 'nav-context', name: 'Go to Context', icon: FileText, shortcut: ['⌘', '4'], action: () => { onNavigate('context'); onClose() }, category: 'navigation' },
    { id: 'nav-settings', name: 'Go to Settings', icon: Settings, shortcut: ['⌘', '5'], action: () => { onNavigate('settings'); onClose() }, category: 'navigation' },
    
    // Themes
    ...Object.values(THEME_PRESETS).filter(t => t.id !== 'custom').map(theme => ({
      id: `theme-${theme.id}`,
      name: `${theme.emoji} Theme: ${theme.name}`,
      description: theme.description,
      icon: Palette,
      action: () => { setTheme(theme.id); onClose() },
      category: 'theme' as const
    })),
    
    // Actions
    { id: 'action-clear-chat', name: 'Clear Chat History', icon: Trash2, action: () => { clearMessages(); onClose() }, category: 'actions' },
    { id: 'action-refresh', name: 'Refresh Data', icon: RefreshCw, action: () => { window.location.reload() }, category: 'actions' },
    
    // Projects
    ...projects.map(p => ({
      id: `project-${p.id}`,
      name: `Switch to ${p.name}`,
      description: p.slug,
      icon: FolderOpen,
      action: () => { setCurrentProject(p); onClose() },
      category: 'projects' as const
    }))
  ], [projects, setCurrentProject, setTheme, clearMessages, onNavigate, onClose])

  const filteredCommands = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q)
    )
  }, [commands, query])

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {}
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category].push(cmd)
    }
    return groups
  }, [filteredCommands])

  const flatCommands = useMemo(() => filteredCommands, [filteredCommands])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (flatCommands[selectedIndex]) {
          flatCommands[selectedIndex].action()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [flatCommands, selectedIndex, onClose])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    theme: 'Theme',
    actions: 'Actions',
    projects: 'Projects'
  }

  let globalIndex = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono text-muted-foreground">
            esc
          </kbd>
        </div>
        
        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flatCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  {categoryLabels[category] || category}
                </div>
                {cmds.map((cmd) => {
                  const index = globalIndex++
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                        selectedIndex === index
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="text-sm">{cmd.name}</p>
                        {cmd.description && (
                          <p className="text-xs text-muted-foreground">{cmd.description}</p>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <div className="flex items-center gap-1">
                          {cmd.shortcut.map((key, i) => (
                            <kbd key={i} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted font-mono">↵</kbd>
              select
            </span>
          </div>
          <span>{flatCommands.length} commands</span>
        </div>
      </div>
    </div>
  )
}
