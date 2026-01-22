import { useState, useEffect, useCallback } from 'react'
import { 
  Lightbulb,
  Palette,
  Code,
  Map,
  Box,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Suggestion {
  text: string
  category: string
  icon?: React.ElementType
}

interface AgentSuggestion {
  id: string
  name: string
  emoji: string
  reason: string
}

// Keyword patterns for suggestions
const SUGGESTION_PATTERNS: { pattern: RegExp; suggestions: Suggestion[] }[] = [
  {
    pattern: /blueprint|bp\b/i,
    suggestions: [
      { text: 'What type of Blueprint? (Actor, Component, Widget)', category: 'clarify', icon: Code },
      { text: 'Where should it be created?', category: 'clarify' },
      { text: 'Should it have any base class?', category: 'clarify' },
    ]
  },
  {
    pattern: /spawn|create|add/i,
    suggestions: [
      { text: 'At what position?', category: 'clarify', icon: Map },
      { text: 'With what properties?', category: 'clarify' },
      { text: 'How many instances?', category: 'clarify' },
    ]
  },
  {
    pattern: /material|texture|color/i,
    suggestions: [
      { text: 'What type of material? (Basic, PBR, Translucent)', category: 'clarify', icon: Palette },
      { text: 'Apply to which mesh?', category: 'clarify' },
      { text: 'Specific color values?', category: 'clarify' },
    ]
  },
  {
    pattern: /level|map|scene/i,
    suggestions: [
      { text: 'Open or create a new level?', category: 'clarify', icon: Map },
      { text: 'What should be in the level?', category: 'clarify' },
    ]
  },
  {
    pattern: /mesh|model|3d/i,
    suggestions: [
      { text: 'Static or Skeletal mesh?', category: 'clarify', icon: Box },
      { text: 'What scale?', category: 'clarify' },
      { text: 'Apply material?', category: 'clarify' },
    ]
  },
]

// Agent detection patterns
const AGENT_PATTERNS: { pattern: RegExp; agent: AgentSuggestion }[] = [
  {
    pattern: /code|implement|function|blueprint|logic|script/i,
    agent: { id: 'game-dev', name: 'Game Developer', emoji: '🕹️', reason: 'For coding and implementation' }
  },
  {
    pattern: /design|mechanic|gameplay|balance|feature/i,
    agent: { id: 'game-designer', name: 'Game Designer', emoji: '🎲', reason: 'For gameplay and mechanics design' }
  },
  {
    pattern: /architect|system|structure|pattern|refactor/i,
    agent: { id: 'game-architect', name: 'Architect', emoji: '🏛️', reason: 'For system architecture' }
  },
  {
    pattern: /3d|model|mesh|texture|material|art|visual/i,
    agent: { id: '3d-artist', name: '3D Artist', emoji: '🎨', reason: 'For 3D assets and materials' }
  },
  {
    pattern: /level|lighting|environment|map|scene|placement/i,
    agent: { id: 'level-designer', name: 'Level Designer', emoji: '🗺️', reason: 'For level design and lighting' }
  },
]

interface PromptSuggestionsProps {
  input: string
  currentAgent: string
  onSuggestionClick: (text: string) => void
  onAgentSuggestion: (agentId: string) => void
}

export function PromptSuggestions({ 
  input, 
  currentAgent,
  onSuggestionClick, 
  onAgentSuggestion 
}: PromptSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [agentSuggestion, setAgentSuggestion] = useState<AgentSuggestion | null>(null)

  const analyzInput = useCallback(() => {
    if (input.length < 3) {
      setSuggestions([])
      setAgentSuggestion(null)
      return
    }

    // Find matching suggestions
    const matchedSuggestions: Suggestion[] = []
    for (const { pattern, suggestions: patternSuggestions } of SUGGESTION_PATTERNS) {
      if (pattern.test(input)) {
        matchedSuggestions.push(...patternSuggestions)
      }
    }
    setSuggestions(matchedSuggestions.slice(0, 3)) // Max 3 suggestions

    // Find agent suggestion
    for (const { pattern, agent } of AGENT_PATTERNS) {
      if (pattern.test(input) && agent.id !== currentAgent) {
        setAgentSuggestion(agent)
        return
      }
    }
    setAgentSuggestion(null)
  }, [input, currentAgent])

  useEffect(() => {
    const timer = setTimeout(analyzInput, 300) // Debounce
    return () => clearTimeout(timer)
  }, [analyzInput])

  if (suggestions.length === 0 && !agentSuggestion) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl border border-border shadow-lg p-2 space-y-2">
          {/* Agent Suggestion */}
          {agentSuggestion && (
            <button
              onClick={() => onAgentSuggestion(agentSuggestion.id)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                {agentSuggestion.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Switch to {agentSuggestion.name}?
                </p>
                <p className="text-xs text-muted-foreground">{agentSuggestion.reason}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Prompt Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                <span>Add more details:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, i) => {
                  const Icon = suggestion.icon || Lightbulb
                  return (
                    <button
                      key={i}
                      onClick={() => onSuggestionClick(suggestion.text)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs",
                        "bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {suggestion.text}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
