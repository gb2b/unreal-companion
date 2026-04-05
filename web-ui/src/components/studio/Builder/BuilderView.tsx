import { useEffect, useRef } from 'react'
import type { WorkflowV2 } from '@/types/studio'
import { useBuilderStore } from '@/stores/builderStore'
import { SectionBar } from '@/components/studio/Workflow/SectionBar'
import { PreviewPanel } from '@/components/studio/Preview/PreviewPanel'
import { MicroTimeline } from './MicroTimeline'
import { StepSlide } from './StepSlide'

interface BuilderViewProps {
  workflow: WorkflowV2
  projectPath: string
}

export function BuilderView({ workflow, projectPath }: BuilderViewProps) {
  const hasInitialized = useRef(false)

  const {
    initWorkflow,
    submitResponse,
    jumpToSection,
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

  const activeMicroStep = microSteps[activeMicroStepIndex] ?? null

  return (
    <div className="flex h-full flex-col">
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
        <div className="w-[400px] shrink-0">
          <PreviewPanel
            sections={workflow.sections}
            sectionStatuses={sectionStatuses}
            documentContent=""
            documents={[]}
            prototypes={prototypes}
            onSectionClick={jumpToSection}
            onDocumentClick={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
