import { describe, expect, it } from 'vitest'
import { canPlaceShip, createEmptyBoard, makeShip, randomFleet, shipAt, shipCells } from './board'
import { BOARD_SIZE, SHIP_DEFS } from './constants'
import { allShipsSunk, alreadyFired, fireAt, shipsRemaining } from './engine'
import { chooseAiShot, createAiState, recordAiResult } from './ai'
import type { BoardState, Difficulty } from './types'

/** Deterministisk pseudo-slump för reproducerbara tester. */
function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

describe('board', () => {
  it('beräknar fartygets celler horisontellt och vertikalt', () => {
    expect(shipCells({ row: 2, col: 3, size: 3, orientation: 'horizontal' })).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
    ])
    expect(shipCells({ row: 2, col: 3, size: 2, orientation: 'vertical' })).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ])
  })

  it('tillåter inte placering utanför brädet', () => {
    const carrier = SHIP_DEFS[0]
    expect(canPlaceShip([], carrier, 0, 6, 'horizontal')).toBe(false)
    expect(canPlaceShip([], carrier, 6, 0, 'vertical')).toBe(false)
    expect(canPlaceShip([], carrier, 0, 5, 'horizontal')).toBe(true)
  })

  it('tillåter inte överlappande fartyg', () => {
    const ships = [makeShip(SHIP_DEFS[0], 0, 0, 'horizontal')]
    expect(canPlaceShip(ships, SHIP_DEFS[1], 0, 2, 'vertical')).toBe(false)
    expect(canPlaceShip(ships, SHIP_DEFS[1], 1, 0, 'horizontal')).toBe(true)
  })

  it('låter ett fartyg flyttas över sin egen gamla position', () => {
    const ships = [makeShip(SHIP_DEFS[2], 4, 4, 'horizontal')]
    expect(canPlaceShip(ships, SHIP_DEFS[2], 4, 5, 'horizontal', 'cruiser')).toBe(true)
  })

  it('slumpar en komplett giltig flotta', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const fleet = randomFleet(seededRng(seed))
      expect(fleet).toHaveLength(5)
      const seen = new Set<string>()
      for (const ship of fleet) {
        for (const c of shipCells(ship)) {
          expect(c.row).toBeGreaterThanOrEqual(0)
          expect(c.row).toBeLessThan(BOARD_SIZE)
          expect(c.col).toBeGreaterThanOrEqual(0)
          expect(c.col).toBeLessThan(BOARD_SIZE)
          const key = `${c.row},${c.col}`
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
      }
    }
  })
})

describe('engine', () => {
  function boardWithTorpedoBoat(): BoardState {
    const board = createEmptyBoard()
    board.ships = [makeShip(SHIP_DEFS[4], 5, 5, 'horizontal')] // storlek 2: (5,5)+(5,6)
    return board
  }

  it('registrerar miss', () => {
    const { board, outcome } = fireAt(boardWithTorpedoBoat(), 0, 0)
    expect(outcome.result).toBe('miss')
    expect(board.shots[0][0]).toBe('miss')
    expect(alreadyFired(board, 0, 0)).toBe(true)
  })

  it('registrerar träff och sedan sänkning', () => {
    const first = fireAt(boardWithTorpedoBoat(), 5, 5)
    expect(first.outcome.result).toBe('hit')
    expect(first.outcome.allSunk).toBe(false)

    const second = fireAt(first.board, 5, 6)
    expect(second.outcome.result).toBe('sunk')
    expect(second.outcome.sunkShip?.id).toBe('torpedoboat')
    expect(second.outcome.allSunk).toBe(true)
    expect(allShipsSunk(second.board)).toBe(true)
    expect(shipsRemaining(second.board)).toBe(0)
  })

  it('muterar inte ursprungsbrädet', () => {
    const original = boardWithTorpedoBoat()
    fireAt(original, 5, 5)
    expect(original.shots[5][5]).toBe('none')
    expect(original.ships[0].hits).toEqual([false, false])
  })
})

describe('ai', () => {
  /** Spelar en hel match AI mot slumpad flotta och räknar antalet skott. */
  function playFullGame(difficulty: Difficulty, seed: number): number {
    const rng = seededRng(seed)
    let board = createEmptyBoard()
    board.ships = randomFleet(rng)
    const ai = createAiState(difficulty, SHIP_DEFS.map((d) => d.size), rng)

    let shotCount = 0
    while (!allShipsSunk(board) && shotCount < 200) {
      const shot = chooseAiShot(ai)
      expect(alreadyFired(board, shot.row, shot.col)).toBe(false)
      const { board: next, outcome } = fireAt(board, shot.row, shot.col)
      board = next
      recordAiResult(ai, shot, outcome)
      shotCount++
    }
    expect(allShipsSunk(board)).toBe(true)
    return shotCount
  }

  it('alla svårighetsgrader spelar färdigt utan ogiltiga skott', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      for (let seed = 1; seed <= 10; seed++) {
        const shots = playFullGame(difficulty, seed)
        expect(shots).toBeLessThanOrEqual(100)
      }
    }
  })

  it('svår är i snitt klart bättre än lätt', () => {
    const games = 30
    let easyTotal = 0
    let hardTotal = 0
    for (let seed = 1; seed <= games; seed++) {
      easyTotal += playFullGame('easy', seed)
      hardTotal += playFullGame('hard', seed + 1000)
    }
    const easyAvg = easyTotal / games
    const hardAvg = hardTotal / games
    // Slump behöver typiskt ~95 skott; en bra sannolikhets-AI ligger runt 45–65.
    expect(hardAvg).toBeLessThan(easyAvg - 15)
  })

  it('medel jagar vidare efter en träff', () => {
    const rng = seededRng(7)
    const ai = createAiState('medium', [3], rng)
    recordAiResult(ai, { row: 4, col: 4 }, {
      result: 'hit',
      allSunk: false,
      ship: makeShip({ id: 'cruiser', size: 3 }, 4, 4, 'horizontal'),
    })
    const shot = chooseAiShot(ai)
    const isNeighbor =
      (Math.abs(shot.row - 4) === 1 && shot.col === 4) ||
      (Math.abs(shot.col - 4) === 1 && shot.row === 4)
    expect(isNeighbor).toBe(true)
  })

  it('hard-AI hittar fartyget som förklarar två träffar på linje', () => {
    const rng = seededRng(3)
    const ai = createAiState('hard', [4], rng)
    const ship = makeShip({ id: 'battleship', size: 4 }, 2, 2, 'horizontal')
    recordAiResult(ai, { row: 2, col: 3 }, { result: 'hit', allSunk: false, ship })
    recordAiResult(ai, { row: 2, col: 4 }, { result: 'hit', allSunk: false, ship })
    const shot = chooseAiShot(ai)
    // Cellen måste ligga på samma rad, direkt intill träffarna.
    expect(shot.row).toBe(2)
    expect([2, 5]).toContain(shot.col)
  })

  it('hittar rätt fartyg via shipAt', () => {
    const ships = [makeShip(SHIP_DEFS[0], 0, 0, 'horizontal')]
    expect(shipAt(ships, 0, 4)?.id).toBe('carrier')
    expect(shipAt(ships, 1, 0)).toBeUndefined()
  })
})
