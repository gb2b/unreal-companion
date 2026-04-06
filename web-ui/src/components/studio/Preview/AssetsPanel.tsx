import { useState, useEffect } from 'react'
import { useI18n } from '@/i18n/useI18n'

interface AssetsPanelProps {
  projectPath?: string
  documentId?: string
}

interface AssetItem {
  id: string
  name: string
  type: string // image, document, asset-3d, file
  path: string
}

export function AssetsPanel({ projectPath, documentId }: AssetsPanelProps) {
  const { language } = useI18n()
  const [assets, setAssets] = useState<AssetItem[]>([])

  useEffect(() => {
    if (!projectPath) return
    const fetchAssets = async () => {
      try {
        const resp = await fetch(`/api/v2/studio/documents?project_path=${encodeURIComponent(projectPath)}`)
        if (resp.ok) {
          const docs = await resp.json()
          // Filter to reference files only
          const refs = (docs as any[]).filter((d: any) => d.id?.startsWith('references/'))
          setAssets(refs.map((d: any) => ({
            id: d.id,
            name: d.name || d.id,
            type: d.meta?.tags?.find((t: string) => ['image', 'asset-3d', 'document'].includes(t)) || 'file',
            path: d.path || '',
          })))
        }
      } catch { /* ignore */ }
    }
    fetchAssets()
  }, [projectPath, documentId])

  const typeIcon: Record<string, string> = {
    image: '🖼️',
    'asset-3d': '🧊',
    document: '📑',
    file: '📎',
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <h3 className="text-sm font-semibold text-foreground">
        {language === 'fr' ? 'Assets du projet' : 'Project Assets'}
      </h3>

      {assets.length === 0 ? (
        <p className="text-xs text-muted-foreground/50">
          {language === 'fr'
            ? 'Aucun asset uploadé. Les fichiers transmis dans le flow apparaîtront ici.'
            : 'No assets uploaded yet. Files shared in the flow will appear here.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {assets.map(asset => (
            <div
              key={asset.id}
              className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/50 p-2 text-xs hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <span className="text-base">{typeIcon[asset.type] || '📎'}</span>
              <span className="flex-1 truncate text-foreground">{asset.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
