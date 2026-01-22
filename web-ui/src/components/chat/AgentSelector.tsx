import { useState } from 'react'
import { Bot, ChevronDown, FolderOpen, Zap } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { cn } from '@/lib/utils'

// Agents with their capabilities
export const AGENTS = [
  { 
    id: 'game-dev', 
    name: 'Game Developer', 
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Implementation & coding',
    capabilities: ['unreal', 'workspace-read'],
  },
  { 
    id: 'game-designer', 
    name: 'Game Designer', 
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-500',
    description: 'Gameplay & mechanics',
    capabilities: ['workspace-read', 'workspace-write'],
  },
  { 
    id: 'game-architect', 
    name: 'Architect', 
    color: 'text-orange-400',
    gradient: 'from-orange-500 to-amber-500',
    description: 'System design',
    capabilities: ['unreal', 'workspace-read', 'workspace-write'],
  },
  { 
    id: '3d-artist', 
    name: '3D Artist', 
    color: 'text-green-400',
    gradient: 'from-green-500 to-emerald-500',
    description: 'Models & materials',
    capabilities: ['unreal', 'meshy', 'workspace-read'],
  },
  { 
    id: 'level-designer', 
    name: 'Level Designer', 
    color: 'text-yellow-400',
    gradient: 'from-yellow-500 to-orange-500',
    description: 'Levels & lighting',
    capabilities: ['unreal', 'workspace-read'],
  },
]

interface AgentSelectorProps {
  compact?: boolean
}

export function AgentSelector({ compact = false }: AgentSelectorProps) {
  const { currentAgent, setAgent } = useChatStore()
  const [isOpen, setIsOpen] = useState(false)
  
  const currentAgentData = AGENTS.find(a => a.id === currentAgent) || AGENTS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border transition-all",
          "hover:border-primary/50 bg-card hover:bg-muted/50",
          compact ? "px-2 py-1.5" : "px-3 py-2"
        )}
      >
        <div className={cn(
          "rounded-lg bg-gradient-to-br text-white",
          currentAgentData.gradient,
          compact ? "p-1" : "p-1.5"
        )}>
          <Bot className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </div>
        <div className="text-left">
          <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {currentAgentData.name}
          </p>
          {!compact && (
            <p className="text-xs text-muted-foreground">{currentAgentData.description}</p>
          )}
        </div>
        <ChevronDown className={cn(
          "text-muted-foreground transition-transform",
          compact ? "h-3 w-3" : "h-4 w-4",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground px-2">Select Agent</p>
            </div>
            <div className="p-2 space-y-1">
              {AGENTS.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setAgent(agent.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors",
                    agent.id === currentAgent 
                      ? "bg-primary/10" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-lg bg-gradient-to-br text-white mt-0.5",
                    agent.gradient
                  )}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{agent.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{agent.description}</p>
                    {/* Capability badges */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {agent.capabilities.includes('unreal') && (
                        <CapabilityBadge icon={Zap} label="Unreal" color="cyan" />
                      )}
                      {agent.capabilities.includes('workspace-read') && (
                        <CapabilityBadge icon={FolderOpen} label="Read" color="emerald" />
                      )}
                      {agent.capabilities.includes('workspace-write') && (
                        <CapabilityBadge icon={FolderOpen} label="Write" color="amber" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CapabilityBadge({ 
  icon: Icon, 
  label, 
  color 
}: { 
  icon: React.ElementType
  label: string
  color: 'cyan' | 'emerald' | 'amber'
}) {
  const colors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border",
      colors[color]
    )}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  )
}
