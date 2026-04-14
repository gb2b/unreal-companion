import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Group, Panel, Separator } from 'react-resizable-panels'
import type { WorkflowV2 } from '@/types/studio'
import { useBuilderStore } from '@/stores/builderStore'
import { generateDatedDocId } from '@/lib/docId'
import { PreviewPanel } from '@/components/studio/Preview/PreviewPanel'
import { SessionHistory } from './SessionHistory'
import { StepSlide } from './StepSlide'
// Confetti removed — too random, replaced with subtler section flash animation
import { OnboardingTour } from './OnboardingTour'
import { ResumeBanner, RepeatableBanner } from './ResumeBanner'
import './animations.css'

function LearningModeToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('learning_mode') === 'true')

  function toggle() {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem('learning_mode', next ? 'true' : 'false')
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        enabled
          ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
          : 'border-border/30 bg-transparent text-muted-foreground/50 hover:text-muted-foreground'
      }`}
      title={enabled ? 'Learning Mode ON' : 'Learning Mode OFF'}
    >
      <span aria-hidden="true">🎓</span>
      <span className="hidden sm:inline">{enabled ? 'Learning' : 'Learn'}</span>
      <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-violet-400' : 'bg-muted-foreground/30'}`} />
    </button>
  )
}

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
    scrollToSection,
    jumpToMicroStep,
    goBack,
    skipSection,
    proposeModification,
    requestEditFromPreview,
    sectionStatuses,
    sectionContents,
    microSteps,
    activeMicroStepIndex,
    isProcessing,
    processingText,
    currentStreamText,
    prototypes,
    agent,
    dynamicSections,
    documentId,
    documentDisplayName,
    documentContent,
  } = useBuilderStore()

  const builderNavigate = useNavigate()
  const allSections = [...workflow.sections, ...dynamicSections]

  // Update URL with doc_id when it's set (so refresh works)
  useEffect(() => {
    if (documentId && workflow.id) {
      const expectedPath = `/studio/build/${encodeURIComponent(workflow.id)}/${encodeURIComponent(documentId)}`
      if (window.location.pathname !== expectedPath) {
        builderNavigate(expectedPath, { replace: true })
      }
    }
  }, [documentId, workflow.id, builderNavigate])

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    // Use explicit override prop if provided; otherwise generate a dated id
    // ONLY for repeatable flows (brainstorming, etc.). Non-repeatable flows get
    // a stable doc_id from the store (workflow.id), so they can be reused/opened.
    ;(async () => {
      let resolvedDocId = docIdOverride
      if (!resolvedDocId && bannerConfig?.type === 'repeatable') {
        resolvedDocId = await generateDatedDocId(workflow.id, projectPath)
      }
      initWorkflow(workflow, projectPath, resolvedDocId)
    })()
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

      {/* Builder toolbar */}
      <div className="flex items-center justify-end gap-2 px-3 py-1 border-b border-border/20">
        <LearningModeToggle />
      </div>

      {/* Main area: SessionHistory (fixed) + resizable center/right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Session History */}
        <SessionHistory
          microSteps={microSteps}
          activeMicroStepIndex={activeMicroStepIndex}
          onStepClick={jumpToMicroStep}
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
              onJumpToLatest={() => jumpToMicroStep(microSteps.length - 1)}
              onProposeModification={proposeModification}
              projectPath={projectPath}
              previousUserResponse={activeMicroStepIndex > 0 ? microSteps[activeMicroStepIndex - 1]?.userResponse : null}
              previousChoiceLabels={activeMicroStepIndex > 0 ? microSteps[activeMicroStepIndex - 1]?.selectedChoiceLabels : undefined}
            />
          </Panel>
          <Separator className="w-1 bg-border/30 hover:bg-primary/30 transition-colors cursor-col-resize" />
          <Panel defaultSize={35} minSize={20} data-tour="preview">
            <PreviewPanel
              sections={allSections}
              sectionStatuses={sectionStatuses}
              sectionContents={sectionContents}
              documentContent={documentContent}
              documents={[]}
              prototypes={prototypes}
              onSectionClick={scrollToSection}
              onDocumentClick={() => {}}
              projectPath={projectPath}
              documentId={documentId ?? ''}
              onEditRequest={requestEditFromPreview}
              workflowTypeName={workflow.name}
              documentDisplayName={documentDisplayName ?? undefined}
              onDocIdChanged={(newId, newDisplayName) => {
                useBuilderStore.setState({ documentId: newId, documentDisplayName: newDisplayName || null })
                builderNavigate(`/studio/build/${encodeURIComponent(workflow.id)}/${encodeURIComponent(newId)}`, { replace: true })
              }}
            />
          </Panel>
        </Group>
      </div>
    </div>
  )
}
