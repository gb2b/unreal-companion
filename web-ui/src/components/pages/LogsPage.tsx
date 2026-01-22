import { useEffect, useRef, useState } from 'react'
import { 
  Terminal, 
  Trash2, 
  Pause, 
  Play, 
  Filter,
  ChevronDown,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogsStore, LogEntry } from '@/stores/logsStore'
import { cn } from '@/lib/utils'

type LogFilter = 'all' | 'info' | 'success' | 'error' | 'warning' | 'tool'

const LOG_ICONS: Record<LogEntry['type'], React.ElementType> = {
  info: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  tool: Wrench,
}

const LOG_COLORS: Record<LogEntry['type'], string> = {
  info: 'text-cyan-400',
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  tool: 'text-primary',
}

const LOG_BG: Record<LogEntry['type'], string> = {
  info: 'bg-cyan-400/5 border-cyan-400/20',
  success: 'bg-green-400/5 border-green-400/20',
  error: 'bg-red-400/5 border-red-400/20',
  warning: 'bg-yellow-400/5 border-yellow-400/20',
  tool: 'bg-primary/5 border-primary/20',
}

interface LogsPageProps {
  compact?: boolean
}

export function LogsPage({ compact = false }: LogsPageProps) {
  const { logs, clearLogs } = useLogsStore()
  const [filter, setFilter] = useState<LogFilter>('all')
  const [paused, setPaused] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, paused])

  // Filter logs
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.type === filter)

  // Count by type
  const counts = {
    all: logs.length,
    info: logs.filter(l => l.type === 'info').length,
    success: logs.filter(l => l.type === 'success').length,
    error: logs.filter(l => l.type === 'error').length,
    warning: logs.filter(l => l.type === 'warning').length,
    tool: logs.filter(l => l.type === 'tool').length,
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - simplified in compact mode */}
      <div className={cn(
        "border-b border-border flex items-center justify-between",
        compact ? "p-2" : "p-4"
      )}>
        <div className="flex items-center gap-2">
          <Terminal className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
          {!compact && <h1 className="text-lg font-semibold">Activity Logs</h1>}
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredLogs.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 text-sm transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span className="capitalize">{filter}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showFilters && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                  {(['all', 'info', 'success', 'error', 'warning', 'tool'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilter(type)
                        setShowFilters(false)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-muted transition-colors",
                        filter === type && "bg-primary/10"
                      )}
                    >
                      <span className="capitalize">{type}</span>
                      <span className="text-xs text-muted-foreground">{counts[type]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Pause/Play */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused(!paused)}
            className={paused ? 'text-yellow-500' : ''}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          
          {/* Clear */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs List */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No logs yet</p>
              <p className="text-xs mt-1">Activity will appear here in real-time</p>
            </div>
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogEntryRow key={log.id} log={log} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Status Bar */}
      {paused && (
        <div className="border-t border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-500 flex items-center gap-2">
          <Pause className="h-4 w-4" />
          Auto-scroll paused. Click Play to resume.
        </div>
      )}
    </div>
  )
}

function LogEntryRow({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = LOG_ICONS[log.type]
  const hasDetails = log.tool || log.params

  // Get icon for tool category
  const getToolIcon = (tool: string) => {
    const category = tool.split('_')[0]
    switch (category) {
      case 'blueprint': return '⚡'
      case 'world': return '🌍'
      case 'asset': return '📦'
      case 'material': return '🎨'
      case 'light': return '💡'
      case 'viewport': return '📷'
      case 'meshy': return '✨'
      case 'graph': return '🔗'
      case 'level': return '🗺️'
      default: return null
    }
  }
  
  const toolIcon = log.tool ? getToolIcon(log.tool) : null

  return (
    <div 
      className={cn(
        "rounded-xl border transition-all",
        LOG_BG[log.type],
        hasDetails && "cursor-pointer hover:scale-[1.01]"
      )}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status Icon */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          log.type === 'success' && "bg-green-500/20",
          log.type === 'error' && "bg-red-500/20",
          log.type === 'warning' && "bg-yellow-500/20",
          log.type === 'info' && "bg-cyan-500/20",
          log.type === 'tool' && "bg-primary/20"
        )}>
          <Icon className={cn("h-4 w-4", LOG_COLORS[log.type])} />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-2 mb-0.5">
            {/* Tool Badge */}
            {log.tool && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {toolIcon && <span>{toolIcon}</span>}
                {log.tool.split('_').slice(1).join(' ')}
              </span>
            )}
            
            {/* Timestamp */}
            <span className="text-xs text-muted-foreground ml-auto tabular-nums">
              {log.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          {/* Message */}
          <p className="text-foreground text-sm break-words">{log.message}</p>
        </div>
        
        {/* Expand indicator */}
        {hasDetails && (
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )} />
        )}
      </div>
      
      {/* Expanded Details */}
      {expanded && log.params && (
        <div className="px-4 pb-3 border-t border-border/30 mt-0">
          <p className="text-xs text-muted-foreground pt-2 mb-1">Parameters:</p>
          <pre className="text-xs bg-background/80 rounded-lg p-3 overflow-x-auto font-mono border border-border/30">
            {JSON.stringify(log.params, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
