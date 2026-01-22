import { useRef, useEffect, useState } from 'react'
import { Send, Bot, User, Loader2, Wrench, ChevronDown, CheckCircle2, XCircle, ChevronRight, Image, X, Camera } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { useChatStore, ToolCall } from '@/stores/chatStore'
import { useLLMStore } from '@/stores/llmStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'
import { PlanningInline } from '@/components/chat/PlanningView'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

const AGENTS = [
  { id: 'game-dev', name: 'Game Developer', color: 'text-blue-400', description: 'Implementation & coding' },
  { id: 'game-designer', name: 'Game Designer', color: 'text-purple-400', description: 'Gameplay & mechanics' },
  { id: 'game-architect', name: 'Architect', color: 'text-orange-400', description: 'System design' },
  { id: '3d-artist', name: '3D Artist', color: 'text-green-400', description: 'Models & materials' },
  { id: 'level-designer', name: 'Level Designer', color: 'text-yellow-400', description: 'Levels & lighting' },
]

interface AttachedImage {
  file: File
  preview: string
  base64?: string
}

interface ChatPageProps {
  hideHeader?: boolean
}

export function ChatPage({ hideHeader = false }: ChatPageProps) {
  const { messages, isLoading, currentAgent, setAgent, sendMessage, clearMessages } = useChatStore()
  const { currentModel } = useLLMStore()
  const { unrealConnected } = useConnectionStore()
  const { currentProject } = useProjectStore()
  const [input, setInput] = useState('')
  const [showAgents, setShowAgents] = useState(false)
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [isCapturingViewport, setIsCapturingViewport] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentAgentData = AGENTS.find(a => a.id === currentAgent) || AGENTS[0]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      
      const preview = URL.createObjectURL(file)
      const base64 = await fileToBase64(file)
      
      setAttachedImages(prev => [...prev, { file, preview, base64 }])
    }
    
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setAttachedImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const captureViewport = async () => {
    if (!currentProject) return
    
    setIsCapturingViewport(true)
    try {
      const result = await api.post<{ success: boolean; image_base64?: string; error?: string }>(
        `/api/projects/${currentProject.id}/viewport/screenshot`
      )
      
      if (result.success && result.image_base64) {
        // Create a fake file for consistency
        const blob = await fetch(`data:image/png;base64,${result.image_base64}`).then(r => r.blob())
        const file = new File([blob], 'viewport-screenshot.png', { type: 'image/png' })
        const preview = URL.createObjectURL(file)
        
        setAttachedImages(prev => [...prev, { 
          file, 
          preview, 
          base64: result.image_base64 
        }])
      }
    } catch (error) {
      console.error('Failed to capture viewport:', error)
    } finally {
      setIsCapturingViewport(false)
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return
    
    // If we have images, include them in the message
    const imageData = attachedImages.map(img => ({
      type: 'image' as const,
      media_type: img.file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: img.base64!
    }))
    
    sendMessage(input.trim(), imageData.length > 0 ? imageData : undefined)
    setInput('')
    setAttachedImages([])
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - hidden when embedded in EditorPage */}
      {!hideHeader && (
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Unreal connection indicator */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              unrealConnected 
                ? "bg-green-500/10 text-green-500" 
                : "bg-muted text-muted-foreground"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                unrealConnected ? "bg-green-500 status-dot" : "bg-muted-foreground"
              )} />
              <span>{unrealConnected ? 'Unreal Connected' : 'Unreal Offline'}</span>
            </div>
            
            {/* Agent Selector */}
            <div className="relative">
              <button
                onClick={() => setShowAgents(!showAgents)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <Bot className={cn("h-4 w-4", currentAgentData.color)} />
                <span className="font-medium">{currentAgentData.name}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {showAgents && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAgents(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-xl shadow-lg z-50 p-2">
                    {AGENTS.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setAgent(agent.id)
                          setShowAgents(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                          agent.id === currentAgent 
                            ? "bg-primary/10" 
                            : "hover:bg-muted"
                        )}
                      >
                        <Bot className={cn("h-5 w-5", agent.color)} />
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Model Selector */}
            <ModelSelector />
          </div>
          
          <Button variant="ghost" size="sm" onClick={clearMessages}>
            Clear
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground">
                Ask the <span className={currentAgentData.color}>{currentAgentData.name}</span> to help you with your Unreal Engine project.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['Create a Blueprint', 'Spawn actors', 'Setup materials'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 rounded-full border border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 animate-fade-in",
                msg.role === 'user' && "flex-row-reverse"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                msg.role === 'user' 
                  ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground" 
                  : msg.role === 'tool'
                  ? "bg-orange-500/20 text-orange-400"
                  : "bg-gradient-to-br from-muted to-muted/50"
              )}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> :
                 msg.role === 'tool' ? <Wrench className="h-4 w-4" /> :
                 <Bot className="h-4 w-4" />}
              </div>
              
              {/* Message Content */}
              <div className={cn(
                "max-w-[85%] space-y-3",
                msg.role === 'user' && "text-right"
              )}>
                {/* User message bubble */}
                {msg.role === 'user' && (
                  <div className="inline-block bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3">
                    <p className="text-sm">{msg.content}</p>
                  </div>
                )}
                
                {/* Tool results (raw) */}
                {msg.role === 'tool' && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                      {msg.content}
                    </pre>
                  </div>
                )}
                
                {/* Assistant message with tool calls */}
                {msg.role === 'assistant' && (
                  <>
                    {/* Execution Plan View (if present) */}
                    {msg.plan && (
                      <PlanningInline plan={msg.plan} />
                    )}
                    
                    {/* Tool Calls Block - Modern Step UI */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && !msg.plan && (
                      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                              <Wrench className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium text-sm">Executing Actions</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                            {msg.toolCalls.length} ops ✓
                          </span>
                        </div>
                        
                        {/* Tool Steps */}
                        <div className="divide-y divide-border/30">
                          {msg.toolCalls.map((tc, idx) => (
                            <ToolCallStep key={tc.id || idx} toolCall={tc} />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Text Response */}
                    {msg.content && (
                      <div className="bg-muted/50 rounded-xl rounded-tl-md px-4 py-3">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center animate-float">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted/50 rounded-xl rounded-tl-md px-5 py-4">
              <div className="flex items-center gap-3">
                {/* Typing indicator dots */}
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          {/* Attached Images Preview */}
          {attachedImages.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {attachedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={img.preview} 
                    alt={`Attached ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-lg border border-border"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            {/* Image Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach image"
            >
              <Image className="h-4 w-4" />
            </Button>
            
            {/* Viewport Screenshot Button */}
            {unrealConnected && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={captureViewport}
                disabled={isLoading || isCapturingViewport}
                title="Capture viewport"
              >
                {isCapturingViewport ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`Ask ${currentAgentData.name}...`}
              disabled={isLoading || !currentModel}
              rows={1}
              className="flex-1 min-h-[44px] max-h-[200px] resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            
            {/* Compact model selector for per-message override */}
            <ModelSelector compact />
            
            <Button 
              onClick={handleSend} 
              disabled={(!input.trim() && attachedImages.length === 0) || isLoading || !currentModel}
              size="icon"
              className="h-11 w-11 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!currentModel && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Configure a LLM provider in Settings to start chatting
          </p>
        )}
      </div>
    </div>
  )
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:image/...;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Individual tool step - compact row in the execution block
function ToolCallStep({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  
  // Parse result
  let isSuccess = false
  try {
    const result = JSON.parse(toolCall.result || '{}')
    isSuccess = result.success === true || result.status === 'success'
  } catch {}
  
  // Format tool name nicely
  const formatToolName = (name: string) => {
    return name
      .split('_')
      .slice(1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || name
  }
  
  // Get category icon
  const category = toolCall.name.split('_')[0]
  const getCategoryIcon = () => {
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
      default: return '🔧'
    }
  }
  
  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
      >
        {/* Status Indicator */}
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center",
          isSuccess 
            ? "bg-green-500 text-white" 
            : "bg-red-500 text-white"
        )}>
          {isSuccess ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
        </div>
        
        {/* Tool Info */}
        <span className="text-base mr-1">{getCategoryIcon()}</span>
        <span className="font-medium text-sm flex-1 text-left">
          {formatToolName(toolCall.name)}
        </span>
        
        {/* Timing */}
        {toolCall.duration ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {(toolCall.duration / 1000).toFixed(1)}s
          </span>
        ) : (
          <span className="text-xs text-green-500 tabular-nums">
            done
          </span>
        )}
        
        {/* Expand Arrow */}
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all",
          expanded && "rotate-90"
        )} />
      </button>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 ml-8 space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">Tool: </span>
            <span className="font-mono text-primary">{toolCall.name}</span>
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground mb-1">Input:</p>
            <pre className="text-xs bg-muted rounded-lg p-2 overflow-x-auto font-mono">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          
          {toolCall.result && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Result:</p>
              <pre className="text-xs bg-muted rounded-lg p-2 overflow-x-auto font-mono max-h-32">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
