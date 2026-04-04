import { useCallback } from 'react'
import type { UploadData } from '@/types/interactions'

interface UploadBlockProps {
  data: UploadData
  onUpload: (files: File[]) => void
  disabled?: boolean
}

export function UploadBlock({ data, onUpload, disabled = false }: UploadBlockProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    onUpload(files)
  }, [onUpload])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onUpload(files)
  }, [onUpload])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border/50 bg-card p-8 text-center transition-colors hover:border-primary/50"
    >
      <p className="text-sm text-muted-foreground">{data.label || 'Drop files here or click to upload'}</p>
      <input
        type="file"
        accept={data.accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        id="upload-input"
      />
      <label
        htmlFor="upload-input"
        className="cursor-pointer rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
      >
        Browse Files
      </label>
    </div>
  )
}
