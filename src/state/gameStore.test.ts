import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Storen körs i webbläsaren: turväxlingen ligger på window.setTimeout och
// ljudet på Web Audio. Testmiljön är node, så window pekas om till globalThis
// innan modulen importeras. AudioContext saknas där, och ljudmotorn tiger då.
vi.stubGlobal('window', globalThis)
const { useGame } = await import('./gameStore')

/** Startar en match mot datorn och hoppar direkt in i stridsfasen. */
function startBattleVsAi() {
  useGame.getState().startVsAi('easy')
  useGame.getState().confirmPlacement()
}

/** Kör igenom båda spelarnas placering fram till p1:s första tur. */
function startBattleTwoPlayer() {
  useGame.getState().startTwoPlayer()
  useGame.getState().confirmPlacement() // p1 klar → överlämning
  useGame.getState().continueHandover() // p2 placerar
  useGame.getState().confirmPlacement() // p2 klar → överlämning
  useGame.getState().continueHandover() // p1:s tur
}

describe('gameStore – ett skott per tur', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    useGame.getState().abandonMatch()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('ignorerar extra klick under nedslaget', () => {
    startBattleVsAi()
    const { fire } = useGame.getState()
    fire(0, 0)
    fire(0, 1)
    fire(5, 5)
    expect(useGame.getState().players.p1.shotsFired).toBe(1)
  })

  it('ger AI:n exakt en tur per spelarskott', () => {
    startBattleVsAi()
    const { fire } = useGame.getState()
    fire(0, 0)
    fire(0, 1)
    vi.advanceTimersByTime(10_000)
    expect(useGame.getState().players.p2.shotsFired).toBe(1)
    expect(useGame.getState().current).toBe('p1')
  })

  it('släpper in nästa skott när turen är tillbaka', () => {
    startBattleVsAi()
    useGame.getState().fire(0, 0)
    vi.advanceTimersByTime(10_000)
    useGame.getState().fire(0, 1)
    expect(useGame.getState().players.p1.shotsFired).toBe(2)
  })

  it('låser brädet i tvåspelarläget fram till överlämningen', () => {
    startBattleTwoPlayer()
    const { fire } = useGame.getState()
    fire(0, 0)
    fire(0, 1)
    expect(useGame.getState().players.p1.shotsFired).toBe(1)

    vi.advanceTimersByTime(10_000)
    expect(useGame.getState().screen).toBe('handover')
    useGame.getState().continueHandover()
    expect(useGame.getState().current).toBe('p2')
    useGame.getState().fire(0, 0)
    expect(useGame.getState().players.p2.shotsFired).toBe(1)
  })
})
