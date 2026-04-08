import type { StudioDocument } from '@/types/studio'

interface ReferenceCardProps {
  document: StudioDocument
  projectPath: string
  onClick: () => void
}

function formatFileSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function detectType(document: StudioDocument): 'image' | 'pdf' | 'doc' {
  const tags = document.meta.tags ?? []
  if (tags.includes('image')) return 'image'
  const name = document.name.toLowerCase()
  const contentType = document.meta.content_type ?? ''
  if (name.endsWith('.pdf') || contentType.includes('pdf')) return 'pdf'
  return 'doc'
}

function getSnippet(document: StudioDocument): string {
  return document.meta.summary ?? ''
}

export function ReferenceCard({ document, projectPath, onClick }: ReferenceCardProps) {
  const type = detectType(document)
  const snippet = getSnippet(document)
  const sizeLabel = formatFileSize(document.meta.size_bytes)

  const imgSrc = `/api/v2/studio/references/${encodeURIComponent(document.name)}?project_path=${encodeURIComponent(projectPath)}`

  return (
    <div
      className="rounded-[10px] border border-border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:border-border/70 hover:bg-card/80 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
      onClick={onClick}
    >
      {/* Preview zone */}
      <div className="h-[90px] overflow-hidden relative flex items-center justify-center"
        style={{
          background: type === 'image'
            ? 'linear-gradient(135deg, hsl(280 30% 15%), hsl(320 30% 18%))'
            : type === 'pdf'
            ? 'linear-gradient(135deg, hsl(0 30% 12%), hsl(15 30% 15%))'
            : 'linear-gradient(135deg, hsl(210 30% 12%), hsl(220 30% 15%))',
        }}
      >
        {type === 'image' ? (
          <img
            src={imgSrc}
            alt={document.name}
            className="w-full h-full object-cover opacity-[0.85]"
          />
        ) : (
          <>
            <span
              className="text-[20px] font-extrabold opacity-[0.15] uppercase tracking-widest"
              style={{
                color: type === 'pdf' ? 'hsl(0 70% 60%)' : 'hsl(210 70% 60%)',
              }}
            >
              {type === 'pdf' ? 'PDF' : 'MD'}
            </span>
            {snippet && (
              <div className="absolute top-2 left-2 right-2 text-[8px] leading-[1.4] text-muted-foreground font-mono opacity-50 overflow-hidden max-h-[70px]">
                {snippet}
              </div>
            )}
          </>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-[10px]">
        <div className="text-[12px] font-medium mb-0.5 truncate">{document.name}</div>
        <div className="text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{sizeLabel}</span>
          {type === 'image' && (
            <span className="text-[8px] uppercase font-bold tracking-[0.05em] px-[5px] py-px rounded-[3px] bg-[hsl(280_40%_20%)] text-[hsl(280_60%_70%)]">
              IMG
            </span>
          )}
          {type === 'pdf' && (
            <span className="text-[8px] uppercase font-bold tracking-[0.05em] px-[5px] py-px rounded-[3px] bg-[hsl(0_50%_20%)] text-[hsl(0_70%_65%)]">
              PDF
            </span>
          )}
          {type === 'doc' && (
            <span className="text-[8px] uppercase font-bold tracking-[0.05em] px-[5px] py-px rounded-[3px] bg-[hsl(210_40%_20%)] text-[hsl(210_60%_70%)]">
              MD
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
