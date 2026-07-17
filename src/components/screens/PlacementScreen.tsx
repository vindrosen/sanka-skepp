import { useCallback, useEffect, useRef, useState } from 'react'
import { shipSprite } from '../../assets'
import { canPlaceShip, fleetComplete } from '../../game/board'
import { BOARD_SIZE, SHIP_DEFS } from '../../game/constants'
import type { Coord, Orientation, ShipId } from '../../game/types'
import { useTranslation } from '../../i18n/useTranslation'
import { useGame } from '../../state/gameStore'
import { Board, type GhostShip } from '../board/Board'
import { GameIcon } from '../ui/GameIcon'
import { NeonButton } from '../ui/NeonButton'

/** Pågående dragning av ett fartyg (från dockan eller brädet). */
interface DragState {
  id: ShipId
  size: number
  orientation: Orientation
  /** Vilken cell längs fartyget som greppats (0 = fören). */
  grabIndex: number
  /** Kom fartyget från brädet (ska döljas där under draget)? */
  fromBoard: boolean
  /** Aktuell ankarcell för förhandsvisningen, eller null utanför brädet. */
  anchor: Coord | null
  /** Startposition för att skilja klick (rotera) från drag. */
  startX: number
  startY: number
  moved: boolean
}

/** Placeringsskärmen: dra fartyg till brädet, rotera, slumpa, töm. */
export function PlacementScreen() {
  const { t } = useTranslation()
  const mode = useGame((s) => s.mode)
  const placingPlayer = useGame((s) => s.placingPlayer)
  const players = useGame((s) => s.players)
  const placeShip = useGame((s) => s.placeShip)
  const rotateShip = useGame((s) => s.rotateShip)
  const randomizeFleet = useGame((s) => s.randomizeFleet)
  const clearFleet = useGame((s) => s.clearFleet)
  const confirmPlacement = useGame((s) => s.confirmPlacement)
  const abandonMatch = useGame((s) => s.abandonMatch)

  const board = players[placingPlayer].board
  const unplaced = SHIP_DEFS.filter((def) => !board.ships.some((s) => s.id === def.id))
  const ready = fleetComplete(board.ships)

  const gridRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  /** Översätter en skärmpunkt till en cell på brädet. */
  const cellFromPoint = useCallback((x: number, y: number): Coord | null => {
    const el = gridRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const col = Math.floor(((x - r.left) / r.width) * BOARD_SIZE)
    const row = Math.floor(((y - r.top) / r.height) * BOARD_SIZE)
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null
    return { row, col }
  }, [])

  /** Räknar ut ankarcellen (fören) utifrån pekarcell + greppindex, inklämd på brädet. */
  const anchorFor = useCallback((state: DragState, hover: Coord): Coord => {
    const maxStart = BOARD_SIZE - state.size
    if (state.orientation === 'horizontal') {
      return { row: hover.row, col: Math.max(0, Math.min(maxStart, hover.col - state.grabIndex)) }
    }
    return { row: Math.max(0, Math.min(maxStart, hover.row - state.grabIndex)), col: hover.col }
  }, [])

  // Globala pekarlyssnare medan ett drag pågår.
  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const hover = cellFromPoint(e.clientX, e.clientY)
      setDrag((d) => {
        if (!d) return d
        const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8
        return { ...d, moved, anchor: hover ? anchorFor(d, hover) : null }
      })
    }
    const onUp = (e: PointerEvent) => {
      setDrag(null)
      const d = drag
      if (!d) return
      const hover = cellFromPoint(e.clientX, e.clientY)
      if (!d.moved && d.fromBoard) {
        // Klick utan drag på ett placerat fartyg = rotera.
        rotateShip(d.id)
        return
      }
      if (hover) {
        const anchor = anchorFor(d, hover)
        placeShip(d.id, anchor.row, anchor.col, d.orientation)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, anchorFor, cellFromPoint, placeShip, rotateShip])

  /** Startar drag från dockan. */
  function startDockDrag(defId: ShipId, size: number, e: React.PointerEvent) {
    e.preventDefault()
    setDrag({
      id: defId,
      size,
      orientation: 'horizontal',
      grabIndex: Math.floor((size - 1) / 2),
      fromBoard: false,
      anchor: null,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    })
  }

  /** Startar drag från ett redan placerat fartyg. */
  function startBoardDrag(shipId: ShipId, e: React.PointerEvent) {
    e.preventDefault()
    const ship = board.ships.find((s) => s.id === shipId)
    if (!ship) return
    const hover = cellFromPoint(e.clientX, e.clientY)
    const grabIndex = hover
      ? ship.orientation === 'horizontal'
        ? hover.col - ship.col
        : hover.row - ship.row
      : 0
    setDrag({
      id: ship.id,
      size: ship.size,
      orientation: ship.orientation,
      grabIndex: Math.max(0, Math.min(ship.size - 1, grabIndex)),
      fromBoard: true,
      anchor: { row: ship.row, col: ship.col },
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    })
  }

  // Ghost-förhandsvisning under drag.
  let ghost: GhostShip | null = null
  if (drag && drag.anchor) {
    const def = SHIP_DEFS.find((d) => d.id === drag.id)!
    ghost = {
      id: drag.id,
      size: drag.size,
      row: drag.anchor.row,
      col: drag.anchor.col,
      orientation: drag.orientation,
      valid: canPlaceShip(board.ships, def, drag.anchor.row, drag.anchor.col, drag.orientation, drag.id),
    }
  }

  const title =
    mode === 'twoPlayer'
      ? t('playerShipsTitle', { n: placingPlayer === 'p1' ? 1 : 2 })
      : t('placeYourShips')

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-3 sm:p-4">
      <div className="glass panel-in w-full max-w-3xl p-4 sm:p-6">
        {/* Rubrik */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <NeonButton size="sm" onClick={abandonMatch} aria-label={t('back')}>
            <GameIcon name="back" fallback="←" className="h-4 w-4" />
          </NeonButton>
          <h1 className="neon-title text-center text-lg font-bold sm:text-2xl">{title}</h1>
          <div className="w-12" />
        </div>
        <p className="mb-4 text-center text-xs text-[var(--muted)] sm:text-sm">{t('placeShipsHint')}</p>

        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Brädet */}
          <div className="mx-auto w-full max-w-md flex-1">
            <Board
              board={board}
              showShips
              ghost={ghost}
              hideShipId={drag?.fromBoard && drag.moved ? drag.id : null}
              onShipPointerDown={startBoardDrag}
              gridRef={gridRef}
            />
          </div>

          {/* Dockan med oplacerade fartyg */}
          <div className="flex flex-col gap-2 sm:w-52">
            {SHIP_DEFS.map((def) => {
              const placed = !unplaced.includes(def)
              return (
                <div
                  key={def.id}
                  className={`glass flex touch-none items-center gap-2 rounded-lg !border-[var(--panel-border)] p-2 transition-opacity ${
                    placed ? 'opacity-35' : 'gentle-float cursor-grab active:cursor-grabbing'
                  }`}
                  style={{ animationDelay: `${def.size * 0.3}s` }}
                  onPointerDown={placed ? undefined : (e) => startDockDrag(def.id, def.size, e)}
                >
                  <img
                    src={shipSprite(def.id)}
                    alt=""
                    draggable={false}
                    className="h-6 w-24 select-none object-contain"
                    onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{t(def.id)}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: def.size }, (_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-[2px] bg-[var(--neon)]/70" />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Verktygsknappar */}
            <div className="mt-1 grid grid-cols-2 gap-2">
              <NeonButton size="sm" onClick={randomizeFleet}>
                <GameIcon name="sonar" fallback="🎲" className="h-4 w-4" />
                {t('randomize')}
              </NeonButton>
              <NeonButton size="sm" onClick={clearFleet} disabled={board.ships.length === 0}>
                {t('clearBoard')}
              </NeonButton>
            </div>
            <NeonButton variant="primary" size="lg" disabled={!ready} onClick={confirmPlacement} className="mt-1">
              {t('ready')}
            </NeonButton>
          </div>
        </div>
      </div>
    </div>
  )
}
