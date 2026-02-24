/**
 * Uzumaki — TypeScript Type Definitions
 * Single source of truth for all interfaces.
 */

// ─── Spiral Families & Types ──────────────────────────────────────────────────

export type SpiralFamily = 'classic' | 'archimedean' | 'parametric'

export type ClassicSpiralType = 'linear' | 'exponential' | 'fibonacci' | 'golden'
export type ArchimedeanSpiralType = 'archimedean' | 'fermat' | 'hyperbolic' | 'lituus'
export type ParametricSpiralType = 'lissajous' | 'rose' | 'harmonograph' | 'epitrochoid' | 'hypotrochoid'

export type SpiralType = ClassicSpiralType | ArchimedeanSpiralType | ParametricSpiralType

// ─── Color Modes ──────────────────────────────────────────────────────────────

export type ColorMode = 'solid' | 'rainbow' | 'gradient' | 'cycle'
export type ColorCycleMode = 'none' | 'smooth' | 'steps' | 'random'
export type LineCap = 'butt' | 'round' | 'square'
export type LineJoin = 'round' | 'bevel' | 'miter'

// ─── Blend Modes ──────────────────────────────────────────────────────────────

export type BlendMode =
  | 'source-over' | 'add' | 'screen' | 'multiply' | 'overlay'
  | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn'
  | 'darken' | 'lighten' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'luminosity'

// ─── Audio ────────────────────────────────────────────────────────────────────

export type AudioMode = 'off' | 'generate' | 'react' | 'both'
export type AudioSource = 'mic' | 'file' | null
export type AudioBand = 'bass' | 'mid' | 'treble' | 'beat'
export type AudioMappingMode = 'add' | 'multiply' | 'set'

export interface AudioMapping {
  id: string
  band: AudioBand
  parameter: keyof SpiralConfigV2
  intensity: number  // 0–1
  mode: AudioMappingMode
  min?: number
  max?: number
}

// ─── Main Config ──────────────────────────────────────────────────────────────

export interface SpiralConfigV2 {
  // === Spiral Type ===
  /** Which mathematical family the spiral belongs to */
  spiralFamily: SpiralFamily
  /** Specific spiral type within the family */
  spiralType: SpiralType

  // === Core Motion ===
  /** Distance between path points */
  stepLength: number
  /** Degrees to rotate per step */
  angleChange: number
  /** Rotation acceleration per step (grows the angle over time) */
  angleIncrement: number
  /** ms delay between rAF ticks (0 = run every rAF, higher = slower) */
  speed: number
  /** Steps computed per rAF tick — multiply effective speed without changing delay */
  stepsPerFrame: number
  /** Speed change per step */
  acceleration: number
  /** Draw inward instead of outward */
  reverseDirection: boolean

  // === Oscillation & Wobble ===
  /** Oscillate the angle back and forth */
  oscillate: boolean
  /** Oscillation frequency multiplier */
  oscillationSpeed: number
  /** Add random jitter to the angle */
  wobble: boolean
  /** Wobble magnitude (0–1) */
  wobbleIntensity: number
  /** Wobble frequency multiplier */
  wobbleSpeed: number

  // === Origin ===
  /** Canvas origin X as a fraction of width (0–1) */
  originX: number
  /** Canvas origin Y as a fraction of height (0–1) */
  originY: number

  // === Classic Family Parameters ===
  /** Growth multiplier per step for classic spiral types */
  stepMultiplier: number

  // === Archimedean Family Parameters ===
  /** Archimedean: 'a' constant (initial offset) */
  archA: number
  /** Archimedean: 'b' constant (growth rate) */
  archB: number

  // === Lissajous Parameters ===
  /** Lissajous: horizontal frequency */
  lissFreqX: number
  /** Lissajous: vertical frequency */
  lissFreqY: number
  /** Lissajous: phase offset in degrees */
  lissPhase: number

  // === Rose Curve Parameters ===
  /** Rose curve: numerator of k/d ratio */
  roseK: number
  /** Rose curve: denominator of k/d ratio */
  roseD: number

  // === Trochoid Parameters (epi + hypo) ===
  /** Trochoid: fixed circle radius */
  trochoidR: number
  /** Trochoid: rolling circle radius */
  trochoidr: number
  /** Trochoid: distance from rolling circle center to drawing point */
  trochoidD: number

  // === Harmonograph Parameters ===
  /** Harmonograph: pendulum 1 frequency */
  harmFreq1: number
  /** Harmonograph: pendulum 2 frequency */
  harmFreq2: number
  /** Harmonograph: pendulum 1 phase offset in degrees */
  harmPhase1: number
  /** Harmonograph: pendulum 2 phase offset in degrees */
  harmPhase2: number
  /** Harmonograph: pendulum 1 decay rate */
  harmDecay1: number
  /** Harmonograph: pendulum 2 decay rate */
  harmDecay2: number
  /** Harmonograph: pendulum 1 amplitude */
  harmAmp1: number
  /** Harmonograph: pendulum 2 amplitude */
  harmAmp2: number

  // === Style ===
  /** Base stroke color (hex) */
  color: string
  /** Line thickness in pixels */
  lineWidth: number
  /** Line end cap style */
  lineCap: LineCap
  /** Corner join style */
  lineJoin: LineJoin
  /** Global opacity (0–1) */
  baseOpacity: number
  /** WebGL blend mode */
  blendMode: BlendMode
  /** Fade opacity over time */
  fadeOpacity: boolean

  // === Color Modes ===
  /** Which color mode is active */
  colorMode: ColorMode
  /** Rainbow hue cycling speed */
  rainbowSpeed: number
  /** Start color for gradient mode */
  gradientColorA: string
  /** End color for gradient mode */
  gradientColorB: string
  /** Gradient cycling speed */
  gradientSpeed: number
  /** Reverse gradient direction */
  gradientReverse: boolean
  /** Color cycle mode (within 'cycle' colorMode) */
  colorCycle: ColorCycleMode
  /** Number of steps in stepped cycle mode */
  colorSteps: number

  // === Pattern ===
  /** Number of parallel spiral lines */
  multiLineCount: number
  /** Gap between parallel lines */
  multiLineSpacing: number
  /** Initial rotation offset in degrees */
  rotationOffset: number
  /** Number of radial symmetry copies */
  symmetry: number
  /** Rotation offset between symmetry copies in degrees */
  symmetryRotation: number
  /** Pulse the line width */
  pulseEffect: boolean
  /** Pulse frequency */
  pulseSpeed: number
  /** Pulse amplitude (0–1) */
  pulseRange: number
}

// ─── Per-Parameter Locks ──────────────────────────────────────────────────────

export type SpiralConfigLocks = {
  [K in keyof SpiralConfigV2]: boolean
}

// ─── Randomization Constraints ────────────────────────────────────────────────

/** Min/max bounds applied to a numeric parameter during randomization. */
export interface ParamRange {
  min: number
  max: number
}

/**
 * Customise what the randomizer can pick.
 *
 * - `allowedSpiralTypes`: null = all 12 types in pool; non-empty array = only those types.
 * - `allowedColorModes`: null = all 4 modes in pool; non-empty array = only those modes.
 * - `paramRanges`: keyed by SpiralConfigV2 field name. When set, randomizer clamps to [min, max].
 */
export interface RandomizationConstraints {
  allowedSpiralTypes: SpiralType[] | null
  allowedColorModes: ColorMode[] | null
  paramRanges: Record<string, ParamRange>
}

export const defaultConstraints = (): RandomizationConstraints => ({
  allowedSpiralTypes: null,
  allowedColorModes: null,
  paramRanges: {},
})

// ─── Render Settings ──────────────────────────────────────────────────────────

export interface RenderSettings {
  bloomEnabled: boolean
  bloomIntensity: number
  bloomThreshold: number
  bloomRadius: number
  motionTrail: number
  chromaticAberrationEnabled: boolean
  chromaticAberration: number
  vignetteEnabled: boolean
  vignetteIntensity: number
  filmGrainEnabled: boolean
  filmGrain: number
}

// ─── Audio State ──────────────────────────────────────────────────────────────

export interface AudioState {
  mode: AudioMode
  source: AudioSource
  volume: number
  mappings: AudioMapping[]
  /** Live FFT data (updated each frame when reactive mode is on) */
  fftData: Uint8Array | null
  /** Note trigger density — 0=sparse, 1=dense */
  musicDensity: number
  /** Reverb wet/dry mix — 0=dry, 1=fully wet */
  reverbAmount: number
  /** FM pad drone layer enabled */
  droneEnabled: boolean
  /** Additive harmonic melody layer enabled */
  melodyEnabled: boolean
  /** Filtered noise burst sparkle layer enabled */
  sparkleEnabled: boolean
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type PanelTab = 'shape' | 'motion' | 'style' | 'pattern' | 'audio' | 'presets'

export interface UIState {
  activeTab: PanelTab
  panelCollapsed: boolean
  panelDocked: boolean
  panelX: number
  panelY: number
  zoom: number
  isPaused: boolean
  isFullscreen: boolean
  isImmersive: boolean
  isScreensaver: boolean
  screensaverInterval: number
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface SpiralPreset {
  id: string
  name: string
  config: SpiralConfigV2
  renderSettings: RenderSettings
  thumbnail: string  // data URL
  createdAt: number
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const defaultConfigV2: SpiralConfigV2 = {
  // Spiral type
  spiralFamily: 'classic',
  spiralType: 'linear',

  // Core motion
  stepLength: 5,
  angleChange: 360,
  angleIncrement: 0.1,
  speed: 20,
  stepsPerFrame: 1,
  acceleration: 0,
  reverseDirection: false,

  // Oscillation & wobble
  oscillate: false,
  oscillationSpeed: 1,
  wobble: false,
  wobbleIntensity: 0.5,
  wobbleSpeed: 1,

  // Origin
  originX: 0.5,
  originY: 0.5,

  // Classic
  stepMultiplier: 0.01,

  // Archimedean
  archA: 0,
  archB: 5,

  // Lissajous
  lissFreqX: 3,
  lissFreqY: 2,
  lissPhase: 90,

  // Rose
  roseK: 3,
  roseD: 1,

  // Trochoid
  trochoidR: 80,
  trochoidr: 30,
  trochoidD: 50,

  // Harmonograph
  harmFreq1: 2,
  harmFreq2: 3,
  harmPhase1: 0,
  harmPhase2: 90,
  harmDecay1: 0.001,
  harmDecay2: 0.001,
  harmAmp1: 200,
  harmAmp2: 200,

  // Style
  color: '#00ff88',
  lineWidth: 2,
  lineCap: 'round',
  lineJoin: 'round',
  baseOpacity: 1,
  blendMode: 'source-over',
  fadeOpacity: false,

  // Color modes
  colorMode: 'solid',
  rainbowSpeed: 1,
  gradientColorA: '#00ffcc',
  gradientColorB: '#ff0066',
  gradientSpeed: 1,
  gradientReverse: false,
  colorCycle: 'none',
  colorSteps: 5,

  // Pattern
  multiLineCount: 1,
  multiLineSpacing: 0,
  rotationOffset: 0,
  symmetry: 1,
  symmetryRotation: 0,
  pulseEffect: false,
  pulseSpeed: 1,
  pulseRange: 0.5,
}

export const defaultRenderSettings: RenderSettings = {
  bloomEnabled: false,
  bloomIntensity: 0.5,
  bloomThreshold: 0.2,
  bloomRadius: 0.3,
  motionTrail: 0,
  chromaticAberrationEnabled: false,
  chromaticAberration: 0,
  vignetteEnabled: false,
  vignetteIntensity: 0,
  filmGrainEnabled: false,
  filmGrain: 0,
}

export const defaultAudioState: AudioState = {
  mode: 'off',
  source: null,
  volume: 0.5,
  mappings: [],
  fftData: null,
  musicDensity: 0.5,
  reverbAmount: 0.6,
  droneEnabled: true,
  melodyEnabled: true,
  sparkleEnabled: true,
}

export const defaultUIState: UIState = {
  activeTab: 'shape',
  panelCollapsed: false,
  panelDocked: true,
  panelX: 0,
  panelY: 0,
  zoom: 1,
  isPaused: false,
  isFullscreen: false,
  isImmersive: false,
  isScreensaver: false,
  screensaverInterval: 10,
}

/** Build a default locks object (origin, speed, and angleChange locked for good randomization defaults) */
export function defaultLocks(): SpiralConfigLocks {
  const locks = {} as SpiralConfigLocks
  for (const key in defaultConfigV2) {
    (locks as Record<string, boolean>)[key] = false
  }
  locks.originX = true
  locks.originY = true
  locks.speed = true
  locks.angleChange = true
  return locks
}
