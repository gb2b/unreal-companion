import { useEffect, useRef } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useI18n } from '@/i18n/useI18n'
import { SectionBar } from './SectionBar'
import { ImmersiveZone } from './ImmersiveZone'
import { InputBar } from './InputBar'
import type { WorkflowV2 } from '@/types/studio'

interface WorkflowViewProps {
  workflow: WorkflowV2
  projectPath?: string
  previewPanel?: React.ReactNode
}

export function WorkflowView({ workflow, projectPath, previewPanel }: WorkflowViewProps) {
  const {
    blocks,
    currentText,
    isStreaming,
    sectionStatuses,
    activeSection,
    sendMessage,
  } = useConversationStore()
  const { language } = useI18n()
  const hasInitialized = useRef(false)

  // Auto-start: send initial message when workflow opens with empty conversation
  useEffect(() => {
    if (hasInitialized.current || blocks.length > 0 || isStreaming) return
    hasInitialized.current = true

    // Build section list for the LLM
    const sectionList = workflow.sections
      .map(s => `- ${s.name}${s.required ? ' (required)' : ' (optional)'}`)
      .join('\n')

    // Send a system-level init message that the LLM responds to
    const initMessage = [
      `[WORKFLOW_START]`,
      `Workflow: ${workflow.name}`,
      `Description: ${workflow.description}`,
      `Sections to fill:\n${sectionList}`,
      ``,
      `Greet the user and start the workflow. Introduce yourself with your persona.`,
      `Propose how to get started: either answer some questions to fill the document,`,
      `or upload an existing document/brief to pre-fill sections.`,
      `Show a choices block with: "Start from scratch", "Upload existing document", "Quick start (fill basics fast)".`,
    ].join('\n')

    sendMessage(initMessage, {
      agent: workflow.agents.primary,
      workflowId: workflow.id,
      language,
      projectPath,
      hidden: true,
    })
  }, [workflow.id])

  const handleSend = (message: string) => {
    sendMessage(message, {
      agent: workflow.agents.primary,
      workflowId: workflow.id,
      sectionFocus: activeSection || undefined,
      language,
      projectPath,
    })
  }

  const handleSkip = () => {
    sendMessage('skip', {
      agent: workflow.agents.primary,
      workflowId: workflow.id,
    })
  }

  const handleSectionClick = (sectionId: string) => {
    sendMessage(`Let's work on the ${sectionId} section.`, {
      agent: workflow.agents.primary,
      workflowId: workflow.id,
      sectionFocus: sectionId,
    })
  }

  const handleInteractionResponse = (response: string) => {
    sendMessage(response, {
      agent: workflow.agents.primary,
      workflowId: workflow.id,
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Section Bar */}
      <SectionBar
        sections={workflow.sections}
        statuses={sectionStatuses}
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Immersive Zone */}
        <div className="flex flex-1 flex-col">
          <ImmersiveZone
            blocks={blocks}
            currentText={currentText}
            isStreaming={isStreaming}
            onInteractionResponse={handleInteractionResponse}
          />
          <InputBar
            onSend={handleSend}
            onSkip={handleSkip}
            isStreaming={isStreaming}
            activeSection={activeSection}
          />
        </div>

        {/* Preview Panel (right side) */}
        {previewPanel && (
          <div className="w-[400px] shrink-0 border-l border-border/30">
            {previewPanel}
          </div>
        )}
      </div>
    </div>
  )
}
