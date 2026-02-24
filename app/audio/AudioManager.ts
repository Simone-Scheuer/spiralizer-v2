/**
 * Uzumaki — Audio Manager
 *
 * Orchestrates SpiralMusicEngine + ReactiveEngine.
 * tick() is called each animation frame and returns:
 *   - fftData: raw FFT bytes for the visualizer (null when not reactive)
 *   - reactiveMods: config overrides derived from audio band energies
 *
 * The generative engine is lazily initialised on first use to avoid
 * creating oscillators when audio is never used.
 */

import { SpiralMusicEngine } from './GenerativeEngine'
import { ReactiveEngine }    from './ReactiveEngine'
import type { SpiralConfigV2, AudioState, AudioMapping } from '@/app/models/types'

export class AudioManager {
  private ctx: AudioContext | null = null
  private generative: SpiralMusicEngine | null = null
  private reactive: ReactiveEngine | null = null
  private genInitialized = false

  /** Create AudioContext. Must be called from a user gesture. */
  initContext(): void {
    if (this.ctx) return
    this.ctx = new AudioContext()
    this.generative = new SpiralMusicEngine()
    this.reactive = new ReactiveEngine()
  }

  get isInitialized(): boolean { return this.ctx !== null }

  /** Expose current scale name for UI display */
  getCurrentScaleName(): string {
    return this.generative?.getCurrentScaleName() ?? '—'
  }

  // ── Per-frame tick ─────────────────────────────────────────────────────────

  tick(
    config: SpiralConfigV2,
    audioState: AudioState
  ): { fftData: Uint8Array | null; reactiveMods: Partial<SpiralConfigV2> } {
    if (!this.ctx) return { fftData: null, reactiveMods: {} }

    const { mode, mappings, volume } = audioState

    if (mode === 'off') {
      if (this.genInitialized) this.generative?.setVolume(0, this.ctx)
      return { fftData: null, reactiveMods: {} }
    }

    // Resume context if it was auto-suspended by the browser
    if (this.ctx.state === 'suspended') this.ctx.resume()

    // ── Generative ──────────────────────────────────────────────────────────
    if (mode === 'generate' || mode === 'both') {
      if (!this.genInitialized) {
        this.generative?.init(this.ctx)
        this.genInitialized = true
      }
      this.generative?.tick(config, audioState, this.ctx)
      this.generative?.setVolume(volume, this.ctx)
    } else {
      if (this.genInitialized) this.generative?.setVolume(0, this.ctx)
    }

    // ── Reactive ────────────────────────────────────────────────────────────
    let fftData: Uint8Array | null = null
    const reactiveMods: Partial<SpiralConfigV2> = {}

    if (mode === 'react' || mode === 'both') {
      this.reactive?.update()
      const raw = this.reactive?.getFFTData()
      if (raw && raw.length > 0) fftData = raw

      const isBeat = this.reactive?.isBeat() ?? false

      for (const mapping of mappings) {
        const energy =
          mapping.band === 'beat'
            ? (isBeat ? 1 : 0)
            : (this.reactive?.getBandEnergy(mapping.band as 'bass' | 'mid' | 'treble') ?? 0)

        const mod = this._applyMapping(mapping, energy, config)
        if (mod !== undefined) Object.assign(reactiveMods, { [mapping.parameter]: mod })
      }
    }

    return { fftData, reactiveMods }
  }

  // ── Source control ─────────────────────────────────────────────────────────

  async setSource(source: 'mic' | 'file', file?: File): Promise<void> {
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') await this.ctx.resume()

    if (source === 'mic') {
      await this.reactive?.connectMicrophone(this.ctx)
    } else if (source === 'file' && file) {
      const buf      = await file.arrayBuffer()
      const audioBuf = await this.ctx.decodeAudioData(buf)
      this.reactive?.connectFileBuffer(this.ctx, audioBuf)
    }
  }

  disconnectReactive(): void {
    this.reactive?.disconnect()
  }

  dispose(): void {
    this.generative?.dispose()
    this.reactive?.disconnect()
    try { this.ctx?.close() } catch { /* ignore */ }
    this.ctx = null
    this.genInitialized = false
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _applyMapping(
    mapping: AudioMapping,
    energy: number,
    config: SpiralConfigV2
  ): number | undefined {
    const base = config[mapping.parameter]
    if (typeof base !== 'number') return undefined

    switch (mapping.mode) {
      case 'add':
        return base + energy * mapping.intensity * Math.abs(base) * 0.5
      case 'multiply':
        return base * (1 + energy * mapping.intensity)
      case 'set': {
        const lo = mapping.min ?? 0
        const hi = mapping.max ?? Math.abs(base) * 2
        return lo + energy * (hi - lo)
      }
    }
  }
}
