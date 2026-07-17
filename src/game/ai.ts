import { inBounds, shipCells } from './board'
import { BOARD_SIZE } from './constants'
import type { Coord, Difficulty, FireOutcome, Orientation } from './types'

/** Vad AI:n vet om en cell på motståndarens bräde. */
type Knowledge = 'unknown' | 'miss' | 'hit' | 'sunk'

/**
 * AI:ns minne mellan dragen. Skapas per match med `createAiState` och
 * uppdateras efter varje skott med `recordAiResult`.
 */
export interface AiState {
  difficulty: Difficulty
  /** Kunskapskarta över motståndarens bräde. */
  knowledge: Knowledge[][]
  /** Storlekar på motståndarens ännu inte sänkta fartyg. */
  remainingSizes: number[]
  rng: () => number
}

/** Skapar ett nytt AI-minne för en match. */
export function createAiState(
  difficulty: Difficulty,
  shipSizes: number[],
  rng: () => number = Math.random,
): AiState {
  return {
    difficulty,
    knowledge: Array.from({ length: BOARD_SIZE }, () => Array<Knowledge>(BOARD_SIZE).fill('unknown')),
    remainingSizes: [...shipSizes],
    rng,
  }
}

/** Uppdaterar AI:ns minne med utfallet av dess senaste skott. */
export function recordAiResult(state: AiState, shot: Coord, outcome: FireOutcome): void {
  state.knowledge[shot.row][shot.col] = outcome.result === 'miss' ? 'miss' : 'hit'
  if (outcome.result === 'sunk' && outcome.sunkShip) {
    // Markera hela det sänkta fartyget så att jakten runt det avbryts.
    for (const c of shipCells(outcome.sunkShip)) state.knowledge[c.row][c.col] = 'sunk'
    const index = state.remainingSizes.indexOf(outcome.sunkShip.size)
    if (index !== -1) state.remainingSizes.splice(index, 1)
  }
}

/** Väljer AI:ns nästa skott utifrån svårighetsgrad. Returnerar alltid en obeskjuten cell. */
export function chooseAiShot(state: AiState): Coord {
  switch (state.difficulty) {
    case 'easy':
      return randomShot(state)
    case 'medium':
      return huntTargetShot(state)
    case 'hard':
      return probabilityShot(state)
  }
}

/** Alla celler som ännu inte beskjutits. */
function unknownCells(state: AiState): Coord[] {
  const cells: Coord[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (state.knowledge[row][col] === 'unknown') cells.push({ row, col })
    }
  }
  return cells
}

/** Träffar som ännu inte hör till ett sänkt fartyg – dessa jagas vidare. */
function openHits(state: AiState): Coord[] {
  const cells: Coord[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (state.knowledge[row][col] === 'hit') cells.push({ row, col })
    }
  }
  return cells
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

/** Lätt: rent slumpmässiga skott. */
function randomShot(state: AiState): Coord {
  return pick(unknownCells(state), state.rng)
}

/**
 * Medel: slumpar tills den träffar, och jagar sedan grannceller.
 * Vid två träffar i rad fortsätter den längs linjen åt båda hållen.
 */
function huntTargetShot(state: AiState): Coord {
  const hits = openHits(state)
  if (hits.length === 0) return randomShot(state)

  const isUnknown = (c: Coord) => inBounds(c.row, c.col) && state.knowledge[c.row][c.col] === 'unknown'
  const candidates: Coord[] = []

  // Två eller fler träffar på samma linje: fortsätt längs linjens båda ändar.
  const sameRow = hits.every((h) => h.row === hits[0].row)
  const sameCol = hits.every((h) => h.col === hits[0].col)
  if (hits.length >= 2 && (sameRow || sameCol)) {
    if (sameRow) {
      const cols = hits.map((h) => h.col)
      const row = hits[0].row
      candidates.push({ row, col: Math.min(...cols) - 1 }, { row, col: Math.max(...cols) + 1 })
    } else {
      const rows = hits.map((h) => h.row)
      const col = hits[0].col
      candidates.push({ row: Math.min(...rows) - 1, col }, { row: Math.max(...rows) + 1, col })
    }
    const lineShots = candidates.filter(isUnknown)
    if (lineShots.length > 0) return pick(lineShots, state.rng)
  }

  // Annars: skjut en obeskjuten granne till någon öppen träff.
  for (const hit of hits) {
    candidates.push(
      { row: hit.row - 1, col: hit.col },
      { row: hit.row + 1, col: hit.col },
      { row: hit.row, col: hit.col - 1 },
      { row: hit.row, col: hit.col + 1 },
    )
  }
  const neighbors = candidates.filter(isUnknown)
  return neighbors.length > 0 ? pick(neighbors, state.rng) : randomShot(state)
}

/**
 * Svår: sannolikhetskarta. För varje kvarvarande fartygsstorlek räknas alla
 * giltiga placeringar; placeringar som täcker öppna träffar viktas kraftigt.
 * AI:n skjuter cellen med högst sammanlagd vikt.
 */
function probabilityShot(state: AiState): Coord {
  const weights = probabilityMap(state)
  let best: Coord[] = []
  let bestWeight = -1
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (state.knowledge[row][col] !== 'unknown') continue
      const w = weights[row][col]
      if (w > bestWeight) {
        bestWeight = w
        best = [{ row, col }]
      } else if (w === bestWeight) {
        best.push({ row, col })
      }
    }
  }
  return pick(best, state.rng)
}

/** Bygger sannolikhetskartan som Svår-AI:n skjuter efter. */
export function probabilityMap(state: AiState): number[][] {
  const weights: number[][] = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))
  const orientations: Orientation[] = ['horizontal', 'vertical']

  for (const size of state.remainingSizes) {
    for (const orientation of orientations) {
      const maxRow = orientation === 'vertical' ? BOARD_SIZE - size : BOARD_SIZE - 1
      const maxCol = orientation === 'horizontal' ? BOARD_SIZE - size : BOARD_SIZE - 1
      for (let row = 0; row <= maxRow; row++) {
        for (let col = 0; col <= maxCol; col++) {
          const cells = shipCells({ row, col, size, orientation })
          // Placeringen är möjlig om ingen cell är miss eller sänkt.
          if (cells.some((c) => state.knowledge[c.row][c.col] === 'miss' || state.knowledge[c.row][c.col] === 'sunk')) {
            continue
          }
          // Vikta placeringar som förklarar öppna träffar mycket högre.
          const hitCount = cells.filter((c) => state.knowledge[c.row][c.col] === 'hit').length
          const weight = hitCount > 0 ? 100 * hitCount : 1
          for (const c of cells) {
            if (state.knowledge[c.row][c.col] === 'unknown') weights[c.row][c.col] += weight
          }
        }
      }
    }
  }
  return weights
}
