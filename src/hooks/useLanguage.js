import { useEffect, useCallback } from 'react'
import { useStore } from './useStore'
import { en, fr } from '../i18n/translations'

const translations = { en, fr }

export function useLanguage() {
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => setLanguage(language === 'en' ? 'fr' : 'en')

  const t = useCallback(
    (key, ...args) => {
      const value = translations[language]?.[key] ?? translations.en[key] ?? key
      return typeof value === 'function' ? value(...args) : value
    },
    [language]
  )

  return { language, toggleLanguage, t }
}
