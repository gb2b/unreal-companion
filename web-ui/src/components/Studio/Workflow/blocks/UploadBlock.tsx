import { useState } from 'react'
import type { UploadData } from '@/types/interactions'
import { UploadModal, type UploadResult } from '@/components/studio/Dashboard/UploadModal'

interface UploadBlockProps {
  data: UploadData
  onUpload: (result: UploadResult) => void
  projectPath?: string
  disabled?: boolean
}

export function UploadBlock({ data, onUpload, projectPath = '', disabled = false }: UploadBlockProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const handleFileSelected = (result: UploadResult) => {
    onUpload(result)
    setModalOpen(false)
  }

  return (
    <>
      <div
        className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border/50 bg-card p-8 text-center transition-colors hover:border-primary/50"
      >
        <p className="text-sm text-muted-foreground">{data.label || 'Drop files here or click to upload'}</p>
        <button
          onClick={() => !disabled && setModalOpen(true)}
          disabled={disabled}
          className="cursor-pointer rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          Browse Files
        </button>
      </div>

      <UploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onFileSelected={handleFileSelected}
        projectPath={projectPath}
        accept={data.accept}
      />
    </>
  )
}
