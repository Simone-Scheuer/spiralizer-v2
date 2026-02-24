'use client'

import type { SpiralType } from '@/app/models/types'

// ── SVG icon path generation ──────────────────────────────────────────────────
// All icons are 40×40 viewBox, center at (20,20), max radius ≈ 16px

const C = 20  // center
const S = 16  // max radius

type Point = { x: number; y: number }

function pts2path(pts: Point[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function polar(r: number, theta: number): Point {
  return { x: C + r * Math.cos(theta), y: C + r * Math.sin(theta) }
}

function polarSweep(steps: number, thetaMax: number, rFn: (t: number) => number): string {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * thetaMax
    pts.push(polar(Math.min(S, Math.max(0, rFn(t))), t))
  }
  return pts2path(pts)
}

function paramSweep(steps: number, tMax: number, fn: (t: number) => Point): string {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tMax
    const p = fn(t)
    pts.push({ x: C + p.x, y: C + p.y })
  }
  return pts2path(pts)
}

const ICONS: Record<SpiralType, string> = {
  linear: polarSweep(250, 4.5 * Math.PI, t => t / (4.5 * Math.PI) * S),

  exponential: polarSweep(200, 3.5 * Math.PI, t => {
    const frac = t / (3.5 * Math.PI)
    return (Math.exp(frac * 2.5) - 1) / (Math.exp(2.5) - 1) * S
  }),

  fibonacci: polarSweep(200, 3 * Math.PI, t => {
    const frac = t / (3 * Math.PI)
    return Math.pow(1.618, frac * 8) / Math.pow(1.618, 8) * S
  }),

  golden: (() => {
    const pts: Point[] = []
    const ga = 2.39996  // golden angle (rad)
    for (let i = 1; i <= 30; i++) {
      const r = Math.sqrt(i) * S * 0.27
      pts.push(polar(Math.min(S, r), i * ga))
    }
    return pts2path(pts)
  })(),

  archimedean: polarSweep(300, 5 * Math.PI, t => t / (5 * Math.PI) * S * 0.95),

  fermat: (() => {
    const pts: Point[] = []
    const tMax = 8 * Math.PI
    // Two branches: positive and negative
    for (let i = 1; i <= 200; i++) {
      const t = (i / 200) * tMax
      pts.push(polar(Math.sqrt(t / tMax) * S, t))
    }
    // Second branch
    for (let i = 1; i <= 200; i++) {
      const t = (i / 200) * tMax
      pts.push(polar(Math.sqrt(t / tMax) * S, t + Math.PI))
    }
    return pts2path(pts.slice(0, 200)) + ' ' + pts2path(pts.slice(200))
  })(),

  hyperbolic: (() => {
    const pts: Point[] = []
    for (let i = 0; i <= 200; i++) {
      const t = 0.25 + (i / 200) * 4.5 * Math.PI
      const r = Math.min(S, S * 1.2 / t)
      pts.push(polar(r, t))
    }
    return pts2path(pts)
  })(),

  lituus: (() => {
    const pts: Point[] = []
    for (let i = 0; i <= 200; i++) {
      const t = 0.05 + (i / 200) * 3 * Math.PI
      const r = Math.min(S, S * 0.7 / Math.sqrt(t))
      pts.push(polar(r, t))
    }
    return pts2path(pts)
  })(),

  lissajous: paramSweep(300, 2 * Math.PI, t => ({
    x: S * 0.88 * Math.sin(3 * t + Math.PI / 2),
    y: S * 0.88 * Math.sin(2 * t),
  })),

  rose: paramSweep(300, 2 * Math.PI, t => {
    const r = S * 0.88 * Math.cos(3 * t)
    return { x: r * Math.cos(t), y: r * Math.sin(t) }
  }),

  harmonograph: paramSweep(500, 55, t => ({
    x: S * 0.9 * Math.sin(2.001 * t + 0.15) * Math.exp(-0.022 * t),
    y: S * 0.9 * Math.sin(3 * t) * Math.exp(-0.016 * t),
  })),

  epitrochoid: paramSweep(300, 2 * Math.PI * 3, t => {
    const R = 5, r = 3, d = 5
    const sc = S / (R + r + d) * 1.1
    return {
      x: sc * ((R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t)),
      y: sc * ((R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t)),
    }
  }),

  hypotrochoid: paramSweep(300, 2 * Math.PI * 3, t => {
    const R = 5, r = 2, d = 4
    const sc = S / R * 0.9
    return {
      x: sc * ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)),
      y: sc * ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)),
    }
  }),
}

const LABELS: Record<SpiralType, string> = {
  linear: 'Linear',
  exponential: 'Exp.',
  fibonacci: 'Fibonacci',
  golden: 'Golden',
  archimedean: 'Archim.',
  fermat: 'Fermat',
  hyperbolic: 'Hyperb.',
  lituus: 'Lituus',
  lissajous: 'Lissajous',
  rose: 'Rose',
  harmonograph: 'Harmono.',
  epitrochoid: 'Epitroch.',
  hypotrochoid: 'Hypotroch.',
}

export const FORMULAS: Record<SpiralType, string> = {
  linear: 'r = base · (1 + n·k)',
  exponential: 'r = base · (1+k)ⁿ',
  fibonacci: 'r grows by φ each step',
  golden: 'θ = 137.5°, r grows',
  archimedean: 'r = a + b·θ',
  fermat: 'r = a · √θ',
  hyperbolic: 'r = a / θ',
  lituus: 'r = a / √θ',
  lissajous: 'x=sin(fx·t+δ), y=sin(fy·t)',
  rose: 'r = cos(k/d · θ)',
  harmonograph: 'x=A₁·sin(f₁t)·e^(−d₁t)',
  epitrochoid: '(R+r)cos(t)−d·cos((R+r)t/r)',
  hypotrochoid: '(R−r)cos(t)+d·cos((R−r)t/r)',
}

const SPIRAL_ORDER: SpiralType[] = [
  'linear', 'exponential', 'fibonacci', 'golden',
  'archimedean', 'fermat', 'hyperbolic', 'lituus',
  'lissajous', 'rose', 'harmonograph',
  'epitrochoid', 'hypotrochoid',
]

interface SpiralTypeSelectorProps {
  value: SpiralType
  onChange: (type: SpiralType) => void
  locked?: boolean
  onToggleLock?: () => void
  /** null = all types in pool (default); non-empty array = only those types are randomizable */
  allowedTypes?: SpiralType[] | null
  /** Called when a type's pool membership is toggled */
  onToggleTypeInPool?: (type: SpiralType) => void
}

export function SpiralTypeSelector({
  value, onChange, locked = false, onToggleLock,
  allowedTypes, onToggleTypeInPool,
}: SpiralTypeSelectorProps) {
  const hasPool = allowedTypes !== null && allowedTypes !== undefined
  const poolCount = hasPool ? allowedTypes!.length : SPIRAL_ORDER.length
  const allInPool = !hasPool || allowedTypes!.length === 0

  const isInPool = (type: SpiralType) =>
    !hasPool || allowedTypes!.includes(type)

  const handleAllInPool = () => {
    if (!onToggleTypeInPool) return
    // If all are in pool (or null), set to empty (all) — no-op, just clear
    onToggleTypeInPool('__all__' as SpiralType)  // sentinel handled in ShapePanel
  }

  return (
    <div className="space-y-1.5">
      {/* Header row: lock hint + pool counter */}
      <div className="flex items-center justify-between">
        {onToggleLock && (
          <button
            onClick={onToggleLock}
            className={`flex items-center gap-1 text-[9px] font-mono transition-colors ${
              locked ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/20 hover:text-white/50'
            }`}
            title={locked ? 'Click or double-click any tile to unlock' : 'Double-click any tile to lock'}
          >
            {locked ? '🔒 locked · click to unlock' : 'dbl-click to lock'}
          </button>
        )}
        {onToggleTypeInPool && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[9px] font-mono text-violet-400/60">
              pool: {allInPool ? 'all' : `${poolCount}/${SPIRAL_ORDER.length}`}
            </span>
            {!allInPool && (
              <button
                onClick={() => onToggleTypeInPool('__clear__' as SpiralType)}
                className="text-[9px] font-mono text-white/20 hover:text-white/50 transition-colors"
                title="Reset pool to all types"
              >
                reset
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`grid grid-cols-4 gap-1 ${locked ? 'opacity-60' : ''}`}>
        {SPIRAL_ORDER.map(type => {
          const active = value === type
          const inPool = isInPool(type)

          return (
            <button
              key={type}
              onClick={() => { if (!locked) onChange(type) }}
              onDoubleClick={e => { e.preventDefault(); onToggleLock?.() }}
              title={`${LABELS[type]}\n${FORMULAS[type]}\n\nDouble-click to ${locked ? 'unlock' : 'lock'} spiral type`}
              className={`relative flex flex-col items-center gap-0.5 p-1 rounded border transition-all duration-150 ${
                locked
                  ? active
                    ? 'border-yellow-400/50 bg-yellow-400/8 text-yellow-300'
                    : 'border-white/[0.05] text-white/25 cursor-not-allowed'
                  : active
                  ? 'border-cyan-400/60 bg-cyan-400/8 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.15)]'
                  : inPool
                  ? 'border-white/[0.07] hover:border-white/20 text-white/35 hover:text-white/65 hover:bg-white/[0.025]'
                  : 'border-white/[0.04] text-white/18 hover:text-white/35 hover:bg-white/[0.015]'
              }`}
            >
              <svg width="36" height="36" viewBox="0 0 40 40" className="flex-none">
                <path
                  d={ICONS[type]}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[8.5px] font-mono leading-none text-center truncate w-full px-0.5">
                {LABELS[type]}
              </span>

              {/* Pool indicator badge (only shown when pool is customised) */}
              {onToggleTypeInPool && (
                <span
                  onClick={e => { e.stopPropagation(); onToggleTypeInPool(type) }}
                  title={inPool ? 'In randomization pool — click to exclude' : 'Excluded from pool — click to include'}
                  className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border flex items-center justify-center transition-colors cursor-pointer z-10 ${
                    inPool
                      ? 'bg-violet-500/70 border-violet-400/80 hover:bg-violet-400/90'
                      : 'bg-transparent border-white/20 hover:border-violet-400/50'
                  }`}
                >
                  {inPool && (
                    <svg width="6" height="6" viewBox="0 0 6 6">
                      <path d="M1 3 L2.5 4.5 L5 1.5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
