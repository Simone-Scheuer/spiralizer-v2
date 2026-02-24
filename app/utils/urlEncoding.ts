import LZString from 'lz-string'
import type { SpiralConfigV2, RenderSettings, SpiralFamily, SpiralType, ColorMode, ColorCycleMode, LineCap, LineJoin, BlendMode } from '@/app/models/types'
import { defaultConfigV2, defaultRenderSettings } from '@/app/models/types'
import { clampNum, validateEnum, validateBool, validateHex } from './validation'

/** What gets serialized into the URL hash. */
export interface SharePayload {
  config: SpiralConfigV2
  render: RenderSettings
}

// ─── Valid enum values ───────────────────────────────────────────────────────

const SPIRAL_FAMILIES: readonly SpiralFamily[] = ['classic', 'archimedean', 'parametric']
const SPIRAL_TYPES: readonly SpiralType[] = [
  'linear', 'exponential', 'fibonacci', 'golden',
  'archimedean', 'fermat', 'hyperbolic', 'lituus',
  'lissajous', 'rose', 'harmonograph', 'epitrochoid', 'hypotrochoid',
]
const COLOR_MODES: readonly ColorMode[] = ['solid', 'rainbow', 'gradient', 'cycle']
const COLOR_CYCLES: readonly ColorCycleMode[] = ['none', 'smooth', 'steps', 'random']
const LINE_CAPS: readonly LineCap[] = ['butt', 'round', 'square']
const LINE_JOINS: readonly LineJoin[] = ['round', 'bevel', 'miter']
const BLEND_MODES: readonly BlendMode[] = [
  'source-over', 'add', 'screen', 'multiply', 'overlay',
  'soft-light', 'hard-light', 'color-dodge', 'color-burn',
  'darken', 'lighten', 'difference', 'exclusion',
  'hue', 'saturation', 'luminosity',
]

// ─── Payload Validation ──────────────────────────────────────────────────────

/**
 * Validate and sanitize a decoded share payload.
 * Rejects unknown keys, clamps numeric values to valid ranges,
 * and validates enum/boolean/hex fields against expected values.
 * Returns null if input is not a valid object.
 */
function validateSharePayload(raw: unknown): SharePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!obj.config || typeof obj.config !== 'object') return null

  const c = obj.config as Record<string, unknown>
  const d = defaultConfigV2
  const r = (obj.render ?? {}) as Record<string, unknown>
  const dr = defaultRenderSettings

  const config: SpiralConfigV2 = {
    // Spiral type
    spiralFamily: validateEnum(c.spiralFamily, SPIRAL_FAMILIES, d.spiralFamily),
    spiralType: validateEnum(c.spiralType, SPIRAL_TYPES, d.spiralType),

    // Core motion
    stepLength: clampNum(c.stepLength, 0.1, 100, d.stepLength),
    angleChange: clampNum(c.angleChange, -360, 360, d.angleChange),
    angleIncrement: clampNum(c.angleIncrement, -10, 10, d.angleIncrement),
    speed: clampNum(c.speed, 0, 200, d.speed),
    stepsPerFrame: clampNum(c.stepsPerFrame, 1, 50, d.stepsPerFrame),
    acceleration: clampNum(c.acceleration, -1, 1, d.acceleration),
    reverseDirection: validateBool(c.reverseDirection, d.reverseDirection),

    // Oscillation & wobble
    oscillate: validateBool(c.oscillate, d.oscillate),
    oscillationSpeed: clampNum(c.oscillationSpeed, 0.01, 10, d.oscillationSpeed),
    wobble: validateBool(c.wobble, d.wobble),
    wobbleIntensity: clampNum(c.wobbleIntensity, 0, 1, d.wobbleIntensity),
    wobbleSpeed: clampNum(c.wobbleSpeed, 0.01, 10, d.wobbleSpeed),

    // Origin
    originX: clampNum(c.originX, 0, 1, d.originX),
    originY: clampNum(c.originY, 0, 1, d.originY),

    // Classic
    stepMultiplier: clampNum(c.stepMultiplier, -1, 1, d.stepMultiplier),

    // Archimedean
    archA: clampNum(c.archA, -500, 500, d.archA),
    archB: clampNum(c.archB, -100, 100, d.archB),

    // Lissajous
    lissFreqX: clampNum(c.lissFreqX, 0.1, 20, d.lissFreqX),
    lissFreqY: clampNum(c.lissFreqY, 0.1, 20, d.lissFreqY),
    lissPhase: clampNum(c.lissPhase, 0, 360, d.lissPhase),

    // Rose
    roseK: clampNum(c.roseK, 1, 20, d.roseK),
    roseD: clampNum(c.roseD, 1, 20, d.roseD),

    // Trochoid
    trochoidR: clampNum(c.trochoidR, 1, 500, d.trochoidR),
    trochoidr: clampNum(c.trochoidr, 1, 500, d.trochoidr),
    trochoidD: clampNum(c.trochoidD, 1, 500, d.trochoidD),

    // Harmonograph
    harmFreq1: clampNum(c.harmFreq1, 0.1, 20, d.harmFreq1),
    harmFreq2: clampNum(c.harmFreq2, 0.1, 20, d.harmFreq2),
    harmPhase1: clampNum(c.harmPhase1, 0, 360, d.harmPhase1),
    harmPhase2: clampNum(c.harmPhase2, 0, 360, d.harmPhase2),
    harmDecay1: clampNum(c.harmDecay1, 0, 1, d.harmDecay1),
    harmDecay2: clampNum(c.harmDecay2, 0, 1, d.harmDecay2),
    harmAmp1: clampNum(c.harmAmp1, 1, 1000, d.harmAmp1),
    harmAmp2: clampNum(c.harmAmp2, 1, 1000, d.harmAmp2),

    // Style
    color: validateHex(c.color, d.color),
    lineWidth: clampNum(c.lineWidth, 0.1, 50, d.lineWidth),
    lineCap: validateEnum(c.lineCap, LINE_CAPS, d.lineCap),
    lineJoin: validateEnum(c.lineJoin, LINE_JOINS, d.lineJoin),
    baseOpacity: clampNum(c.baseOpacity, 0, 1, d.baseOpacity),
    blendMode: validateEnum(c.blendMode, BLEND_MODES, d.blendMode),
    fadeOpacity: validateBool(c.fadeOpacity, d.fadeOpacity),

    // Color modes
    colorMode: validateEnum(c.colorMode, COLOR_MODES, d.colorMode),
    rainbowSpeed: clampNum(c.rainbowSpeed, 0.01, 10, d.rainbowSpeed),
    gradientColorA: validateHex(c.gradientColorA, d.gradientColorA),
    gradientColorB: validateHex(c.gradientColorB, d.gradientColorB),
    gradientSpeed: clampNum(c.gradientSpeed, 0.01, 10, d.gradientSpeed),
    gradientReverse: validateBool(c.gradientReverse, d.gradientReverse),
    colorCycle: validateEnum(c.colorCycle, COLOR_CYCLES, d.colorCycle),
    colorSteps: clampNum(c.colorSteps, 2, 50, d.colorSteps),

    // Pattern
    multiLineCount: clampNum(c.multiLineCount, 1, 20, d.multiLineCount),
    multiLineSpacing: clampNum(c.multiLineSpacing, 0, 100, d.multiLineSpacing),
    rotationOffset: clampNum(c.rotationOffset, 0, 360, d.rotationOffset),
    symmetry: clampNum(c.symmetry, 1, 36, d.symmetry),
    symmetryRotation: clampNum(c.symmetryRotation, 0, 360, d.symmetryRotation),
    pulseEffect: validateBool(c.pulseEffect, d.pulseEffect),
    pulseSpeed: clampNum(c.pulseSpeed, 0.01, 10, d.pulseSpeed),
    pulseRange: clampNum(c.pulseRange, 0, 1, d.pulseRange),
  }

  const render: RenderSettings = {
    bloomEnabled: validateBool(r.bloomEnabled, dr.bloomEnabled),
    bloomIntensity: clampNum(r.bloomIntensity, 0, 3, dr.bloomIntensity),
    bloomThreshold: clampNum(r.bloomThreshold, 0, 1, dr.bloomThreshold),
    bloomRadius: clampNum(r.bloomRadius, 0, 2, dr.bloomRadius),
    motionTrail: clampNum(r.motionTrail, 0, 1, dr.motionTrail),
    chromaticAberrationEnabled: validateBool(r.chromaticAberrationEnabled, dr.chromaticAberrationEnabled),
    chromaticAberration: clampNum(r.chromaticAberration, 0, 0.1, dr.chromaticAberration),
    vignetteEnabled: validateBool(r.vignetteEnabled, dr.vignetteEnabled),
    vignetteIntensity: clampNum(r.vignetteIntensity, 0, 2, dr.vignetteIntensity),
    filmGrainEnabled: validateBool(r.filmGrainEnabled, dr.filmGrainEnabled),
    filmGrain: clampNum(r.filmGrain, 0, 1, dr.filmGrain),
  }

  return { config, render }
}

/**
 * Compress a config + render settings into a URI-safe string.
 * Uses lz-string for ~60-70% size reduction vs raw JSON.
 */
export function encodeSharePayload(config: SpiralConfigV2, render: RenderSettings): string {
  const payload: SharePayload = { config, render }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

/**
 * Decompress a URI-safe string back into config + render settings.
 * Validates the payload structure and clamps all values to safe ranges.
 * Returns null on any parse or validation error.
 */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const raw = JSON.parse(json)
    return validateSharePayload(raw)
  } catch {
    return null
  }
}

/**
 * Build a full share URL with the config encoded in the hash.
 * Format: `https://host/path#s=<compressed>`
 */
export function getShareURL(config: SpiralConfigV2, render: RenderSettings): string {
  const encoded = encodeSharePayload(config, render)
  return `${window.location.origin}${window.location.pathname}#s=${encoded}`
}

/**
 * Parse the current URL hash for a share payload.
 * Returns null if no `#s=` hash is present or if decoding fails.
 */
export function parseShareURL(): SharePayload | null {
  const hash = window.location.hash
  if (!hash.startsWith('#s=')) return null
  return decodeSharePayload(hash.slice(3))
}
