'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { useSpiralAnimation } from '@/app/hooks/useSpiralAnimation'
import type { SpiralConfigV2, RenderSettings } from '@/app/models/types'

interface SpiralCanvasProps {
  config: SpiralConfigV2
  isPaused: boolean
  onControls?: (controls: ReturnType<typeof useSpiralAnimation>) => void
  /** Reactive audio mods ref — overlaid onto config each animation frame */
  reactiveModsRef?: RefObject<Partial<SpiralConfigV2>>
  /** Render settings ref — passed to PostProcessor each frame */
  renderSettingsRef?: RefObject<RenderSettings>
}

/**
 * Full-screen Three.js canvas component.
 * Mounts the WebGL renderer and wires up zoom + pan.
 */
export function SpiralCanvas({ config, isPaused, onControls, reactiveModsRef, renderSettingsRef }: SpiralCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controls = useSpiralAnimation(canvasRef, config, reactiveModsRef, renderSettingsRef)

  // Zoom indicator state
  const [zoomDisplay, setZoomDisplay] = useState<number | null>(null)
  const zoomFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expose controls to parent via callback
  useEffect(() => {
    if (onControls) onControls(controls)
  }, [onControls, controls])

  // Sync play/pause state
  useEffect(() => {
    if (isPaused) {
      controls.pause()
    } else {
      controls.play()
    }
  }, [isPaused, controls.pause, controls.play])

  // ── Zoom helpers ────────────────────────────────────────────────────────────
  const zoomRef = useRef(1)

  const applyTransform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.transform = `scale(${zoomRef.current})`
    canvas.style.transformOrigin = 'center center'
    canvas.style.translate = `${panRef.current.offsetX}px ${panRef.current.offsetY}px`

    // Show zoom indicator
    setZoomDisplay(zoomRef.current)
    if (zoomFadeRef.current) clearTimeout(zoomFadeRef.current)
    zoomFadeRef.current = setTimeout(() => setZoomDisplay(null), 1500)
  }, [])

  const resetZoomPan = useCallback(() => {
    zoomRef.current = 1
    panRef.current.offsetX = 0
    panRef.current.offsetY = 0
    applyTransform()
  }, [applyTransform])

  // ── Zoom (mouse wheel) — zooms toward cursor ────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.25, Math.min(10, zoomRef.current * factor))

    // Zoom toward cursor position
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top - rect.height / 2
      const scale = newZoom / zoomRef.current
      panRef.current.offsetX = cx - scale * (cx - panRef.current.offsetX)
      panRef.current.offsetY = cy - scale * (cy - panRef.current.offsetY)
    }

    zoomRef.current = newZoom
    applyTransform()
  }, [applyTransform])

  // ── Pan (drag) ───────────────────────────────────────────────────────────────
  const panRef = useRef({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 })

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 1 && !e.altKey) return  // middle mouse or alt+drag
    e.preventDefault()
    panRef.current.dragging = true
    panRef.current.startX = e.clientX - panRef.current.offsetX
    panRef.current.startY = e.clientY - panRef.current.offsetY
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!panRef.current.dragging) return
    panRef.current.offsetX = e.clientX - panRef.current.startX
    panRef.current.offsetY = e.clientY - panRef.current.startY
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.translate = `${panRef.current.offsetX}px ${panRef.current.offsetY}px`
  }, [])

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false
  }, [])

  // ── Double-click to reset zoom & pan ─────────────────────────────────────────
  const handleDblClick = useCallback((e: MouseEvent) => {
    e.preventDefault()
    resetZoomPan()
  }, [resetZoomPan])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('dblclick', handleDblClick)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('dblclick', handleDblClick)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleDblClick])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          background: '#000000',
        }}
      />
      {/* Zoom indicator */}
      {zoomDisplay !== null && (
        <div
          className="absolute bottom-3 left-3 text-white/40 text-[11px] font-mono select-none pointer-events-none bg-black/40 rounded px-1.5 py-0.5 backdrop-blur-sm transition-opacity duration-300"
        >
          {zoomDisplay.toFixed(1)}x
        </div>
      )}
    </>
  )
}
