import { 
  Keyboard,
  Globe,
  ExternalLink,
  Check,
  Sun,
  Moon
} from 'lucide-react'
import { useTranslation } from '@/i18n/useI18n'
import { LANGUAGES, Language } from '@/i18n/translations'
import { ThemeSelector } from './ThemeSelector'
import { cn } from '@/lib/utils'

function ShortcutRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <span className="text-sm text-muted-foreground">{action}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd 
            key={i}
            className="px-2 py-1 rounded bg-muted text-xs font-mono"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}

export function AppearanceTab() {
  const { language, setLanguage, t } = useTranslation()

  return (
    <div className="space-y-8">
      {/* Genre-based Theme Selector */}
      <section className="p-6 rounded-2xl border border-border bg-card">
        <ThemeSelector />
      </section>
      
      {/* Light/Dark Mode */}
      <section className="p-4 rounded-xl border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sun className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{t('appearance.colorScheme')}</p>
              <p className="text-sm text-muted-foreground">Dark mode only for now</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            <button className="p-2 rounded-md text-muted-foreground">
              <Sun className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-md bg-background text-foreground shadow-sm">
              <Moon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold">{t('appearance.language')}</h2>
        </div>
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3">{t('appearance.languageDesc')}</p>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id as Language)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                  language === lang.id
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-border hover:border-cyan-500/50"
                )}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {language === lang.id && (
                  <Check className="h-4 w-4 ml-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold">{t('appearance.shortcuts')}</h2>
        </div>
        <div className="space-y-2">
          <ShortcutRow keys={['⌘', 'K']} action={t('shortcuts.commandPalette')} />
          <ShortcutRow keys={['⌘', 'Enter']} action={t('shortcuts.sendMessage')} />
          <ShortcutRow keys={['⌘', ',']} action={t('shortcuts.openSettings')} />
          <ShortcutRow keys={['Esc']} action={t('shortcuts.closeModal')} />
        </div>
      </section>

      {/* About */}
      <section className="p-4 rounded-xl border border-border bg-gradient-to-br from-cyan-500/5 to-emerald-500/5">
        <h3 className="font-medium mb-2">{t('appearance.about')}</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{t('appearance.version')}: 0.1.0</p>
          <p>A companion interface for Unreal Companion</p>
          <a 
            href="https://github.com/your-repo/unreal-companion" 
            target="_blank"
            className="text-cyan-400 hover:underline flex items-center gap-1 mt-2"
          >
            View on GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>
    </div>
  )
}
