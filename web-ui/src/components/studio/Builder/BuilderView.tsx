import { useEffect, useRef, useState, useCallback } from 'react'
import type { WorkflowV2 } from '@/types/studio'
import { useBuilderStore } from '@/stores/builderStore'
import { SectionBar } from '@/components/studio/Workflow/SectionBar'
import { PreviewPanel } from '@/components/studio/Preview/PreviewPanel'
import { MicroTimeline } from './MicroTimeline'
import { StepSlide } from './StepSlide'
import { Confetti } from './Confetti'
import { OnboardingTour } from './OnboardingTour'
import './animations.css'

interface BuilderViewProps {
  workflow: WorkflowV2
  projectPath: string
}

export function BuilderView({ workflow, projectPath }: BuilderViewProps) {
  const hasInitialized = useRef(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const {
    initWorkflow,
    submitResponse,
    jumpToSection,
    scrollToSection,
    jumpToMicroStep,
    goBack,
    skipSection,
    sectionStatuses,
    activeSection,
    microSteps,
    activeMicroStepIndex,
    isProcessing,
    processingText,
    currentStreamText,
    prototypes,
    agent,
  } = useBuilderStore()

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    initWorkflow(workflow, projectPath)
  }, [initWorkflow, workflow, projectPath])

  // Watch for newly completed sections to trigger confetti
  const prevStatusesRef = useRef<Record<string, string>>({})
  useEffect(() => {
    const newlyComplete = Object.entries(sectionStatuses).find(
      ([id, s]) => s === 'complete' && prevStatusesRef.current[id] !== 'complete'
    )
    if (newlyComplete) setShowConfetti(true)
    prevStatusesRef.current = { ...sectionStatuses }
  }, [sectionStatuses])

  const activeMicroStep = microSteps[activeMicroStepIndex] ?? null

  // Keyboard shortcuts
  const handleContinue = useCallback(() => {
    // StepSlide handles its own continue logic; here we just forward to skip if no step
    if (!activeMicroStep) skipSection()
  }, [activeMicroStep, skipSection])

  const handleSkip = useCallback(() => {
    skipSection()
  }, [skipSection])

  const handleBack = useCallback(() => {
    goBack()
  }, [goBack])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in input/textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        // Enter in textarea = submit (unless Shift+Enter for newline)
        if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLTextAreaElement) {
          e.preventDefault()
          const value = e.target.value.trim()
          if (value) {
            submitResponse(value)
            ;(e.target as HTMLTextAreaElement).value = ''
          }
        }
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        handleContinue()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault()
        handleBack()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleContinue, handleSkip, handleBack, submitResponse])

  // Auto-focus first interactive element on step change
  useEffect(() => {
    const el = document.querySelector('[data-autofocus]') as HTMLElement
    el?.focus()
  }, [activeMicroStepIndex])

  return (
    <div className="flex h-full flex-col">
      {/* Confetti on section complete */}
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Onboarding tour (first time) */}
      <OnboardingTour />

      {/* Section Bar (top, full width) */}
      <SectionBar
        sections={workflow.sections}
        statuses={sectionStatuses}
        activeSection={activeSection}
        onSectionClick={jumpToSection}
      />

      {/* Main area: 3-column flex */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: MicroTimeline (w-64, shrink-0) */}
        <MicroTimeline
          steps={microSteps}
          activeIndex={activeMicroStepIndex}
          onStepClick={jumpToMicroStep}
          sectionName={activeSection ?? undefined}
        />

        {/* Center: StepSlide (flex-1) */}
        <StepSlide
          microStep={activeMicroStep}
          streamingText={currentStreamText}
          isProcessing={isProcessing}
          processingText={processingText}
          agentName={agent.name}
          agentEmoji={agent.emoji}
          activeMicroStepIndex={activeMicroStepIndex}
          onSubmitResponse={submitResponse}
          onBack={goBack}
          onSkip={skipSection}
        />

        {/* Right: PreviewPanel (w-[400px], shrink-0) */}
        <div data-tour="preview" className="w-[400px] shrink-0">
          <PreviewPanel
            sections={workflow.sections}
            sectionStatuses={sectionStatuses}
            documentContent=""
            documents={[]}
            prototypes={prototypes}
            onSectionClick={scrollToSection}
            onDocumentClick={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
