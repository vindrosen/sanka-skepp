import { useState } from 'react'
import { asset } from '../../assets'
import type { Difficulty } from '../../game/types'
import { useTranslation } from '../../i18n/useTranslation'
import { useGame } from '../../state/gameStore'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Startsidan: hjältebild, titel och huvudmenyn. */
export function MenuScreen() {
  const { t } = useTranslation()
  const goTo = useGame((s) => s.goTo)
  const startVsAi = useGame((s) => s.startVsAi)
  const startTwoPlayer = useGame((s) => s.startTwoPlayer)
  const [pickDifficulty, setPickDifficulty] = useState(false)

  const difficulties: { id: Difficulty; label: string; desc: string }[] = [
    { id: 'easy', label: t('difficultyEasy'), desc: t('difficultyEasyDesc') },
    { id: 'medium', label: t('difficultyMedium'), desc: t('difficultyMediumDesc') },
    { id: 'hard', label: t('difficultyHard'), desc: t('difficultyHardDesc') },
  ]

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="glass panel-in w-full max-w-md overflow-hidden">
        {/* Hjältebild med titel */}
        <div className="relative h-52 sm:h-64">
          <img
            src={asset('bg-menu.webp')}
            alt=""
            className="h-full w-full object-cover object-center"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--panel-solid)] via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-2 text-center">
            <h1 className="neon-title text-4xl font-black tracking-[0.08em] text-[var(--text)] sm:text-5xl">
              {t('appTitle').toUpperCase()}
            </h1>
            <p className="mt-1 text-xs font-semibold tracking-[0.5em] text-[var(--gold)]">
              ★ {t('appSubtitle').toUpperCase()} ★
            </p>
          </div>
        </div>

        {/* Menyknappar */}
        <div className="flex flex-col gap-3 p-5">
          <NeonButton variant="primary" size="lg" onClick={() => setPickDifficulty(true)}>
            <GameIcon name="radar" fallback="🎯" className="h-6 w-6" />
            {t('menuVsAi')}
          </NeonButton>
          <NeonButton size="lg" onClick={startTwoPlayer}>
            <GameIcon name="sonar" fallback="👥" className="h-6 w-6" />
            {t('menuTwoPlayer')}
          </NeonButton>
          <div className="grid grid-cols-3 gap-3">
            <NeonButton onClick={() => goTo('settings')} className="flex-col !gap-1 py-3 text-sm">
              <GameIcon name="settings" fallback="⚙️" className="h-7 w-7" />
              {t('menuSettings')}
            </NeonButton>
            <NeonButton onClick={() => goTo('stats')} className="flex-col !gap-1 py-3 text-sm">
              <GameIcon name="stats" fallback="📊" className="h-7 w-7" />
              {t('menuStats')}
            </NeonButton>
            <NeonButton onClick={() => goTo('achievements')} className="flex-col !gap-1 py-3 text-sm">
              <GameIcon name="trophy" fallback="🏆" className="h-7 w-7" />
              {t('menuAchievements')}
            </NeonButton>
          </div>
        </div>
      </div>

      {/* Svårighetsval */}
      {pickDifficulty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPickDifficulty(false)}
        >
          <div className="glass panel-in w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="neon-title mb-4 text-center text-xl font-bold">{t('chooseDifficulty')}</h2>
            <div className="flex flex-col gap-3">
              {difficulties.map((d) => (
                <NeonButton
                  key={d.id}
                  variant={d.id === 'hard' ? 'danger' : d.id === 'medium' ? 'primary' : 'default'}
                  size="lg"
                  onClick={() => startVsAi(d.id)}
                  className="justify-between"
                >
                  <span>{d.label}</span>
                  <span className="text-xs font-normal text-[var(--muted)]">{d.desc}</span>
                </NeonButton>
              ))}
            </div>
            <NeonButton size="sm" className="mt-4 w-full" onClick={() => setPickDifficulty(false)}>
              {t('back')}
            </NeonButton>
          </div>
        </div>
      )}
    </div>
  )
}
