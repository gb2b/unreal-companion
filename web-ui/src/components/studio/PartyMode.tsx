import { useState } from 'react'
import { 
  Users, 
  MessageCircle, 
  ThumbsUp, 
  AlertTriangle, 
  Lightbulb,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AgentReview {
  agent: string
  agentName: string
  emoji: string
  tone: string
  points: Array<{
    type: 'strength' | 'concern' | 'suggestion' | 'general'
    text: string
  }>
}

interface PartyModeProps {
  documentContent: string
  documentType: 'brief' | 'gdd' | 'architecture' | 'other'
  documentTitle: string
  onClose: () => void
}

// Agent configuration
const AGENTS = [
  { id: 'game-architect', name: 'Game Architect', emoji: '🏗️', color: 'blue' },
  { id: 'game-dev', name: 'Game Developer', emoji: '💻', color: 'green' },
  { id: 'game-designer', name: 'Game Designer', emoji: '🎮', color: 'purple' },
]

export function PartyMode({ documentContent, documentType, documentTitle, onClose }: PartyModeProps) {
  const [reviews, setReviews] = useState<AgentReview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['game-architect', 'game-dev', 'game-designer'])
  const [hasReviewed, setHasReviewed] = useState(false)

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  const startReview = async () => {
    if (selectedAgents.length === 0) return
    
    setIsLoading(true)
    setReviews([])
    
    try {
      // Get user locale
      const locale = navigator.language.split('-')[0]
      
      const response = await fetch('/api/studio/party/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_content: documentContent,
          document_type: documentType,
          agents: selectedAgents,
          locale
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews)
        setHasReviewed(true)
      }
    } catch (error) {
      console.error('Failed to get reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPointIcon = (type: string) => {
    switch (type) {
      case 'strength': return <ThumbsUp className="h-4 w-4 text-emerald-400" />
      case 'concern': return <AlertTriangle className="h-4 w-4 text-amber-400" />
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-cyan-400" />
      default: return <MessageCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getPointColor = (type: string) => {
    switch (type) {
      case 'strength': return 'border-emerald-500/30 bg-emerald-500/5'
      case 'concern': return 'border-amber-500/30 bg-amber-500/5'
      case 'suggestion': return 'border-cyan-500/30 bg-cyan-500/5'
      default: return 'border-border bg-muted/30'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative flex flex-1 m-4 rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">
        {/* Left Panel - Document Preview */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{documentTitle}</h2>
              <p className="text-xs text-muted-foreground">{documentType.toUpperCase()}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans">{documentContent}</pre>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Agent Reviews */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold">Party Mode</h2>
              <span className="text-xs text-muted-foreground">Multi-Agent Review</span>
            </div>
            
            {/* Agent Selection */}
            <div className="flex flex-wrap gap-2 mb-4">
              {AGENTS.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                    selectedAgents.includes(agent.id)
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-border hover:border-cyan-500/50"
                  )}
                >
                  <span className="text-lg">{agent.emoji}</span>
                  <span className="text-sm">{agent.name}</span>
                </button>
              ))}
            </div>
            
            {/* Start Button */}
            <Button
              onClick={startReview}
              disabled={isLoading || selectedAgents.length === 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agents are reviewing...
                </>
              ) : hasReviewed ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Review Again
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Start Party Review
                </>
              )}
            </Button>
          </div>
          
          {/* Reviews */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {reviews.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select agents and start the party review!</p>
                <p className="text-xs mt-2">Each agent will analyze the document from their perspective.</p>
              </div>
            )}
            
            {reviews.map((review, idx) => (
              <div 
                key={review.agent}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 200}ms` }}
              >
                {/* Agent Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{review.emoji}</span>
                  <div>
                    <p className="font-medium">{review.agentName}</p>
                    <p className="text-xs text-muted-foreground">{review.tone}</p>
                  </div>
                </div>
                
                {/* Review Points */}
                <div className="space-y-2 ml-10">
                  {review.points.map((point, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "p-3 rounded-lg border",
                        getPointColor(point.type)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getPointIcon(point.type)}
                        <p className="text-sm">{point.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
