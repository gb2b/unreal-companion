import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Upload } from 'lucide-react'
import { useI18n } from '@/i18n/useI18n'
import { AttachModal } from '../Builder/AttachModal'

interface AssetsPanelProps {
  projectPath?: string
  documentId?: string
}

interface AssetItem {
  id: string
  name: string
  type: string // image, document, asset-3d, file
  tags: string[]
  summary?: string
  contentType?: string
  sizeBytes?: number
}

export function AssetsPanel({ projectPath, documentId }: AssetsPanelProps) {
  const { language } = useI18n()
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [selected, setSelected] = useState<AssetItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const fetchAssets = () => {
    if (!projectPath) return
    fetch(`/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`)
      .then(r => r.ok ? r.json() : { documents: [] })
      .then(data => {
        const docs = data.documents || data || []
        const refs = (docs as any[]).filter((d: any) => d.id?.startsWith('references/'))
        setAssets(refs.map((d: any) => ({
          id: d.id,
          name: d.name || d.id,
          type: d.meta?.tags?.find((t: string) => ['image', 'asset-3d', 'document'].includes(t)) || 'file',
          tags: d.meta?.tags || [],
          summary: d.meta?.index?.summary || d.meta?.summary || '',
          contentType: d.meta?.content_type || '',
          sizeBytes: d.meta?.size_bytes,
        })))
      })
      .catch(() => {})
  }

  useEffect(() => { fetchAssets() }, [projectPath, documentId])

  const typeIcon: Record<string, string> = {
    image: '🖼️',
    'asset-3d': '🧊',
    document: '📑',
    file: '📎',
  }

  const fileUrl = (asset: AssetItem) => {
    const filename = asset.name || asset.id.replace('references/', '')
    return `/api/v2/studio/references/${encodeURIComponent(filename)}?project_path=${encodeURIComponent(projectPath || '')}`
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Asset viewer — inline preview
  if (selected) {
    const isImage = selected.type === 'image'
    const isPdf = selected.contentType?.includes('pdf') || selected.name.endsWith('.pdf')
    const url = fileUrl(selected)

    return (
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <span className="text-xs font-medium text-foreground truncate flex-1">{selected.name}</span>
          <a
            href={url}
            download={selected.name}
            className="flex items-center gap-1 rounded-md border border-border/30 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3" />
          </a>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-3">
          {isImage ? (
            <img
              src={url}
              alt={selected.name}
              className="w-full rounded-lg border border-border/30 object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={url}
              title={selected.name}
              className="h-full w-full rounded-lg border border-border/30"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-3">{typeIcon[selected.type] || '📎'}</span>
              <p className="text-sm text-muted-foreground mb-1">{selected.name}</p>
              {selected.sizeBytes && (
                <p className="text-xs text-muted-foreground/60 mb-3">{formatSize(selected.sizeBytes)}</p>
              )}
              <a
                href={url}
                download={selected.name}
                className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20 transition-colors"
              >
                Download
              </a>
            </div>
          )}

          {/* Summary if indexed */}
          {selected.summary && (
            <div className="mt-3 rounded-lg border border-border/20 bg-muted/20 p-3">
              <p className="text-[11px] font-medium text-foreground/60 mb-1">AI Summary</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{selected.summary}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Asset list
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
        <h3 className="flex-1 text-xs font-semibold text-foreground">
          {language === 'fr' ? 'Références' : 'References'}
        </h3>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1 rounded-md border border-border/30 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Upload className="h-3 w-3" />
          {language === 'fr' ? 'Ajouter' : 'Add'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-3xl opacity-30 mb-2">📎</span>
            <p className="text-xs text-muted-foreground/50">
              {language === 'fr'
                ? 'Aucune référence. Uploadez des fichiers ou images.'
                : 'No references yet. Upload files or images.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {assets.map(asset => (
              <button
                key={asset.id}
                onClick={() => setSelected(asset)}
                className="flex items-start gap-2.5 rounded-lg border border-border/20 bg-card/30 p-2.5 text-left transition-colors hover:bg-muted/50"
              >
                {/* Thumbnail for images */}
                {asset.type === 'image' ? (
                  <img
                    src={fileUrl(asset)}
                    alt={asset.name}
                    className="h-10 w-10 shrink-0 rounded-md border border-border/20 object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/30 text-lg">
                    {typeIcon[asset.type] || '📎'}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{asset.name}</div>
                  {asset.summary ? (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{asset.summary}</div>
                  ) : asset.sizeBytes ? (
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">{formatSize(asset.sizeBytes)}</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadOpen && projectPath && (
        <AttachModal
          isOpen={true}
          onClose={() => { setUploadOpen(false); fetchAssets() }}
          onAttach={() => { setUploadOpen(false); fetchAssets() }}
          projectPath={projectPath}
          sourceDocument={documentId}
        />
      )}
    </div>
  )
}
