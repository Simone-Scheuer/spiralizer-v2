'use client'

import { useEffect, useRef, useState } from 'react'
import type { SpiralConfigV2 } from '@/app/models/types'
import {
  getClassicStepLength,
  classicStep,
  getArchimedeanPoint,
  getParametricPoint,
  computeColor,
  GOLDEN_ANGLE_DEG,
} from '@/app/renderer/spiralMath'

const THUMB_SIZE = 160
const STEPS = 400

/**
 * Generate a thumbnail data URL from a SpiralConfigV2 using OffscreenCanvas.
 * Returns empty string if OffscreenCanvas is unavailable (e.g. Safari < 16.4).
 */
async function generateThumbnail(config: SpiralConfigV2): Promise<string> {
  try {
    const canvas = new OffscreenCanvas(THUMB_SIZE, THUMB_SIZE)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE)

    const cx = config.originX * THUMB_SIZE
    const cy = config.originY * THUMB_SIZE
    const scale = THUMB_SIZE * 0.45

    let x = cx
    let y = cy
    let angleDeg = config.rotationOffset
    let stepCount = 0
    let t = 0.01

    for (let i = 0; i < STEPS; i++) {
      let nx: number
      let ny: number

      const col = computeColor(config, i, STEPS)
      ctx.strokeStyle = `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${col.a})`
      ctx.lineWidth = Math.max(0.5, config.lineWidth * 0.3)

      if (config.spiralFamily === 'classic') {
        const angleActual = config.spiralType === 'golden'
          ? GOLDEN_ANGLE_DEG
          : config.angleChange + angleDeg * 0 // just use angleChange
        const sl = getClassicStepLength(
          config.stepLength * 0.3,
          stepCount,
          config.spiralType as 'linear' | 'exponential' | 'fibonacci' | 'golden',
          config.stepMultiplier
        )
        const next = classicStep(x, y, angleDeg, sl)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(next.x, next.y)
        ctx.stroke()
        x = next.x
        y = next.y
        angleDeg += angleActual
        stepCount++
      } else if (config.spiralFamily === 'archimedean') {
        const thetaStep = (config.angleChange * Math.PI) / 180 * 0.5
        const prevPt = getArchimedeanPoint(t, config)
        t += thetaStep
        const nextPt = getArchimedeanPoint(t, config)
        ctx.beginPath()
        ctx.moveTo(cx + prevPt.x * 0.3, cy + prevPt.y * 0.3)
        ctx.lineTo(cx + nextPt.x * 0.3, cy + nextPt.y * 0.3)
        ctx.stroke()
      } else {
        // parametric
        const tStep = 0.05
        const prevPt = getParametricPoint(t, config, scale)
        t += tStep
        const nextPt = getParametricPoint(t, config, scale)
        ctx.beginPath()
        ctx.moveTo(cx + prevPt.x, cy + prevPt.y)
        ctx.lineTo(cx + nextPt.x, cy + nextPt.y)
        ctx.stroke()
      }
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return URL.createObjectURL(blob)
  } catch {
    return ''
  }
}

interface PresetThumbnailProps {
  config: SpiralConfigV2
  /** Pre-generated data URL. If provided, skip generation. */
  dataUrl?: string
  className?: string
}

export function PresetThumbnail({ config, dataUrl, className = '' }: PresetThumbnailProps) {
  const [src, setSrc] = useState(dataUrl ?? '')
  const generatedRef = useRef(false)

  useEffect(() => {
    if (dataUrl) { setSrc(dataUrl); return }
    if (generatedRef.current) return
    generatedRef.current = true
    generateThumbnail(config).then(url => { if (url) setSrc(url) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl])

  if (!src) {
    return (
      <div className={`bg-zinc-900 flex items-center justify-center ${className}`}>
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return <img src={src} alt="" className={`object-cover ${className}`} />
}

export { generateThumbnail }
