'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import { SpiralRenderer } from '@/app/renderer/SpiralRenderer'
import {
  classicStep,
  getClassicStepLength,
  GOLDEN_ANGLE_DEG,
  getArchimedeanPoint,
  getParametricPoint,
  computeColor,
} from '@/app/renderer/spiralMath'
import type { SpiralConfigV2, RenderSettings } from '@/app/models/types'

export interface AnimationControls {
  isPaused: boolean
  play: () => void
  pause: () => void
  restart: () => void
  clearCanvas: () => void
  getRenderer: () => SpiralRenderer | null
}

/**
 * Core animation loop for Uzumaki.
 *
 * Animation strategy: requestAnimationFrame + setTimeout hybrid.
 * - requestAnimationFrame keeps us synced with the display.
 * - setTimeout(callback, config.speed) controls how often we advance the spiral.
 * This decouples draw-rate from frame-rate, matching v1's behavior.
 *
 * Supports all 3 spiral families:
 *   - classic: step-based position tracking
 *   - archimedean: polar θ tracking
 *   - parametric: absolute t tracking
 */
export function useSpiralAnimation(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  config: SpiralConfigV2,
  reactiveModsRef?: RefObject<Partial<SpiralConfigV2>>,
  renderSettingsRef?: RefObject<RenderSettings>
): AnimationControls {
  const rendererRef = useRef<SpiralRenderer | null>(null)
  const isPausedRef = useRef(false)
  const rafIdRef = useRef<number | null>(null)
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Classic family state
  const posRef = useRef({ x: 0, y: 0 })
  const angleDegRef = useRef(0)
  const stepCountRef = useRef(0)
  const oscPhaseRef = useRef(0)
  const wobblePhaseRef = useRef(0)

  // Archimedean / parametric family state
  const tRef = useRef(0)
  const prevPosRef = useRef<{ x: number; y: number } | null>(null)

  // Keep latest config in a ref so the animation loop always reads current values
  const configRef = useRef(config)
  configRef.current = config

  // ── Initialization ───────────────────────────────────────────────────────────

  const initRenderer = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || rendererRef.current) return

    const renderer = new SpiralRenderer()
    renderer.init(canvas)
    if (renderSettingsRef?.current) {
      renderer.initPostProcessing(renderSettingsRef.current)
    }
    rendererRef.current = renderer
  }, [canvasRef, renderSettingsRef])

  const resetState = useCallback(() => {
    const cfg = configRef.current
    const renderer = rendererRef.current
    if (!renderer) return

    // Reset position to canvas center offset by originX/Y
    posRef.current = {
      x: (cfg.originX - 0.5) * renderer.canvasWidth,
      y: (0.5 - cfg.originY) * renderer.canvasHeight,
    }
    angleDegRef.current = cfg.rotationOffset
    stepCountRef.current = 0
    oscPhaseRef.current = 0
    wobblePhaseRef.current = 0
    tRef.current = 0
    prevPosRef.current = null
  }, [])

  // ── Frame Logic ──────────────────────────────────────────────────────────────

  const computeNextFrame = useCallback(() => {
    // Merge reactive audio mods on top of base config (zero-allocation fast path when empty)
    const mods = reactiveModsRef?.current
    const cfg = (mods && Object.keys(mods).length > 0)
      ? { ...configRef.current, ...mods }
      : configRef.current
    const renderer = rendererRef.current
    if (!renderer) return

    const { spiralFamily, spiralType } = cfg
    const stepCount = stepCountRef.current

    // Compute color for this step
    const { r, g, b, a } = computeColor(cfg, stepCount, 5000)

    if (spiralFamily === 'classic') {
      // ── Classic Family ──────────────────────────────────────────────────────
      const prevPos = { ...posRef.current }
      const type = spiralType as 'linear' | 'exponential' | 'fibonacci' | 'golden'

      // Angle for golden spiral is fixed
      let angleChange = type === 'golden' ? GOLDEN_ANGLE_DEG : cfg.angleChange

      // Apply angle increment (acceleration)
      if (cfg.angleIncrement !== 0) {
        angleChange += cfg.angleIncrement * stepCount
      }

      // Oscillation
      if (cfg.oscillate) {
        oscPhaseRef.current += cfg.oscillationSpeed * 0.05
        angleChange += Math.sin(oscPhaseRef.current) * 45
      }

      // Wobble
      if (cfg.wobble) {
        wobblePhaseRef.current += cfg.wobbleSpeed * 0.1
        const jitter = (Math.random() * 2 - 1) * cfg.wobbleIntensity * 30
        angleChange += jitter
      }

      // Advance angle
      const direction = cfg.reverseDirection ? -1 : 1
      angleDegRef.current += angleChange * direction

      // Compute step length
      let stepLen = getClassicStepLength(cfg.stepLength, stepCount, type, cfg.stepMultiplier)

      // Pulse effect
      if (cfg.pulseEffect) {
        const pulse = 1 + cfg.pulseRange * Math.sin(stepCount * cfg.pulseSpeed * 0.1)
        stepLen *= pulse
      }

      // Apply acceleration to speed
      if (cfg.acceleration !== 0) {
        stepLen *= Math.max(0.01, 1 + cfg.acceleration * stepCount)
      }

      // Advance position
      const nextPos = classicStep(
        posRef.current.x,
        posRef.current.y,
        angleDegRef.current,
        stepLen
      )
      posRef.current = nextPos

      // Draw multi-line + symmetry
      _drawWithSymmetry(renderer, prevPos, nextPos, cfg, r, g, b, a)

    } else if (spiralFamily === 'archimedean') {
      // ── Archimedean Family ──────────────────────────────────────────────────
      // stepLength drives angular resolution: higher = coarser, faster advance
      const thetaStep = cfg.stepLength * 0.01
      tRef.current += thetaStep

      const originX = (cfg.originX - 0.5) * renderer.canvasWidth
      const originY = (0.5 - cfg.originY) * renderer.canvasHeight
      const raw = getArchimedeanPoint(tRef.current, cfg)
      const currentPos = { x: raw.x + originX, y: raw.y + originY }
      const prevPos = prevPosRef.current ?? currentPos

      _drawWithSymmetry(renderer, prevPos, currentPos, cfg, r, g, b, a)
      prevPosRef.current = { ...currentPos }

    } else if (spiralFamily === 'parametric') {
      // ── Parametric Family ───────────────────────────────────────────────────
      // stepLength drives t-advance rate: higher = faster/coarser sweep
      const tStep = cfg.stepLength * 0.004
      tRef.current += tStep

      // Scale: 40% of the shorter canvas dimension
      const scale = Math.min(renderer.canvasWidth, renderer.canvasHeight) * 0.4

      const originX = (cfg.originX - 0.5) * renderer.canvasWidth
      const originY = (0.5 - cfg.originY) * renderer.canvasHeight
      const raw = getParametricPoint(tRef.current, cfg, scale)
      const currentPos = { x: raw.x + originX, y: raw.y + originY }
      const prevPos = prevPosRef.current ?? currentPos

      _drawWithSymmetry(renderer, prevPos, currentPos, cfg, r, g, b, a)
      prevPosRef.current = { ...currentPos }
    }

    stepCountRef.current++
    // Caller is responsible for renderer.render() to allow batching
  }, [])

  // ── Loop ─────────────────────────────────────────────────────────────────────

  const scheduleNext = useCallback(() => {
    if (isPausedRef.current) return

    const speed = Math.max(0, configRef.current.speed)
    const steps = Math.max(1, Math.round(configRef.current.stepsPerFrame))

    const tick = () => {
      // Sync material properties that can change without a restart
      const cfg = configRef.current
      rendererRef.current?.setLineWidth(cfg.lineWidth)
      // Push latest render settings so PostProcessor uses current values
      if (renderSettingsRef?.current) {
        rendererRef.current?.updateRenderSettings(renderSettingsRef.current)
      }
      // Run N steps, then issue a single render call
      for (let i = 0; i < steps; i++) computeNextFrame()
      rendererRef.current?.render()
    }

    if (speed === 0) {
      // Run as fast as possible via rAF
      rafIdRef.current = requestAnimationFrame(() => {
        tick()
        scheduleNext()
      })
    } else {
      // Delay between ticks
      timeoutIdRef.current = setTimeout(() => {
        rafIdRef.current = requestAnimationFrame(() => {
          tick()
          scheduleNext()
        })
      }, speed)
    }
  }, [computeNextFrame])

  const stopLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
  }, [])

  // ── Public Controls ───────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (!isPausedRef.current) return
    isPausedRef.current = false
    scheduleNext()
  }, [scheduleNext])

  const pause = useCallback(() => {
    isPausedRef.current = true
    stopLoop()
  }, [stopLoop])

  const restart = useCallback(() => {
    stopLoop()
    isPausedRef.current = false
    resetState()
    scheduleNext()
  }, [stopLoop, resetState, scheduleNext])

  const clearCanvas = useCallback(() => {
    rendererRef.current?.clear()
    resetState()
  }, [resetState])

  const getRenderer = useCallback(() => rendererRef.current, [])

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    initRenderer()
    resetState()
    scheduleNext()

    const handleResize = () => {
      const canvas = canvasRef.current
      const renderer = rendererRef.current
      if (!canvas || !renderer) return
      // offsetWidth/offsetHeight are more reliable than clientWidth for canvas elements
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      if (w > 0 && h > 0) renderer.resize(w, h)
    }
    const ro = new ResizeObserver(handleResize)
    if (canvasRef.current) ro.observe(canvasRef.current)

    return () => {
      stopLoop()
      ro.disconnect()
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // Only run on mount/unmount

  return {
    isPaused: isPausedRef.current,
    play,
    pause,
    restart,
    clearCanvas,
    getRenderer,
  }
}

// ─── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Draw a segment (from → to) with all multi-line and symmetry copies.
 */
function _drawWithSymmetry(
  renderer: SpiralRenderer,
  from: { x: number; y: number },
  to: { x: number; y: number },
  cfg: SpiralConfigV2,
  r: number, g: number, b: number, a: number
): void {
  const { multiLineCount, multiLineSpacing, symmetry, symmetryRotation } = cfg

  // Build the list of offsets for parallel lines
  const lineOffsets: number[] = []
  for (let i = 0; i < multiLineCount; i++) {
    const offset = (i - (multiLineCount - 1) / 2) * multiLineSpacing
    lineOffsets.push(offset)
  }

  for (let sym = 0; sym < symmetry; sym++) {
    const symAngleRad = ((sym * (360 / symmetry) + symmetryRotation) * Math.PI) / 180

    for (const offset of lineOffsets) {
      // Offset perpendicular to the segment direction
      const dx = to.x - from.x
      const dy = to.y - from.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const perpX = (-dy / len) * offset
      const perpY = (dx / len) * offset

      let f = { x: from.x + perpX, y: from.y + perpY }
      let t = { x: to.x + perpX, y: to.y + perpY }

      // Apply symmetry rotation around origin
      if (sym > 0) {
        f = rotatePoint(f, symAngleRad)
        t = rotatePoint(t, symAngleRad)
      }

      renderer.addLineSegment(f, t, r, g, b, a)
    }
  }
}

function rotatePoint(p: { x: number; y: number }, rad: number): { x: number; y: number } {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }
}
