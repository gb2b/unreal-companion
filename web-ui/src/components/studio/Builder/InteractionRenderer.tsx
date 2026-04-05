import type { InteractionBlockType, InteractionData, ChoicesData, SliderData, RatingData, UploadData, ConfirmData } from '@/types/interactions'
import { ChoicesBlock } from '@/components/studio/Workflow/blocks/ChoicesBlock'
import { SliderBlock } from '@/components/studio/Workflow/blocks/SliderBlock'
import { RatingBlock } from '@/components/studio/Workflow/blocks/RatingBlock'
import { UploadBlock } from '@/components/studio/Workflow/blocks/UploadBlock'
import { ConfirmBlock } from '@/components/studio/Workflow/blocks/ConfirmBlock'

interface InteractionRendererProps {
  type: InteractionBlockType
  data: InteractionData
  onResponse: (response: string) => void
  disabled: boolean
}

export function InteractionRenderer({ type, data, onResponse, disabled }: InteractionRendererProps) {
  switch (type) {
    case 'choices':
      return (
        <ChoicesBlock
          data={data as ChoicesData}
          onSelect={ids => onResponse(ids.join(', '))}
          disabled={disabled}
        />
      )
    case 'slider':
      return (
        <SliderBlock
          data={data as SliderData}
          onSubmit={v => onResponse(String(v))}
          disabled={disabled}
        />
      )
    case 'rating':
      return (
        <RatingBlock
          data={data as RatingData}
          onSubmit={v => onResponse(String(v))}
          disabled={disabled}
        />
      )
    case 'upload':
      return (
        <UploadBlock
          data={data as UploadData}
          onUpload={() => onResponse('[file uploaded]')}
          disabled={disabled}
        />
      )
    case 'confirm':
      return (
        <ConfirmBlock
          data={data as ConfirmData}
          onConfirm={ok => onResponse(ok ? 'approved' : 'revise')}
          disabled={disabled}
        />
      )
    default:
      return null
  }
}
