import { create } from 'zustand'
import type { TranslationKey } from '../i18n/translations'
import { loadJson, saveJson } from './persistence'
import type { MatchSummary, StatsData } from './statsStore'

export type AchievementId =
  | 'firstWin'
  | 'wins10'
  | 'wins100'
  | 'perfect'
  | 'hardWin'
  | 'streak5'
  | 'streak20'
  | 'games20'

export interface AchievementDef {
  id: AchievementId
  titleKey: TranslationKey
  descKey: TranslationKey
  /** Emblem som visas i listan. */
  icon: 'trophy' | 'medal' | 'star' | 'target' | 'skull' | 'fire' | 'crown' | 'anchor'
  /** True om prestationen låstes upp av den här matchen. */
  earned: (stats: StatsData, match: MatchSummary) => boolean
}

/** Alla prestationer i visningsordning. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstWin', titleKey: 'achFirstWinTitle', descKey: 'achFirstWinDesc', icon: 'trophy', earned: (s) => s.wins >= 1 },
  { id: 'wins10', titleKey: 'achWins10Title', descKey: 'achWins10Desc', icon: 'medal', earned: (s) => s.wins >= 10 },
  { id: 'wins100', titleKey: 'achWins100Title', descKey: 'achWins100Desc', icon: 'crown', earned: (s) => s.wins >= 100 },
  { id: 'perfect', titleKey: 'achPerfectTitle', descKey: 'achPerfectDesc', icon: 'target', earned: (_s, m) => m.won && m.perfect },
  { id: 'hardWin', titleKey: 'achHardWinTitle', descKey: 'achHardWinDesc', icon: 'skull', earned: (_s, m) => m.won && m.difficulty === 'hard' },
  { id: 'streak5', titleKey: 'achStreak5Title', descKey: 'achStreak5Desc', icon: 'fire', earned: (s) => s.currentStreak >= 5 },
  { id: 'streak20', titleKey: 'achStreak20Title', descKey: 'achStreak20Desc', icon: 'star', earned: (s) => s.currentStreak >= 20 },
  { id: 'games20', titleKey: 'achGames20Title', descKey: 'achGames20Desc', icon: 'anchor', earned: (s) => s.gamesPlayed >= 20 },
] as const

interface AchievementsState {
  /** id → ISO-datum då prestationen låstes upp. */
  unlocked: Partial<Record<AchievementId, string>>
  /** Kontrollerar alla prestationer efter en match; returnerar nyupplåsta id:n. */
  evaluate: (stats: StatsData, match: MatchSummary) => AchievementId[]
  reset: () => void
}

const STORAGE_KEY = 'sankaskepp:achievements'

/** Upplåsta prestationer, persisterade i LocalStorage. */
export const useAchievements = create<AchievementsState>((set, get) => ({
  unlocked: loadJson<{ unlocked: Partial<Record<AchievementId, string>> }>(STORAGE_KEY, { unlocked: {} }).unlocked,

  evaluate: (stats, match) => {
    const { unlocked } = get()
    const fresh: AchievementId[] = []
    const next = { ...unlocked }
    for (const def of ACHIEVEMENTS) {
      if (!next[def.id] && def.earned(stats, match)) {
        next[def.id] = new Date().toISOString()
        fresh.push(def.id)
      }
    }
    if (fresh.length > 0) {
      set({ unlocked: next })
      saveJson(STORAGE_KEY, { unlocked: next })
    }
    return fresh
  },

  reset: () => {
    set({ unlocked: {} })
    saveJson(STORAGE_KEY, { unlocked: {} })
  },
}))
