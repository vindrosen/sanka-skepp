import { useTranslation } from '../../i18n/useTranslation'
import { useGame } from '../../state/gameStore'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Skärm mellan turerna i tvåspelarläget så att motståndaren inte ser brädet. */
export function HandoverScreen() {
  const { t } = useTranslation()
  const handoverTarget = useGame((s) => s.handoverTarget)
  const continueHandover = useGame((s) => s.continueHandover)

  const name = handoverTarget === 'p1' ? t('player1') : t('player2')

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-4">
      <div className="glass panel-in w-full max-w-sm p-8 text-center">
        <GameIcon name="sonar" fallback="🔄" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="neon-title mb-2 text-2xl font-bold">{t('handoverTitle')}</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">{t('handoverBody', { name })}</p>
        <NeonButton variant="primary" size="lg" className="w-full" onClick={continueHandover}>
          {t('handoverContinue')}
        </NeonButton>
      </div>
    </div>
  )
}
