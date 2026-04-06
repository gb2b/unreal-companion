import { useEffect, useRef, useCallback, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import type { WorkflowV2 } from '@/types/studio'
import { useBuilderStore } from '@/stores/builderStore'
import { PreviewPanel } from '@/components/studio/Preview/PreviewPanel'
import { TimelineSommaire } from './TimelineSommaire'
import { StepSlide } from './StepSlide'
// Confetti removed — too random, replaced with subtler section flash animation
import { OnboardingTour } from './OnboardingTour'
import { ResumeBanner, RepeatableBanner } from './ResumeBanner'
import './animations.css'

export interface BuilderBannerConfig {
  type: 'resume' | 'repeatable'
  documentName?: string
  documentId?: string
  flowName?: string
  existingCount?: number
  /** True if the flow is repeatable — used to generate a unique docId on re-init */
  repeatable?: boolean
}

interface BuilderViewProps {
  workflow: WorkflowV2
  projectPath: string
  bannerConfig?: BuilderBannerConfig | null
  /** When set, bypasses the default doc ID and uses this one (for new / repeatable docs) */
  docIdOverride?: string
  onNewDocument?: () => void
  onViewInLibrary?: () => void
}

export function BuilderView({ workflow, projectPath, bannerConfig, docIdOverride, onNewDocument, onViewInLibrary }: BuilderViewProps) {
  const hasInitialized = useRef(false)
  const [bannerVisible, setBannerVisible] = useState(true)
  // Confetti removed

  const {
    initWorkflow,
    submitResponse,
    jumpToSection,
    scrollToSection,
    jumpToMicroStep,
    goBack,
    skipSection,
    proposeModification,
    requestEditFromPreview,
    sectionStatuses,
    sectionContents,
    activeSection,
    microSteps,
    activeMicroStepIndex,
    isProcessing,
    processingText,
    currentStreamText,
    prototypes,
    agent,
    dynamicSections,
  } = useBuilderStore()

  const allSections = [...workflow.sections, ...dynamicSections]

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    // Use explicit override prop if provided; otherwise generate one for repeatable flows
    const resolvedDocId = docIdOverride
      ?? (bannerConfig?.type === 'repeatable'
        ? `concept/${workflow.id}-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 15)}`
        : undefined)
    initWorkflow(workflow, projectPath, resolvedDocId)
  }, [initWorkflow, workflow, projectPath]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset banner visibility whenever a new bannerConfig arrives
  useEffect(() => {
    setBannerVisible(true)
  }, [bannerConfig])

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

      {/* Onboarding tour (first time) */}
      <OnboardingTour />

      {/* Resume / repeatable banner */}
      {bannerConfig && bannerVisible && bannerConfig.type === 'resume' && (
        <ResumeBanner
          documentName={bannerConfig.documentName ?? ''}
          documentId={bannerConfig.documentId ?? ''}
          onNewDocument={() => { setBannerVisible(false); onNewDocument?.() }}
          onViewInLibrary={() => onViewInLibrary?.()}
          onDismiss={() => setBannerVisible(false)}
        />
      )}
      {bannerConfig && bannerVisible && bannerConfig.type === 'repeatable' && (
        <RepeatableBanner
          flowName={bannerConfig.flowName ?? ''}
          existingCount={bannerConfig.existingCount ?? 0}
          onViewInLibrary={() => onViewInLibrary?.()}
          onDismiss={() => setBannerVisible(false)}
        />
      )}

      {/* Main area: TimelineSommaire (fixed) + resizable center/right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: TimelineSommaire (fixed width, stays outside Group) */}
        <TimelineSommaire
          sections={allSections}
          sectionStatuses={sectionStatuses}
          microSteps={microSteps}
          activeMicroStepIndex={activeMicroStepIndex}
          activeSection={activeSection}
          onStepClick={jumpToMicroStep}
          onSectionClick={jumpToSection}
        />

        {/* Center + Right: resizable via react-resizable-panels */}
        <Group className="flex-1">
          <Panel defaultSize={65} minSize={40}>
            <StepSlide
              microStep={activeMicroStep}
              streamingText={currentStreamText}
              isProcessing={isProcessing}
              processingText={processingText}
              agentName={agent.name}
              agentEmoji={agent.emoji}
              activeMicroStepIndex={activeMicroStepIndex}
              totalMicroSteps={microSteps.length}
              onSubmitResponse={submitResponse}
              onBack={goBack}
              onSkip={skipSection}
              onProposeModification={proposeModification}
            />
          </Panel>
          <Separator className="w-1 bg-border/30 hover:bg-primary/30 transition-colors cursor-col-resize" />
          <Panel defaultSize={35} minSize={20} data-tour="preview">
            <PreviewPanel
              sections={allSections}
              sectionStatuses={sectionStatuses}
              sectionContents={sectionContents}
              documentContent=""
              documents={[]}
              prototypes={prototypes}
              onSectionClick={scrollToSection}
              onDocumentClick={() => {}}
              projectPath={projectPath}
              documentId={useBuilderStore.getState().documentId ?? ''}
              onEditRequest={requestEditFromPreview}
            />
          </Panel>
        </Group>
      </div>
    </div>
  )
}
