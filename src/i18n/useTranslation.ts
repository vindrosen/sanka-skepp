import { useCallback } from 'react'
import { useSettings } from '../state/settingsStore'
import { interpolate, translations, type TranslationKey } from './translations'

/** Hook som ger aktuell översättningsfunktion utifrån valt språk. */
export function useTranslation() {
  const language = useSettings((s) => s.language)
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      interpolate(translations[language][key], params),
    [language],
  )
  return { t, language }
}
