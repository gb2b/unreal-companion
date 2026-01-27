/**
 * WorkflowStepContainer - Container for step-based workflow execution
 *
 * Handles:
 * - Displaying step data (from store or fetched)
 * - Submitting responses
 * - Navigation (next, back, skip)
 * - Completion handling
 * 
 * NOTE: Step data is provided directly from /start response.
 * We only fetch if data is missing (e.g., page refresh).
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowStepView } from './WorkflowStepView';
import { useWorkflowStore, StepRenderData } from '@/stores/workflowStore';
import { useProjectStore } from '@/stores/projectStore';
import { useI18n, useTranslation } from '@/i18n/useI18n';
import { useStreamingResponse } from '@/hooks/useStreamingResponse';
import { ThinkingIndicator } from '@/components/common/ThinkingIndicator';

interface WorkflowStepContainerProps {
  className?: string;
}

export const WorkflowStepContainer: React.FC<WorkflowStepContainerProps> = ({
  className = '',
}) => {
  const { 
    activeSession, 
    pendingWorkflow, 
    isLoading: isWorkflowLoading,
    isStartStreaming,
    streamingThoughts,
    currentStepData: storeStepData,
    setCurrentStepData,
  } = useWorkflowStore();
  const { currentProject } = useProjectStore();
  const { language } = useI18n();
  const { t } = useTranslation();

  // Local state for step data (used when fetching is needed)
  const [localStepData, setLocalStepData] = useState<StepRenderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);

  // SSE streaming for thinking indicator (for step fetching, not start)
  const { 
    thoughts: stepThoughts, 
    isStreaming: isStepStreaming, 
    finalData,
    startStream,
    error: streamError,
  } = useStreamingResponse();

  // Combine thoughts from store (start) and hook (step fetch)
  const allThoughts = isStartStreaming ? streamingThoughts : stepThoughts;
  const isThinking = isStartStreaming || isStepStreaming;

  // Use store data if available, otherwise local data, otherwise streaming data
  const stepData = storeStepData || localStepData || (finalData as unknown as StepRenderData | null);

  // Prevent double fetching
  const fetchingRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);

  // Get project path
  const getProjectPath = useCallback(() => {
    // First try session's stored path
    if (activeSession?.project_path) {
      return activeSession.project_path;
    }
    // Fall back to localStorage
    const storedPath = localStorage.getItem('currentProjectPath');
    if (storedPath) return storedPath;
    // Last resort: derive from project
    if (!currentProject) return '';
    return currentProject.companion_path
      ? currentProject.companion_path.replace(/\/.unreal-companion$/, '')
      : currentProject.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || '';
  }, [activeSession?.project_path, currentProject]);

  // Fetch step data ONLY if not already available
  // Uses SSE for visual feedback (thinking indicator) during LLM processing
  const fetchStep = useCallback(async (force = false, useSSE = true) => {
    if (!activeSession) return;

    // IMPORTANT: Don't fetch if we already have data from the store
    // This is the key optimization - no double fetch!
    if (!force && storeStepData) {
      console.log('[WorkflowStep] Using data from store, no fetch needed');
      return;
    }

    // Prevent double fetching for same session
    if (!force && (fetchingRef.current || lastSessionIdRef.current === activeSession.id)) {
      return;
    }

    console.log('[WorkflowStep] Fetching step data (no store data available)');
    fetchingRef.current = true;
    lastSessionIdRef.current = activeSession.id;
    setError(null);

    const projectPath = getProjectPath();

    // Use SSE for streaming with thinking indicator
    if (useSSE) {
      console.log('[WorkflowStep] Using SSE streaming for step data');
      setIsLoading(true);
      const sseUrl = `/api/workflows/session/${activeSession.id}/step/stream?project_path=${encodeURIComponent(projectPath)}&language=${language}`;
      startStream(sseUrl);
      return;
    }

    // Fallback to regular REST fetch
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/workflows/session/${activeSession.id}/step?project_path=${encodeURIComponent(projectPath)}&language=${language}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch step: ${response.statusText}`);
      }

      const data = await response.json();
      setLocalStepData(data);
      // Also update store for consistency
      setCurrentStepData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load step');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [activeSession, storeStepData, getProjectPath, language, setCurrentStepData, startStream]);

  // Handle SSE completion - update step data when streaming finishes
  useEffect(() => {
    if (finalData && !stepData) {
      console.log('[WorkflowStep] SSE complete, using streamed data');
      const streamedData = finalData as unknown as StepRenderData;
      setLocalStepData(streamedData);
      setCurrentStepData(streamedData);
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [finalData, stepData, setCurrentStepData]);

  // Handle SSE errors
  useEffect(() => {
    if (streamError) {
      console.error('[WorkflowStep] SSE error:', streamError);
      setError(streamError);
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [streamError]);

  // Only fetch if we don't have data
  useEffect(() => {
    if (activeSession && !stepData && activeSession.id !== lastSessionIdRef.current) {
      fetchStep();
    }
  }, [activeSession, stepData, fetchStep]);

  // Submit step responses
  const handleSubmit = useCallback(async (responses: Record<string, string | string[]>) => {
    if (!activeSession) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const projectPath = getProjectPath();
      const response = await fetch(
        `/api/workflows/session/${activeSession.id}/step/submit?project_path=${encodeURIComponent(projectPath)}&language=${language}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses, skipped: false }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to submit: ${response.statusText}`);
      }

      const result = await response.json();

      console.log('[WorkflowStep] Submit result:', result);

      if (!result.success) {
        // Validation errors - check if errors exist
        if (result.errors && typeof result.errors === 'object' && Object.keys(result.errors).length > 0) {
          const errorMessages = Object.values(result.errors).filter(Boolean).join(', ');
          setError(errorMessages || result.message || 'Validation failed');
        } else {
          setError(result.message || 'Validation failed');
        }
        return;
      }

      if (result.complete) {
        // Workflow complete!
        console.log('[WorkflowStep] Workflow complete!');
        setIsComplete(true);
        setCelebration(result.celebration || 'Workflow complete!');
        setCurrentStepData(null);
      } else if (result.next_step) {
        // Load next step from response - update both local and store
        console.log('[WorkflowStep] Loading next step:', result.next_step.step_id);
        setLocalStepData(result.next_step);
        setCurrentStepData(result.next_step);
      } else {
        // Fetch next step if not included in response
        console.log('[WorkflowStep] Fetching next step...');
        lastSessionIdRef.current = null; // Allow re-fetch
        await fetchStep(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeSession, getProjectPath, language, fetchStep, setCurrentStepData]);

  // Skip step
  const handleSkip = useCallback(async () => {
    if (!activeSession) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const projectPath = getProjectPath();
      const response = await fetch(
        `/api/workflows/session/${activeSession.id}/step/submit?project_path=${encodeURIComponent(projectPath)}&language=${language}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: {}, skipped: true }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to skip: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.complete) {
        setIsComplete(true);
        setCelebration(result.celebration || 'Workflow complete!');
        setCurrentStepData(null);
      } else if (result.next_step) {
        setLocalStepData(result.next_step);
        setCurrentStepData(result.next_step);
      } else {
        lastSessionIdRef.current = null;
        await fetchStep(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeSession, getProjectPath, language, fetchStep, setCurrentStepData]);

  // Go back
  const handleBack = useCallback(async () => {
    if (!activeSession || !stepData || stepData.step_number <= 1) return;

    setIsLoading(true);
    setError(null);

    try {
      const projectPath = getProjectPath();
      const response = await fetch(
        `/api/workflows/session/${activeSession.id}/step/back?project_path=${encodeURIComponent(projectPath)}&language=${language}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`Failed to go back: ${response.statusText}`);
      }

      const result = await response.json();
      setLocalStepData(result.step);
      setCurrentStepData(result.step);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to go back');
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, stepData, getProjectPath, language, setCurrentStepData]);

  // Loading state - show thinking indicator with SSE thoughts
  // PRIORITY: Show this during SSE streaming, even if activeSession is not yet set
  // This handles both: workflow start (isStartStreaming) and step fetch (isStepStreaming)
  if (isStartStreaming || ((isLoading || isThinking || isWorkflowLoading) && !stepData)) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${className}`}>
        <div className="w-full max-w-md px-4">
          {/* Workflow name header during streaming */}
          {pendingWorkflow && (
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold">{pendingWorkflow.name}</h2>
            </div>
          )}
          
          {/* SSE Thinking Indicator - shows real-time thoughts from LLM */}
          {allThoughts.length > 0 && (
            <ThinkingIndicator 
              thoughts={allThoughts} 
              isActive={isThinking || isStartStreaming} 
              className="mb-6"
            />
          )}
          
          {/* Fallback if no thoughts yet */}
          {allThoughts.length === 0 && (
            <div className="text-center">
              {/* Animated thinking indicator */}
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
                <div className="absolute inset-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              </div>
              <p className="text-foreground font-medium mb-1">{t('streaming.thinking')}</p>
              <p className="text-sm text-muted-foreground">{t('workflow.preparingWorkflow')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No active session - check if pending (only shown if NOT streaming)
  if (!activeSession) {
    // Show loading if workflow is starting (pendingWorkflow exists but not streaming)
    if (pendingWorkflow || isWorkflowLoading) {
      return (
        <div className={`flex items-center justify-center h-full ${className}`}>
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">
              {pendingWorkflow?.name || t('workflow.starting')}
            </p>
            <p className="text-sm text-muted-foreground">{t('workflow.preparingWorkflow')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-muted-foreground">
          {t('workflow.noActiveWorkflow')}
        </p>
      </div>
    );
  }

  // Error state
  if (error && !stepData) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('common.error')}</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => fetchStep()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('workflow.retry')}
          </button>
        </div>
      </div>
    );
  }

  // Completion state
  if (isComplete) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <PartyPopper className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('workflow.congratulations')}</h2>
          <p className="text-muted-foreground mb-6">{celebration}</p>
          <p className="text-sm text-muted-foreground">
            {t('workflow.documentSaved')}
          </p>
        </motion.div>
      </div>
    );
  }

  // Step view
  if (!stepData) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-10 bg-destructive/10 text-destructive px-4 py-2 text-sm"
          >
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              {t('workflow.dismiss')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <WorkflowStepView
        stepData={stepData as any}
        isLoading={isSubmitting}
        onSubmit={handleSubmit}
        onSkip={stepData.can_skip ? handleSkip : undefined}
        onBack={stepData.step_number > 1 ? handleBack : undefined}
        sessionId={activeSession.id}
        projectPath={getProjectPath()}
      />
    </div>
  );
};

export default WorkflowStepContainer;
