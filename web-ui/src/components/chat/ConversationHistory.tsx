import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Download,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useChatStore } from '@/stores/chatStore'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  title: string
  message_count: number
  created_at: string
  updated_at: string
}

interface ConversationHistoryProps {
  onSelect?: () => void
}

export function ConversationHistory({ onSelect }: ConversationHistoryProps) {
  const { currentProject } = useProjectStore()
  const { currentConversationId, setConversationId, clearMessages } = useChatStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchConversations = async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const data = await api.get<Conversation[]>(`/api/projects/${currentProject.id}/conversations`)
      setConversations(data)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [currentProject])

  const handleNewConversation = () => {
    setConversationId(null)
    clearMessages()
    onSelect?.()
  }

  const handleSelectConversation = async (conv: Conversation) => {
    if (!currentProject) return
    
    setConversationId(conv.id)
    // The messages will be loaded by the chat store
    onSelect?.()
  }

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    if (!currentProject) return
    if (!confirm('Delete this conversation?')) return
    
    try {
      await api.delete(`/api/projects/${currentProject.id}/conversations/${convId}`)
      fetchConversations()
      if (currentConversationId === convId) {
        setConversationId(null)
        clearMessages()
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleExport = async (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation()
    if (!currentProject) return
    
    try {
      const data = await api.get<{ messages: any[] }>(
        `/api/projects/${currentProject.id}/conversations/${conv.id}`
      )
      
      // Format as markdown
      let markdown = `# ${conv.title}\n\n`
      markdown += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`
      
      for (const msg of data.messages) {
        const role = msg.role === 'user' ? '**User**' : '**Assistant**'
        markdown += `${role}:\n\n${msg.content}\n\n---\n\n`
      }
      
      // Download
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${conv.title.replace(/\s+/g, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export conversation:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a project first
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Conversation Button */}
      <div className="p-3 border-b border-border">
        <Button onClick={handleNewConversation} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  "w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors group",
                  currentConversationId === conv.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent"
                )}
              >
                <MessageSquare className={cn(
                  "h-4 w-4 flex-shrink-0",
                  currentConversationId === conv.id ? "text-primary" : "text-muted-foreground"
                )} />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(conv.updated_at)}</span>
                    <span>•</span>
                    <span>{conv.message_count} msgs</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleExport(e, conv)}
                    className="p-1 rounded hover:bg-muted-foreground/10"
                    title="Export"
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="p-1 rounded hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
