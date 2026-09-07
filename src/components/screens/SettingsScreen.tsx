import type { Language } from '../../i18n/translations'
import { useTranslation } from '../../i18n/useTranslation'
import { useGame } from '../../state/gameStore'
import { useSettings, type Theme } from '../../state/settingsStore'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'
import { Toggle } from '../ui/Toggle'

/** Segmentväljare med två alternativ (tema, språk). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[var(--panel-border)]">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`cursor-pointer px-3 py-1.5 text-sm font-semibold transition-colors ${
            value === option.id
              ? 'bg-[var(--neon)]/30 text-[var(--text)]'
              : 'bg-transparent text-[var(--muted)] hover:bg-[var(--neon)]/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Inställningsskärmen: ljud, animationer, tema och språk. */
export function SettingsScreen() {
  const { t } = useTranslation()
  const goTo = useGame((s) => s.goTo)
  const settings = useSettings()

  const rows: { icon: string; fallback: string; label: string; control: React.ReactNode }[] = [
    {
      icon: 'music',
      fallback: '🎵',
      label: t('settingsMusic'),
      control: <Toggle checked={settings.music} onChange={settings.setMusic} label={t('settingsMusic')} />,
    },
    {
      icon: 'sound',
      fallback: '🔊',
      label: t('settingsSfx'),
      control: <Toggle checked={settings.sfx} onChange={settings.setSfx} label={t('settingsSfx')} />,
    },
    {
      icon: 'explosion',
      fallback: '✨',
      label: t('settingsAnimations'),
      control: (
        <Toggle checked={settings.animations} onChange={settings.setAnimations} label={t('settingsAnimations')} />
      ),
    },
    {
      icon: 'sonar',
      fallback: '🌓',
      label: t('settingsTheme'),
      control: (
        <Segmented<Theme>
          value={settings.theme}
          onChange={settings.setTheme}
          options={[
            { id: 'dark', label: t('themeDark') },
            { id: 'light', label: t('themeLight') },
          ]}
        />
      ),
    },
    {
      icon: 'radar',
      fallback: '🌐',
      label: t('settingsLanguage'),
      control: (
        <Segmented<Language>
          value={settings.language}
          onChange={settings.setLanguage}
          options={[
            { id: 'sv', label: t('langSwedish') },
            { id: 'en', label: t('langEnglish') },
          ]}
        />
      ),
    },
  ]

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="glass panel-in w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <NeonButton size="sm" onClick={() => goTo('menu')} aria-label={t('back')}>
            <GameIcon name="back" fallback="←" className="h-4 w-4" />
          </NeonButton>
          <h1 className="neon-title text-xl font-bold">{t('settingsTitle')}</h1>
          <GameIcon name="settings" fallback="⚙️" className="h-6 w-6" />
        </div>
        <div className="flex flex-col divide-y divide-[var(--panel-border)]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <GameIcon name={row.icon} fallback={row.fallback} className="h-6 w-6 text-xl" />
                <span className="font-semibold">{row.label}</span>
              </div>
              {row.control}
            </div>
          ))}
        </div>
        <a
          href="kontakt.html"
          className="mt-3 block text-center text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"
        >
          {t('settingsContact')}
        </a>
      </div>
    </div>
  )
}
