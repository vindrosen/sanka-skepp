import { ACHIEVEMENTS } from '../../state/achievements'
import { useTranslation } from '../../i18n/useTranslation'
import { useGame } from '../../state/gameStore'
import { formatDuration, formatPercent } from '../../utils/format'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Resultatskärmen efter en avgjord match. */
export function ResultScreen() {
  const { t } = useTranslation()
  const mode = useGame((s) => s.mode)
  const winner = useGame((s) => s.winner)
  const players = useGame((s) => s.players)
  const matchDurationMs = useGame((s) => s.matchDurationMs)
  const newAchievements = useGame((s) => s.newAchievements)
  const playAgain = useGame((s) => s.playAgain)
  const goTo = useGame((s) => s.goTo)

  const iWon = winner === 'p1'
  const title =
    mode === 'twoPlayer'
      ? t('winnerIs', { name: winner === 'p1' ? t('player1') : t('player2') })
      : iWon
        ? t('victory')
        : t('defeat')
  const subtitle =
    mode === 'twoPlayer'
      ? t('resultAllSunkName', { name: winner === 'p1' ? t('player1') : t('player2') })
      : iWon
        ? t('resultAllSunk')
        : t('resultAllSunkLoss')

  // Statistiken visas för vinnaren i 2P-läget, annars för spelaren.
  const shown = mode === 'twoPlayer' ? players[winner ?? 'p1'] : players.p1

  const rows: [string, string][] = [
    [t('shots'), String(shown.shotsFired)],
    [t('hits'), String(shown.shotsHit)],
    [t('accuracy'), formatPercent(shown.shotsHit, shown.shotsFired)],
    [t('sunkShips'), `${shown.shipsSunk}/5`],
    [t('duration'), formatDuration(matchDurationMs)],
  ]

  const positive = mode === 'twoPlayer' || iWon

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="glass panel-in w-full max-w-sm overflow-hidden">
        <div className={`p-6 text-center ${positive ? '' : 'saturate-75'}`}>
          <GameIcon
            name={positive ? 'trophy' : 'explosion'}
            fallback={positive ? '🏆' : '💥'}
            className={`mx-auto mb-3 h-20 w-20 text-6xl ${positive ? 'trophy-glow' : ''}`}
          />
          <h1
            className={`neon-title mb-1 text-4xl font-black tracking-wide ${
              positive ? 'text-[var(--gold)]' : 'text-[var(--danger)]'
            }`}
          >
            {title}
          </h1>
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        </div>

        {/* Matchstatistik */}
        <div className="mx-6 mb-4 divide-y divide-[var(--panel-border)] rounded-lg border border-[var(--panel-border)] bg-black/15">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="text-[var(--muted)]">{label}</span>
              <span className="font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* Nya prestationer */}
        {newAchievements.length > 0 && (
          <div className="mx-6 mb-4">
            <div className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-[var(--gold)]">
              {t('newAchievement')}
            </div>
            <div className="flex flex-col gap-2">
              {newAchievements.map((id) => {
                const def = ACHIEVEMENTS.find((a) => a.id === id)!
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-lg border border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.08)] px-3 py-2"
                  >
                    <GameIcon name="medal" fallback="🥇" className="h-8 w-8 text-2xl" />
                    <div>
                      <div className="text-sm font-bold text-[var(--gold)]">{t(def.titleKey)}</div>
                      <div className="text-xs text-[var(--muted)]">{t(def.descKey)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 p-6 pt-2">
          <NeonButton className="flex-1" onClick={() => goTo('menu')}>
            <GameIcon name="home" fallback="🏠" className="h-4 w-4" />
            {t('backToMenu')}
          </NeonButton>
          <NeonButton variant="primary" className="flex-1" onClick={playAgain}>
            {t('playAgain')}
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
