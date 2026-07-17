import { useTranslation } from '../../i18n/useTranslation'
import { ACHIEVEMENTS } from '../../state/achievements'
import { useAchievements } from '../../state/achievements'
import { useGame } from '../../state/gameStore'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Emoji-reserv per emblemtyp om PNG-ikonen saknas. */
const ICON_FALLBACK: Record<string, string> = {
  trophy: '🏆',
  medal: '🥇',
  star: '⭐',
  target: '🎯',
  skull: '💀',
  fire: '🔥',
  crown: '👑',
  anchor: '⚓',
}

/** Ikonfil per emblemtyp – pokal och medalj har egna genererade ikoner. */
const ICON_NAME: Record<string, string> = {
  trophy: 'trophy',
  medal: 'medal',
  star: 'medal',
  target: 'explosion',
  skull: 'explosion',
  fire: 'explosion',
  crown: 'trophy',
  anchor: 'sonar',
}

/** Prestationsskärmen: alla emblem, upplåsta i guld och låsta nedtonade. */
export function AchievementsScreen() {
  const { t } = useTranslation()
  const goTo = useGame((s) => s.goTo)
  const unlocked = useAchievements((s) => s.unlocked)

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="glass panel-in w-full max-w-lg p-6">
        <div className="mb-2 flex items-center justify-between">
          <NeonButton size="sm" onClick={() => goTo('menu')} aria-label={t('back')}>
            <GameIcon name="back" fallback="←" className="h-4 w-4" />
          </NeonButton>
          <h1 className="neon-title text-xl font-bold">{t('achievementsTitle')}</h1>
          <GameIcon name="trophy" fallback="🏆" className="h-6 w-6" />
        </div>
        <p className="mb-5 text-center text-xs text-[var(--muted)]">
          {t('achievementsUnlocked', { n: unlockedCount, total: ACHIEVEMENTS.length })}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((def) => {
            const unlockedAt = unlocked[def.id]
            return (
              <div
                key={def.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  unlockedAt
                    ? 'border-[rgba(251,191,36,0.45)] bg-[rgba(251,191,36,0.08)] shadow-[0_0_16px_rgba(251,191,36,0.12)]'
                    : 'border-[var(--panel-border)] bg-black/15 opacity-60 grayscale'
                }`}
              >
                <GameIcon
                  name={ICON_NAME[def.icon]}
                  fallback={ICON_FALLBACK[def.icon]}
                  className="h-10 w-10 shrink-0 text-3xl"
                />
                <div className="min-w-0">
                  <div className={`text-sm font-bold ${unlockedAt ? 'text-[var(--gold)]' : ''}`}>
                    {t(def.titleKey)}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{t(def.descKey)}</div>
                  <div className="mt-0.5 text-[0.65rem] text-[var(--muted)]">
                    {unlockedAt ? new Date(unlockedAt).toLocaleDateString() : t('locked')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
