import { useConversationStore } from '@/stores/conversationStore'
import { useI18n } from '@/i18n/useI18n'
import { SectionBar } from './SectionBar'
import { ImmersiveZone } from './ImmersiveZone'
import { InputBar } from './InputBar'
import type { WorkflowV2 } from '@/types/studio'

interface WorkflowViewProps {
  workflow: WorkflowV2
  previewPanel?: React.ReactNode
}

export function WorkflowView({ workflow, previewPanel }: WorkflowViewProps) {
  const {
    blocks,
    currentText,
    isStreaming,
    sectionStatuses,
    activeSection,
    sendMessage,
  } = useConversationStore()
  const { language } = useI18n()

  const handleSend = (message: string) => {
    sendMessage(message, {
      agent: workflow.agents.primary,
      workflowId: workflow.id,
      sectionFocus: activeSection || undefined,
      language,
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
