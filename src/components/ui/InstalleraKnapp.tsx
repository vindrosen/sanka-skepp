import { useEffect, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { NeonButton } from './NeonButton'

/** Chromiums installationshändelse saknas i lib.dom. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Installationsknappen i menyn.
 *
 * Manifestet ensamt ger bara webbläsarens egen prompt, begravd i en meny.
 * Knappen finns inte alls förrän Chromium säger att installation är möjlig,
 * och aldrig i ett redan installerat fönster. Safari fyrar aldrig händelsen,
 * så iOS får en textrad i stället.
 */
export function InstalleraKnapp() {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const installerad =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (installerad) return
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      setIos(true)
      return
    }

    const fanga = (handelse: Event) => {
      // Utan preventDefault visar Chrome sin egen ruta ovanpå appens knapp.
      handelse.preventDefault()
      setPrompt(handelse as InstallPromptEvent)
    }
    const installerades = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', fanga)
    window.addEventListener('appinstalled', installerades)
    return () => {
      window.removeEventListener('beforeinstallprompt', fanga)
      window.removeEventListener('appinstalled', installerades)
    }
  }, [])

  if (ios) {
    return <p className="mt-3 text-center text-xs text-[var(--muted)]">{t('installIos')}</p>
  }
  if (!prompt) return null

  return (
    <NeonButton
      size="sm"
      className="mt-3 w-full"
      onClick={async () => {
        await prompt.prompt()
        await prompt.userChoice
        // Händelsen är engångs: efter prompt() går den inte att återanvända.
        setPrompt(null)
      }}
    >
      {t('installApp')}
    </NeonButton>
  )
}
