import { shipAt, shipCells } from './board'
import type { BoardState, FireOutcome, PlacedShip } from './types'

/** True om fartyget är helt sänkt. */
export function isSunk(ship: PlacedShip): boolean {
  return ship.hits.every(Boolean)
}

/** True om samtliga fartyg på brädet är sänkta – spelet är slut. */
export function allShipsSunk(board: BoardState): boolean {
  return board.ships.length > 0 && board.ships.every(isSunk)
}

/** True om cellen redan beskjutits (ogiltigt mål). */
export function alreadyFired(board: BoardState, row: number, col: number): boolean {
  return board.shots[row][col] !== 'none'
}

/**
 * Avlossar ett skott mot en cell. Muterar INTE inkommande bräde utan
 * returnerar ett nytt tillstånd tillsammans med utfallet.
 */
export function fireAt(
  board: BoardState,
  row: number,
  col: number,
): { board: BoardState; outcome: FireOutcome } {
  const shots = board.shots.map((r) => [...r])
  const target = shipAt(board.ships, row, col)

  if (!target) {
    shots[row][col] = 'miss'
    const next = { ...board, shots }
    return { board: next, outcome: { result: 'miss', allSunk: false } }
  }

  shots[row][col] = 'hit'
  const ships = board.ships.map((ship) => {
    if (ship !== target) return ship
    const index = shipCells(ship).findIndex((c) => c.row === row && c.col === col)
    const hits = [...ship.hits]
    hits[index] = true
    return { ...ship, hits }
  })
  const updated = ships.find((s) => s.id === target.id)!
  const next: BoardState = { ships, shots }
  const sunk = isSunk(updated)
  return {
    board: next,
    outcome: {
      result: sunk ? 'sunk' : 'hit',
      ship: updated,
      sunkShip: sunk ? updated : undefined,
      allSunk: allShipsSunk(next),
    },
  }
}

/** Antal fartyg som ännu inte sänkts. */
export function shipsRemaining(board: BoardState): number {
  return board.ships.filter((ship) => !isSunk(ship)).length
}
