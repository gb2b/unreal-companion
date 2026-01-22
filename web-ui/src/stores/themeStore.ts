import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================
// GENRE-BASED THEME SYSTEM
// ============================================

export type ThemePreset = 
  | 'cyber'      // Default: Cyberpunk/Sci-Fi - Dark with cyan/emerald neons
  | 'fantasy'    // Adventure/RPG - Parchment, gold, warm browns
  | 'horror'     // Horror/Survival - Dark red, blood, shadows
  | 'nature'     // Simulation/Farming - Soft greens, earth tones
  | 'arcade'     // Puzzle/Casual - Bright, playful, colorful
  | 'military'   // FPS/Strategy - Olive, tactical, muted
  | 'noir'       // Mystery/Detective - Black & white, high contrast
  | 'retro'      // Retro/Pixel - CRT glow, 8-bit colors
  | 'custom'     // User-defined colors

export interface ThemeColors {
  // Core colors (HSL values without hsl())
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  border: string
  
  // Theme-specific gradients and effects
  gradientFrom: string
  gradientTo: string
  glowColor: string
  
  // Optional decorative elements
  pattern?: 'none' | 'scanlines' | 'parchment' | 'grid' | 'noise' | 'dots'
  fontFamily?: string
}

export interface ThemeConfig {
  id: ThemePreset
  name: string
  description: string
  emoji: string
  colors: ThemeColors
  suggestedGenres: string[]
}

// ============================================
// THEME PRESETS
// ============================================

export const THEME_PRESETS: Record<ThemePreset, ThemeConfig> = {
  cyber: {
    id: 'cyber',
    name: 'Cyber Mint',
    description: 'Futuristic neon aesthetic with cyan and emerald accents',
    emoji: '🌐',
    suggestedGenres: ['Cyberpunk', 'Sci-Fi', 'Space', 'Tech'],
    colors: {
      background: '220 20% 4%',
      foreground: '180 10% 95%',
      card: '220 20% 7%',
      cardForeground: '180 10% 95%',
      primary: '173 80% 50%',
      primaryForeground: '220 20% 4%',
      secondary: '220 15% 12%',
      secondaryForeground: '180 10% 95%',
      muted: '220 15% 12%',
      mutedForeground: '220 10% 50%',
      accent: '160 84% 45%',
      accentForeground: '220 20% 4%',
      border: '220 15% 15%',
      gradientFrom: '173 80% 50%',
      gradientTo: '160 84% 45%',
      glowColor: '173 80% 50%',
      pattern: 'scanlines',
    }
  },
  
  fantasy: {
    id: 'fantasy',
    name: 'Ancient Parchment',
    description: 'Warm, medieval aesthetic with gold and brown tones',
    emoji: '📜',
    suggestedGenres: ['RPG', 'Adventure', 'Fantasy', 'Medieval'],
    colors: {
      background: '35 25% 8%',
      foreground: '40 30% 90%',
      card: '35 20% 12%',
      cardForeground: '40 30% 90%',
      primary: '42 87% 55%',
      primaryForeground: '35 25% 8%',
      secondary: '35 15% 18%',
      secondaryForeground: '40 30% 90%',
      muted: '35 15% 15%',
      mutedForeground: '35 20% 50%',
      accent: '28 80% 52%',
      accentForeground: '35 25% 8%',
      border: '35 20% 20%',
      gradientFrom: '42 87% 55%',
      gradientTo: '28 80% 52%',
      glowColor: '42 87% 55%',
      pattern: 'parchment',
      fontFamily: 'Georgia, serif',
    }
  },
  
  horror: {
    id: 'horror',
    name: 'Blood Moon',
    description: 'Dark and ominous with deep reds and shadows',
    emoji: '🩸',
    suggestedGenres: ['Horror', 'Survival', 'Dark Fantasy', 'Thriller'],
    colors: {
      background: '0 10% 4%',
      foreground: '0 5% 85%',
      card: '0 10% 7%',
      cardForeground: '0 5% 85%',
      primary: '0 72% 50%',
      primaryForeground: '0 0% 100%',
      secondary: '0 10% 12%',
      secondaryForeground: '0 5% 85%',
      muted: '0 10% 12%',
      mutedForeground: '0 10% 45%',
      accent: '350 80% 45%',
      accentForeground: '0 0% 100%',
      border: '0 15% 15%',
      gradientFrom: '0 72% 50%',
      gradientTo: '350 80% 45%',
      glowColor: '0 72% 50%',
      pattern: 'noise',
    }
  },
  
  nature: {
    id: 'nature',
    name: 'Forest Grove',
    description: 'Calm and organic with natural greens and earth tones',
    emoji: '🌿',
    suggestedGenres: ['Simulation', 'Farming', 'Cozy', 'Nature'],
    colors: {
      background: '140 15% 6%',
      foreground: '80 20% 90%',
      card: '140 12% 10%',
      cardForeground: '80 20% 90%',
      primary: '142 55% 45%',
      primaryForeground: '140 15% 6%',
      secondary: '140 10% 15%',
      secondaryForeground: '80 20% 90%',
      muted: '140 10% 14%',
      mutedForeground: '100 15% 45%',
      accent: '80 50% 50%',
      accentForeground: '140 15% 6%',
      border: '140 12% 18%',
      gradientFrom: '142 55% 45%',
      gradientTo: '80 50% 50%',
      glowColor: '142 55% 45%',
      pattern: 'dots',
    }
  },
  
  arcade: {
    id: 'arcade',
    name: 'Neon Arcade',
    description: 'Vibrant and playful with bright pinks and purples',
    emoji: '🕹️',
    suggestedGenres: ['Puzzle', 'Casual', 'Party', 'Arcade'],
    colors: {
      background: '280 20% 6%',
      foreground: '300 20% 95%',
      card: '280 15% 10%',
      cardForeground: '300 20% 95%',
      primary: '320 80% 60%',
      primaryForeground: '280 20% 6%',
      secondary: '280 15% 15%',
      secondaryForeground: '300 20% 95%',
      muted: '280 12% 14%',
      mutedForeground: '280 15% 50%',
      accent: '260 75% 65%',
      accentForeground: '280 20% 6%',
      border: '280 15% 18%',
      gradientFrom: '320 80% 60%',
      gradientTo: '260 75% 65%',
      glowColor: '320 80% 60%',
      pattern: 'grid',
    }
  },
  
  military: {
    id: 'military',
    name: 'Tactical Ops',
    description: 'Muted military aesthetic with olive and tactical colors',
    emoji: '🎖️',
    suggestedGenres: ['FPS', 'Strategy', 'Military', 'Tactical'],
    colors: {
      background: '100 10% 5%',
      foreground: '60 10% 85%',
      card: '100 8% 9%',
      cardForeground: '60 10% 85%',
      primary: '80 40% 40%',
      primaryForeground: '60 10% 95%',
      secondary: '100 8% 13%',
      secondaryForeground: '60 10% 85%',
      muted: '100 8% 12%',
      mutedForeground: '80 10% 45%',
      accent: '45 50% 45%',
      accentForeground: '100 10% 5%',
      border: '100 10% 16%',
      gradientFrom: '80 40% 40%',
      gradientTo: '45 50% 45%',
      glowColor: '80 40% 40%',
      pattern: 'none',
    }
  },
  
  noir: {
    id: 'noir',
    name: 'Film Noir',
    description: 'High contrast black and white with dramatic shadows',
    emoji: '🎬',
    suggestedGenres: ['Mystery', 'Detective', 'Noir', 'Thriller'],
    colors: {
      background: '0 0% 3%',
      foreground: '0 0% 92%',
      card: '0 0% 7%',
      cardForeground: '0 0% 92%',
      primary: '0 0% 95%',
      primaryForeground: '0 0% 5%',
      secondary: '0 0% 12%',
      secondaryForeground: '0 0% 92%',
      muted: '0 0% 12%',
      mutedForeground: '0 0% 50%',
      accent: '45 10% 60%',
      accentForeground: '0 0% 5%',
      border: '0 0% 18%',
      gradientFrom: '0 0% 95%',
      gradientTo: '45 10% 60%',
      glowColor: '0 0% 80%',
      pattern: 'noise',
    }
  },
  
  retro: {
    id: 'retro',
    name: 'Retro CRT',
    description: 'Classic 8-bit aesthetic with CRT glow effect',
    emoji: '👾',
    suggestedGenres: ['Retro', 'Pixel Art', 'Platformer', 'Classic'],
    colors: {
      background: '240 20% 5%',
      foreground: '120 100% 80%',
      card: '240 15% 8%',
      cardForeground: '120 100% 80%',
      primary: '120 100% 50%',
      primaryForeground: '240 20% 5%',
      secondary: '240 15% 12%',
      secondaryForeground: '120 100% 80%',
      muted: '240 12% 12%',
      mutedForeground: '120 30% 40%',
      accent: '60 100% 50%',
      accentForeground: '240 20% 5%',
      border: '240 15% 18%',
      gradientFrom: '120 100% 50%',
      gradientTo: '60 100% 50%',
      glowColor: '120 100% 50%',
      pattern: 'scanlines',
      fontFamily: 'monospace',
    }
  },
  
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Your personalized color scheme',
    emoji: '🎨',
    suggestedGenres: [],
    colors: {
      background: '220 20% 4%',
      foreground: '180 10% 95%',
      card: '220 20% 7%',
      cardForeground: '180 10% 95%',
      primary: '173 80% 50%',
      primaryForeground: '220 20% 4%',
      secondary: '220 15% 12%',
      secondaryForeground: '180 10% 95%',
      muted: '220 15% 12%',
      mutedForeground: '220 10% 50%',
      accent: '160 84% 45%',
      accentForeground: '220 20% 4%',
      border: '220 15% 15%',
      gradientFrom: '173 80% 50%',
      gradientTo: '160 84% 45%',
      glowColor: '173 80% 50%',
      pattern: 'none',
    }
  },
}

// ============================================
// GENRE TO THEME MAPPING
// ============================================

export const GENRE_THEME_SUGGESTIONS: Record<string, ThemePreset> = {
  // Sci-Fi / Tech
  'cyberpunk': 'cyber',
  'sci-fi': 'cyber',
  'space': 'cyber',
  'tech': 'cyber',
  'mecha': 'cyber',
  
  // Fantasy / RPG
  'rpg': 'fantasy',
  'fantasy': 'fantasy',
  'adventure': 'fantasy',
  'medieval': 'fantasy',
  'jrpg': 'fantasy',
  
  // Horror
  'horror': 'horror',
  'survival': 'horror',
  'dark fantasy': 'horror',
  'thriller': 'horror',
  'zombie': 'horror',
  
  // Nature / Cozy
  'simulation': 'nature',
  'farming': 'nature',
  'cozy': 'nature',
  'nature': 'nature',
  'life sim': 'nature',
  
  // Casual / Arcade
  'puzzle': 'arcade',
  'casual': 'arcade',
  'party': 'arcade',
  'arcade': 'arcade',
  'rhythm': 'arcade',
  
  // Military / Tactical
  'fps': 'military',
  'shooter': 'military',
  'strategy': 'military',
  'military': 'military',
  'tactical': 'military',
  
  // Mystery / Noir
  'mystery': 'noir',
  'detective': 'noir',
  'noir': 'noir',
  'visual novel': 'noir',
  
  // Retro
  'retro': 'retro',
  'pixel art': 'retro',
  'platformer': 'retro',
  '8-bit': 'retro',
  'roguelike': 'retro',
}

// ============================================
// STORE
// ============================================

interface ThemeStore {
  currentTheme: ThemePreset
  customColors: ThemeColors
  autoThemeFromGenre: boolean
  
  // Actions
  setTheme: (theme: ThemePreset) => void
  setCustomColors: (colors: Partial<ThemeColors>) => void
  setAutoThemeFromGenre: (enabled: boolean) => void
  suggestThemeForGenre: (genre: string) => ThemePreset
  applyTheme: () => void
  resetToDefault: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentTheme: 'cyber',
      customColors: { ...THEME_PRESETS.cyber.colors },
      autoThemeFromGenre: true,
      
      setTheme: (theme) => {
        set({ currentTheme: theme })
        get().applyTheme()
      },
      
      setCustomColors: (colors) => {
        set((state) => ({
          customColors: { ...state.customColors, ...colors },
          currentTheme: 'custom'
        }))
        get().applyTheme()
      },
      
      setAutoThemeFromGenre: (enabled) => {
        set({ autoThemeFromGenre: enabled })
      },
      
      suggestThemeForGenre: (genre) => {
        const normalizedGenre = genre.toLowerCase().trim()
        return GENRE_THEME_SUGGESTIONS[normalizedGenre] || 'cyber'
      },
      
      applyTheme: () => {
        const { currentTheme, customColors } = get()
        const colors = currentTheme === 'custom' 
          ? customColors 
          : THEME_PRESETS[currentTheme].colors
        
        const root = document.documentElement
        
        // Apply CSS variables
        root.style.setProperty('--background', colors.background)
        root.style.setProperty('--foreground', colors.foreground)
        root.style.setProperty('--card', colors.card)
        root.style.setProperty('--card-foreground', colors.cardForeground)
        root.style.setProperty('--primary', colors.primary)
        root.style.setProperty('--primary-foreground', colors.primaryForeground)
        root.style.setProperty('--secondary', colors.secondary)
        root.style.setProperty('--secondary-foreground', colors.secondaryForeground)
        root.style.setProperty('--muted', colors.muted)
        root.style.setProperty('--muted-foreground', colors.mutedForeground)
        root.style.setProperty('--accent', colors.accent)
        root.style.setProperty('--accent-foreground', colors.accentForeground)
        root.style.setProperty('--border', colors.border)
        root.style.setProperty('--input', colors.border)
        root.style.setProperty('--ring', colors.primary)
        
        // Theme-specific
        root.style.setProperty('--gradient-from', colors.gradientFrom)
        root.style.setProperty('--gradient-to', colors.gradientTo)
        root.style.setProperty('--glow-color', colors.glowColor)
        
        // Font family
        if (colors.fontFamily) {
          root.style.setProperty('--font-family', colors.fontFamily)
        } else {
          root.style.removeProperty('--font-family')
        }
        
        // Pattern class
        root.setAttribute('data-theme-pattern', colors.pattern || 'none')
        root.setAttribute('data-theme', currentTheme)
      },
      
      resetToDefault: () => {
        set({ 
          currentTheme: 'cyber',
          customColors: { ...THEME_PRESETS.cyber.colors }
        })
        get().applyTheme()
      },
    }),
    {
      name: 'theme-store',
    }
  )
)

// Apply theme on store rehydration
if (typeof window !== 'undefined') {
  // Wait for store to be ready, then apply theme
  setTimeout(() => {
    useThemeStore.getState().applyTheme()
  }, 0)
}

// Helper to get current theme config
export function getCurrentThemeConfig(): ThemeConfig {
  const { currentTheme, customColors } = useThemeStore.getState()
  if (currentTheme === 'custom') {
    return {
      ...THEME_PRESETS.custom,
      colors: customColors
    }
  }
  return THEME_PRESETS[currentTheme]
}
