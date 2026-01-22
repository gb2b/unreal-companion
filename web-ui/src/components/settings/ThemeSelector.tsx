import { useState } from 'react'
import { Check, Palette, RotateCcw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  useThemeStore, 
  THEME_PRESETS, 
  ThemePreset,
  ThemeConfig 
} from '@/stores/themeStore'
import { cn } from '@/lib/utils'

export function ThemeSelector() {
  const { 
    currentTheme, 
    setTheme, 
    autoThemeFromGenre, 
    setAutoThemeFromGenre,
    resetToDefault 
  } = useThemeStore()
  
  const [hoveredTheme, setHoveredTheme] = useState<ThemePreset | null>(null)
  
  const themes = Object.values(THEME_PRESETS).filter(t => t.id !== 'custom')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose a visual theme that matches your game&apos;s genre
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetToDefault}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Auto theme toggle */}
      <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/30 transition-colors">
        <input
          type="checkbox"
          checked={autoThemeFromGenre}
          onChange={(e) => setAutoThemeFromGenre(e.target.checked)}
          className="sr-only"
        />
        <div className={cn(
          "w-10 h-6 rounded-full transition-colors relative",
          autoThemeFromGenre ? "bg-primary" : "bg-muted"
        )}>
          <div className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
            autoThemeFromGenre ? "translate-x-5" : "translate-x-1"
          )} />
        </div>
        <div className="flex-1">
          <p className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Auto-theme from genre
          </p>
          <p className="text-sm text-muted-foreground">
            Automatically suggest theme based on your game&apos;s genre
          </p>
        </div>
      </label>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme === theme.id}
            isHovered={hoveredTheme === theme.id}
            onSelect={() => setTheme(theme.id)}
            onHover={() => setHoveredTheme(theme.id)}
            onLeave={() => setHoveredTheme(null)}
          />
        ))}
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl border border-border bg-muted/30">
        <h4 className="text-sm font-medium mb-3">Preview</h4>
        <ThemePreview theme={hoveredTheme ? THEME_PRESETS[hoveredTheme] : THEME_PRESETS[currentTheme]} />
      </div>
    </div>
  )
}

function ThemeCard({
  theme,
  isActive,
  isHovered,
  onSelect,
  onHover,
  onLeave
}: {
  theme: ThemeConfig
  isActive: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "relative p-4 rounded-xl border-2 text-left transition-all",
        isActive 
          ? "border-primary shadow-lg" 
          : isHovered
          ? "border-primary/50"
          : "border-border hover:border-primary/30"
      )}
      style={{
        background: `hsl(${theme.colors.card})`
      }}
    >
      {/* Color preview bar */}
      <div 
        className="h-2 rounded-full mb-3"
        style={{
          background: `linear-gradient(90deg, hsl(${theme.colors.gradientFrom}), hsl(${theme.colors.gradientTo}))`
        }}
      />
      
      {/* Theme info */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{theme.emoji}</span>
        <span 
          className="font-medium text-sm"
          style={{ color: `hsl(${theme.colors.foreground})` }}
        >
          {theme.name}
        </span>
      </div>
      
      <p 
        className="text-xs line-clamp-2"
        style={{ color: `hsl(${theme.colors.mutedForeground})` }}
      >
        {theme.description}
      </p>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  )
}

function ThemePreview({ theme }: { theme: ThemeConfig }) {
  return (
    <div 
      className="p-4 rounded-lg"
      style={{ background: `hsl(${theme.colors.background})` }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Simulated sidebar */}
        <div 
          className="w-12 h-24 rounded-lg"
          style={{ background: `hsl(${theme.colors.card})`, border: `1px solid hsl(${theme.colors.border})` }}
        >
          <div className="p-2 space-y-2">
            <div 
              className="w-8 h-2 rounded"
              style={{ background: `hsl(${theme.colors.primary})` }}
            />
            <div 
              className="w-6 h-2 rounded"
              style={{ background: `hsl(${theme.colors.muted})` }}
            />
            <div 
              className="w-7 h-2 rounded"
              style={{ background: `hsl(${theme.colors.muted})` }}
            />
          </div>
        </div>
        
        {/* Simulated main content */}
        <div className="flex-1 space-y-2">
          <div 
            className="h-3 w-32 rounded"
            style={{ background: `linear-gradient(90deg, hsl(${theme.colors.gradientFrom}), hsl(${theme.colors.gradientTo}))` }}
          />
          <div 
            className="h-2 w-48 rounded"
            style={{ background: `hsl(${theme.colors.mutedForeground})`, opacity: 0.5 }}
          />
          <div className="flex gap-2 mt-3">
            <div 
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{ 
                background: `hsl(${theme.colors.primary})`,
                color: `hsl(${theme.colors.primaryForeground})`
              }}
            >
              Button
            </div>
            <div 
              className="px-3 py-1.5 rounded text-xs font-medium"
              style={{ 
                background: `hsl(${theme.colors.secondary})`,
                color: `hsl(${theme.colors.secondaryForeground})`
              }}
            >
              Secondary
            </div>
          </div>
        </div>
      </div>
      
      {/* Suggested genres */}
      {theme.suggestedGenres.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {theme.suggestedGenres.map((genre) => (
            <span
              key={genre}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ 
                background: `hsl(${theme.colors.primary} / 0.1)`,
                color: `hsl(${theme.colors.primary})`
              }}
            >
              {genre}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
