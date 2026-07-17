import { create } from 'zustand'
import { loadJson, saveJson } from './persistence'

/** Sammanfattning av en avslutad match mot datorn, ur spelarens perspektiv. */
export interface MatchSummary {
  won: boolean
  shotsFired: number
  shotsHit: number
  shipsSunk: number
  durationMs: number
  perfect: boolean
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface StatsData {
  gamesPlayed: number
  wins: number
  losses: number
  shotsFired: number
  shotsHit: number
  shipsSunk: number
  currentStreak: number
  bestStreak: number
  /** Matchlängder i millisekunder; 0 = inget värde ännu. */
  shortestMatchMs: number
  longestMatchMs: number
}

interface StatsState extends StatsData {
  recordMatch: (summary: MatchSummary) => StatsData
  reset: () => void
}

const STORAGE_KEY = 'sankaskepp:stats'

const defaults: StatsData = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  shotsFired: 0,
  shotsHit: 0,
  shipsSunk: 0,
  currentStreak: 0,
  bestStreak: 0,
  shortestMatchMs: 0,
  longestMatchMs: 0,
}

/** Livstidsstatistik för matcher mot datorn, persisterad i LocalStorage. */
export const useStats = create<StatsState>((set, get) => ({
  ...loadJson(STORAGE_KEY, defaults),

  recordMatch: (summary) => {
    const s = get()
    const currentStreak = summary.won ? s.currentStreak + 1 : 0
    const next: StatsData = {
      gamesPlayed: s.gamesPlayed + 1,
      wins: s.wins + (summary.won ? 1 : 0),
      losses: s.losses + (summary.won ? 0 : 1),
      shotsFired: s.shotsFired + summary.shotsFired,
      shotsHit: s.shotsHit + summary.shotsHit,
      shipsSunk: s.shipsSunk + summary.shipsSunk,
      currentStreak,
      bestStreak: Math.max(s.bestStreak, currentStreak),
      shortestMatchMs:
        s.shortestMatchMs === 0 ? summary.durationMs : Math.min(s.shortestMatchMs, summary.durationMs),
      longestMatchMs: Math.max(s.longestMatchMs, summary.durationMs),
    }
    set(next)
    saveJson(STORAGE_KEY, next)
    return next
  },

  reset: () => {
    set(defaults)
    saveJson(STORAGE_KEY, defaults)
  },
}))
