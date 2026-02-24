/**
 * Uzumaki — Randomize engine.
 * Creates a new random SpiralConfigV2 that respects per-param locks and
 * optional randomization constraints (type pool + numeric ranges).
 */

import type {
  SpiralConfigV2,
  SpiralConfigLocks,
  SpiralFamily,
  SpiralType,
  ColorMode,
  RandomizationConstraints,
} from '@/app/models/types'
import { defaultConstraints } from '@/app/models/types'

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** rand() clamped to the constraint range for `key`, falling back to [schemaMin, schemaMax]. */
function crand(key: string, schemaMin: number, schemaMax: number, c: RandomizationConstraints): number {
  const range = c.paramRanges[key]
  if (range) {
    const lo = Math.max(schemaMin, Math.min(schemaMax, range.min))
    const hi = Math.min(schemaMax, Math.max(schemaMin, range.max))
    return rand(lo, hi <= lo ? lo : hi)
  }
  return rand(schemaMin, schemaMax)
}

/** randInt() version of crand(). */
function crandInt(key: string, schemaMin: number, schemaMax: number, c: RandomizationConstraints): number {
  const range = c.paramRanges[key]
  if (range) {
    const lo = Math.round(Math.max(schemaMin, Math.min(schemaMax, range.min)))
    const hi = Math.round(Math.min(schemaMax, Math.max(schemaMin, range.max)))
    return randInt(lo, hi <= lo ? lo : hi)
  }
  return randInt(schemaMin, schemaMax)
}

const CLASSIC_TYPES: SpiralType[] = ['linear', 'exponential', 'fibonacci', 'golden']
const ARCHIMEDEAN_TYPES: SpiralType[] = ['archimedean', 'fermat', 'hyperbolic', 'lituus']
const PARAMETRIC_TYPES: SpiralType[] = ['lissajous', 'rose', 'harmonograph', 'epitrochoid', 'hypotrochoid']
const ALL_TYPES: SpiralType[] = [...CLASSIC_TYPES, ...ARCHIMEDEAN_TYPES, ...PARAMETRIC_TYPES]
const ALL_COLOR_MODES: ColorMode[] = ['solid', 'rainbow', 'gradient', 'cycle']

const FAMILIES: SpiralFamily[] = ['classic', 'archimedean', 'parametric']

const HEX_COLORS = [
  '#00ff88', '#00ffcc', '#ff0066', '#ff6600', '#ffcc00',
  '#00ccff', '#cc00ff', '#ff00cc', '#66ff00', '#0066ff',
  '#ff3366', '#33ffcc', '#ff9900', '#9900ff', '#00ff66',
]

function randomColor(): string {
  return pick(HEX_COLORS)
}

/**
 * Generate a new random config, preserving locked params from `current`
 * and respecting optional `constraints` for type pool and numeric ranges.
 */
export function createRandomConfig(
  current: SpiralConfigV2,
  locks: SpiralConfigLocks,
  constraints: RandomizationConstraints = defaultConstraints()
): SpiralConfigV2 {
  // Helper: use current value if locked, else call fn()
  function maybeRand<K extends keyof SpiralConfigV2>(
    key: K,
    fn: () => SpiralConfigV2[K]
  ): SpiralConfigV2[K] {
    return locks[key] ? current[key] : fn()
  }

  // Determine spiral type — use allowed pool if set
  let spiralType: SpiralType
  let spiralFamily: SpiralFamily

  if (locks.spiralType) {
    spiralType = current.spiralType
    spiralFamily = current.spiralFamily
  } else {
    const pool = (constraints.allowedSpiralTypes && constraints.allowedSpiralTypes.length > 0)
      ? constraints.allowedSpiralTypes
      : ALL_TYPES
    spiralType = pick(pool)
    spiralFamily = CLASSIC_TYPES.includes(spiralType)
      ? 'classic'
      : ARCHIMEDEAN_TYPES.includes(spiralType)
      ? 'archimedean'
      : 'parametric'
  }

  // Color mode — use allowed pool if set
  const colorModePool = (constraints.allowedColorModes && constraints.allowedColorModes.length > 0)
    ? constraints.allowedColorModes
    : (['solid', 'solid', 'rainbow', 'gradient'] as ColorMode[])

  const colorMode = maybeRand('colorMode', () => pick(colorModePool))

  const c = constraints  // shorthand

  return {
    // Type
    spiralFamily: locks.spiralFamily ? current.spiralFamily : spiralFamily,
    spiralType: locks.spiralType ? current.spiralType : spiralType,

    // Core motion
    stepLength:      maybeRand('stepLength',      () => crand('stepLength', 1, 20, c)),
    angleChange:     maybeRand('angleChange',     () => crand('angleChange', 1, 180, c)),
    angleIncrement:  maybeRand('angleIncrement',  () => crand('angleIncrement', -0.5, 0.5, c)),
    speed:           maybeRand('speed',           () => crandInt('speed', 5, 60, c)),
    stepsPerFrame:   maybeRand('stepsPerFrame',   () => 1),
    acceleration:    maybeRand('acceleration',    () => crand('acceleration', -0.05, 0.05, c)),
    reverseDirection: maybeRand('reverseDirection', () => Math.random() < 0.2),

    // Oscillation & wobble
    oscillate:        maybeRand('oscillate',        () => Math.random() < 0.3),
    oscillationSpeed: maybeRand('oscillationSpeed', () => crand('oscillationSpeed', 0.2, 3, c)),
    wobble:           maybeRand('wobble',           () => Math.random() < 0.25),
    wobbleIntensity:  maybeRand('wobbleIntensity',  () => crand('wobbleIntensity', 0.1, 0.8, c)),
    wobbleSpeed:      maybeRand('wobbleSpeed',      () => crand('wobbleSpeed', 0.5, 4, c)),

    // Origin — keep near center to avoid off-screen spirals
    originX: maybeRand('originX', () => crand('originX', 0.3, 0.7, c)),
    originY: maybeRand('originY', () => crand('originY', 0.3, 0.7, c)),

    // Classic
    stepMultiplier: maybeRand('stepMultiplier', () => crand('stepMultiplier', 0, 0.03, c)),

    // Archimedean
    archA: maybeRand('archA', () => crand('archA', 0, 20, c)),
    archB: maybeRand('archB', () => crand('archB', 2, 12, c)),

    // Lissajous
    lissFreqX: maybeRand('lissFreqX', () => crandInt('lissFreqX', 1, 12, c)),
    lissFreqY: maybeRand('lissFreqY', () => crandInt('lissFreqY', 1, 12, c)),
    lissPhase: maybeRand('lissPhase', () => crand('lissPhase', 0, 360, c)),

    // Rose
    roseK: maybeRand('roseK', () => crandInt('roseK', 1, 10, c)),
    roseD: maybeRand('roseD', () => crandInt('roseD', 1, 6, c)),

    // Trochoid
    trochoidR: maybeRand('trochoidR', () => crand('trochoidR', 40, 150, c)),
    trochoidr: maybeRand('trochoidr', () => crand('trochoidr', 10, 80, c)),
    trochoidD: maybeRand('trochoidD', () => crand('trochoidD', 10, 100, c)),

    // Harmonograph
    harmFreq1:  maybeRand('harmFreq1',  () => crand('harmFreq1', 0.5, 8, c)),
    harmFreq2:  maybeRand('harmFreq2',  () => crand('harmFreq2', 0.5, 8, c)),
    harmPhase1: maybeRand('harmPhase1', () => crand('harmPhase1', 0, 360, c)),
    harmPhase2: maybeRand('harmPhase2', () => crand('harmPhase2', 0, 360, c)),
    harmDecay1: maybeRand('harmDecay1', () => crand('harmDecay1', 0.0001, 0.005, c)),
    harmDecay2: maybeRand('harmDecay2', () => crand('harmDecay2', 0.0001, 0.005, c)),
    harmAmp1:   maybeRand('harmAmp1',   () => crand('harmAmp1', 100, 280, c)),
    harmAmp2:   maybeRand('harmAmp2',   () => crand('harmAmp2', 100, 280, c)),

    // Style
    color:      maybeRand('color',      randomColor),
    lineWidth:  maybeRand('lineWidth',  () => crand('lineWidth', 0.5, 8, c)),
    lineCap:    maybeRand('lineCap',    () => pick(['round', 'round', 'butt', 'square'])),
    lineJoin:   maybeRand('lineJoin',   () => pick(['round', 'round', 'bevel'])),
    baseOpacity: maybeRand('baseOpacity', () => crand('baseOpacity', 0.5, 1, c)),
    blendMode:  maybeRand('blendMode',  () =>
      pick(['source-over', 'source-over', 'add', 'screen', 'overlay'])
    ),
    fadeOpacity: maybeRand('fadeOpacity', () => Math.random() < 0.15),

    // Color modes
    colorMode,
    rainbowSpeed:   maybeRand('rainbowSpeed',   () => crand('rainbowSpeed', 0.3, 3, c)),
    gradientColorA: maybeRand('gradientColorA', randomColor),
    gradientColorB: maybeRand('gradientColorB', randomColor),
    gradientSpeed:  maybeRand('gradientSpeed',  () => crand('gradientSpeed', 0.3, 3, c)),
    gradientReverse: maybeRand('gradientReverse', () => Math.random() < 0.5),
    colorCycle:     maybeRand('colorCycle',     () => pick(['none', 'smooth', 'steps'])),
    colorSteps:     maybeRand('colorSteps',     () => crandInt('colorSteps', 2, 10, c)),

    // Pattern
    multiLineCount:   maybeRand('multiLineCount',   () => crandInt('multiLineCount', 1, 6, c)),
    multiLineSpacing: maybeRand('multiLineSpacing', () => crand('multiLineSpacing', 0, 30, c)),
    rotationOffset:   maybeRand('rotationOffset',   () => crand('rotationOffset', 0, 360, c)),
    symmetry:         maybeRand('symmetry',         () => crandInt('symmetry', 1, 8, c)),
    symmetryRotation: maybeRand('symmetryRotation', () => crand('symmetryRotation', 0, 360, c)),
    pulseEffect:      maybeRand('pulseEffect',      () => Math.random() < 0.2),
    pulseSpeed:       maybeRand('pulseSpeed',       () => crand('pulseSpeed', 0.3, 4, c)),
    pulseRange:       maybeRand('pulseRange',       () => crand('pulseRange', 0.1, 0.8, c)),
  }
}

// Export for use in type-pool UI
export { ALL_TYPES, ALL_COLOR_MODES, FAMILIES }
