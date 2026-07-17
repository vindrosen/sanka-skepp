/**
 * Ljudmotor byggd på Web Audio API. Alla effekter och musiken syntetiseras
 * i kod – inga ljudfiler behövs. Motorn startas lazy vid första
 * användarinteraktionen (krav från webbläsare för autoplay).
 */

export type SfxName =
  | 'click'
  | 'place'
  | 'rotate'
  | 'fire'
  | 'hit'
  | 'miss'
  | 'sunk'
  | 'win'
  | 'lose'
  | 'error'
  | 'achievement'

class SoundEngine {
  private ctx: AudioContext | null = null
  private sfxGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicNodes: AudioNode[] = []
  private musicTimer: number | null = null
  private noiseBuffer: AudioBuffer | null = null

  sfxEnabled = true
  musicEnabled = true

  /** Skapar AudioContext vid behov. Måste ske efter en user gesture. */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = 0.5
      this.sfxGain.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.16
      this.musicGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Återanvändbar buffert med vitt brus (2 s). */
  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    }
    return this.noiseBuffer
  }

  /** Ton med enkel attack/decay-kuvert. */
  private tone(
    freq: number,
    opts: {
      type?: OscillatorType
      start?: number
      duration?: number
      gain?: number
      endFreq?: number
    } = {},
  ) {
    const ctx = this.ensureContext()
    if (!ctx || !this.sfxGain) return
    const { type = 'sine', start = 0, duration = 0.15, gain = 0.5, endFreq } = opts
    const t0 = ctx.currentTime + start
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration)
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(env).connect(this.sfxGain)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  }

  /** Brusskur genom filter – grunden för explosioner och plask. */
  private noiseBurst(opts: {
    start?: number
    duration?: number
    gain?: number
    filterType?: BiquadFilterType
    freq?: number
    endFreq?: number
    q?: number
  }) {
    const ctx = this.ensureContext()
    if (!ctx || !this.sfxGain) return
    const { start = 0, duration = 0.3, gain = 0.5, filterType = 'lowpass', freq = 1000, endFreq, q = 0.8 } = opts
    const t0 = ctx.currentTime + start
    const src = ctx.createBufferSource()
    src.buffer = this.getNoise(ctx)
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.setValueAtTime(freq, t0)
    if (endFreq) filter.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), t0 + duration)
    filter.Q.value = q
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t0)
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.015)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    src.connect(filter).connect(env).connect(this.sfxGain)
    src.start(t0)
    src.stop(t0 + duration + 0.05)
  }

  /** Spelar en namngiven ljudeffekt. */
  play(name: SfxName): void {
    if (!this.sfxEnabled) return
    if (!this.ensureContext()) return
    switch (name) {
      case 'click':
        this.tone(880, { type: 'triangle', duration: 0.06, gain: 0.25 })
        break
      case 'place':
        this.tone(220, { type: 'triangle', duration: 0.12, gain: 0.4, endFreq: 160 })
        this.tone(440, { type: 'sine', start: 0.02, duration: 0.08, gain: 0.15 })
        break
      case 'rotate':
        this.tone(600, { type: 'square', duration: 0.05, gain: 0.12, endFreq: 800 })
        break
      case 'fire':
        // Avfyrningsvisslande – bandpassat brus som sveper nedåt.
        this.noiseBurst({ duration: 0.35, gain: 0.35, filterType: 'bandpass', freq: 2600, endFreq: 300, q: 2 })
        break
      case 'hit':
        // Explosion: brus + djup sinus-dropp.
        this.noiseBurst({ duration: 0.5, gain: 0.7, filterType: 'lowpass', freq: 2500, endFreq: 120 })
        this.tone(140, { type: 'sine', duration: 0.5, gain: 0.8, endFreq: 40 })
        this.tone(500, { type: 'sawtooth', duration: 0.12, gain: 0.2, endFreq: 90 })
        break
      case 'miss':
        // Plask: kort ljust brus + litet "bloop".
        this.noiseBurst({ duration: 0.4, gain: 0.35, filterType: 'highpass', freq: 900, q: 0.5 })
        this.tone(300, { type: 'sine', duration: 0.22, gain: 0.3, endFreq: 90 })
        break
      case 'sunk':
        // Stor explosion följd av lång mullrande efterklang.
        this.noiseBurst({ duration: 0.8, gain: 0.9, filterType: 'lowpass', freq: 3200, endFreq: 60 })
        this.tone(110, { type: 'sine', duration: 1.0, gain: 0.9, endFreq: 30 })
        this.noiseBurst({ start: 0.25, duration: 1.4, gain: 0.3, filterType: 'lowpass', freq: 400, endFreq: 50 })
        this.tone(60, { type: 'sine', start: 0.15, duration: 1.2, gain: 0.5, endFreq: 25 })
        break
      case 'win':
        // Liten fanfar i dur.
        this.tone(523, { type: 'triangle', duration: 0.18, gain: 0.35 })
        this.tone(659, { type: 'triangle', start: 0.14, duration: 0.18, gain: 0.35 })
        this.tone(784, { type: 'triangle', start: 0.28, duration: 0.22, gain: 0.4 })
        this.tone(1047, { type: 'triangle', start: 0.42, duration: 0.5, gain: 0.45 })
        break
      case 'lose':
        // Fallande moll.
        this.tone(392, { type: 'triangle', duration: 0.3, gain: 0.35 })
        this.tone(311, { type: 'triangle', start: 0.25, duration: 0.3, gain: 0.35 })
        this.tone(233, { type: 'triangle', start: 0.5, duration: 0.6, gain: 0.4 })
        break
      case 'achievement':
        this.tone(660, { type: 'sine', duration: 0.12, gain: 0.3 })
        this.tone(880, { type: 'sine', start: 0.1, duration: 0.12, gain: 0.3 })
        this.tone(1320, { type: 'sine', start: 0.2, duration: 0.3, gain: 0.35 })
        break
      case 'error':
        this.tone(160, { type: 'square', duration: 0.12, gain: 0.15 })
        break
    }
  }

  /** Startar ambient havsmusik: mjuka ackordpads + brusande vågor. */
  startMusic(): void {
    if (!this.musicEnabled || this.musicTimer !== null) return
    const ctx = this.ensureContext()
    if (!ctx || !this.musicGain) return

    // Vågbrus: långsamt modulerat lågpassfiltrerat brus.
    const waves = ctx.createBufferSource()
    waves.buffer = this.getNoise(ctx)
    waves.loop = true
    const wavesFilter = ctx.createBiquadFilter()
    wavesFilter.type = 'lowpass'
    wavesFilter.frequency.value = 420
    const wavesGain = ctx.createGain()
    wavesGain.gain.value = 0.35
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.18
    lfo.connect(lfoGain).connect(wavesGain.gain)
    waves.connect(wavesFilter).connect(wavesGain).connect(this.musicGain)
    waves.start()
    lfo.start()
    this.musicNodes = [waves, wavesFilter, wavesGain, lfo, lfoGain]

    // Långsam ackordföljd som spelas med mjuka pads.
    const chords = [
      [110.0, 164.81, 220.0, 329.63], // Am
      [87.31, 130.81, 174.61, 261.63], // F
      [98.0, 146.83, 196.0, 293.66], // G
      [82.41, 123.47, 164.81, 246.94], // Em
    ]
    let step = 0
    const playChord = () => {
      const ctx2 = this.ctx
      if (!ctx2 || !this.musicGain) return
      const notes = chords[step % chords.length]
      step++
      const t0 = ctx2.currentTime
      for (const freq of notes) {
        const osc = ctx2.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        const detune = ctx2.createOscillator()
        detune.type = 'sine'
        detune.frequency.value = freq * 1.005
        const env = ctx2.createGain()
        env.gain.setValueAtTime(0.0001, t0)
        env.gain.exponentialRampToValueAtTime(0.09, t0 + 2.2)
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.4)
        osc.connect(env)
        detune.connect(env)
        env.connect(this.musicGain)
        osc.start(t0)
        detune.start(t0)
        osc.stop(t0 + 7.6)
        detune.stop(t0 + 7.6)
      }
    }
    playChord()
    this.musicTimer = window.setInterval(playChord, 7000)
  }

  /** Stoppar musiken och släpper noderna. */
  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
    for (const node of this.musicNodes) {
      try {
        if (node instanceof AudioScheduledSourceNode) node.stop()
        node.disconnect()
      } catch {
        // Redan stoppad – ofarligt.
      }
    }
    this.musicNodes = []
  }

  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on
    if (on) this.startMusic()
    else this.stopMusic()
  }
}

/** Global singleton – importeras där ljud behövs. */
export const sound = new SoundEngine()
