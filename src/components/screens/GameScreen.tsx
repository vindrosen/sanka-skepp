import { useEffect, useState } from 'react'
import { shipSprite } from '../../assets'
import { isSunk, shipsRemaining } from '../../game/engine'
import { SHIP_DEFS } from '../../game/constants'
import type { BoardState } from '../../game/types'
import { useTranslation } from '../../i18n/useTranslation'
import { useGame, type PlayerId } from '../../state/gameStore'
import { Board } from '../board/Board'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Liten rad med flottans fem fartyg; sänkta visas röda och nedtonade. */
function FleetStrip({ board, label }: { board: BoardState; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-1.5">
        {SHIP_DEFS.map((def) => {
          const ship = board.ships.find((s) => s.id === def.id)
          const sunk = ship ? isSunk(ship) : false
          return (
            <img
              key={def.id}
              src={shipSprite(def.id)}
              alt={def.id}
              draggable={false}
              className={`h-3.5 select-none object-contain transition-all sm:h-4 ${
                sunk ? 'opacity-45 brightness-75 saturate-0 hue-rotate-[320deg]' : ''
              }`}
              style={{ width: `${def.size * 0.7}rem`, filter: sunk ? 'sepia(1) saturate(4) hue-rotate(320deg) brightness(0.7)' : undefined }}
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Stridsskärmen: motståndarens vatten + egen flotta, tur-status och effekter. */
export function GameScreen() {
  const { t } = useTranslation()
  const mode = useGame((s) => s.mode)
  const difficulty = useGame((s) => s.difficulty)
  const players = useGame((s) => s.players)
  const current = useGame((s) => s.current)
  const phase = useGame((s) => s.phase)
  const aiThinking = useGame((s) => s.aiThinking)
  const lastEvent = useGame((s) => s.lastEvent)
  const fire = useGame((s) => s.fire)
  const abandonMatch = useGame((s) => s.abandonMatch)
  const [confirmLeave, setConfirmLeave] = useState(false)

  // Bannern visas bara för färska händelser och döljs sedan av en timer,
  // så att den inte blir kvar när animationer är avstängda eller efter
  // en överlämning i tvåspelarläget.
  const [bannerSeq, setBannerSeq] = useState<number | null>(null)
  useEffect(() => {
    if (!lastEvent || Date.now() - lastEvent.at > 1800) return
    setBannerSeq(lastEvent.seq)
    const id = setTimeout(() => setBannerSeq(null), 1700)
    return () => clearTimeout(id)
  }, [lastEvent])

  // Perspektiv: i AI-läge är du alltid p1; i 2P-läge den vars tur det är.
  const myId: PlayerId = mode === 'vsAi' ? 'p1' : current
  const enemyId: PlayerId = myId === 'p1' ? 'p2' : 'p1'
  const myBoard = players[myId].board
  const enemyBoard = players[enemyId].board

  const myTurn = phase === 'battle' && current === myId && !aiThinking

  const playerName = (id: PlayerId) =>
    mode === 'vsAi' ? (id === 'p1' ? t('you') : t('computer')) : id === 'p1' ? t('player1') : t('player2')

  const turnText =
    phase !== 'battle'
      ? ''
      : mode === 'vsAi'
        ? aiThinking || current === 'p2'
          ? t('aiThinking')
          : t('yourTurn')
        : t('playersTurn', { name: playerName(current) })

  // Bannertext för senaste skottet.
  const bannerText = lastEvent
    ? lastEvent.result === 'sunk'
      ? t('sunk', { ship: t(lastEvent.sunkShipId!) })
      : lastEvent.result === 'hit'
        ? t('hit')
        : t('miss')
    : null

  const difficultyLabel =
    difficulty === 'easy' ? t('difficultyEasy') : difficulty === 'medium' ? t('difficultyMedium') : t('difficultyHard')

  /** Skakar brädet som just träffades. */
  const shakeKeyFor = (owner: PlayerId) =>
    lastEvent && lastEvent.target === owner && lastEvent.result !== 'miss' ? `shake-${lastEvent.seq}` : 'idle'

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col gap-3 p-3 sm:p-4">
      {/* Statusrad */}
      <div className="glass panel-in flex items-center justify-between gap-2 px-3 py-2">
        <NeonButton size="sm" onClick={() => setConfirmLeave(true)} aria-label={t('backToMenu')}>
          <GameIcon name="home" fallback="🏠" className="h-4 w-4" />
        </NeonButton>
        <div className="flex items-center gap-2">
          {mode === 'vsAi' && aiThinking && (
            <span className="radar-sweep inline-block h-4 w-4 rounded-full border border-[var(--neon)] border-t-transparent" />
          )}
          <span className={`text-sm font-bold sm:text-base ${myTurn ? 'text-[var(--neon-strong)]' : 'text-[var(--hit)]'}`}>
            {turnText}
          </span>
        </div>
        <span className="rounded-md border border-[var(--panel-border)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
          {mode === 'vsAi' ? difficultyLabel : '2P'}
        </span>
      </div>

      {/* Händelsebanner */}
      {bannerText && bannerSeq === lastEvent?.seq && (
        <div key={lastEvent!.seq} className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center">
          <div
            className={`banner-pop glass px-6 py-2 text-xl font-black tracking-wider sm:text-2xl ${
              lastEvent!.result === 'miss' ? 'text-[var(--neon-strong)]' : 'text-[var(--hit)]'
            }`}
          >
            {bannerText}
          </div>
        </div>
      )}

      {/* Brädena */}
      <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Motståndarens vatten */}
        <div className="glass panel-in p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--hit)]">
              {t('enemyFleet')} · {playerName(enemyId)}
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {t('shipsLeft')}: <b className="text-[var(--text)]">{shipsRemaining(enemyBoard)}</b>
            </span>
          </div>
          <div key={shakeKeyFor(enemyId)} className="board-shake">
            <Board
              board={enemyBoard}
              revealSunk
              interactive={myTurn}
              onCellClick={fire}
              lastEvent={lastEvent && lastEvent.target === enemyId ? lastEvent : null}
            />
          </div>
          <div className="mt-2">
            <FleetStrip board={enemyBoard} label={playerName(enemyId)} />
          </div>
        </div>

        {/* Egen flotta */}
        <div className="glass panel-in mx-auto w-full max-w-sm p-3 sm:p-4 lg:max-w-none">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--neon-strong)]">
              {t('yourFleet')} · {playerName(myId)}
            </h2>
            <span className="text-xs text-[var(--muted)]">
              {t('shipsLeft')}: <b className="text-[var(--text)]">{shipsRemaining(myBoard)}</b>
            </span>
          </div>
          <div key={shakeKeyFor(myId)} className="board-shake">
            <Board
              board={myBoard}
              showShips
              lastEvent={lastEvent && lastEvent.target === myId ? lastEvent : null}
              compact
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <FleetStrip board={myBoard} label={playerName(myId)} />
            <span className="text-xs text-[var(--muted)]">
              {t('shots')}: <b className="text-[var(--text)]">{players[myId].shotsFired}</b> · {t('hits')}:{' '}
              <b className="text-[var(--text)]">{players[myId].shotsHit}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Bekräfta avbryt */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass panel-in w-full max-w-sm p-6 text-center">
            <h2 className="mb-2 text-lg font-bold">{t('abandonMatch')}</h2>
            <p className="mb-4 text-sm text-[var(--muted)]">{t('abandonBody')}</p>
            <div className="flex justify-center gap-3">
              <NeonButton onClick={() => setConfirmLeave(false)}>{t('abandonCancel')}</NeonButton>
              <NeonButton variant="danger" onClick={abandonMatch}>
                {t('abandonConfirm')}
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
