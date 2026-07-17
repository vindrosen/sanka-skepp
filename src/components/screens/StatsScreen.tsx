import { useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { useAchievements } from '../../state/achievements'
import { useGame } from '../../state/gameStore'
import { useStats } from '../../state/statsStore'
import { formatDuration, formatPercent } from '../../utils/format'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Statistikskärmen: livstidssiffror för matcher mot datorn. */
export function StatsScreen() {
  const { t } = useTranslation()
  const goTo = useGame((s) => s.goTo)
  const stats = useStats()
  const resetAchievements = useAchievements((s) => s.reset)
  const [confirmReset, setConfirmReset] = useState(false)

  const rows: [string, string][] = [
    [t('statsGames'), String(stats.gamesPlayed)],
    [t('statsWins'), String(stats.wins)],
    [t('statsLosses'), String(stats.losses)],
    [t('statsWinRate'), formatPercent(stats.wins, stats.gamesPlayed)],
    [t('statsHitRate'), formatPercent(stats.shotsHit, stats.shotsFired)],
    [t('statsShipsSunk'), String(stats.shipsSunk)],
    [t('statsBestStreak'), String(stats.bestStreak)],
    [t('statsShortest'), stats.shortestMatchMs > 0 ? formatDuration(stats.shortestMatchMs) : '–'],
    [t('statsLongest'), stats.longestMatchMs > 0 ? formatDuration(stats.longestMatchMs) : '–'],
  ]

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="glass panel-in w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <NeonButton size="sm" onClick={() => goTo('menu')} aria-label={t('back')}>
            <GameIcon name="back" fallback="←" className="h-4 w-4" />
          </NeonButton>
          <h1 className="neon-title text-xl font-bold">{t('statsTitle')}</h1>
          <GameIcon name="stats" fallback="📊" className="h-6 w-6" />
        </div>

        {stats.gamesPlayed === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">{t('statsEmpty')}</p>
        ) : (
          <div className="divide-y divide-[var(--panel-border)] rounded-lg border border-[var(--panel-border)] bg-black/15">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-[var(--muted)]">{label}</span>
                <span className="font-bold">{value}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-center text-xs text-[var(--muted)]">{t('statsNote')}</p>

        {stats.gamesPlayed > 0 && (
          <NeonButton size="sm" variant="danger" className="mt-4 w-full" onClick={() => setConfirmReset(true)}>
            {t('resetStats')}
          </NeonButton>
        )}

        {confirmReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="glass panel-in w-full max-w-sm p-6 text-center">
              <p className="mb-4 text-sm">{t('resetStatsConfirm')}</p>
              <div className="flex justify-center gap-3">
                <NeonButton onClick={() => setConfirmReset(false)}>{t('back')}</NeonButton>
                <NeonButton
                  variant="danger"
                  onClick={() => {
                    stats.reset()
                    resetAchievements()
                    setConfirmReset(false)
                  }}
                >
                  {t('resetStats')}
                </NeonButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
