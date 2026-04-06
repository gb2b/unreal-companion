import type { SectionVersion } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

interface SectionDiffProps {
  versions: SectionVersion[]
  currentVersion: number
  onRollback: (version: number) => void
  onClose: () => void
}

export function SectionDiff({ versions, currentVersion, onRollback, onClose }: SectionDiffProps) {
  const { language } = useI18n()

  if (versions.length < 2) return null

  const prev = versions[currentVersion - 2]
  const curr = versions[currentVersion - 1]

  if (!prev || !curr) return null

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-foreground">
          {language === 'fr' ? `Version ${currentVersion} / ${versions.length}` : `Version ${currentVersion} of ${versions.length}`}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      <div className="mb-2 rounded bg-red-500/10 p-2">
        <p className="mb-0.5 text-[10px] font-medium text-red-400">
          {language === 'fr' ? 'Avant' : 'Before'} (v{currentVersion - 1})
        </p>
        <p className="text-muted-foreground whitespace-pre-wrap">{prev.content.slice(0, 300)}</p>
      </div>
      <div className="mb-2 rounded bg-green-500/10 p-2">
        <p className="mb-0.5 text-[10px] font-medium text-green-400">
          {language === 'fr' ? 'Après' : 'After'} (v{currentVersion})
        </p>
        <p className="text-muted-foreground whitespace-pre-wrap">{curr.content.slice(0, 300)}</p>
      </div>

      {currentVersion > 1 && (
        <button
          onClick={() => onRollback(currentVersion - 1)}
          className="rounded bg-orange-500/20 px-2 py-1 text-orange-400 hover:bg-orange-500/30"
        >
          {language === 'fr' ? `↩ Revenir à la version ${currentVersion - 1}` : `↩ Rollback to v${currentVersion - 1}`}
        </button>
      )}
    </div>
  )
}
