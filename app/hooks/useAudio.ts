'use client'

/**
 * Uzumaki — Audio hook
 *
 * Manages the AudioManager lifecycle and runs an independent rAF loop
 * that calls manager.tick() each frame.
 *
 * Returns:
 *   fftData          — Uint8Array snapshot for the FFT visualizer (~30fps)
 *   reactiveModsRef  — ref (not state) to current reactive config overrides;
 *                      read by useSpiralAnimation hot path with zero re-renders
 *   initAudio        — must be called from a user gesture to create AudioContext
 *   setAudioSource   — connect mic or audio file
 *   disconnectReactive
 *   isAudioInitialized
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import type { RefObject } from 'react'
import { AudioManager } from '@/app/audio/AudioManager'
import type { SpiralConfigV2, AudioState } from '@/app/models/types'

export interface AudioControls {
  fftData: Uint8Array | null
  reactiveModsRef: RefObject<Partial<SpiralConfigV2>>
  initAudio: () => void
  setAudioSource: (source: 'mic' | 'file', file?: File) => Promise<void>
  disconnectReactive: () => void
  isAudioInitialized: boolean
  getScaleName: () => string
}

export function useAudio(
  configRef: RefObject<SpiralConfigV2>,
  audioStateRef: RefObject<AudioState>
): AudioControls {
  const managerRef       = useRef<AudioManager | null>(null)
  const reactiveModsRef  = useRef<Partial<SpiralConfigV2>>({})
  const rafRef           = useRef<number | null>(null)
  const lastFftUpdateRef = useRef(0)

  const [fftData, setFftData]                     = useState<Uint8Array | null>(null)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  // ── Public controls ──────────────────────────────────────────────────────

  const initAudio = useCallback(() => {
    if (managerRef.current?.isInitialized) return
    const m = new AudioManager()
    m.initContext()
    managerRef.current = m
    setIsAudioInitialized(true)
  }, [])

  const setAudioSource = useCallback(async (source: 'mic' | 'file', file?: File) => {
    if (!managerRef.current?.isInitialized) initAudio()
    await managerRef.current?.setSource(source, file)
  }, [initAudio])

  const disconnectReactive = useCallback(() => {
    managerRef.current?.disconnectReactive()
  }, [])

  const getScaleName = useCallback(() => {
    return managerRef.current?.getCurrentScaleName() ?? '—'
  }, [])

  // ── Audio rAF loop ────────────────────────────────────────────────────────

  useEffect(() => {
    const loop = () => {
      const manager    = managerRef.current
      const config     = configRef.current
      const audioState = audioStateRef.current

      if (manager?.isInitialized && config && audioState) {
        const { fftData: newFft, reactiveMods } = manager.tick(config, audioState)
        reactiveModsRef.current = reactiveMods

        // Throttle React state to ~30 fps to avoid excessive renders
        const now = performance.now()
        if (now - lastFftUpdateRef.current > 33) {
          setFftData(newFft ? new Uint8Array(newFft) : null)
          lastFftUpdateRef.current = now
        }
      } else {
        reactiveModsRef.current = {}
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configRef, audioStateRef])

  // ── Cleanup ───────────────────────────────────────────────────────────────

  useEffect(() => () => { managerRef.current?.dispose() }, [])

  return {
    fftData,
    reactiveModsRef,
    initAudio,
    setAudioSource,
    disconnectReactive,
    isAudioInitialized,
    getScaleName,
  }
}
