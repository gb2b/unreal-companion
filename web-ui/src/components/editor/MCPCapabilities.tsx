import { useState, useEffect } from 'react'
import { 
  Box,
  Layers,
  Palette,
  Map,
  FileCode,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface Capability {
  id: string
  name: string
  description: string
  icon: React.ElementType
  examples: string[]
}

const CAPABILITIES: Capability[] = [
  {
    id: 'blueprints',
    name: 'Blueprints',
    description: 'Create and modify Blueprint classes and functions',
    icon: FileCode,
    examples: [
      'Create a new Actor Blueprint',
      'Add a function to a Blueprint',
      'Modify Blueprint variables',
      'Create Blueprint event graphs'
    ]
  },
  {
    id: 'world',
    name: 'World & Actors',
    description: 'Spawn, move, and manipulate actors in the scene',
    icon: Layers,
    examples: [
      'Spawn a cube at position',
      'Move selected actor',
      'Delete actors by type',
      'Set actor properties'
    ]
  },
  {
    id: 'materials',
    name: 'Materials & Textures',
    description: 'Create and edit materials and texture assets',
    icon: Palette,
    examples: [
      'Create a new material',
      'Apply material to mesh',
      'Modify material parameters',
      'Create material instances'
    ]
  },
  {
    id: 'levels',
    name: 'Levels & Maps',
    description: 'Manage levels, sublevels, and world composition',
    icon: Map,
    examples: [
      'Open a level',
      'Save current level',
      'Add streaming sublevel',
      'Set level properties'
    ]
  },
  {
    id: 'search',
    name: 'Search & Query',
    description: 'Find assets, actors, and nodes in the project',
    icon: Search,
    examples: [
      'Find all actors of type',
      'Search assets by name',
      'Get info about asset',
      'List Blueprint nodes'
    ]
  },
  {
    id: 'editor',
    name: 'Editor Controls',
    description: 'Control editor settings and viewport',
    icon: Settings,
    examples: [
      'Take viewport screenshot',
      'Set editor mode',
      'Focus on actor',
      'Toggle simulation'
    ]
  }
]

interface MCPCapabilitiesProps {
  compact?: boolean
  onSelectCapability?: (capability: Capability, example: string) => void
}

export function MCPCapabilities({ compact, onSelectCapability }: MCPCapabilitiesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [toolCount, setToolCount] = useState(0)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const data = await api.get<{ unreal_connected: boolean; tool_count: number }>('/api/tools')
        setIsConnected(data.unreal_connected)
        setToolCount(data.tool_count)
      } catch {
        setIsConnected(false)
      }
    }
    checkConnection()
  }, [])

  if (isConnected === null) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-amber-500 mb-2">
          <Box className="h-4 w-4" />
          <span className="font-medium text-sm">Unreal Engine not connected</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Start Unreal Engine with the MCP plugin to enable AI-powered editing
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {CAPABILITIES.map(cap => (
          <button
            key={cap.id}
            onClick={() => onSelectCapability?.(cap, cap.examples[0])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-muted transition-colors text-sm"
          >
            <cap.icon className="h-3.5 w-3.5 text-primary" />
            <span>{cap.name}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Box className="h-4 w-4 text-green-500" />
          <span>Connected to Unreal Engine • {toolCount} tools available</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CAPABILITIES.map(cap => {
          const Icon = cap.icon
          const isExpanded = expandedId === cap.id

          return (
            <div 
              key={cap.id}
              className={cn(
                "rounded-xl border border-border bg-card/50 overflow-hidden transition-all",
                isExpanded && "col-span-2"
              )}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : cap.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{cap.name}</p>
                  {!isExpanded && (
                    <p className="text-xs text-muted-foreground truncate">{cap.description}</p>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{cap.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cap.examples.map((example, i) => (
                      <button
                        key={i}
                        onClick={() => onSelectCapability?.(cap, example)}
                        className="px-2.5 py-1 rounded-lg bg-muted text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
