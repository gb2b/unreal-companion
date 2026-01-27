import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslation } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'

// Legacy component - kept for compatibility
// Theme is now managed by genre-based themes in themeStore

type ThemeMode = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  const { t } = useTranslation()

  // For now, dark mode only - genre themes are dark-mode based
  const currentMode: ThemeMode = 'dark'

  const options = [
    { id: 'light' as const, icon: Sun, labelKey: 'theme.light', disabled: true },
    { id: 'dark' as const, icon: Moon, labelKey: 'theme.dark', disabled: false },
    { id: 'system' as const, icon: Monitor, labelKey: 'theme.system', disabled: true },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
      {options.map(({ id, icon: Icon, labelKey, disabled }) => {
        const label = t(labelKey)
        return (
          <button
            key={id}
            disabled={disabled}
            className={cn(
              "p-2 rounded-md transition-all",
              currentMode === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title={disabled ? `${label} ${t('theme.comingSoon')}` : label}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
