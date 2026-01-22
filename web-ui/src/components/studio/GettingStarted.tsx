import { useState } from 'react'
import { 
  Sparkles, 
  Send, 
  Loader2,
  FileText,
  ArrowRight,
  Lightbulb
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useLLMStore } from '@/stores/llmStore'
import { api } from '@/services/api'

interface GettingStartedProps {
  onStartWorkflow: (workflowId: string) => void
}

export function GettingStarted({ onStartWorkflow }: GettingStartedProps) {
  const { currentProject } = useProjectStore()
  const { hasAnthropicKey, hasOpenAIKey, hasGoogleKey } = useLLMStore()
  const [concept, setConcept] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  const hasApiKey = hasAnthropicKey || hasOpenAIKey || hasGoogleKey

  const handleAnalyzeConcept = async () => {
    if (!concept.trim() || !currentProject) return
    
    setIsAnalyzing(true)
    try {
      // Send to LLM to analyze and get suggestions
      const response = await api.post<{ suggestions: string[] }>(
        `/api/projects/${currentProject.id}/analyze-concept`,
        { concept: concept.trim() }
      )
      setSuggestions(response.suggestions || [
        'Create a Game Brief',
        'Define Core Mechanics',
        'Plan the Architecture'
      ])
    } catch (error) {
      // Fallback suggestions
      setSuggestions([
        'Create a Game Brief',
        'Define Core Mechanics', 
        'Plan the Architecture'
      ])
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!hasApiKey) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Configure AI First</h2>
        <p className="text-muted-foreground mb-6">
          Add an API key in Settings to start using AI features
        </p>
        <Button variant="outline">
          Open Settings
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Let's talk about your game</h2>
        <p className="text-muted-foreground">
          Describe your concept and I'll help you create the right documents
        </p>
      </div>

      {/* Concept Input */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <label className="block text-sm font-medium mb-3">
          What kind of game do you want to make?
        </label>
        <textarea
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Describe your game idea... For example: A roguelike dungeon crawler with real-time combat, procedural levels, and a unique card-based ability system. The player explores ancient ruins, collects artifacts, and fights mythological creatures."
          className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        
        <div className="flex justify-end mt-4">
          <Button 
            onClick={handleAnalyzeConcept}
            disabled={!concept.trim() || isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Analyze Concept
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Recommended next steps
          </h3>
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => {
                  if (suggestion.includes('Brief')) onStartWorkflow('game-brief')
                  else if (suggestion.includes('Mechanics')) onStartWorkflow('create-gdd')
                  else if (suggestion.includes('Architecture')) onStartWorkflow('game-architecture')
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{suggestion}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Start Options */}
      {suggestions.length === 0 && (
        <div className="text-center text-muted-foreground">
          <p className="text-sm mb-4">Or start with a template:</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onStartWorkflow('game-brief')}>
              Game Brief
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStartWorkflow('create-gdd')}>
              GDD
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStartWorkflow('game-architecture')}>
              Architecture
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
