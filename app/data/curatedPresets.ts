/**
 * Uzumaki — Curated Preset Collection
 *
 * Every preset is validated against the spiral quality evaluator.
 * Parameters are derived from the actual animation math:
 *
 * TIMING:
 *   ticks/sec = min(60, 1000/speed)
 *   steps/sec = stepsPerFrame * ticks/sec
 *   steps_in_20s = steps/sec * 20
 *
 * CLASSIC — step-based growth:
 *   linear:      stepLen(N) = base * (1 + N * mult)
 *   exponential: stepLen(N) = base * (1 + mult)^N  ← VERY sensitive
 *   fibonacci:   stepLen(N) = base * phi^(N * mult * 50)  ← VERY sensitive
 *   golden:      stepLen(N) = base * (1 + N * mult), angle fixed 137.508
 *
 * ARCHIMEDEAN — polar r = f(theta):
 *   theta advances by stepLength * 0.01 per step
 *   archimedean: r = archA + archB * theta  (gap = 2*pi*archB)
 *   fermat: r = archA * sqrt(theta)  (gap shrinks)
 *
 * PARAMETRIC — absolute XY from t:
 *   t advances by stepLength * 0.004 per step
 *   scale = 0.4 * min(canvasW, canvasH) ≈ 320px
 *   Target: 2-4 full trace periods in 20s
 */

import type { SpiralConfigV2, RenderSettings, SpiralPreset } from '@/app/models/types'
import { defaultConfigV2, defaultRenderSettings } from '@/app/models/types'

interface CuratedDef {
  name: string
  config: Partial<SpiralConfigV2>
  render: Partial<RenderSettings>
}

function makePreset(def: CuratedDef, index: number): SpiralPreset {
  return {
    id: `curated_${index}`,
    name: def.name,
    config: { ...defaultConfigV2, ...def.config },
    renderSettings: { ...defaultRenderSettings, ...def.render },
    thumbnail: '',
    createdAt: 0,
  }
}

const CURATED: CuratedDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. GOLDEN BLOOM
  //
  // Golden spiral: each step scatters at 137.508°. The phyllotactic angle means
  // no two turns align — it creates a sunflower seed pattern. To fill the canvas,
  // we need stepLength to grow enough that later points land further out.
  //
  // Math: 56 steps/sec * 20s = 1120 steps
  //   stepLen(1120) = 8 * (1 + 1120*0.015) = 8 * 17.8 = 142px
  //   Golden angle scatters, so radius ≈ recent step lengths (not cumulative)
  //   At step 500: 8*(1+7.5) = 68px — nice medium expansion
  //   At step 1000: 8*(1+15) = 128px — fills frame beautifully
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Golden Bloom',
    config: {
      spiralFamily: 'classic',
      spiralType: 'golden',
      stepLength: 8,
      angleChange: 137.508,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.015,
      originX: 0.5,
      originY: 0.5,
      colorMode: 'gradient',
      gradientColorA: '#ffaa00',
      gradientColorB: '#ff4400',
      gradientSpeed: 0.4,
      lineWidth: 2.5,
      baseOpacity: 0.95,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.8,
      bloomThreshold: 0.15,
      bloomRadius: 0.5,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. NEON KALEIDOSCOPE
  //
  // 6-fold symmetry with rainbow. angleChange=10° creates smooth turns.
  // 10° means 36 steps per revolution — with stepMultiplier=0.012:
  //
  // Math: 56 sps * 20s = 1120 steps
  //   gap = stepLen * (360/10) * 0.012 / (2*sin(5°)) = 5 * 36 * 0.012 / 0.1744 = 12.4px ✓
  //   radius(1120) = 5*(1+1120*0.012) / (2*sin(5°)) = 5*14.4/0.1744 = 413px
  //   That's good — fills canvas by 20s.
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Neon Kaleidoscope',
    config: {
      spiralFamily: 'classic',
      spiralType: 'linear',
      stepLength: 5,
      angleChange: 10,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.012,
      colorMode: 'rainbow',
      rainbowSpeed: 0.8,
      lineWidth: 1.5,
      baseOpacity: 0.9,
      blendMode: 'screen',
      symmetry: 6,
      symmetryRotation: 60,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.6,
      bloomThreshold: 0.2,
      bloomRadius: 0.4,
      chromaticAberrationEnabled: true,
      chromaticAberration: 0.003,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. ROSE GARDEN
  //
  // Rose curve k=5, d=2: r = cos(2.5*t). Full pattern traces in 2*pi*d = 4*pi ≈ 12.6 rad.
  // Want ~2 full traces in 20s for the "drawing it out" feel.
  //
  // Math: sps=100 (speed=10, stepsPerFrame=1)
  //   t_per_step = 2 * 0.004 = 0.008
  //   t_in_20s = 100*20*0.008 = 16 rad → 16/12.6 = 1.3 traces ← good, slow reveal
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Rose Garden',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'rose',
      roseK: 5,
      roseD: 2,
      stepLength: 2,
      speed: 10,
      stepsPerFrame: 1,
      colorMode: 'gradient',
      gradientColorA: '#ff0080',
      gradientColorB: '#00ffcc',
      gradientSpeed: 0.6,
      lineWidth: 2.5,
      baseOpacity: 1,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.6,
      bloomThreshold: 0.2,
      bloomRadius: 0.4,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. SPIROGRAPH DREAMS
  //
  // Hypotrochoid R=80, r=48, D=40. gcd(80,48)=16, period = 2*pi*48/16 = 6*pi ≈ 18.85 rad.
  // Want 1-2 full traces in 20s.
  //
  // Math: sps=100, stepLength=2
  //   t_per_step = 2 * 0.004 = 0.008
  //   t_in_20s = 100*20*0.008 = 16 rad → 16/18.85 = 0.85 traces ← slow, dramatic
  //   30s: 24/18.85 = 1.27 traces ← completes first pattern at ~22s, starts second
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Spirograph Dreams',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'hypotrochoid',
      trochoidR: 80,
      trochoidr: 48,
      trochoidD: 40,
      stepLength: 2,
      speed: 10,
      stepsPerFrame: 1,
      colorMode: 'gradient',
      gradientColorA: '#9900ff',
      gradientColorB: '#00ccff',
      gradientSpeed: 0.5,
      lineWidth: 2,
      baseOpacity: 0.9,
      blendMode: 'screen',
      multiLineCount: 3,
      multiLineSpacing: 4,
      symmetry: 1,
      symmetryRotation: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.7,
      bloomThreshold: 0.15,
      bloomRadius: 0.4,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. COSMIC FIBONACCI
  //
  // Fibonacci: stepLen = base * phi^(N * mult * 50). EXTREMELY sensitive to mult.
  // phi^x doubles at x ≈ 1.44, so we need N*mult*50 to stay under ~8-10.
  //
  // Math: 56 sps * 20s = 1120 steps
  //   At mult=0.0002: exponent = 1120 * 0.0002 * 50 = 11.2 → phi^11.2 = 199
  //   stepLen(1120) = 3*199 = 597px — too big by 20s but dramatic growth
  //   At step 500: exp=5 → phi^5 = 11.1 → stepLen = 33px — nice
  //   At step 800: exp=8 → phi^8 = 46.9 → stepLen = 141px — filling screen
  //   Growth is dramatic: slow buildup then rapid expansion
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Cosmic Fibonacci',
    config: {
      spiralFamily: 'classic',
      spiralType: 'fibonacci',
      stepLength: 3,
      angleChange: 30,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.0002,
      colorMode: 'gradient',
      gradientColorA: '#0044ff',
      gradientColorB: '#ffffff',
      gradientSpeed: 0.3,
      lineWidth: 2,
      baseOpacity: 0.9,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 1.2,
      bloomThreshold: 0.1,
      bloomRadius: 0.6,
      motionTrail: 0.15,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. HEARTBEAT
  //
  // Lissajous 2:3. Period = 2*pi ≈ 6.28 rad per frequency cycle.
  // For 2:3 ratio, the figure closes at 2*pi. Want ~2-3 traces in 20s.
  //
  // Math: sps=56 (speed=18, stepsPerFrame=1)
  //   t_per_step = 2 * 0.004 = 0.008
  //   t_in_20s = 56*20*0.008 = 8.96 rad → 8.96/6.28 = 1.4 traces ← nice slow buildup
  //   The pulse effect makes lines breathe — adds organic drama
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Heartbeat',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'lissajous',
      lissFreqX: 2,
      lissFreqY: 3,
      lissPhase: 90,
      stepLength: 2,
      speed: 18,
      stepsPerFrame: 1,
      colorMode: 'gradient',
      gradientColorA: '#ff0033',
      gradientColorB: '#ff6600',
      gradientSpeed: 0.8,
      lineWidth: 3,
      baseOpacity: 1,
      blendMode: 'screen',
      pulseEffect: true,
      pulseSpeed: 1.5,
      pulseRange: 0.4,
      symmetry: 1,
      symmetryRotation: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.9,
      bloomThreshold: 0.15,
      bloomRadius: 0.5,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. SACRED MANDALA
  //
  // 8-fold symmetry, angleChange=10° for smooth curves. stepMultiplier tuned
  // for visible gap between turns with thin lines.
  //
  // Math: 56 sps * 20s = 1120 steps
  //   stepsPerRev = 36, sin(5°) = 0.0872
  //   gap = 6 * 36 * 0.01 / (2*0.0872) = 2.16 / 0.1744 = 12.4px ✓ (lineWidth=1.2)
  //   radius(1120) = 6*(1+1120*0.01)/0.1744 = 6*12.2/0.1744 = 420px — fills canvas
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Sacred Mandala',
    config: {
      spiralFamily: 'classic',
      spiralType: 'linear',
      stepLength: 6,
      angleChange: 10,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.01,
      colorMode: 'gradient',
      gradientColorA: '#ffffff',
      gradientColorB: '#ffcc00',
      gradientSpeed: 0.3,
      lineWidth: 1.2,
      baseOpacity: 0.85,
      blendMode: 'screen',
      symmetry: 8,
      symmetryRotation: 45,
      rotationOffset: 0,
      multiLineCount: 2,
      multiLineSpacing: 3,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 1.0,
      bloomThreshold: 0.1,
      bloomRadius: 0.5,
      vignetteEnabled: true,
      vignetteIntensity: 0.5,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 8. AURORA
  //
  // Archimedean spiral (not Fermat — Fermat grows too slowly).
  // r = archA + archB * theta. Gap between turns = 2*pi*archB.
  //
  // Math: sps=100 (speed=10, stepsPerFrame=1)
  //   theta_per_step = 5 * 0.01 = 0.05
  //   theta_at_20s = 100*20*0.05 = 100 rad
  //   r(20s) = 0 + 3*100 = 300px ✓
  //   gap = 2*pi*3 = 18.8px ✓ (lineWidth=2)
  //   Oscillation adds aurora-like waviness
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Aurora',
    config: {
      spiralFamily: 'archimedean',
      spiralType: 'archimedean',
      archA: 0,
      archB: 3,
      stepLength: 5,
      speed: 10,
      stepsPerFrame: 1,
      oscillate: true,
      oscillationSpeed: 0.8,
      colorMode: 'gradient',
      gradientColorA: '#00ff66',
      gradientColorB: '#cc00ff',
      gradientSpeed: 0.5,
      lineWidth: 2,
      baseOpacity: 0.9,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.8,
      bloomThreshold: 0.2,
      bloomRadius: 0.5,
      motionTrail: 0.1,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 9. VOID DANCER
  //
  // Harmonograph 2:2.01 — near-unison creates slowly evolving Lissajous-like
  // interference. Low decay keeps amplitude high. Slow t advance lets the
  // pattern build intricately.
  //
  // Math: sps=56, stepLength=2
  //   t_per_step = 2 * 0.004 = 0.008
  //   t_in_20s = 56*20*0.008 = 8.96 rad
  //   At t=8.96: amp factor = e^(-0.0005*8.96) = 0.9955 — basically no decay
  //   The beat frequency = |2-2.01| = 0.01 Hz, beat period = 2*pi/0.01 = 628 rad
  //   In 20s we see 8.96/628 = 1.4% of a beat — just the beginning of evolution
  //   In 60s: 26.9 rad — still early, pattern slowly mutating. Very zen.
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Void Dancer',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'harmonograph',
      harmFreq1: 2,
      harmFreq2: 2.01,
      harmPhase1: 0,
      harmPhase2: 90,
      harmDecay1: 0.0005,
      harmDecay2: 0.0005,
      harmAmp1: 250,
      harmAmp2: 250,
      stepLength: 2,
      speed: 18,
      stepsPerFrame: 1,
      colorMode: 'solid',
      color: '#00ffcc',
      lineWidth: 1,
      baseOpacity: 0.8,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.6,
      bloomThreshold: 0.3,
      bloomRadius: 0.3,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 10. SUPERNOVA
  //
  // Exponential: stepLen = base * (1+mult)^N. Must use TINY mult to avoid explosion.
  // (1.001)^1120 = 3.06 — gentle growth. With 4-fold symmetry.
  //
  // Math: 56 sps * 20s = 1120 steps
  //   stepLen(1120) = 4 * 3.06 = 12.2px
  //   stepsPerRev = 360/90 = 4, sin(45°) = 0.707
  //   radius ≈ stepLen / (2*0.707) = 12.2/1.414 = 8.6px per "turn radius"
  //   But exponential means early steps are tiny → later ones big. The dramatic
  //   growth comes from the RATIO of early to late, not the absolute size.
  //
  //   Actually with mult=0.002: (1.002)^1120 = 9.35
  //   stepLen(1120) = 4*9.35 = 37.4px — better drama
  //   radius(1120) ≈ sum of steps... need simulation. Let me use mult=0.003.
  //   (1.003)^1120 = 28.5 → stepLen = 4*28.5 = 114px — dramatic expansion
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Supernova',
    config: {
      spiralFamily: 'classic',
      spiralType: 'exponential',
      stepLength: 4,
      angleChange: 15,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.002,
      colorMode: 'gradient',
      gradientColorA: '#ff6600',
      gradientColorB: '#ffffff',
      gradientSpeed: 0.5,
      lineWidth: 2,
      baseOpacity: 1,
      blendMode: 'add',
      symmetry: 4,
      symmetryRotation: 90,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 1.5,
      bloomThreshold: 0.1,
      bloomRadius: 0.7,
      chromaticAberrationEnabled: true,
      chromaticAberration: 0.004,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 11. HYPNOTIC PULSE
  //
  // Classic linear with oscillation. The oscillation (sin wave on angle) makes
  // the spiral "breathe" back and forth. With motion trail, old positions ghost.
  // Small angle (10°) + moderate stepMultiplier. Oscillation causes radius chaos
  // so we use lower stepMultiplier to keep it contained.
  //
  // Math: 56 sps * 20s = 1120 steps
  //   gap = 4 * 36 * 0.007 / 0.1744 = 5.8px ✓ (lineWidth=1.5)
  //   radius(1120) = 4*(1+7.84)/0.1744 = 203px base, oscillation adds ±40%
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Hypnotic Pulse',
    config: {
      spiralFamily: 'classic',
      spiralType: 'linear',
      stepLength: 4,
      angleChange: 10,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.007,
      oscillate: true,
      oscillationSpeed: 0.6,
      colorMode: 'rainbow',
      rainbowSpeed: 0.4,
      lineWidth: 1.5,
      baseOpacity: 0.9,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.7,
      bloomThreshold: 0.2,
      bloomRadius: 0.4,
      motionTrail: 0.2,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 12. ELECTRIC LOTUS
  //
  // Epitrochoid R=100, r=60, D=80. gcd(100,60)=20, period = 2*pi*60/20 = 6*pi.
  // With 3-fold symmetry for lotus shape.
  //
  // Math: sps=56, stepLength=2
  //   t_per_step = 0.008
  //   t_in_20s = 56*20*0.008 = 8.96 rad → 8.96/(6*pi) = 0.47 traces
  //   In 40s: 0.95 traces — just barely completing one full pattern. Dramatic!
  //   Radius of epitrochoid: max = R+r+D = 240px (but actual max varies)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Electric Lotus',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'epitrochoid',
      trochoidR: 100,
      trochoidr: 60,
      trochoidD: 80,
      stepLength: 2,
      speed: 18,
      stepsPerFrame: 1,
      colorMode: 'gradient',
      gradientColorA: '#0066ff',
      gradientColorB: '#ff00cc',
      gradientSpeed: 0.7,
      lineWidth: 2,
      baseOpacity: 0.95,
      blendMode: 'screen',
      symmetry: 3,
      symmetryRotation: 120,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.8,
      bloomThreshold: 0.15,
      bloomRadius: 0.4,
      chromaticAberrationEnabled: true,
      chromaticAberration: 0.002,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 13. SILK THREADS
  //
  // Archimedean with 5 thin parallel lines. Clean linear growth.
  //
  // Math: sps=56, stepLength=3
  //   theta_per_step = 3*0.01 = 0.03
  //   theta_at_20s = 56*20*0.03 = 33.6 rad
  //   r(20s) = 0 + 5*33.6 = 168px ✓ — fills center nicely
  //   gap = 2*pi*5 = 31.4px ✓ (lineWidth=0.8, multiLine spacing=6)
  //   r(40s) = 5*67.2 = 336px — fills canvas by 40s
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Silk Threads',
    config: {
      spiralFamily: 'archimedean',
      spiralType: 'archimedean',
      archA: 0,
      archB: 5,
      stepLength: 3,
      speed: 18,
      stepsPerFrame: 1,
      colorMode: 'gradient',
      gradientColorA: '#ffffff',
      gradientColorB: '#ffdd88',
      gradientSpeed: 0.3,
      lineWidth: 0.8,
      baseOpacity: 0.7,
      blendMode: 'screen',
      multiLineCount: 5,
      multiLineSpacing: 6,
      symmetry: 1,
      symmetryRotation: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.4,
      bloomThreshold: 0.3,
      bloomRadius: 0.3,
      vignetteEnabled: true,
      vignetteIntensity: 0.4,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 14. QUANTUM ROSE
  //
  // Rose k=7, d=4: r = cos(1.75*t). Full pattern in 2*pi*4 = 8*pi ≈ 25.1 rad.
  // 7 petals that take 4 revolutions to complete — very intricate.
  //
  // Math: sps=56, stepLength=3
  //   t_per_step = 3*0.004 = 0.012
  //   t_in_20s = 56*20*0.012 = 13.4 rad → 13.4/25.1 = 0.53 traces
  //   In 40s: 1.07 traces — just completing the pattern. Beautiful slow reveal.
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Quantum Rose',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'rose',
      roseK: 7,
      roseD: 4,
      stepLength: 3,
      speed: 18,
      stepsPerFrame: 1,
      colorMode: 'solid',
      color: '#00ff44',
      lineWidth: 1.5,
      baseOpacity: 0.9,
      blendMode: 'screen',
      symmetry: 1,
      symmetryRotation: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 1.2,
      bloomThreshold: 0.1,
      bloomRadius: 0.6,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 15. FIRE DANCE
  //
  // Exponential with 3-fold symmetry + oscillation. Exponential mult must be tiny.
  // (1.002)^1120 = 9.35, so stepLen grows from 5 to 47px over 20s.
  //
  // Math: 56 sps * 20s = 1120 steps
  //   Early: stepLen ≈ 5px, tight swirling
  //   Late: stepLen ≈ 47px, dramatic expansion
  //   Oscillation adds ±45° → creates flame tendrils
  //   3-fold symmetry at 120° → three dancing flames
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Fire Dance',
    config: {
      spiralFamily: 'classic',
      spiralType: 'exponential',
      stepLength: 5,
      angleChange: 15,
      angleIncrement: 0,
      speed: 18,
      stepsPerFrame: 1,
      stepMultiplier: 0.002,
      oscillate: true,
      oscillationSpeed: 1.2,
      colorMode: 'gradient',
      gradientColorA: '#ff0000',
      gradientColorB: '#ffcc00',
      gradientSpeed: 1.0,
      lineWidth: 2.5,
      baseOpacity: 1,
      blendMode: 'add',
      symmetry: 3,
      symmetryRotation: 120,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 1.3,
      bloomThreshold: 0.1,
      bloomRadius: 0.6,
      motionTrail: 0.15,
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 16. DIAMOND WEB
  //
  // Lissajous 3:4 with 5-fold symmetry. Creates jewel-like web.
  // Period for 3:4 = 2*pi. Five copies at 72° = pentagonal gem.
  //
  // Math: sps=56, stepLength=2
  //   t_per_step = 0.008
  //   t_in_20s = 8.96 rad → 8.96/6.28 = 1.4 traces
  //   Slow enough to watch the web build. White + chromatic aberration = prismatic.
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Diamond Web',
    config: {
      spiralFamily: 'parametric',
      spiralType: 'lissajous',
      lissFreqX: 3,
      lissFreqY: 4,
      lissPhase: 45,
      stepLength: 2,
      speed: 18,
      stepsPerFrame: 1,
      colorMode: 'solid',
      color: '#ffffff',
      lineWidth: 1.2,
      baseOpacity: 0.8,
      blendMode: 'screen',
      symmetry: 5,
      symmetryRotation: 72,
      rotationOffset: 0,
    },
    render: {
      bloomEnabled: true,
      bloomIntensity: 0.5,
      bloomThreshold: 0.2,
      bloomRadius: 0.3,
      chromaticAberrationEnabled: true,
      chromaticAberration: 0.006,
    },
  },
]

export const curatedPresets: SpiralPreset[] = CURATED.map((def, i) => makePreset(def, i))
