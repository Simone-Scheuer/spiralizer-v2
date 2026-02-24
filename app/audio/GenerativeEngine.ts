/**
 * Uzumaki — Spiral Music Engine
 *
 * Replaces the Shepard tone engine with a 3-layer ambient generative music system.
 * Spiral parameters drive harmony, timbre, and texture. Runs on its own scheduling
 * clock (setInterval + AudioContext.currentTime lookahead), independent of rAF rate.
 *
 * ── Layers ─────────────────────────────────────────────────────────────────────
 *  A) FM Pad (drone)      — slow evolving FM voice, root note, long attack/release
 *  B) Additive Tones      — harmonic partials derived from spiral math, voice-led melody
 *  C) Noise Bursts        — bandpass-filtered white noise, percussive sparkle
 *
 * ── Signal flow ────────────────────────────────────────────────────────────────
 *  All voices → dryGain ──────────────────────────────────────┐
 *             → ConvolverNode (reverb IR) → wetGain ──────────┤
 *                                                              ↓
 *                                          PingPongDelay → DynamicsCompressor
 *                                                              ↓
 *                                                        masterGain → destination
 */

import type { SpiralConfigV2, AudioState, SpiralFamily } from '@/app/models/types'

// ── Scale definitions ──────────────────────────────────────────────────────────

const SCALES: Record<string, number[]> = {
  pentatonic_minor: [0, 3, 5, 7, 10],
  pentatonic_major: [0, 2, 4, 7, 9],
  major:            [0, 2, 4, 5, 7, 9, 11],
  natural_minor:    [0, 2, 3, 5, 7, 8, 10],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
  whole_tone:       [0, 2, 4, 6, 8, 10],
  diminished:       [0, 2, 3, 5, 6, 8, 9, 11],
  lydian:           [0, 2, 4, 6, 7, 9, 11],
  chromatic:        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
}

const FAMILY_PALETTES: Record<SpiralFamily, string[]> = {
  classic:     ['major', 'natural_minor', 'dorian', 'mixolydian'],
  archimedean: ['pentatonic_minor', 'pentatonic_major'],
  parametric:  ['whole_tone', 'diminished', 'lydian', 'chromatic'],
}

// Simple ratios to snap FM modulator ratio toward (keeps FM musical)
const SIMPLE_RATIOS = [1.0, 1.25, 1.333, 1.5, 2.0, 2.5, 3.0, 4.0, 8.0]

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// ── Helpers ────────────────────────────────────────────────────────────────────

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function snapToSimpleRatio(ratio: number): number {
  const clamped = Math.max(1.0, Math.min(8.0, ratio))
  let best = SIMPLE_RATIOS[0]
  let bestDist = Infinity
  for (const r of SIMPLE_RATIOS) {
    const dist = Math.abs(clamped - r) / r
    if (dist < bestDist) { bestDist = dist; best = r }
  }
  // Only snap if within 15% tolerance; otherwise return clamped (raw) value
  return bestDist < 0.15 ? best : clamped
}

function createReverbIR(ctx: AudioContext, durationS: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * durationS)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

function exponentialRandom(mean: number): number {
  // Poisson inter-arrival time: -mean * ln(U)
  return -mean * Math.log(Math.max(1e-9, Math.random()))
}

// ── FM voice ──────────────────────────────────────────────────────────────────

interface FMVoice {
  carrier:   OscillatorNode
  modulator: OscillatorNode
  modGain:   GainNode       // modulation depth
  envGain:   GainNode       // amplitude envelope
}

// ── Main engine ───────────────────────────────────────────────────────────────

export class SpiralMusicEngine {
  private ctx: AudioContext | null = null

  // Signal path nodes
  private masterGain:  GainNode | null = null
  private compressor:  DynamicsCompressorNode | null = null
  private dryGain:     GainNode | null = null
  private wetGain:     GainNode | null = null
  private reverb:      ConvolverNode | null = null
  private delayL:      DelayNode | null = null
  private delayR:      DelayNode | null = null
  private delayFbL:    GainNode | null = null
  private delayFbR:    GainNode | null = null
  private delayOut:    GainNode | null = null

  // Voice pool — 6 additive-tone voices
  private voicePool:   Array<{ osc: OscillatorNode; gain: GainNode; busy: boolean }> = []
  private lastMelodyMidi = 60

  // FM pad voices (2)
  private fmVoices:    FMVoice[] = []

  // Noise buffer (pre-generated, reused)
  private noiseBuffer: AudioBuffer | null = null
  private noiseFilter: BiquadFilterNode | null = null
  private noiseGain:   GainNode | null = null

  // Musical state
  private currentScaleName = 'pentatonic_minor'
  private currentScale:    number[] = SCALES.pentatonic_minor
  private rootMidi = 60   // C4
  private rootDriftAcc = 0
  private harmonicRatio = 1.5

  // Scheduling
  private schedInterval: ReturnType<typeof setInterval> | null = null
  private nextTime = { drone: 0, melody: 0, sparkle: 0 }
  private readonly LOOKAHEAD = 0.025  // seconds
  private readonly SCHED_MS  = 10

  // Live config references (updated by tick)
  private config: SpiralConfigV2 | null = null
  private audioState: AudioState | null = null

  // ── Initialisation ──────────────────────────────────────────────────────────

  init(ctx: AudioContext): void {
    if (this.masterGain) return  // already initialised
    this.ctx = ctx

    // Master output chain: compressor → masterGain → destination
    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = 0   // silent until setVolume() called
    this.masterGain.connect(ctx.destination)

    this.compressor = ctx.createDynamicsCompressor()
    this.compressor.threshold.value = -18
    this.compressor.knee.value       = 10
    this.compressor.ratio.value      = 4
    this.compressor.attack.value     = 0.05
    this.compressor.release.value    = 0.3
    this.compressor.connect(this.masterGain)

    // Ping-pong delay → compressor
    this.delayOut = ctx.createGain()
    this.delayOut.gain.value = 0.22
    this.delayOut.connect(this.compressor)

    this.delayL   = ctx.createDelay(2.0)
    this.delayR   = ctx.createDelay(2.0)
    this.delayL.delayTime.value = 0.31
    this.delayR.delayTime.value = 0.47

    this.delayFbL = ctx.createGain()
    this.delayFbR = ctx.createGain()
    this.delayFbL.gain.value = 0.35
    this.delayFbR.gain.value = 0.35

    // Cross-feed: L → R → L
    this.delayL.connect(this.delayFbL)
    this.delayFbL.connect(this.delayR)
    this.delayR.connect(this.delayFbR)
    this.delayFbR.connect(this.delayL)
    this.delayL.connect(this.delayOut)
    this.delayR.connect(this.delayOut)

    // Reverb
    this.reverb  = ctx.createConvolver()
    this.reverb.buffer = createReverbIR(ctx, 3.5, 2.0)

    this.dryGain = ctx.createGain()
    this.wetGain = ctx.createGain()
    this.dryGain.gain.value = 0.4
    this.wetGain.gain.value = 0.6  // default reverbAmount 0.6 maps here

    this.dryGain.connect(this.compressor)
    this.reverb.connect(this.wetGain)
    this.wetGain.connect(this.compressor)

    // Also route wet through delay for extra space
    this.reverb.connect(this.delayL!)

    // ── Voice pool (6 additive-tone voices) ─────────────────────────────────
    for (let i = 0; i < 6; i++) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 440
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(this.dryGain)
      gain.connect(this.reverb)
      osc.start()
      this.voicePool.push({ osc, gain, busy: false })
    }

    // ── FM pad voices (2) ────────────────────────────────────────────────────
    for (let i = 0; i < 2; i++) {
      const carrier   = ctx.createOscillator()
      const modulator = ctx.createOscillator()
      const modGain   = ctx.createGain()
      const envGain   = ctx.createGain()

      carrier.type   = 'sine'
      modulator.type = 'sine'
      carrier.frequency.value   = 220
      modulator.frequency.value = 330
      modGain.gain.value = 0
      envGain.gain.value = 0

      modulator.connect(modGain)
      modGain.connect(carrier.frequency)  // FM modulation
      carrier.connect(envGain)
      envGain.connect(this.dryGain!)
      envGain.connect(this.reverb!)

      carrier.start()
      modulator.start()
      this.fmVoices.push({ carrier, modulator, modGain, envGain })
    }

    // ── Noise buffer for sparkle layer ───────────────────────────────────────
    const bufLen = ctx.sampleRate * 2  // 2-second noise buffer, looped
    this.noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const noiseData = this.noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufLen; i++) noiseData[i] = Math.random() * 2 - 1

    this.noiseFilter = ctx.createBiquadFilter()
    this.noiseFilter.type = 'bandpass'
    this.noiseFilter.frequency.value = 800
    this.noiseFilter.Q.value = 2.5

    this.noiseGain = ctx.createGain()
    this.noiseGain.gain.value = 0

    this.noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.dryGain!)
    this.noiseGain.connect(this.reverb!)

    // ── Start scheduler ──────────────────────────────────────────────────────
    this._runScheduler()
  }

  // ── Per-frame tick ──────────────────────────────────────────────────────────

  tick(config: SpiralConfigV2, audioState: AudioState, ctx: AudioContext): void {
    if (!this.masterGain || !ctx) return
    this.config     = config
    this.audioState = audioState

    // Update reverb wet/dry from audioState
    const wet = audioState.reverbAmount
    this.wetGain?.gain.setTargetAtTime(wet * 0.9, ctx.currentTime, 0.3)
    this.dryGain?.gain.setTargetAtTime((1 - wet) * 0.7 + 0.1, ctx.currentTime, 0.3)

    // Slowly drift root note (every ~30s in real time)
    this._updateRoot(config)
    // Re-derive scale + harmonic ratio on each tick (cheap)
    this._deriveScale(config)
    this.harmonicRatio = this._deriveHarmonicRatio(config)
  }

  setVolume(v: number, ctx: AudioContext): void {
    this.masterGain?.gain.setTargetAtTime(v * 0.55, ctx.currentTime, 0.08)
  }

  getCurrentScaleName(): string {
    const root = NOTE_NAMES[this.rootMidi % 12]
    return `${this.currentScaleName.replace(/_/g, ' ')} · ${root}`
  }

  dispose(): void {
    if (this.schedInterval !== null) {
      clearInterval(this.schedInterval)
      this.schedInterval = null
    }

    for (const v of this.voicePool) {
      try { v.osc.stop() } catch { /* already stopped */ }
    }
    for (const v of this.fmVoices) {
      try { v.carrier.stop()   } catch { /* */ }
      try { v.modulator.stop() } catch { /* */ }
    }

    this.voicePool  = []
    this.fmVoices   = []
    this.masterGain = null
    this.ctx        = null
    this.config     = null
    this.audioState = null
  }

  // ── Scheduler ───────────────────────────────────────────────────────────────

  private _runScheduler(): void {
    this.schedInterval = setInterval(() => {
      if (!this.ctx || !this.config || !this.audioState) return
      if (this.ctx.state === 'suspended') return

      const now       = this.ctx.currentTime
      const lookahead = now + this.LOOKAHEAD
      const as        = this.audioState

      if (as.droneEnabled   && this.nextTime.drone   < lookahead) this._scheduleDrone()
      if (as.melodyEnabled  && this.nextTime.melody  < lookahead) this._scheduleMelody()
      if (as.sparkleEnabled && this.nextTime.sparkle < lookahead) this._scheduleSparkle()
    }, this.SCHED_MS)
  }

  // ── Layer A: FM Pad ─────────────────────────────────────────────────────────

  private _scheduleDrone(): void {
    if (!this.ctx || !this.audioState) return
    const now     = Math.max(this.ctx.currentTime, this.nextTime.drone)
    const density = this.audioState.musicDensity
    // Drone retriggers every 8–20s, less often when sparse
    const interval = 8 + (1 - density) * 12

    for (let i = 0; i < this.fmVoices.length; i++) {
      const voice = this.fmVoices[i]
      const octOffset = i === 0 ? 0 : -12  // second voice one octave lower

      const rootHz     = midiToHz(this.rootMidi + octOffset)
      const modulatorHz = rootHz * this.harmonicRatio

      const attack  = 2.0 + (1 - density)        // 2–3s
      const sustain = interval * 0.65
      const release = 3.0

      // Modulation depth: gives FM its character — sweeps slowly
      const modDepth = rootHz * (0.3 + (this.harmonicRatio - 1) * 0.5)

      voice.carrier.frequency.setTargetAtTime(rootHz,      now,       0.1)
      voice.modulator.frequency.setTargetAtTime(modulatorHz, now,     0.1)
      voice.modGain.gain.cancelScheduledValues(now)
      voice.modGain.gain.setValueAtTime(0, now)
      voice.modGain.gain.linearRampToValueAtTime(modDepth,  now + attack)
      voice.modGain.gain.setValueAtTime(modDepth * 0.7, now + attack + sustain)
      voice.modGain.gain.linearRampToValueAtTime(0, now + attack + sustain + release)

      const peakGain = 0.18 / this.fmVoices.length
      voice.envGain.gain.cancelScheduledValues(now)
      voice.envGain.gain.setValueAtTime(0, now)
      voice.envGain.gain.linearRampToValueAtTime(peakGain, now + attack)
      voice.envGain.gain.setValueAtTime(peakGain * 0.7, now + attack + sustain)
      voice.envGain.gain.linearRampToValueAtTime(0, now + attack + sustain + release)
    }

    this.nextTime.drone = now + interval
  }

  // ── Layer B: Additive Tones ─────────────────────────────────────────────────

  private _scheduleMelody(): void {
    if (!this.ctx || !this.config || !this.audioState) return
    const now     = Math.max(this.ctx.currentTime, this.nextTime.melody)
    const density = this.audioState.musicDensity

    // Note interval: 1.5s–6s inversely related to density
    const interval = 1.5 + (1 - density) * 4.5

    // Next note via voice leading
    const nextMidi = this._nextMelodyNote()
    this.lastMelodyMidi = nextMidi

    const driftCents = this._microtonalDrift(this.config)
    const driftRatio = Math.pow(2, driftCents / 1200)

    // Find a free voice; steal oldest-started voice if all busy
    const voice = this._claimVoice(now)

    const baseHz  = midiToHz(nextMidi) * driftRatio
    const attack  = 0.08
    const sustain = interval * 0.5 + 0.3
    const release = 0.45
    const peak    = 0.12

    // Stack partials at ratio multiples, wrapped to ≤3 octaves
    const numPartials = 3
    for (let p = 0; p < numPartials; p++) {
      const rawRatio = Math.pow(this.harmonicRatio, p)
      // Wrap into 3-octave window
      let hz = baseHz * rawRatio
      while (hz > baseHz * 8) hz /= 2
      const partialGain = peak * Math.pow(0.55, p)

      if (p === 0) {
        // Main voice uses claimed voice slot
        voice.osc.frequency.setTargetAtTime(hz, now, 0.01)
        voice.gain.gain.cancelScheduledValues(now)
        voice.gain.gain.setValueAtTime(0, now)
        voice.gain.gain.linearRampToValueAtTime(partialGain, now + attack)
        voice.gain.gain.setValueAtTime(partialGain, now + attack + sustain)
        voice.gain.gain.linearRampToValueAtTime(0, now + attack + sustain + release)
      } else {
        // Extra partials get short-lived voices from pool
        const pv = this._claimVoice(now)
        pv.osc.frequency.setTargetAtTime(hz, now, 0.01)
        pv.gain.gain.cancelScheduledValues(now)
        pv.gain.gain.setValueAtTime(0, now)
        pv.gain.gain.linearRampToValueAtTime(partialGain, now + attack)
        pv.gain.gain.setValueAtTime(partialGain * 0.8, now + attack + sustain * 0.6)
        pv.gain.gain.linearRampToValueAtTime(0, now + attack + sustain * 0.6 + release)
        // Mark free after note ends
        const releaseEnd = attack + sustain * 0.6 + release
        setTimeout(() => { pv.busy = false }, releaseEnd * 1000 + 50)
      }
    }

    // Mark main voice free after note ends
    const totalDur = attack + sustain + release
    setTimeout(() => { voice.busy = false }, totalDur * 1000 + 50)

    this.nextTime.melody = now + interval
  }

  // ── Layer C: Noise Bursts ───────────────────────────────────────────────────

  private _scheduleSparkle(): void {
    if (!this.ctx || !this.audioState || !this.noiseBuffer || !this.noiseFilter || !this.noiseGain) return
    const now     = Math.max(this.ctx.currentTime, this.nextTime.sparkle)
    const density = this.audioState.musicDensity

    // Poisson inter-arrival: mean 0.5–3s depending on density
    const mean     = 0.5 + (1 - density) * 2.5
    const interval = exponentialRandom(mean)

    // Tune noise filter to a random scale note
    const noteHz = midiToHz(this._randomScaleNote(this.rootMidi, this.currentScale, 4, 6))
    this.noiseFilter.frequency.setTargetAtTime(noteHz, now, 0.01)

    // Short burst: 30–150ms
    const burstDur = 0.03 + Math.random() * 0.12
    const peakGain = 0.07 + Math.random() * 0.08

    // Use noise buffer source (create new each time — cheap small buffer)
    const src = this.ctx.createBufferSource()
    src.buffer  = this.noiseBuffer
    src.loop    = true
    src.connect(this.noiseFilter)
    src.start(now)
    src.stop(now + burstDur + 0.05)

    this.noiseGain.gain.cancelScheduledValues(now)
    this.noiseGain.gain.setValueAtTime(0, now)
    this.noiseGain.gain.linearRampToValueAtTime(peakGain, now + 0.004)
    this.noiseGain.gain.linearRampToValueAtTime(0, now + burstDur)

    this.nextTime.sparkle = now + Math.max(0.1, interval)
  }

  // ── Musical math helpers ────────────────────────────────────────────────────

  private _deriveScale(config: SpiralConfigV2): void {
    const palette = FAMILY_PALETTES[config.spiralFamily]
    const angle   = ((config.angleChange % 360) + 360) % 360
    const idx     = Math.floor(angle / 90 * palette.length / 4) % palette.length
    const name    = palette[idx]
    if (name !== this.currentScaleName) {
      this.currentScaleName = name
      this.currentScale     = SCALES[name]
    }
  }

  private _deriveHarmonicRatio(config: SpiralConfigV2): number {
    let raw: number
    switch (config.spiralType) {
      case 'lissajous':
        raw = config.lissFreqX / Math.max(0.1, config.lissFreqY)
        break
      case 'rose':
        raw = config.roseK / Math.max(1, config.roseD)
        break
      case 'harmonograph':
        raw = config.harmFreq1 / Math.max(0.1, config.harmFreq2)
        break
      case 'epitrochoid':
      case 'hypotrochoid':
        raw = config.trochoidR / Math.max(1, config.trochoidr)
        break
      case 'archimedean':
      case 'fermat':
      case 'hyperbolic':
      case 'lituus':
        raw = Math.max(1.0, config.archB * 0.1 + 1.0)
        break
      default:
        // classic types: golden-ratio-adjacent sweep
        raw = 1.0 + ((config.angleChange % 90) / 90)
        break
    }
    return snapToSimpleRatio(raw)
  }

  private _updateRoot(config: SpiralConfigV2): void {
    // Drift root at ~1 chromatic step per 30 real seconds
    // Seed from a type-specific param so different spirals sound different
    let seed = 0
    switch (config.spiralFamily) {
      case 'archimedean': seed = config.archA * 0.3; break
      case 'parametric':  seed = config.lissPhase  * 0.05; break
      default:            seed = config.angleChange * 0.02; break
    }
    this.rootDriftAcc += 0.00008 + seed * 0.00001
    if (this.rootDriftAcc >= 1) {
      this.rootDriftAcc -= 1
      const dir = Math.random() < 0.5 ? 1 : -1
      this.rootMidi = Math.max(48, Math.min(72, this.rootMidi + dir))
    }
  }

  private _microtonalDrift(config: SpiralConfigV2): number {
    if (config.spiralFamily !== 'parametric') return 0
    switch (config.spiralType) {
      case 'lissajous': {
        const ratio = config.lissFreqX / Math.max(0.1, config.lissFreqY)
        return (ratio % 1) * 40 - 20  // ±20 cents
      }
      case 'rose':
        return ((config.roseK % Math.max(1, config.roseD)) / Math.max(1, config.roseD)) * 30 - 15
      case 'harmonograph': {
        const ratio = config.harmFreq1 / Math.max(0.1, config.harmFreq2)
        return (ratio % 1) * 50 - 25  // ±25 cents
      }
      default: {
        const ratio = config.trochoidr / Math.max(1, config.trochoidR)
        return (ratio % 1) * 35 - 17  // ±17 cents
      }
    }
  }

  private _nextMelodyNote(): number {
    const last  = this.lastMelodyMidi
    const scale = this.currentScale
    const root  = this.rootMidi

    // Build candidate notes from scale over 3 octaves centered on middle range
    const candidates: number[] = []
    for (let oct = -1; oct <= 2; oct++) {
      for (const interval of scale) {
        const midi = root + oct * 12 + interval
        if (midi >= 48 && midi <= 84) candidates.push(midi)
      }
    }

    if (candidates.length === 0) return 60

    // 70% stepwise (≤5 semitones from last), 30% leap
    const stepwise = candidates.filter(n => Math.abs(n - last) <= 5 && n !== last)
    const leaps    = candidates.filter(n => Math.abs(n - last) > 5 && n !== last)

    const pool = Math.random() < 0.7 && stepwise.length > 0 ? stepwise : leaps.length > 0 ? leaps : candidates
    return pool[Math.floor(Math.random() * pool.length)]
  }

  private _randomScaleNote(root: number, scale: number[], minOct: number, maxOct: number): number {
    const oct  = minOct + Math.floor(Math.random() * (maxOct - minOct + 1))
    const step = scale[Math.floor(Math.random() * scale.length)]
    return root + (oct - 4) * 12 + step
  }

  private _claimVoice(now: number): { osc: OscillatorNode; gain: GainNode; busy: boolean } {
    // Find a free voice
    const free = this.voicePool.find(v => !v.busy)
    if (free) { free.busy = true; return free }

    // All busy — steal the one that started earliest (crudely: find the one
    // with the lowest current gain target; just pick first in pool)
    const stolen = this.voicePool[Math.floor(Math.random() * this.voicePool.length)]
    // Silence immediately
    stolen.gain.gain.cancelScheduledValues(now)
    stolen.gain.gain.setValueAtTime(0, now)
    stolen.busy = true
    return stolen
  }
}
