import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Sparkles,
  X,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModelSelector } from '@/components/chat/ModelSelector'
import { BriefImport } from './BriefImport'
import { Workflow, WorkflowQuestion, WorkflowResponse } from '@/workflows/types'
import { cn } from '@/lib/utils'

// Get user locale
function getUserLocale(): string {
  const lang = navigator.language.split('-')[0]
  return ['en', 'fr', 'es'].includes(lang) ? lang : 'en'
}

interface WorkflowWizardProps {
  workflow: Workflow
  onComplete: (responses: WorkflowResponse[]) => void
  onCancel: () => void
}

export function WorkflowWizard({ workflow, onComplete, onCancel }: WorkflowWizardProps) {
  const [showImport, setShowImport] = useState(true) // Show import option first
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string | string[]>>({})
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [showCelebration, setShowCelebration] = useState(false)
  
  // Dynamic content state
  const [dynamicMessage, setDynamicMessage] = useState<string | null>(null)
  const [dynamicEmoji, setDynamicEmoji] = useState<string>('🎮')
  const [adaptations, setAdaptations] = useState<Record<string, { suggestions?: string[]; placeholder?: string }>>({})
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false)
  
  const currentStep = workflow.steps[currentStepIndex]
  const progress = showImport ? 0 : ((currentStepIndex + 1) / workflow.steps.length) * 100
  const isLastStep = currentStepIndex === workflow.steps.length - 1
  const locale = getUserLocale()

  // Fetch dynamic content when step changes
  useEffect(() => {
    if (showImport || !currentStep) return
    
    const fetchDynamicContent = async () => {
      setIsLoadingDynamic(true)
      try {
        // Get dynamic agent message
        const genResponse = await fetch('/api/studio/workflow/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: workflow.id,
            step_index: currentStepIndex,
            step_id: currentStep.id,
            previous_responses: responses,
            locale,
            agent: workflow.agent
          })
        })
        
        if (genResponse.ok) {
          const data = await genResponse.json()
          setDynamicMessage(data.agentMessage)
          setDynamicEmoji(data.agentEmoji || '🎮')
        }
        
        // Get adaptations for questions
        const adaptResponse = await fetch('/api/studio/workflow/adapt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: workflow.id,
            step_index: currentStepIndex,
            step_id: currentStep.id,
            previous_responses: responses,
            locale,
            agent: workflow.agent
          })
        })
        
        if (adaptResponse.ok) {
          const data = await adaptResponse.json()
          setAdaptations(data.adaptations || {})
        }
      } catch (error) {
        console.error('Failed to fetch dynamic content:', error)
      } finally {
        setIsLoadingDynamic(false)
      }
    }
    
    fetchDynamicContent()
  }, [currentStepIndex, showImport])

  const canProceed = currentStep ? currentStep.questions.every(q => {
    if (!q.required) return true
    const value = responses[q.id]
    if (Array.isArray(value)) return value.length > 0
    return value && value.trim().length > 0
  }) : true
  
  // Handle brief import
  const handleBriefImport = (extracted: { gameName?: string; concept?: string; genre?: string; inspirations?: string[] }) => {
    // Pre-fill responses with extracted data
    const prefilled: Record<string, string | string[]> = {}
    if (extracted.gameName) prefilled['gameName'] = extracted.gameName
    if (extracted.concept) prefilled['concept'] = extracted.concept
    if (extracted.concept) prefilled['elevatorPitch'] = extracted.concept
    if (extracted.genre) prefilled['genre'] = extracted.genre
    if (extracted.inspirations) prefilled['inspirations'] = extracted.inspirations.join(', ')
    
    setResponses(prefilled)
    setShowImport(false)
  }
  
  // Get adapted placeholder for a question
  const getAdaptedPlaceholder = (question: WorkflowQuestion): string | undefined => {
    const adaptation = adaptations[question.id]
    return adaptation?.placeholder || question.placeholder
  }
  
  // Get suggestions for a question
  const getAdaptedSuggestions = (question: WorkflowQuestion): string[] => {
    const adaptation = adaptations[question.id]
    return adaptation?.suggestions || []
  }

  const handleNext = async () => {
    if (isLastStep) {
      // Generate document from responses
      try {
        const genResponse = await fetch('/api/studio/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: workflow.id,
            responses,
            template: workflow.outputTemplate,
            output_path: workflow.outputPath,
            locale
          })
        })
        
        if (genResponse.ok) {
          const data = await genResponse.json()
          console.log('Document generated:', data.path)
        }
      } catch (error) {
        console.error('Failed to generate document:', error)
      }
      
      // Convert responses to array format
      const responseArray: WorkflowResponse[] = Object.entries(responses).map(([questionId, value]) => ({
        questionId,
        value,
      }))
      onComplete(responseArray)
    } else {
      if (currentStep.celebration) {
        setShowCelebration(true)
        setTimeout(() => {
          setShowCelebration(false)
          setCurrentStepIndex(i => i + 1)
        }, 1500)
      } else {
        setCurrentStepIndex(i => i + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1)
    }
  }

  const updateResponse = (questionId: string, value: string | string[]) => {
    setResponses(prev => ({ ...prev, [questionId]: value }))
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", workflow.color)}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">{workflow.name}</h2>
              <p className="text-xs text-muted-foreground">{workflow.estimatedTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModelSelector compact />
            <button onClick={onCancel} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500 bg-gradient-to-r", workflow.color)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {showImport ? 'Import existing brief (optional)' : `Step ${currentStepIndex + 1} of ${workflow.steps.length}`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {showImport ? (
          <BriefImport 
            onImport={handleBriefImport}
            onSkip={() => setShowImport(false)}
          />
        ) : showCelebration ? (
          <CelebrationScreen message={currentStep.celebration!} />
        ) : (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            {/* Step Title with Dynamic Agent Message */}
            <div>
              <h3 className="text-2xl font-bold mb-2">{currentStep.title}</h3>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                <span className="text-2xl">{dynamicEmoji}</span>
                <div className="flex-1">
                  {isLoadingDynamic ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {dynamicMessage || currentStep.agentMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Adapted Suggestions */}
            {Object.keys(adaptations).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(adaptations).map(([questionId, adaptation]) => (
                  adaptation.suggestions?.map((suggestion, i) => (
                    <button
                      key={`${questionId}-${i}`}
                      onClick={() => {
                        const currentVal = responses[questionId]
                        if (typeof currentVal === 'string') {
                          updateResponse(questionId, currentVal ? `${currentVal}, ${suggestion}` : suggestion)
                        }
                      }}
                      className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))
                ))}
              </div>
            )}

            {/* Questions */}
            <div className="space-y-6">
              {currentStep.questions.map(question => (
                <QuestionField
                  key={question.id}
                  question={{
                    ...question,
                    placeholder: getAdaptedPlaceholder(question)
                  }}
                  value={responses[question.id]}
                  customValue={customValues[question.id]}
                  onChange={(value) => updateResponse(question.id, value)}
                  onCustomChange={(value) => setCustomValues(prev => ({ ...prev, [question.id]: value }))}
                  suggestions={getAdaptedSuggestions(question)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!showCelebration && !showImport && (
        <div className="border-t border-border p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className={cn("bg-gradient-to-r", workflow.color)}
            >
              {isLastStep ? (
                <>
                  Complete
                  <Check className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionField({
  question,
  value,
  customValue,
  onChange,
  onCustomChange,
  suggestions = [],
}: {
  question: WorkflowQuestion
  value: string | string[] | undefined
  customValue?: string
  onChange: (value: string | string[]) => void
  onCustomChange?: (value: string) => void
  suggestions?: string[]
}) {
  const stringValue = Array.isArray(value) ? value[0] || '' : value || ''
  
  // Check if selected option allows custom input
  const selectedOption = question.options?.find(o => o.id === stringValue)
  const showCustomInput = selectedOption?.allowCustom

  return (
    <div className="space-y-3">
      <div>
        <label className="block font-medium mb-1">
          {question.prompt}
          {question.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {question.description && (
          <p className="text-sm text-muted-foreground">{question.description}</p>
        )}
      </div>

      {question.type === 'text' && (
        <Input
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="h-12 text-lg"
        />
      )}

      {question.type === 'textarea' && (
        <div className="space-y-2">
          <textarea
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const newValue = stringValue ? `${stringValue}\n- ${suggestion}` : `- ${suggestion}`
                    onChange(newValue)
                  }}
                  className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {question.type === 'single' && question.options && (
        <div className="space-y-2">
          <div className="grid gap-2">
            {question.options.map(option => (
              <button
                key={option.id}
                onClick={() => onChange(option.id)}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all",
                  stringValue === option.id
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border hover:border-cyan-500/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    stringValue === option.id
                      ? "border-cyan-500 bg-cyan-500"
                      : "border-muted-foreground"
                  )}>
                    {stringValue === option.id && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{option.label}</p>
                    {option.description && !option.allowCustom && (
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Custom input for "Other" option */}
          {showCustomInput && (
            <div className="ml-8 animate-fade-in">
              <Input
                value={customValue || ''}
                onChange={(e) => onCustomChange?.(e.target.value)}
                placeholder="Describe your genre..."
                className="h-10"
                autoFocus
              />
            </div>
          )}
        </div>
      )}

      {question.type === 'multiple' && question.options && (
        <div className="grid gap-2">
          {question.options.map(option => {
            const selected = Array.isArray(value) && value.includes(option.id)
            return (
              <button
                key={option.id}
                onClick={() => {
                  const current = Array.isArray(value) ? value : []
                  if (selected) {
                    onChange(current.filter(v => v !== option.id))
                  } else {
                    onChange([...current, option.id])
                  }
                }}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all",
                  selected
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-border hover:border-cyan-500/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                    selected
                      ? "border-cyan-500 bg-cyan-500"
                      : "border-muted-foreground"
                  )}>
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CelebrationScreen({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in">
      <div className="p-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 mb-6 animate-pulse">
        <Sparkles className="h-12 w-12 text-cyan-400" />
      </div>
      <p className="text-xl font-medium text-cyan-400">{message}</p>
    </div>
  )
}
