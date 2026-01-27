import { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  History,
  Server,
  Gamepad2,
  ChevronDown,
  Bot,
  Send,
  Image,
  Camera,
  X,
  Loader2,
  Wrench,
  User,
  CheckCircle2,
  XCircle,
  ChevronRight,
  FileText
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { LogsDrawer } from '@/components/layout/LogsDrawer'
import { PlanningInline } from '@/components/chat/PlanningView'
import { MCPCapabilities } from '@/components/editor/MCPCapabilities'
import { ContextPicker, ContextBadges } from '@/components/editor/ContextPicker'
import { PromptSuggestions } from '@/components/editor/PromptSuggestions'
import { useChatStore, ToolCall } from '@/stores/chatStore'
import { useLLMStore } from '@/stores/llmStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTranslation } from '@/i18n/useI18n'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

// ============ AGENTS ============

const AGENTS = [
  { id: 'game-dev', name: 'Game Developer', emoji: '🕹️', color: 'text-blue-400', description: 'Implementation & coding' },
  { id: 'game-designer', name: 'Game Designer', emoji: '🎲', color: 'text-purple-400', description: 'Gameplay & mechanics' },
  { id: 'game-architect', name: 'Architect', emoji: '🏛️', color: 'text-orange-400', description: 'System design' },
  { id: '3d-artist', name: '3D Artist', emoji: '🎨', color: 'text-green-400', description: 'Models & materials' },
  { id: 'level-designer', name: 'Level Designer', emoji: '🗺️', color: 'text-yellow-400', description: 'Levels & lighting' },
]

interface AttachedImage {
  file: File
  preview: string
  base64?: string
}

export function EditorPage() {
  const [showLogs, setShowLogs] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [logs] = useState<Array<{ id: string; timestamp: Date; level: 'info' | 'warn' | 'error'; category: string; message: string }>>([])
  
  // TODO: Connect to real log stream via WebSocket
  // For now, logs will populate as the user interacts

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <EditorHeader 
        onShowLogs={() => setShowLogs(true)}
        onShowHistory={() => setShowHistory(!showHistory)}
        showHistory={showHistory}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all",
          showHistory && "mr-80"
        )}>
          <ChatArea />
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="w-80 border-l border-border bg-card flex-shrink-0 overflow-hidden">
            <ConversationHistory onClose={() => setShowHistory(false)} />
          </div>
        )}
      </div>

      {/* Logs Drawer */}
      <LogsDrawer
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        logs={logs}
        onClear={() => {}}
      />
    </div>
  )
}

// ============ EDITOR HEADER ============

function EditorHeader({
  onShowLogs,
  onShowHistory,
  showHistory
}: {
  onShowLogs: () => void
  onShowHistory: () => void
  showHistory: boolean
}) {
  const { unrealConnected, mcpConnected } = useConnectionStore()
  const { currentAgent, setAgent } = useChatStore()
  const { t } = useTranslation()
  const [showAgents, setShowAgents] = useState(false)

  const currentAgentData = AGENTS.find(a => a.id === currentAgent) || AGENTS[0]

  return (
    <div className="h-12 border-b border-border bg-card/50 flex items-center justify-between px-4">
      {/* Left: Agent Selector */}
      <div className="flex items-center gap-3">
        {/* Agent Selector */}
        <div className="relative">
          <button
            onClick={() => setShowAgents(!showAgents)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
          >
            <span className="text-lg">{currentAgentData.emoji}</span>
            <span className="font-medium text-sm">{currentAgentData.name}</span>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              showAgents && "rotate-180"
            )} />
          </button>
          
          {showAgents && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAgents(false)} />
              <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 animate-scale-in">
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
                    <span className="text-xl">{agent.emoji}</span>
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

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Model Selector */}
        <ModelSelector compact />
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <div className="flex items-center gap-2 mr-2">
          <StatusDot 
            connected={mcpConnected} 
            icon={Server} 
            label="MCP" 
          />
          <StatusDot 
            connected={unrealConnected} 
            icon={Gamepad2} 
            label="Unreal" 
          />
        </div>

        {/* History Toggle */}
        <Button
          variant={showHistory ? "secondary" : "ghost"}
          size="sm"
          onClick={onShowHistory}
          className="gap-1"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">{t('editorPage.history')}</span>
        </Button>

        {/* Logs Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowLogs}
          className="gap-1"
        >
          <Terminal className="h-4 w-4" />
          <span className="hidden sm:inline">{t('editorPage.logs')}</span>
        </Button>
      </div>
    </div>
  )
}

// ============ STATUS DOT ============

function StatusDot({ 
  connected, 
  icon: Icon, 
  label 
}: { 
  connected: boolean
  icon: React.ElementType
  label: string
}) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
        connected 
          ? "bg-emerald-500/10 text-emerald-500" 
          : "bg-muted text-muted-foreground"
      )}
      title={`${label}: ${connected ? 'Connected' : 'Disconnected'}`}
    >
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        connected ? "bg-emerald-500 status-dot-pulse" : "bg-muted-foreground"
      )} />
      <Icon className="h-3 w-3" />
    </div>
  )
}

// ============ CONVERSATION HISTORY ============

function ConversationHistory({ onClose }: { onClose: () => void }) {
  const { currentProject } = useProjectStore()
  const { loadConversation, setConversationId } = useChatStore()
  const { t } = useTranslation()
  const [conversations, setConversations] = useState<Array<{
    id: string
    title: string
    agent: string
    created_at: string
  }>>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!currentProject) return
    
    const fetchConversations = async () => {
      setIsLoading(true)
      try {
        const data = await api.get<{ conversations: typeof conversations }>(
          `/api/projects/${currentProject.id}/conversations`
        )
        setConversations(data.conversations || [])
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchConversations()
  }, [currentProject])

  const handleSelectConversation = async (convId: string) => {
    if (!currentProject) return
    setConversationId(convId)
    await loadConversation(currentProject.id, convId)
    onClose()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <h3 className="font-medium text-sm">{t('editorPage.conversations')}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t('editorPage.noConversations')}
          </div>
        ) : (
          conversations.map(conv => {
            const agent = AGENTS.find(a => a.id === conv.agent)
            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className="w-full p-3 rounded-lg text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{agent?.emoji || '💬'}</span>
                  <span className="text-sm font-medium truncate">{conv.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(conv.created_at).toLocaleDateString()}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============ CHAT AREA ============

interface SelectedContext {
  type: 'document' | 'task' | 'asset'
  id: string
  name: string
  content?: string
}

function ChatArea() {
  const { messages, isLoading, currentAgent, sendMessage } = useChatStore()
  const { currentModel } = useLLMStore()
  const { unrealConnected } = useConnectionStore()
  const { currentProject } = useProjectStore()
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [isCapturingViewport, setIsCapturingViewport] = useState(false)
  const [showContextPicker, setShowContextPicker] = useState(false)
  const [selectedContexts, setSelectedContexts] = useState<SelectedContext[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentAgentData = AGENTS.find(a => a.id === currentAgent) || AGENTS[0]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Image handling
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
      const result = await api.post<{ success: boolean; image_base64?: string }>(
        `/api/projects/${currentProject.id}/viewport/screenshot`
      )
      
      if (result.success && result.image_base64) {
        const blob = await fetch(`data:image/png;base64,${result.image_base64}`).then(r => r.blob())
        const file = new File([blob], 'viewport-screenshot.png', { type: 'image/png' })
        const preview = URL.createObjectURL(file)
        
        setAttachedImages(prev => [...prev, { file, preview, base64: result.image_base64 }])
      }
    } catch (error) {
      console.error('Failed to capture viewport:', error)
    } finally {
      setIsCapturingViewport(false)
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || isLoading) return
    
    const imageData = attachedImages.map(img => ({
      type: 'image' as const,
      media_type: img.file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
      data: img.base64!
    }))
    
    // Build message with context
    let messageContent = input.trim()
    if (selectedContexts.length > 0) {
      const contextInfo = selectedContexts.map(ctx => 
        `[${ctx.type.toUpperCase()}: ${ctx.name}]${ctx.content ? `\n${ctx.content}` : ''}`
      ).join('\n\n')
      messageContent = `Context:\n${contextInfo}\n\n---\n\n${messageContent}`
    }
    
    sendMessage(messageContent, imageData.length > 0 ? imageData : undefined)
    setInput('')
    setAttachedImages([])
    setSelectedContexts([])
  }

  // Contextual suggestions based on project
  const suggestions = currentProject 
    ? ['Implement the dash ability', 'Create enemy spawn system', 'Setup combo counter']
    : ['Create a Blueprint', 'Spawn actors', 'Setup materials']

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState 
            agent={currentAgentData}
            suggestions={suggestions}
            onSuggestionClick={setInput}
          />
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        
        {isLoading && <TypingIndicator />}
        
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 relative">
        {/* Prompt Suggestions Overlay */}
        <PromptSuggestions
          input={input}
          currentAgent={currentAgent}
          onSuggestionClick={(text) => setInput(prev => prev + ' ' + text)}
          onAgentSuggestion={(agentId) => {
            // Use the setAgent from useChatStore - already available in component scope
            const chatStore = useChatStore.getState()
            chatStore.setAgent(agentId)
          }}
        />
        
        <div className="max-w-4xl mx-auto">
          {/* Context Badges */}
          <ContextBadges 
            contexts={selectedContexts}
            onRemove={(ctx) => setSelectedContexts(prev => 
              prev.filter(c => !(c.id === ctx.id && c.type === ctx.type))
            )}
          />
          
          {/* Attached Images */}
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
            {/* Context Picker */}
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={() => setShowContextPicker(true)}
              disabled={isLoading}
              title={t('editorPage.addContext')}
            >
              <FileText className="h-4 w-4" />
            </Button>

            {/* Image Upload */}
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
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title={t('editorPage.attachImage')}
            >
              <Image className="h-4 w-4" />
            </Button>

            {/* Viewport Screenshot */}
            {unrealConnected && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
                onClick={captureViewport}
                disabled={isLoading || isCapturingViewport}
                title={t('editorPage.captureViewport')}
              >
                {isCapturingViewport ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Text Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`${t('editorPage.askPlaceholder')} ${currentAgentData.name}...`}
              disabled={isLoading || !currentModel}
              rows={1}
              className="flex-1 min-h-[44px] max-h-[200px] resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && attachedImages.length === 0) || isLoading || !currentModel}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {!currentModel && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {t('editorPage.configureProvider')}
            </p>
          )}
        </div>
      </div>

      {/* Context Picker Modal */}
      <ContextPicker
        isOpen={showContextPicker}
        onClose={() => setShowContextPicker(false)}
        onSelect={(contexts) => setSelectedContexts(contexts)}
        selectedContexts={selectedContexts}
      />
    </>
  )
}

// ============ EMPTY STATE ============

function EmptyState({
  agent,
  suggestions,
  onSuggestionClick
}: {
  agent: typeof AGENTS[0]
  suggestions: string[]
  onSuggestionClick: (text: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="h-full flex flex-col items-center justify-center overflow-y-auto py-8">
      <div className="text-center max-w-2xl px-4">
        <div className="text-6xl mb-4">{agent.emoji}</div>
        <h3 className="text-xl font-semibold mb-2">
          {t('editorPage.chatWith')} {agent.name}
        </h3>
        <p className="text-muted-foreground mb-6">
          {agent.description}
        </p>
        
        {/* Quick suggestions */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1.5 rounded-full border border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
        
        {/* MCP Capabilities */}
        <div className="text-left">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 text-center">
            What can I do with Unreal Engine?
          </h4>
          <MCPCapabilities 
            onSelectCapability={(_, example) => onSuggestionClick(example)}
          />
        </div>
      </div>
    </div>
  )
}

// ============ MESSAGE BUBBLE ============

function MessageBubble({ message }: { message: ReturnType<typeof useChatStore.getState>['messages'][0] }) {
  return (
    <div className={cn(
      "flex gap-3 animate-fade-in",
      message.role === 'user' && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
        message.role === 'user' 
          ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground" 
          : message.role === 'tool'
          ? "bg-orange-500/20 text-orange-400"
          : "bg-gradient-to-br from-muted to-muted/50"
      )}>
        {message.role === 'user' ? <User className="h-4 w-4" /> :
         message.role === 'tool' ? <Wrench className="h-4 w-4" /> :
         <Bot className="h-4 w-4" />}
      </div>
      
      {/* Content */}
      <div className={cn(
        "max-w-[85%] space-y-3",
        message.role === 'user' && "text-right"
      )}>
        {message.role === 'user' && (
          <div className="inline-block bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3">
            <p className="text-sm">{message.content}</p>
          </div>
        )}
        
        {message.role === 'tool' && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
              {message.content}
            </pre>
          </div>
        )}
        
        {message.role === 'assistant' && (
          <>
            {message.plan && <PlanningInline plan={message.plan} />}
            
            {message.toolCalls && message.toolCalls.length > 0 && !message.plan && (
              <ToolCallsBlock toolCalls={message.toolCalls} />
            )}
            
            {message.content && (
              <div className="bg-muted/50 rounded-xl rounded-tl-md px-4 py-3">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============ TOOL CALLS BLOCK ============

function ToolCallsBlock({ toolCalls }: { toolCalls: ToolCall[] }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
            <Wrench className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-medium text-sm">{t('editorPage.executingActions')}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
          {toolCalls.length} {t('editorPage.opsComplete')}
        </span>
      </div>
      
      <div className="divide-y divide-border/30">
        {toolCalls.map((tc, idx) => (
          <ToolCallStep key={tc.id || idx} toolCall={tc} />
        ))}
      </div>
    </div>
  )
}

function ToolCallStep({ toolCall }: { toolCall: ToolCall }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  
  let isSuccess = false
  try {
    const result = JSON.parse(toolCall.result || '{}')
    isSuccess = result.success === true || result.status === 'success'
  } catch {}
  
  const formatToolName = (name: string) => {
    return name.split('_').slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || name
  }
  
  const category = toolCall.name.split('_')[0]
  const getCategoryIcon = () => {
    const icons: Record<string, string> = {
      blueprint: '⚡', world: '🌍', asset: '📦', material: '🎨',
      light: '💡', viewport: '📷', meshy: '✨', graph: '🔗', level: '🗺️'
    }
    return icons[category] || '🔧'
  }
  
  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
      >
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center",
          isSuccess ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {isSuccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        </div>
        
        <span className="text-base mr-1">{getCategoryIcon()}</span>
        <span className="font-medium text-sm flex-1 text-left">{formatToolName(toolCall.name)}</span>
        
        {toolCall.duration ? (
          <span className="text-xs text-muted-foreground tabular-nums">{(toolCall.duration / 1000).toFixed(1)}s</span>
        ) : (
          <span className="text-xs text-green-500 tabular-nums">done</span>
        )}
        
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all",
          expanded && "rotate-90"
        )} />
      </button>
      
      {expanded && (
        <div className="px-4 pb-3 pt-1 ml-8 space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">{t('editorPage.tool')} </span>
            <span className="font-mono text-primary">{toolCall.name}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t('editorPage.input')}</p>
            <pre className="text-xs bg-muted rounded-lg p-2 overflow-x-auto font-mono">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('editorPage.result')}</p>
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

// ============ TYPING INDICATOR ============

function TypingIndicator() {
  const { t } = useTranslation()

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center animate-float">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="bg-muted/50 rounded-xl rounded-tl-md px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="text-sm text-muted-foreground">{t('editorPage.thinking')}</span>
        </div>
      </div>
    </div>
  )
}

// ============ HELPERS ============

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
