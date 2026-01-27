/**
 * WorkflowPage - Dedicated page for AI-driven workflows
 *
 * Integrates:
 * - WorkflowSelector for picking workflows
 * - WorkflowStepContainer for step-based execution
 */

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useWorkflowStore } from '@/stores/workflowStore'
import { WorkflowStepContainer } from '@/components/workflow/WorkflowStepContainer'
import { WorkflowSelector } from '@/components/workflow/WorkflowSelector'

interface WorkflowPageProps {
  onBack: () => void
}

export function WorkflowPage({ onBack }: WorkflowPageProps) {
  const { currentProject } = useProjectStore()
  const {
    workflows,
    activeSession,
    pendingWorkflow,
    isLoading,
    error,
    fetchWorkflows,
    startWorkflow,
    resumeSession,
    reset,
  } = useWorkflowStore()
  
  const [view, setView] = useState<'select' | 'execute'>('select')
  
  // Fetch workflows on mount
  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])
  
  // Switch to execute view when session is active or pending
  useEffect(() => {
    if (activeSession || pendingWorkflow) {
      setView('execute')
    }
  }, [activeSession, pendingWorkflow])
  
  const handleSelectWorkflow = async (workflowId: string) => {
    if (!currentProject) return

    // Use companion_path if available, otherwise derive project folder from uproject_path
    const projectPath = currentProject.companion_path
      ? currentProject.companion_path.replace(/\/.unreal-companion$/, '')
      : currentProject.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || ''

    await startWorkflow(
      workflowId,
      currentProject.id,
      projectPath
    )
  }
  
  const handleResumeSession = async (sessionId: string) => {
    if (!currentProject) return

    // Use companion_path if available, otherwise derive project folder from uproject_path
    const projectPath = currentProject.companion_path
      ? currentProject.companion_path.replace(/\/.unreal-companion$/, '')
      : currentProject.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || ''

    await resumeSession(
      sessionId,
      projectPath
    )
  }
  
  const handleBack = () => {
    if (view === 'execute') {
      setView('select')
      reset()
    } else {
      onBack()
    }
  }
  
  // Loading state
  if (isLoading && !activeSession) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading workflows...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchWorkflows()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card/50 flex items-center px-4 gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {view === 'execute' ? 'Workflows' : 'Studio'}
        </Button>
        
        {(activeSession || pendingWorkflow) && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {pendingWorkflow?.name || workflows.find(w => w.id === activeSession?.workflow_id)?.name || 'Workflow'}
            </span>
            {activeSession ? (
              <span className="text-sm text-muted-foreground">
                Step {activeSession.current_step + 1} / {activeSession.total_steps}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Starting...</span>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'select' ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold mb-2">AI Workflows</h1>
              <p className="text-muted-foreground mb-8">
                Interactive workflows powered by AI to help you design your game.
              </p>
              
              <WorkflowSelector
                workflows={workflows}
                onSelect={handleSelectWorkflow}
                onResume={handleResumeSession}
              />
            </div>
          </div>
        ) : (
          <WorkflowStepContainer className="h-full" />
        )}
      </div>
    </div>
  )
}

export default WorkflowPage
