import { useState, useEffect, useCallback } from 'react'
import { 
  Box, 
  RefreshCw, 
  Trash2, 
  Download, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

interface MeshyTask {
  task_id: string
  type: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'
  progress: number
  prompt: string
  thumbnail_url?: string
  model_urls?: Record<string, string>
  created_at?: number
}

interface MeshyStatus {
  configured: boolean
  connected: boolean
  message: string
}

export function MeshyPage() {
  const [status, setStatus] = useState<MeshyStatus | null>(null)
  const [tasks, setTasks] = useState<MeshyTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTask, setSelectedTask] = useState<MeshyTask | null>(null)
  const [artStyle, setArtStyle] = useState<'realistic' | 'sculpture'>('realistic')

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<MeshyStatus>('/api/meshy/status')
      setStatus(data)
    } catch (error) {
      setStatus({ configured: false, connected: false, message: 'Failed to check status' })
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<{ tasks: MeshyTask[] }>('/api/meshy/tasks?limit=20')
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchTasks()
  }, [fetchStatus, fetchTasks])

  // Poll for in-progress tasks
  useEffect(() => {
    const inProgress = tasks.some(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING')
    if (inProgress) {
      const interval = setInterval(fetchTasks, 5000)
      return () => clearInterval(interval)
    }
  }, [tasks, fetchTasks])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    try {
      const result = await api.post<{ task_id: string }>('/api/meshy/text-to-3d/preview', {
        prompt: prompt.trim(),
        art_style: artStyle
      })
      
      toast.success('Generation started', `Task ID: ${result.task_id}`)
      setPrompt('')
      fetchTasks()
    } catch (error) {
      toast.error('Generation failed', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefine = async (taskId: string) => {
    try {
      const result = await api.post<{ task_id: string }>('/api/meshy/text-to-3d/refine', {
        preview_task_id: taskId,
        enable_pbr: true
      })
      
      toast.success('Refine started', `Task ID: ${result.task_id}`)
      fetchTasks()
    } catch (error) {
      toast.error('Refine failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return
    
    try {
      await api.delete(`/api/meshy/tasks/${taskId}`)
      toast.success('Task deleted')
      fetchTasks()
      if (selectedTask?.task_id === taskId) {
        setSelectedTask(null)
      }
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCEEDED': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />
      case 'IN_PROGRESS': return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return null
    }
  }

  if (!status?.configured) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-yellow-500" />
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold mb-2">Meshy API Key Required</h2>
          <p className="text-muted-foreground mb-6">
            The 3D Model Generator uses <span className="text-foreground font-medium">Meshy AI</span> to create 
            3D models from text. You need an API key to use this feature.
          </p>
          
          {/* Steps */}
          <div className="bg-muted/50 rounded-xl p-6 text-left mb-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Setup Instructions</h3>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">Get your API key</p>
                  <a 
                    href="https://app.meshy.ai/settings/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    app.meshy.ai/settings/api <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">Add to your environment</p>
                  <div className="mt-2 bg-background rounded-lg p-3 font-mono text-sm border border-border">
                    <p className="text-muted-foreground"># macOS/Linux</p>
                    <p className="text-green-500">export MESHY_API_KEY="msy_..."</p>
                    <p className="text-muted-foreground mt-2"># Windows</p>
                    <p className="text-green-500">set MESHY_API_KEY=msy_...</p>
                  </div>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">Restart the Web UI server</p>
                  <p className="text-sm text-muted-foreground">The server needs to pick up the new environment variable.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info */}
          <div className="text-xs text-muted-foreground">
            <p>Meshy offers a free tier with limited credits.</p>
            <p className="mt-1">Pro plans available for production use.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - Generate & List */}
      <div className="w-96 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Meshy 3D</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchTasks} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          
          {/* Status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
            status?.connected 
              ? "bg-green-500/10 text-green-500" 
              : "bg-yellow-500/10 text-yellow-500"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              status?.connected ? "bg-green-500" : "bg-yellow-500"
            )} />
            <span>{status?.message}</span>
          </div>
        </div>

        {/* Generate Form */}
        <div className="p-4 border-b border-border space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A medieval sword with ornate handle and glowing runes..."
              rows={3}
              maxLength={600}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {prompt.length}/600
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Style</label>
            <div className="flex gap-2">
              <button
                onClick={() => setArtStyle('realistic')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm transition-colors",
                  artStyle === 'realistic'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                Realistic
              </button>
              <button
                onClick={() => setArtStyle('sculpture')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-sm transition-colors",
                  artStyle === 'sculpture'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                Sculpture
              </button>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerate} 
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate 3D Model
          </Button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-2">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No generations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <button
                  key={task.task_id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    selectedTask?.task_id === task.task_id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted border border-transparent"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {task.thumbnail_url ? (
                      <img 
                        src={task.thumbnail_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="text-xs text-muted-foreground">
                        {task.type.replace('text-to-3d-', '')}
                      </span>
                    </div>
                    <p className="text-sm truncate mt-1">{task.prompt}</p>
                    {task.status === 'IN_PROGRESS' && (
                      <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Details */}
      <div className="flex-1 flex flex-col">
        {selectedTask ? (
          <>
            {/* Task Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedTask.status)}
                  <h2 className="font-semibold">{selectedTask.status}</h2>
                  {selectedTask.status === 'IN_PROGRESS' && (
                    <span className="text-sm text-muted-foreground">
                      {selectedTask.progress}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedTask.task_id}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedTask.status === 'SUCCEEDED' && selectedTask.type === 'text-to-3d-preview' && (
                  <Button 
                    size="sm" 
                    onClick={() => handleRefine(selectedTask.task_id)}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Add Textures
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedTask.task_id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Thumbnail/Preview */}
              <div className="aspect-square max-w-md mx-auto rounded-xl bg-muted overflow-hidden mb-4">
                {selectedTask.thumbnail_url ? (
                  <img 
                    src={selectedTask.thumbnail_url} 
                    alt="3D Model Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'PENDING' ? (
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-2" />
                        <p className="text-muted-foreground">Generating...</p>
                        {selectedTask.status === 'IN_PROGRESS' && (
                          <p className="text-2xl font-bold text-primary mt-2">
                            {selectedTask.progress}%
                          </p>
                        )}
                      </div>
                    ) : (
                      <Box className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Prompt</h3>
                <p className="text-sm bg-muted rounded-lg p-3">{selectedTask.prompt}</p>
              </div>

              {/* Download Links */}
              {selectedTask.status === 'SUCCEEDED' && selectedTask.model_urls && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Download Model</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedTask.model_urls).map(([format, url]) => (
                      <a
                        key={format}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        <span className="uppercase font-medium">{format}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Box className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No task selected</p>
              <p className="text-sm">Select a task or generate a new 3D model</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
