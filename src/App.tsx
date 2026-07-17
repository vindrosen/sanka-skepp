import { useEffect } from 'react'
import { sound } from './audio/sound'
import { AchievementsScreen } from './components/screens/AchievementsScreen'
import { GameScreen } from './components/screens/GameScreen'
import { HandoverScreen } from './components/screens/HandoverScreen'
import { MenuScreen } from './components/screens/MenuScreen'
import { PlacementScreen } from './components/screens/PlacementScreen'
import { ResultScreen } from './components/screens/ResultScreen'
import { SettingsScreen } from './components/screens/SettingsScreen'
import { StatsScreen } from './components/screens/StatsScreen'
import { useGame } from './state/gameStore'
import { useSettings } from './state/settingsStore'

/** Skärmrouter + koppling av tema, animationer och ljud till inställningarna. */
export default function App() {
  const screen = useGame((s) => s.screen)
  const theme = useSettings((s) => s.theme)
  const animations = useSettings((s) => s.animations)
  const music = useSettings((s) => s.music)
  const sfx = useSettings((s) => s.sfx)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('anim-on', animations)
  }, [animations])

  useEffect(() => {
    sound.setSfxEnabled(sfx)
  }, [sfx])

  useEffect(() => {
    sound.setMusicEnabled(music)
  }, [music])

  // Webbläsare kräver en användargest innan ljud får spelas – starta musiken då.
  useEffect(() => {
    const start = () => {
      if (useSettings.getState().music) sound.startMusic()
    }
    window.addEventListener('pointerdown', start, { once: true })
    return () => window.removeEventListener('pointerdown', start)
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      <div className="ocean-bg" aria-hidden />
      {screen === 'menu' && <MenuScreen />}
      {screen === 'placement' && <PlacementScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'handover' && <HandoverScreen />}
      {screen === 'result' && <ResultScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'stats' && <StatsScreen />}
      {screen === 'achievements' && <AchievementsScreen />}
    </div>
  )
}
