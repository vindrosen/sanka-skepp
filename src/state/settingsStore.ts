import { create } from 'zustand'
import type { Language } from '../i18n/translations'
import { loadJson, saveJson } from './persistence'

export type Theme = 'dark' | 'light'

interface SettingsState {
  music: boolean
  sfx: boolean
  animations: boolean
  theme: Theme
  language: Language
  setMusic: (on: boolean) => void
  setSfx: (on: boolean) => void
  setAnimations: (on: boolean) => void
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
}

const STORAGE_KEY = 'sankaskepp:settings'

const defaults = {
  music: true,
  sfx: true,
  animations: true,
  theme: 'dark' as Theme,
  language: 'sv' as Language,
}

/** Globala inställningar, persisterade i LocalStorage. */
export const useSettings = create<SettingsState>((set, get) => {
  const persist = () => {
    const { music, sfx, animations, theme, language } = get()
    saveJson(STORAGE_KEY, { music, sfx, animations, theme, language })
  }
  return {
    ...loadJson(STORAGE_KEY, defaults),
    setMusic: (music) => {
      set({ music })
      persist()
    },
    setSfx: (sfx) => {
      set({ sfx })
      persist()
    },
    setAnimations: (animations) => {
      set({ animations })
      persist()
    },
    setTheme: (theme) => {
      set({ theme })
      persist()
    },
    setLanguage: (language) => {
      set({ language })
      persist()
    },
  }
})
