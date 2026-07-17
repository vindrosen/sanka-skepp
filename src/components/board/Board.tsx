import { useMemo } from 'react'
import { BOARD_SIZE, ROW_LABELS } from '../../game/constants'
import { isSunk } from '../../game/engine'
import { shipCells } from '../../game/board'
import type { BoardState, Coord, Orientation, ShipId } from '../../game/types'
import type { LastEvent } from '../../state/gameStore'
import { ExplosionFx, FireFx, MissFx, SmokeFx, SplashFx } from './Effects'
import { ShipView } from './ShipView'

export interface GhostShip {
  id: ShipId
  size: number
  row: number
  col: number
  orientation: Orientation
  valid: boolean
}

interface BoardProps {
  board: BoardState
  /** Visa levande fartyg (eget bräde / placering). */
  showShips?: boolean
  /** Visa sänkta fartyg (motståndarens bräde avslöjar dem vid sänkning). */
  revealSunk?: boolean
  /** Går det att klicka på celler för att skjuta? */
  interactive?: boolean
  onCellClick?: (row: number, col: number) => void
  /** Senaste skotthändelsen MOT det här brädet (för engångsanimationer). */
  lastEvent?: LastEvent | null
  /** Förhandsvisning av fartyg under placering. */
  ghost?: GhostShip | null
  /** Fartyg som just nu dras och därför inte ska ritas på brädet. */
  hideShipId?: ShipId | null
  onShipPointerDown?: (shipId: ShipId, e: React.PointerEvent) => void
  /** Ref till cellrutnätet, för träffberäkning vid drag & drop. */
  gridRef?: React.Ref<HTMLDivElement>
  /** Mindre koordinatetiketter (minibräde). */
  compact?: boolean
  className?: string
}

/**
 * Ett 10×10-bräde med koordinatetiketter, fartyg, skottmarkeringar och
 * effekter. Skalar med sin container och används av både placering och spel.
 */
export function Board({
  board,
  showShips = false,
  revealSunk = false,
  interactive = false,
  onCellClick,
  lastEvent = null,
  ghost = null,
  hideShipId = null,
  onShipPointerDown,
  gridRef,
  compact = false,
  className = '',
}: BoardProps) {
  // Celler som hör till sänkta fartyg – ritas mörkare och ryker.
  const sunkCellKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const ship of board.ships) {
      if (isSunk(ship)) for (const c of shipCells(ship)) keys.add(`${c.row},${c.col}`)
    }
    return keys
  }, [board.ships])

  const ghostCells = useMemo(() => {
    if (!ghost) return new Set<string>()
    return new Set(
      shipCells({ row: ghost.row, col: ghost.col, size: ghost.size, orientation: ghost.orientation }).map(
        (c) => `${c.row},${c.col}`,
      ),
    )
  }, [ghost])

  const labelClass = `flex items-center justify-center font-semibold text-[var(--muted)] ${
    compact ? 'text-[0.5rem]' : 'text-[clamp(0.55rem,1.6vw,0.8rem)]'
  }`

  // Ihågkomna markörer per cell.
  const persistent: { cell: Coord; kind: 'miss' | 'fire' | 'smoke' }[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const mark = board.shots[row][col]
      if (mark === 'miss') persistent.push({ cell: { row, col }, kind: 'miss' })
      else if (mark === 'hit') {
        persistent.push({ cell: { row, col }, kind: sunkCellKeys.has(`${row},${col}`) ? 'smoke' : 'fire' })
      }
    }
  }

  const showEventFx = lastEvent !== null

  return (
    <div className={`select-none ${className}`}>
      {/* Kolumnetiketter 1–10 */}
      <div className="grid" style={{ gridTemplateColumns: `${compact ? '0.9rem' : 'clamp(1rem,2.5vw,1.5rem)'} repeat(10, 1fr)` }}>
        <div />
        {Array.from({ length: BOARD_SIZE }, (_, i) => (
          <div key={i} className={labelClass}>
            {i + 1}
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `${compact ? '0.9rem' : 'clamp(1rem,2.5vw,1.5rem)'} 1fr` }}>
        {/* Radetiketter A–J */}
        <div className="grid grid-rows-10">
          {ROW_LABELS.map((label) => (
            <div key={label} className={labelClass}>
              {label}
            </div>
          ))}
        </div>

        {/* Själva rutnätet */}
        <div
          ref={gridRef}
          className="relative aspect-square touch-none overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--cell)] shadow-[0_0_20px_var(--panel-glow)_inset]"
        >
          <div className="grid h-full w-full grid-cols-10 grid-rows-10">
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
              const row = Math.floor(i / BOARD_SIZE)
              const col = i % BOARD_SIZE
              const key = `${row},${col}`
              const mark = board.shots[row][col]
              const isGhost = ghostCells.has(key)
              const clickable = interactive && mark === 'none'
              return (
                <button
                  key={key}
                  type="button"
                  tabIndex={clickable ? 0 : -1}
                  aria-label={`${ROW_LABELS[row]}${col + 1}`}
                  data-cell={key}
                  disabled={!clickable}
                  onClick={clickable && onCellClick ? () => onCellClick(row, col) : undefined}
                  className={`relative border-[0.5px] border-[var(--grid-line)] transition-colors duration-100 ${
                    sunkCellKeys.has(key) ? 'bg-black/40' : ''
                  } ${
                    isGhost ? (ghost!.valid ? 'bg-emerald-400/40' : 'bg-red-500/45') : ''
                  } ${clickable ? 'group cursor-crosshair hover:bg-[var(--cell-hover)]' : 'cursor-default'}`}
                >
                  {clickable && (
                    <span className="target-pulse pointer-events-none absolute inset-[12%] hidden rounded-full border-2 border-[var(--neon)] opacity-80 group-hover:block">
                      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--neon)]/70" />
                      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-[var(--neon)]/70" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Fartyg */}
          {board.ships.map((ship) => {
            const sunk = isSunk(ship)
            if (ship.id === hideShipId) return null
            if (!showShips && !(revealSunk && sunk)) return null
            return (
              <ShipView
                key={ship.id}
                ship={ship}
                sunk={sunk}
                onPointerDown={onShipPointerDown ? (e) => onShipPointerDown(ship.id, e) : undefined}
              />
            )
          })}

          {/* Ghost-förhandsvisning under drag */}
          {ghost && <ShipView ship={ghost} ghost />}

          {/* Kvarliggande markörer */}
          {persistent.map(({ cell, kind }) =>
            kind === 'miss' ? (
              <MissFx key={`m${cell.row},${cell.col}`} cell={cell} />
            ) : kind === 'fire' ? (
              <FireFx key={`f${cell.row},${cell.col}`} cell={cell} />
            ) : (
              <SmokeFx key={`s${cell.row},${cell.col}`} cell={cell} delayed={(cell.row + cell.col) % 2 === 0} />
            ),
          )}

          {/* Engångsanimationer för senaste skottet (key på seq startar om dem) */}
          {showEventFx && lastEvent!.result === 'miss' && (
            <SplashFx key={`ev${lastEvent!.seq}`} cell={{ row: lastEvent!.row, col: lastEvent!.col }} />
          )}
          {showEventFx && lastEvent!.result === 'hit' && (
            <ExplosionFx key={`ev${lastEvent!.seq}`} cell={{ row: lastEvent!.row, col: lastEvent!.col }} />
          )}
          {showEventFx && lastEvent!.result === 'sunk' && (
            <ExplosionFx key={`ev${lastEvent!.seq}`} cell={{ row: lastEvent!.row, col: lastEvent!.col }} big />
          )}
        </div>
      </div>
    </div>
  )
}
