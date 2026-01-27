import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Language, translations } from './translations'

interface I18nStore {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
}

export const useI18n = create<I18nStore>()(
  persist(
    (set, get) => ({
      language: 'en',

      setLanguage: (language) => set({ language }),

      t: (key: string, params?: Record<string, string>) => {
        const { language } = get()
        const translation = translations[language]
        let result = (translation as Record<string, string>)[key] || key

        // Replace {{variable}} with values from params
        if (params) {
          Object.entries(params).forEach(([paramKey, value]) => {
            result = result.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), value)
          })
        }

        return result
      },
    }),
    {
      name: 'i18n-store',
      partialize: (state) => ({ language: state.language }),
    }
  )
)

// Hook for getting translations
export function useTranslation() {
  const { language, setLanguage, t } = useI18n()
  return { language, setLanguage, t }
}
