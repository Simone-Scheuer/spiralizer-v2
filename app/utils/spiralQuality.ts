/**
 * Uzumaki — Spiral Quality Evaluation
 *
 * Simulates spiral growth to verify that a config produces a visually compelling
 * spiral before it's shown to the user. Catches:
 *   - Spirals that don't grow (stuck in center)
 *   - Spirals that grow too fast (off-screen in seconds)
 *   - Spirals that overlap themselves (turns too tight for line width)
 *   - Parametric curves that trace too fast or too slow
 *
 * Key formulas derived from the actual animation loop:
 *
 * TIMING:
 *   ticks/sec = min(60, 1000/max(speed, 1))
 *   steps/sec = stepsPerFrame * ticks/sec
 *   steps at T seconds = steps/sec * T
 *
 * CLASSIC (step-based):
 *   stepLen(N) depends on type:
 *     linear:      base * (1 + N * mult)
 *     exponential: base * (1 + mult)^N
 *     fibonacci:   base * phi^(N * mult * 50)
 *     golden:      base * (1 + N * mult)  [angle fixed at 137.508]
 *   stepsPerRev = 360 / angleChange
 *   gapPerTurn ≈ stepLen(N+spr) * spr * mult / (2 * sin(angleChange_rad/2))
 *     (simplified: radial distance gained per full revolution)
 *
 * ARCHIMEDEAN (polar r = f(theta)):
 *   theta advances by stepLength * 0.01 per step
 *   archimedean: r = a + b*theta  → gap = 2*pi*b per revolution
 *   fermat:      r = a*sqrt(theta) → gap shrinks as theta grows
 *
 * PARAMETRIC (absolute XY from t):
 *   t advances by stepLength * 0.004 per step
 *   scale = 0.4 * min(canvasW, canvasH)
 *   lissajous period = 2*pi (per frequency unit)
 *   rose period = 2*pi*d (for r = cos(k/d * theta))
 *   trochoid period = 2*pi*r/gcd(R,r)
 */

import type { SpiralConfigV2, RenderSettings } from '@/app/models/types'
import {
  getClassicStepLength,
  GOLDEN_ANGLE_DEG,
  classicStep,
  getArchimedeanPoint,
  getParametricPoint,
} from '@/app/renderer/spiralMath'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SpiralMetrics {
  /** Steps the spiral takes per second */
  stepsPerSec: number
  /** Approximate radius at 10, 20, 30 seconds */
  radiusAt10s: number
  radiusAt20s: number
  radiusAt30s: number
  /** Minimum gap between adjacent turns in pixels (classic/archimedean only) */
  minGapBetweenTurns: number
  /** Whether turns overlap given the line width */
  hasOverlap: boolean
  /** Whether spiral is still tiny after 15 seconds */
  tooSlow: boolean
  /** Whether spiral exceeds canvas bounds before 10 seconds */
  tooFast: boolean
  /** For parametric: how many full periods traced in 20s */
  periodsIn20s: number
}

export interface QualityReport {
  score: number  // 0–100
  issues: string[]
  metrics: SpiralMetrics
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CANVAS_HALF = 400     // typical half-canvas in pixels
const TARGET_MIN_RADIUS_15S = 60   // should reach at least this by 15s
const TARGET_MAX_RADIUS_10S = 450  // shouldn't exceed this by 10s
const TARGET_IDEAL_RADIUS_20S_MIN = 120
const TARGET_IDEAL_RADIUS_20S_MAX = 380

// ─── Core Evaluation ────────────────────────────────────────────────────────────

function getStepsPerSec(config: SpiralConfigV2): number {
  const speed = Math.max(1, config.speed)
  const ticksPerSec = Math.min(60, 1000 / speed)
  return Math.max(1, config.stepsPerFrame) * ticksPerSec
}

/**
 * Simulate a classic spiral and measure its actual radius over time.
 * This runs the exact same math as the animation loop.
 */
function simulateClassic(config: SpiralConfigV2, totalSteps: number): {
  radii: number[]  // radius at each checkpoint
  gaps: number[]   // gap between consecutive turns
} {
  const type = config.spiralType as 'linear' | 'exponential' | 'fibonacci' | 'golden'
  let x = 0, y = 0
  let angleDeg = config.rotationOffset
  const checkpoints = [0, 0, 0]  // at 1/3, 2/3, full
  const third = Math.floor(totalSteps / 3)

  // Track radii at each revolution to compute gaps
  const stepsPerRev = Math.ceil(360 / (type === 'golden' ? GOLDEN_ANGLE_DEG : Math.max(1, config.angleChange)))
  const revolutionRadii: number[] = []
  let oscPhase = 0

  for (let step = 0; step < totalSteps; step++) {
    let angleChange = type === 'golden' ? GOLDEN_ANGLE_DEG : config.angleChange
    if (config.angleIncrement !== 0) {
      angleChange += config.angleIncrement * step
    }
    if (config.oscillate) {
      oscPhase += config.oscillationSpeed * 0.05
      angleChange += Math.sin(oscPhase) * 45
    }
    // Skip wobble for simulation (random component)

    const direction = config.reverseDirection ? -1 : 1
    angleDeg += angleChange * direction

    let stepLen = getClassicStepLength(config.stepLength, step, type, config.stepMultiplier)
    if (config.pulseEffect) {
      stepLen *= 1 + config.pulseRange * Math.sin(step * config.pulseSpeed * 0.1)
    }
    if (config.acceleration !== 0) {
      stepLen *= Math.max(0.01, 1 + config.acceleration * step)
    }

    const next = classicStep(x, y, angleDeg, stepLen)
    x = next.x
    y = next.y

    const radius = Math.sqrt(x * x + y * y)

    // Record radius at each revolution boundary
    if (step > 0 && step % stepsPerRev === 0) {
      revolutionRadii.push(radius)
    }

    // Record checkpoints
    if (step === third) checkpoints[0] = radius
    if (step === third * 2) checkpoints[1] = radius
    if (step === totalSteps - 1) checkpoints[2] = radius
  }

  // Compute gaps between consecutive revolutions
  const gaps: number[] = []
  for (let i = 1; i < revolutionRadii.length; i++) {
    gaps.push(Math.abs(revolutionRadii[i] - revolutionRadii[i - 1]))
  }

  return { radii: checkpoints, gaps }
}

/**
 * Simulate an archimedean spiral and measure its radius over time.
 */
function simulateArchimedean(config: SpiralConfigV2, totalSteps: number): {
  radii: number[]
  gaps: number[]
} {
  const thetaStep = config.stepLength * 0.01
  const third = Math.floor(totalSteps / 3)
  const checkpoints = [0, 0, 0]
  const revolutionRadii: number[] = []
  const stepsPerRev = Math.ceil(2 * Math.PI / thetaStep)

  for (let step = 0; step < totalSteps; step++) {
    const theta = (step + 1) * thetaStep
    const pt = getArchimedeanPoint(theta, config)
    const radius = Math.sqrt(pt.x * pt.x + pt.y * pt.y)

    if (step > 0 && step % stepsPerRev === 0) {
      revolutionRadii.push(radius)
    }

    if (step === third) checkpoints[0] = radius
    if (step === third * 2) checkpoints[1] = radius
    if (step === totalSteps - 1) checkpoints[2] = radius
  }

  const gaps: number[] = []
  for (let i = 1; i < revolutionRadii.length; i++) {
    gaps.push(Math.abs(revolutionRadii[i] - revolutionRadii[i - 1]))
  }

  return { radii: checkpoints, gaps }
}

/**
 * Simulate a parametric curve to check pacing.
 */
function simulateParametric(config: SpiralConfigV2, totalSteps: number, scale: number): {
  radii: number[]  // max radius seen at each checkpoint
  periods: number  // approximate full periods traced
} {
  const tStep = config.stepLength * 0.004
  const third = Math.floor(totalSteps / 3)
  let maxR = [0, 0, 0]

  // Track zero-crossings to count periods
  let prevX = 0
  let crossings = 0

  for (let step = 0; step < totalSteps; step++) {
    const t = (step + 1) * tStep
    const pt = getParametricPoint(t, config, scale)
    const radius = Math.sqrt(pt.x * pt.x + pt.y * pt.y)

    if (step <= third) maxR[0] = Math.max(maxR[0], radius)
    else if (step <= third * 2) maxR[1] = Math.max(maxR[1], radius)
    else maxR[2] = Math.max(maxR[2], radius)

    // Count x-axis zero crossings (rough period estimation)
    if (prevX < 0 && pt.x >= 0) crossings++
    prevX = pt.x
  }

  return { radii: maxR, periods: crossings / 2 }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Evaluate a spiral config and return a quality report.
 * Higher score = more visually compelling spiral.
 */
export function evaluateSpiral(
  config: SpiralConfigV2,
  render: RenderSettings = {
    bloomEnabled: false, bloomIntensity: 0, bloomThreshold: 0, bloomRadius: 0,
    motionTrail: 0, chromaticAberrationEnabled: false, chromaticAberration: 0,
    vignetteEnabled: false, vignetteIntensity: 0, filmGrainEnabled: false, filmGrain: 0,
  }
): QualityReport {
  const issues: string[] = []
  let score = 100
  const sps = getStepsPerSec(config)

  const stepsAt10 = Math.round(sps * 10)
  const stepsAt15 = Math.round(sps * 15)
  const stepsAt20 = Math.round(sps * 20)
  const stepsAt30 = Math.round(sps * 30)

  let metrics: SpiralMetrics = {
    stepsPerSec: sps,
    radiusAt10s: 0,
    radiusAt20s: 0,
    radiusAt30s: 0,
    minGapBetweenTurns: Infinity,
    hasOverlap: false,
    tooSlow: false,
    tooFast: false,
    periodsIn20s: 0,
  }

  const { spiralFamily } = config

  if (spiralFamily === 'classic') {
    const sim30 = simulateClassic(config, stepsAt30)
    const sim10 = simulateClassic(config, stepsAt10)
    const sim20 = simulateClassic(config, stepsAt20)

    metrics.radiusAt10s = sim10.radii[2]
    metrics.radiusAt20s = sim20.radii[2]
    metrics.radiusAt30s = sim30.radii[2]

    // Gap analysis
    const allGaps = [...sim30.gaps]
    if (allGaps.length > 0) {
      metrics.minGapBetweenTurns = Math.min(...allGaps)
    }

    // Check overlap
    if (metrics.minGapBetweenTurns < config.lineWidth * 2) {
      metrics.hasOverlap = true
      issues.push(`Turns overlap: gap ${metrics.minGapBetweenTurns.toFixed(1)}px < lineWidth*2 (${(config.lineWidth * 2).toFixed(1)}px)`)
      score -= 30
    } else if (metrics.minGapBetweenTurns < config.lineWidth * 3) {
      issues.push(`Turns barely separated: gap ${metrics.minGapBetweenTurns.toFixed(1)}px`)
      score -= 10
    }

    // Check growth rate
    if (metrics.radiusAt20s < TARGET_MIN_RADIUS_15S) {
      metrics.tooSlow = true
      issues.push(`Too slow: only ${metrics.radiusAt20s.toFixed(0)}px radius at 20s`)
      score -= 25
    }
    if (metrics.radiusAt10s > TARGET_MAX_RADIUS_10S) {
      metrics.tooFast = true
      issues.push(`Too fast: ${metrics.radiusAt10s.toFixed(0)}px radius at 10s (off screen)`)
      score -= 25
    }

    // Ideal range bonus
    if (metrics.radiusAt20s >= TARGET_IDEAL_RADIUS_20S_MIN &&
        metrics.radiusAt20s <= TARGET_IDEAL_RADIUS_20S_MAX) {
      // Good growth rate
    } else if (!metrics.tooSlow && !metrics.tooFast) {
      score -= 5
    }

  } else if (spiralFamily === 'archimedean') {
    const sim = simulateArchimedean(config, stepsAt30)
    const sim10 = simulateArchimedean(config, stepsAt10)
    const sim20 = simulateArchimedean(config, stepsAt20)

    metrics.radiusAt10s = sim10.radii[2]
    metrics.radiusAt20s = sim20.radii[2]
    metrics.radiusAt30s = sim.radii[2]

    const allGaps = [...sim.gaps]
    if (allGaps.length > 0) {
      metrics.minGapBetweenTurns = Math.min(...allGaps)
    }

    if (metrics.minGapBetweenTurns < config.lineWidth * 2) {
      metrics.hasOverlap = true
      issues.push(`Turns overlap: gap ${metrics.minGapBetweenTurns.toFixed(1)}px < lineWidth*2`)
      score -= 30
    }

    if (metrics.radiusAt20s < TARGET_MIN_RADIUS_15S) {
      metrics.tooSlow = true
      issues.push(`Too slow: only ${metrics.radiusAt20s.toFixed(0)}px at 20s`)
      score -= 25
    }
    if (metrics.radiusAt10s > TARGET_MAX_RADIUS_10S) {
      metrics.tooFast = true
      issues.push(`Too fast: ${metrics.radiusAt10s.toFixed(0)}px at 10s`)
      score -= 25
    }

  } else if (spiralFamily === 'parametric') {
    const scale = CANVAS_HALF * 0.8  // 0.4 * canvas, canvas ~= 2 * CANVAS_HALF
    const sim = simulateParametric(config, stepsAt20, scale)

    metrics.radiusAt10s = sim.radii[0]
    metrics.radiusAt20s = sim.radii[2]
    metrics.radiusAt30s = sim.radii[2]
    metrics.periodsIn20s = sim.periods

    // Parametric curves should trace 1-4 full periods in 20s for good pacing
    if (sim.periods < 0.5) {
      issues.push(`Too slow: only ${sim.periods.toFixed(1)} periods in 20s`)
      score -= 20
    } else if (sim.periods > 8) {
      issues.push(`Too fast: ${sim.periods.toFixed(0)} periods in 20s (retracing)`)
      score -= 15
    }

    // Check if curve reaches meaningful size
    if (sim.radii[2] < 50) {
      issues.push(`Curve too small: max radius ${sim.radii[2].toFixed(0)}px`)
      score -= 20
    }
  }

  // Bloom bonus — bloom makes spirals look better
  if (render.bloomEnabled && render.bloomIntensity > 0.3) {
    score = Math.min(100, score + 5)
  }

  return {
    score: Math.max(0, score),
    issues,
    metrics,
  }
}

/**
 * Quick check: is this config likely to produce a good spiral?
 */
export function isGoodSpiral(config: SpiralConfigV2, render?: RenderSettings): boolean {
  const report = evaluateSpiral(config, render)
  return report.score >= 70
}
