import { BOARD_SIZE, SHIP_DEFS } from './constants'
import type { BoardState, CellMark, Coord, Orientation, PlacedShip, ShipDef } from './types'

/** Skapar ett tomt bräde utan fartyg och utan skott. */
export function createEmptyBoard(): BoardState {
  return { ships: [], shots: createEmptyShots() }
}

/** Skapar en tom 10×10-matris med skottmarkeringar. */
export function createEmptyShots(): CellMark[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<CellMark>(BOARD_SIZE).fill('none'))
}

/** Returnerar alla celler ett fartyg täcker, i ordning från fören. */
export function shipCells(ship: Pick<PlacedShip, 'row' | 'col' | 'size' | 'orientation'>): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < ship.size; i++) {
    cells.push({
      row: ship.row + (ship.orientation === 'vertical' ? i : 0),
      col: ship.col + (ship.orientation === 'horizontal' ? i : 0),
    })
  }
  return cells
}

/** True om cellen ligger innanför brädet. */
export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

/**
 * Kontrollerar om ett fartyg kan placeras: helt innanför brädet och utan att
 * överlappa andra fartyg. `ignoreId` gör att ett fartyg kan flyttas till en
 * plats som överlappar dess egen gamla position.
 */
export function canPlaceShip(
  ships: PlacedShip[],
  def: ShipDef,
  row: number,
  col: number,
  orientation: Orientation,
  ignoreId?: string,
): boolean {
  const candidate = shipCells({ row, col, size: def.size, orientation })
  if (!candidate.every((c) => inBounds(c.row, c.col))) return false

  const occupied = new Set<string>()
  for (const ship of ships) {
    if (ship.id === ignoreId) continue
    for (const c of shipCells(ship)) occupied.add(`${c.row},${c.col}`)
  }
  return candidate.every((c) => !occupied.has(`${c.row},${c.col}`))
}

/** Skapar ett placerat fartyg utan träffar. */
export function makeShip(def: ShipDef, row: number, col: number, orientation: Orientation): PlacedShip {
  return { id: def.id, size: def.size, row, col, orientation, hits: Array(def.size).fill(false) }
}

/** Slumpar en giltig placering av samtliga fem fartyg. */
export function randomFleet(rng: () => number = Math.random): PlacedShip[] {
  // Placera största fartyget först – då finns alltid plats kvar för de små.
  const ships: PlacedShip[] = []
  for (const def of SHIP_DEFS) {
    let placed = false
    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const orientation: Orientation = rng() < 0.5 ? 'horizontal' : 'vertical'
      const row = Math.floor(rng() * BOARD_SIZE)
      const col = Math.floor(rng() * BOARD_SIZE)
      if (canPlaceShip(ships, def, row, col, orientation)) {
        ships.push(makeShip(def, row, col, orientation))
        placed = true
      }
    }
    if (!placed) return randomFleet(rng) // extremt osannolikt – börja om
  }
  return ships
}

/** True när alla fem fartyg är utplacerade. */
export function fleetComplete(ships: PlacedShip[]): boolean {
  return ships.length === SHIP_DEFS.length
}

/** Hittar fartyget som täcker en viss cell, om något. */
export function shipAt(ships: PlacedShip[], row: number, col: number): PlacedShip | undefined {
  return ships.find((ship) => shipCells(ship).some((c) => c.row === row && c.col === col))
}
