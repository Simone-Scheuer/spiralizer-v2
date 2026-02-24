/**
 * Uzumaki — Reactive Audio Engine
 *
 * Analyses incoming audio (microphone or file) via an AnalyserNode (FFT).
 * Exposes per-band energy (bass/mid/treble, all 0–1) and beat detection.
 *
 * Beat detection algorithm:
 *   - Rolling window of 60 energy values (~1 second at 60 fps)
 *   - Beat = current energy > 1.5× rolling average AND avg > noise floor
 *   - 200 ms cooldown between beats
 */

const FFT_SIZE            = 256
const BEAT_THRESHOLD      = 1.5
const BEAT_COOLDOWN_MS    = 200
const ENERGY_HISTORY_LEN  = 60

export class ReactiveEngine {
  private analyser: AnalyserNode | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(0) as any
  private energyHistory: number[] = []
  private lastBeatTime = 0
  private streamTracks: MediaStreamTrack[] = []
  private sourceNode: AudioNode | null = null

  // ── Source connections ──────────────────────────────────────────────────────

  async connectMicrophone(ctx: AudioContext): Promise<void> {
    this.disconnect()
    this._initAnalyser(ctx)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    this.streamTracks = stream.getAudioTracks()
    const source = ctx.createMediaStreamSource(stream)
    source.connect(this.analyser!)
    this.sourceNode = source
  }

  connectFileBuffer(ctx: AudioContext, buffer: AudioBuffer): void {
    this.disconnect()
    this._initAnalyser(ctx)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(this.analyser!)
    source.connect(ctx.destination)
    source.start()
    this.sourceNode = source
  }

  disconnect(): void {
    try { this.sourceNode?.disconnect() } catch { /* ignore */ }
    this.sourceNode = null
    for (const track of this.streamTracks) track.stop()
    this.streamTracks = []
    this.energyHistory = []
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  /** Read FFT snapshot + update beat detector. Call once per frame. */
  update(): void {
    if (!this.analyser) return
    this.analyser.getByteFrequencyData(this.frequencyData)
    const energy = this._sliceEnergy(0, this.frequencyData.length)
    this.energyHistory.push(energy)
    if (this.energyHistory.length > ENERGY_HISTORY_LEN) this.energyHistory.shift()
  }

  // ── Data accessors ─────────────────────────────────────────────────────────

  getBandEnergy(band: 'bass' | 'mid' | 'treble'): number {
    const n = this.frequencyData.length
    if (n === 0) return 0
    switch (band) {
      case 'bass':   return this._sliceEnergy(0,                Math.floor(n * 0.08))
      case 'mid':    return this._sliceEnergy(Math.floor(n * 0.08), Math.floor(n * 0.40))
      case 'treble': return this._sliceEnergy(Math.floor(n * 0.40), Math.floor(n * 0.85))
    }
  }

  isBeat(): boolean {
    if (this.energyHistory.length < 10) return false
    const now = Date.now()
    if (now - this.lastBeatTime < BEAT_COOLDOWN_MS) return false
    const current = this.energyHistory[this.energyHistory.length - 1]
    const avg = this.energyHistory.slice(0, -1).reduce((s, v) => s + v, 0) /
                (this.energyHistory.length - 1)
    if (avg > 0.02 && current > avg * BEAT_THRESHOLD) {
      this.lastBeatTime = now
      return true
    }
    return false
  }

  /** Raw FFT byte array (128 bins, each 0–255). Returns empty array if not connected. */
  getFFTData(): Uint8Array { return this.frequencyData }

  // ── Internals ─────────────────────────────────────────────────────────────

  private _initAnalyser(ctx: AudioContext): void {
    if (this.analyser) return
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = FFT_SIZE
    this.analyser.smoothingTimeConstant = 0.8
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as any
  }

  private _sliceEnergy(start: number, end: number): number {
    if (end <= start || this.frequencyData.length === 0) return 0
    let sum = 0
    for (let i = start; i < end; i++) sum += this.frequencyData[i]
    return sum / ((end - start) * 255)
  }
}
