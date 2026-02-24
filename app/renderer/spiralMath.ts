/**
 * Uzumaki — All spiral math functions.
 * All functions are pure: no side effects, no refs.
 *
 * Coordinate system: Three.js world units, origin at (0, 0).
 * The orthographic camera maps canvas pixels → world units 1:1.
 */

import type { SpiralConfigV2 } from '@/app/models/types'

// ─── Classic Family ────────────────────────────────────────────────────────────
// Step-based: advance position + angle each frame.

const PHI = 1.6180339887  // Golden ratio

/**
 * Compute the step length for classic spiral types.
 * @param base        - base step length (pixels)
 * @param stepCount   - number of steps taken so far
 * @param type        - which growth formula to use
 * @param multiplier  - growth rate multiplier
 */
export function getClassicStepLength(
  base: number,
  stepCount: number,
  type: 'linear' | 'exponential' | 'fibonacci' | 'golden',
  multiplier: number
): number {
  switch (type) {
    case 'linear':
      return base * (1 + stepCount * multiplier)
    case 'exponential':
      return base * Math.pow(1 + multiplier, stepCount)
    case 'fibonacci':
      // φ^(n/50) gives a smooth Fibonacci-like growth curve
      return base * Math.pow(PHI, stepCount * multiplier * 50)
    case 'golden':
      // For golden spiral, step length grows linearly while angle is fixed at 137.508°
      return base * (1 + stepCount * multiplier)
    default:
      return base
  }
}

/**
 * Compute the angle change for the golden spiral type.
 * Returns 137.508° (the golden angle) regardless of config angleChange.
 */
export const GOLDEN_ANGLE_DEG = 137.50776405003785

/**
 * Advance a classic spiral by one step.
 * Returns the next position and the updated step length.
 */
export function classicStep(
  x: number,
  y: number,
  angleDeg: number,
  stepLength: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: x + Math.cos(rad) * stepLength,
    y: y + Math.sin(rad) * stepLength,
  }
}

// ─── Archimedean Family ────────────────────────────────────────────────────────
// Polar: r = f(θ). Advance θ each frame, compute absolute XY.

function polarToCartesian(r: number, theta: number): { x: number; y: number } {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta),
  }
}

/** Archimedean spiral: r = a + b·θ */
export function archimedeanPoint(theta: number, a: number, b: number): { x: number; y: number } {
  const r = a + b * theta
  return polarToCartesian(Math.max(0, r), theta)
}

/** Fermat's spiral: r = a·√θ  (two branches: ±) */
export function fermatPoint(theta: number, a: number): { x: number; y: number } {
  const r = a * Math.sqrt(Math.abs(theta))
  return polarToCartesian(r, theta)
}

/** Hyperbolic spiral: r = a / θ */
export function hyperbolicPoint(theta: number, a: number): { x: number; y: number } {
  if (Math.abs(theta) < 0.001) return { x: 0, y: 0 }
  const r = a / theta
  return polarToCartesian(r, theta)
}

/** Lituus spiral: r² = a² / θ  →  r = a / √θ */
export function lituusPoint(theta: number, a: number): { x: number; y: number } {
  if (Math.abs(theta) < 0.001) return { x: 0, y: 0 }
  const r = a / Math.sqrt(Math.abs(theta))
  return polarToCartesian(r, theta)
}

// ─── Parametric Family ────────────────────────────────────────────────────────
// Absolute XY from parameter t. Advance t each frame.

/**
 * Lissajous figure: x = A·sin(fx·t + δ), y = B·sin(fy·t)
 * @param scale  - half-width/height in world units
 */
export function lissajousPoint(
  t: number,
  freqX: number,
  freqY: number,
  phaseDeg: number,
  scale: number
): { x: number; y: number } {
  const phaseRad = (phaseDeg * Math.PI) / 180
  return {
    x: scale * Math.sin(freqX * t + phaseRad),
    y: scale * Math.sin(freqY * t),
  }
}

/**
 * Rose curve: r = cos(k/d · θ)
 * @param scale  - max radius in world units
 */
export function rosePoint(
  t: number,
  k: number,
  d: number,
  scale: number
): { x: number; y: number } {
  const r = scale * Math.cos((k / d) * t)
  return polarToCartesian(r, t)
}

/**
 * Epitrochoid: rolling circle (r) outside fixed circle (R),
 * drawing point at distance d from rolling circle center.
 */
export function epitrochoidPoint(
  t: number,
  R: number,
  r: number,
  d: number
): { x: number; y: number } {
  return {
    x: (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t),
    y: (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t),
  }
}

/**
 * Hypotrochoid: rolling circle (r) inside fixed circle (R),
 * drawing point at distance d from rolling circle center.
 */
export function hypotrochoidPoint(
  t: number,
  R: number,
  r: number,
  d: number
): { x: number; y: number } {
  return {
    x: (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t),
    y: (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t),
  }
}

/**
 * Harmonograph: superposition of two damped pendulums.
 * x(t) = A1·sin(f1·t + p1)·e^(-d1·t)
 * y(t) = A2·sin(f2·t + p2)·e^(-d2·t)
 */
export function harmonographPoint(
  t: number,
  freq1: number,
  freq2: number,
  phase1Deg: number,
  phase2Deg: number,
  decay1: number,
  decay2: number,
  amp1: number,
  amp2: number
): { x: number; y: number } {
  const p1 = (phase1Deg * Math.PI) / 180
  const p2 = (phase2Deg * Math.PI) / 180
  return {
    x: amp1 * Math.sin(freq1 * t + p1) * Math.exp(-decay1 * t),
    y: amp2 * Math.sin(freq2 * t + p2) * Math.exp(-decay2 * t),
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Compute the absolute XY position for archimedean spiral types.
 * Used when spiralFamily === 'archimedean'.
 */
export function getArchimedeanPoint(
  theta: number,
  config: SpiralConfigV2
): { x: number; y: number } {
  switch (config.spiralType) {
    case 'archimedean':
      return archimedeanPoint(theta, config.archA, config.archB)
    case 'fermat':
      return fermatPoint(theta, config.archA)
    case 'hyperbolic':
      return hyperbolicPoint(theta, config.archA)
    case 'lituus':
      return lituusPoint(theta, config.archA)
    default:
      return { x: 0, y: 0 }
  }
}

/**
 * Compute the absolute XY position for parametric spiral types.
 * Used when spiralFamily === 'parametric'.
 * @param scale - world-unit scale (typically half the min canvas dimension)
 */
export function getParametricPoint(
  t: number,
  config: SpiralConfigV2,
  scale: number
): { x: number; y: number } {
  switch (config.spiralType) {
    case 'lissajous':
      return lissajousPoint(t, config.lissFreqX, config.lissFreqY, config.lissPhase, scale)
    case 'rose':
      return rosePoint(t, config.roseK, config.roseD, scale)
    case 'epitrochoid':
      return epitrochoidPoint(t, config.trochoidR, config.trochoidr, config.trochoidD)
    case 'hypotrochoid':
      return hypotrochoidPoint(t, config.trochoidR, config.trochoidr, config.trochoidD)
    case 'harmonograph':
      return harmonographPoint(
        t,
        config.harmFreq1, config.harmFreq2,
        config.harmPhase1, config.harmPhase2,
        config.harmDecay1, config.harmDecay2,
        config.harmAmp1, config.harmAmp2
      )
    default:
      return { x: 0, y: 0 }
  }
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

/** Parse a CSS hex color string into normalized RGB (0–1) */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  const n = parseInt(cleaned, 16)
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  }
}

/** HSL to RGB (all values 0–1) */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r, g, b }
}

/**
 * Compute the stroke color for a given step.
 * Returns normalized RGBA (0–1).
 */
export function computeColor(
  config: SpiralConfigV2,
  stepCount: number,
  totalSteps: number
): { r: number; g: number; b: number; a: number } {
  const a = config.baseOpacity

  switch (config.colorMode) {
    case 'solid': {
      const { r, g, b } = hexToRgb(config.color)
      return { r, g, b, a }
    }
    case 'rainbow': {
      const hue = ((stepCount * config.rainbowSpeed * 0.01) % 1 + 1) % 1
      const { r, g, b } = hslToRgb(hue, 1, 0.5)
      return { r, g, b, a }
    }
    case 'gradient': {
      const t = totalSteps > 0 ? (stepCount % totalSteps) / totalSteps : 0
      const tAdj = config.gradientReverse ? 1 - t : t
      const tAnimated = (tAdj + stepCount * config.gradientSpeed * 0.001) % 1
      const cA = hexToRgb(config.gradientColorA)
      const cB = hexToRgb(config.gradientColorB)
      return {
        r: cA.r + (cB.r - cA.r) * tAnimated,
        g: cA.g + (cB.g - cA.g) * tAnimated,
        b: cA.b + (cB.b - cA.b) * tAnimated,
        a,
      }
    }
    case 'cycle': {
      const { r, g, b } = hexToRgb(config.color)
      return { r, g, b, a }
    }
    default: {
      const { r, g, b } = hexToRgb(config.color)
      return { r, g, b, a }
    }
  }
}
