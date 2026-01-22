import { useState, useEffect, useRef } from 'react'
import { 
  X, 
  Terminal, 
  Trash2, 
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, generateId } from '@/lib/utils'

interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  details?: Record<string, unknown>
}

interface LogsDrawerProps {
  isOpen: boolean
  onClose: () => void
  logs: LogEntry[]
  onClear: () => void
}

export function LogsDrawer({ isOpen, onClose, logs, onClear }: LogsDrawerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Filter logs
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter || log.category === filter)

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={cn(
        "fixed z-50 bg-card border-l border-border shadow-2xl flex flex-col transition-all duration-300",
        isFullscreen 
          ? "inset-0" 
          : "right-0 top-0 bottom-0 w-[500px] max-w-[90vw]"
      )}>
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-medium">Logs</span>
            <span className="text-xs text-muted-foreground">
              ({filteredLogs.length})
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-7 px-2 text-xs rounded border border-border bg-background"
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
              <option value="mcp">MCP</option>
              <option value="unreal">Unreal</option>
            </select>
            
            {/* Actions */}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClear} title="Clear logs">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Download logs">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Logs Content */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No logs yet</p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <LogLine key={log.id} log={log} />
            ))
          )}
        </div>

        {/* Auto-scroll indicator */}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true)
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs shadow-lg"
          >
            ↓ New logs
          </button>
        )}
      </div>
    </>
  )
}

function LogLine({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false)
  
  const levelColors = {
    info: 'text-blue-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    debug: 'text-muted-foreground',
  }

  const levelBg = {
    info: 'bg-blue-500/10',
    warn: 'bg-amber-500/10',
    error: 'bg-red-500/10',
    debug: 'bg-muted',
  }

  return (
    <div 
      className={cn(
        "rounded px-2 py-1 hover:bg-muted/50 cursor-pointer",
        log.level === 'error' && "bg-red-500/5"
      )}
      onClick={() => log.details && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        {/* Timestamp */}
        <span className="text-muted-foreground shrink-0">
          {log.timestamp.toLocaleTimeString()}
        </span>
        
        {/* Level */}
        <span className={cn(
          "px-1 rounded text-[10px] uppercase shrink-0",
          levelBg[log.level],
          levelColors[log.level]
        )}>
          {log.level}
        </span>
        
        {/* Category */}
        <span className="text-primary shrink-0">
          [{log.category}]
        </span>
        
        {/* Message */}
        <span className="text-foreground break-all">
          {log.message}
        </span>
      </div>
      
      {/* Expanded details */}
      {expanded && log.details && (
        <pre className="mt-1 ml-20 p-2 rounded bg-muted text-muted-foreground overflow-x-auto">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ============ HOOK FOR LOGS ============

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLogs(prev => [...prev, {
      ...entry,
      id: generateId(),
      timestamp: new Date()
    }])
  }

  const clearLogs = () => setLogs([])

  return { logs, addLog, clearLogs }
}
