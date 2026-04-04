import { useEffect, useRef } from 'react'
import type { StreamBlock } from '@/types/interactions'
import type { ChoicesData, SliderData, RatingData, UploadData, ConfirmData } from '@/types/interactions'
import { AgentBubble } from './blocks/AgentBubble'
import { ChoicesBlock } from './blocks/ChoicesBlock'
import { SliderBlock } from './blocks/SliderBlock'
import { RatingBlock } from './blocks/RatingBlock'
import { UploadBlock } from './blocks/UploadBlock'
import { ConfirmBlock } from './blocks/ConfirmBlock'

interface ImmersiveZoneProps {
  blocks: StreamBlock[]
  currentText: string
  isStreaming: boolean
  agentName?: string
  agentEmoji?: string
  onInteractionResponse: (response: string) => void
}

export function ImmersiveZone({ blocks, currentText, isStreaming, agentName, agentEmoji, onInteractionResponse }: ImmersiveZoneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [blocks.length, currentText])

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {blocks.map((block, i) => (
          <div key={i}>
            {block.kind === 'agent_text' && (
              <AgentBubble content={block.content} agentName={agentName} agentEmoji={agentEmoji} />
            )}
            {block.kind === 'user_response' && (
              <div className="ml-auto max-w-[80%] rounded-lg bg-primary/10 px-4 py-2 text-sm text-foreground">
                {block.content}
              </div>
            )}
            {block.kind === 'interaction' && block.blockType === 'choices' && (
              <ChoicesBlock data={block.data as ChoicesData} onSelect={ids => onInteractionResponse(ids.join(', '))} />
            )}
            {block.kind === 'interaction' && block.blockType === 'slider' && (
              <SliderBlock data={block.data as SliderData} onSubmit={v => onInteractionResponse(String(v))} />
            )}
            {block.kind === 'interaction' && block.blockType === 'rating' && (
              <RatingBlock data={block.data as RatingData} onSubmit={v => onInteractionResponse(String(v))} />
            )}
            {block.kind === 'interaction' && block.blockType === 'upload' && (
              <UploadBlock data={block.data as UploadData} onUpload={() => onInteractionResponse('[file uploaded]')} />
            )}
            {block.kind === 'interaction' && block.blockType === 'confirm' && (
              <ConfirmBlock data={block.data as ConfirmData} onConfirm={ok => onInteractionResponse(ok ? 'approved' : 'revise')} />
            )}
            {block.kind === 'tool_call' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
                Calling {block.name}...
              </div>
            )}
            {block.kind === 'tool_result' && (
              <div className="text-xs text-muted-foreground">
                Tool result received
              </div>
            )}
            {block.kind === 'thinking' && (
              <div className="text-xs italic text-muted-foreground/60">
                Thinking...
              </div>
            )}
          </div>
        ))}

        {/* Live streaming text */}
        {currentText && (
          <AgentBubble content={currentText} agentName={agentName} agentEmoji={agentEmoji} />
        )}

        {isStreaming && !currentText && (
          <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/50 px-4 py-3">
            <div className="flex gap-1">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-muted-foreground">
              {agentName || 'Agent'} is thinking...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
