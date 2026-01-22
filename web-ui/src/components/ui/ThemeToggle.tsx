import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

// Legacy component - kept for compatibility
// Theme is now managed by genre-based themes in themeStore

type ThemeMode = 'light' | 'dark' | 'system'

export function ThemeToggle() {
  // For now, dark mode only - genre themes are dark-mode based
  const currentMode: ThemeMode = 'dark'

  const options = [
    { id: 'light' as const, icon: Sun, label: 'Light', disabled: true },
    { id: 'dark' as const, icon: Moon, label: 'Dark', disabled: false },
    { id: 'system' as const, icon: Monitor, label: 'System', disabled: true },
  ]

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
      {options.map(({ id, icon: Icon, label, disabled }) => (
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
          title={disabled ? `${label} (coming soon)` : label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
