import { create } from 'zustand'
import { chooseAiShot, createAiState, recordAiResult, type AiState } from '../game/ai'
import { canPlaceShip, createEmptyBoard, makeShip, randomFleet, shipCells } from '../game/board'
import { SHIP_DEFS } from '../game/constants'
import { alreadyFired, fireAt } from '../game/engine'
import type { BoardState, Coord, Difficulty, GameMode, Orientation, ShipId, ShotResult } from '../game/types'
import { sound } from '../audio/sound'
import { useAchievements, type AchievementId } from './achievements'
import { useSettings } from './settingsStore'
import { useStats } from './statsStore'

export type Screen =
  | 'menu'
  | 'placement'
  | 'game'
  | 'handover'
  | 'result'
  | 'settings'
  | 'stats'
  | 'achievements'

export type PlayerId = 'p1' | 'p2'

/** En spelares sida av matchen: eget bräde + attackstatistik. */
export interface PlayerSlot {
  board: BoardState
  shotsFired: number
  shotsHit: number
  shipsSunk: number
}

/** Senaste skotthändelsen – används av UI för animationer och effekter. */
export interface LastEvent {
  seq: number
  attacker: PlayerId
  target: PlayerId
  row: number
  col: number
  result: ShotResult
  sunkShipId?: ShipId
  sunkCells?: Coord[]
}

/** Vad överlämningsskärmen ska leda vidare till. */
type HandoverNext = 'placement' | 'turn'

interface GameStore {
  screen: Screen
  mode: GameMode
  difficulty: Difficulty
  players: Record<PlayerId, PlayerSlot>
  current: PlayerId
  phase: 'placement' | 'battle' | 'over'
  placingPlayer: PlayerId
  winner: PlayerId | null
  aiThinking: boolean
  lastEvent: LastEvent | null
  matchStart: number
  /** Matchens längd i ms, satt när matchen avgörs (för resultatskärmen). */
  matchDurationMs: number
  newAchievements: AchievementId[]
  handoverTarget: PlayerId
  handoverNext: HandoverNext

  goTo: (screen: Screen) => void
  startVsAi: (difficulty: Difficulty) => void
  startTwoPlayer: () => void
  placeShip: (shipId: ShipId, row: number, col: number, orientation: Orientation) => boolean
  rotateShip: (shipId: ShipId) => void
  removeShip: (shipId: ShipId) => void
  randomizeFleet: () => void
  clearFleet: () => void
  confirmPlacement: () => void
  continueHandover: () => void
  fire: (row: number, col: number) => void
  playAgain: () => void
  abandonMatch: () => void
}

function emptySlot(): PlayerSlot {
  return { board: createEmptyBoard(), shotsFired: 0, shotsHit: 0, shipsSunk: 0 }
}

/** Fördröjningar (ms) – kortare när animationer är avstängda. */
function delays() {
  const animations = useSettings.getState().animations
  return {
    impact: animations ? 350 : 80, // skott avfyrat → nedslag
    turnSwitch: animations ? 1500 : 400, // nedslag → nästa tur/överlämning
    aiAim: animations ? 900 : 250, // AI "siktar" innan den skjuter
    gameOver: animations ? 2400 : 600, // sista nedslaget → resultatskärm
  }
}

// AI:n och turväxlingen körs med timers. matchToken ogiltigförklarar
// utestående timers när en match avbryts eller startas om.
let matchToken = 0
const timers: number[] = []

function later(fn: () => void, ms: number) {
  const token = matchToken
  timers.push(
    window.setTimeout(() => {
      if (token === matchToken) fn()
    }, ms),
  )
}

function cancelTimers() {
  matchToken++
  for (const id of timers) clearTimeout(id)
  timers.length = 0
}

let eventSeq = 0

export const useGame = create<GameStore>((set, get) => {
  /** Uppdaterar en spelares slot immutabelt. */
  function patchSlot(id: PlayerId, patch: Partial<PlayerSlot>) {
    set((s) => ({ players: { ...s.players, [id]: { ...s.players[id], ...patch } } }))
  }

  /** Avslutar matchen, uppdaterar statistik/prestationer och visar resultat. */
  function finishMatch(winner: PlayerId) {
    const s = get()
    set({ phase: 'over', winner, matchDurationMs: Date.now() - s.matchStart })
    if (s.mode === 'vsAi') {
      const me = get().players.p1
      const summary = {
        won: winner === 'p1',
        shotsFired: me.shotsFired,
        shotsHit: me.shotsHit,
        shipsSunk: me.shipsSunk,
        durationMs: Date.now() - s.matchStart,
        perfect: me.shotsFired > 0 && me.shotsFired === me.shotsHit,
        difficulty: s.difficulty,
      }
      const stats = useStats.getState().recordMatch(summary)
      const fresh = useAchievements.getState().evaluate(stats, summary)
      set({ newAchievements: fresh })
      if (fresh.length > 0) later(() => sound.play('achievement'), 900)
    }
    later(() => {
      sound.play(get().mode === 'twoPlayer' || get().winner === 'p1' ? 'win' : 'lose')
      set({ screen: 'result' })
    }, delays().gameOver)
  }

  /** Utför ett skott från `attacker` mot motståndarens bräde. */
  function resolveShot(attacker: PlayerId, row: number, col: number, aiState?: AiState) {
    const targetId: PlayerId = attacker === 'p1' ? 'p2' : 'p1'
    const target = get().players[targetId]
    const { board, outcome } = fireAt(target.board, row, col)

    const attackerSlot = get().players[attacker]
    patchSlot(targetId, { board })
    patchSlot(attacker, {
      shotsFired: attackerSlot.shotsFired + 1,
      shotsHit: attackerSlot.shotsHit + (outcome.result === 'miss' ? 0 : 1),
      shipsSunk: attackerSlot.shipsSunk + (outcome.result === 'sunk' ? 1 : 0),
    })
    set({
      lastEvent: {
        seq: ++eventSeq,
        attacker,
        target: targetId,
        row,
        col,
        result: outcome.result,
        sunkShipId: outcome.sunkShip?.id,
        sunkCells: outcome.sunkShip ? shipCells(outcome.sunkShip) : undefined,
      },
    })
    if (aiState) recordAiResult(aiState, { row, col }, outcome)

    // Nedslagsljudet spelas när projektilen "landar" (synkat med animationen).
    later(() => sound.play(outcome.result === 'sunk' ? 'sunk' : outcome.result === 'hit' ? 'hit' : 'miss'), delays().impact)
    return outcome
  }

  /** Låter AI:n sikta och skjuta, efter en kort paus. */
  function scheduleAiTurn() {
    set({ current: 'p2', aiThinking: true })
    later(() => {
      const ai = aiMemory
      if (!ai) return
      const shot = chooseAiShot(ai)
      const outcome = resolveShot('p2', shot.row, shot.col, ai)
      if (outcome.allSunk) {
        set({ aiThinking: false })
        finishMatch('p2')
      } else {
        later(() => set({ current: 'p1', aiThinking: false }), delays().turnSwitch)
      }
    }, delays().aiAim)
  }

  // AI-minnet hålls utanför Zustand: det muteras och behöver aldrig rendera UI.
  let aiMemory: AiState | null = null

  return {
    screen: 'menu',
    mode: 'vsAi',
    difficulty: 'medium',
    players: { p1: emptySlot(), p2: emptySlot() },
    current: 'p1',
    phase: 'placement',
    placingPlayer: 'p1',
    winner: null,
    aiThinking: false,
    lastEvent: null,
    matchStart: 0,
    matchDurationMs: 0,
    newAchievements: [],
    handoverTarget: 'p2',
    handoverNext: 'placement',

    goTo: (screen) => {
      sound.play('click')
      if (screen === 'menu') cancelTimers()
      set({ screen })
    },

    startVsAi: (difficulty) => {
      cancelTimers()
      const aiBoard = createEmptyBoard()
      aiBoard.ships = randomFleet()
      aiMemory = createAiState(difficulty, SHIP_DEFS.map((d) => d.size))
      set({
        mode: 'vsAi',
        difficulty,
        players: { p1: emptySlot(), p2: { ...emptySlot(), board: aiBoard } },
        current: 'p1',
        phase: 'placement',
        placingPlayer: 'p1',
        winner: null,
        aiThinking: false,
        lastEvent: null,
        newAchievements: [],
        screen: 'placement',
      })
    },

    startTwoPlayer: () => {
      cancelTimers()
      aiMemory = null
      set({
        mode: 'twoPlayer',
        players: { p1: emptySlot(), p2: emptySlot() },
        current: 'p1',
        phase: 'placement',
        placingPlayer: 'p1',
        winner: null,
        aiThinking: false,
        lastEvent: null,
        newAchievements: [],
        screen: 'placement',
      })
    },

    placeShip: (shipId, row, col, orientation) => {
      const s = get()
      const slot = s.players[s.placingPlayer]
      const def = SHIP_DEFS.find((d) => d.id === shipId)!
      if (!canPlaceShip(slot.board.ships, def, row, col, orientation, shipId)) return false
      const others = slot.board.ships.filter((ship) => ship.id !== shipId)
      patchSlot(s.placingPlayer, {
        board: { ...slot.board, ships: [...others, makeShip(def, row, col, orientation)] },
      })
      sound.play('place')
      return true
    },

    rotateShip: (shipId) => {
      const s = get()
      const slot = s.players[s.placingPlayer]
      const ship = slot.board.ships.find((sh) => sh.id === shipId)
      if (!ship) return
      const def = SHIP_DEFS.find((d) => d.id === shipId)!
      const next: Orientation = ship.orientation === 'horizontal' ? 'vertical' : 'horizontal'
      // Rotera runt fören; knuffa in på brädet om det behövs.
      const maxStart = 10 - ship.size
      const row = next === 'vertical' ? Math.min(ship.row, maxStart) : ship.row
      const col = next === 'horizontal' ? Math.min(ship.col, maxStart) : ship.col
      if (canPlaceShip(slot.board.ships, def, row, col, next, shipId)) {
        const others = slot.board.ships.filter((sh) => sh.id !== shipId)
        patchSlot(s.placingPlayer, {
          board: { ...slot.board, ships: [...others, makeShip(def, row, col, next)] },
        })
        sound.play('rotate')
      } else {
        sound.play('error')
      }
    },

    removeShip: (shipId) => {
      const s = get()
      const slot = s.players[s.placingPlayer]
      patchSlot(s.placingPlayer, {
        board: { ...slot.board, ships: slot.board.ships.filter((sh) => sh.id !== shipId) },
      })
    },

    randomizeFleet: () => {
      const s = get()
      const slot = s.players[s.placingPlayer]
      patchSlot(s.placingPlayer, { board: { ...slot.board, ships: randomFleet() } })
      sound.play('place')
    },

    clearFleet: () => {
      const s = get()
      const slot = s.players[s.placingPlayer]
      patchSlot(s.placingPlayer, { board: { ...slot.board, ships: [] } })
      sound.play('click')
    },

    confirmPlacement: () => {
      const s = get()
      sound.play('click')
      if (s.mode === 'vsAi') {
        set({ phase: 'battle', current: 'p1', matchStart: Date.now(), screen: 'game' })
        return
      }
      if (s.placingPlayer === 'p1') {
        set({ handoverTarget: 'p2', handoverNext: 'placement', screen: 'handover' })
      } else {
        set({ handoverTarget: 'p1', handoverNext: 'turn', phase: 'battle', matchStart: Date.now(), screen: 'handover' })
      }
    },

    continueHandover: () => {
      const s = get()
      sound.play('click')
      if (s.handoverNext === 'placement') {
        set({ placingPlayer: 'p2', screen: 'placement' })
      } else {
        set({ current: s.handoverTarget, screen: 'game' })
      }
    },

    fire: (row, col) => {
      const s = get()
      if (s.phase !== 'battle' || s.aiThinking || s.screen !== 'game') return
      if (s.mode === 'vsAi' && s.current !== 'p1') return
      const targetId: PlayerId = s.current === 'p1' ? 'p2' : 'p1'
      if (alreadyFired(s.players[targetId].board, row, col)) {
        sound.play('error')
        return
      }
      sound.play('fire')
      const attacker = s.current
      const outcome = resolveShot(attacker, row, col)

      if (outcome.allSunk) {
        finishMatch(attacker)
        return
      }
      if (s.mode === 'vsAi') {
        later(() => scheduleAiTurn(), delays().turnSwitch)
      } else {
        const nextPlayer: PlayerId = attacker === 'p1' ? 'p2' : 'p1'
        later(() => {
          set({ handoverTarget: nextPlayer, handoverNext: 'turn', screen: 'handover' })
        }, delays().turnSwitch)
      }
    },

    playAgain: () => {
      const s = get()
      if (s.mode === 'vsAi') get().startVsAi(s.difficulty)
      else get().startTwoPlayer()
    },

    abandonMatch: () => {
      cancelTimers()
      // En påbörjad strid mot datorn räknas som förlust i statistiken.
      const s = get()
      if (s.mode === 'vsAi' && s.phase === 'battle') {
        const me = s.players.p1
        const summary = {
          won: false,
          shotsFired: me.shotsFired,
          shotsHit: me.shotsHit,
          shipsSunk: me.shipsSunk,
          durationMs: Date.now() - s.matchStart,
          perfect: false,
          difficulty: s.difficulty,
        }
        const stats = useStats.getState().recordMatch(summary)
        useAchievements.getState().evaluate(stats, summary)
      }
      set({ screen: 'menu', phase: 'placement', winner: null, aiThinking: false, lastEvent: null })
    },
  }
})
