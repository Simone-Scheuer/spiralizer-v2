'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Zap, X } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'

interface ImmersiveOverlayProps {
  onRandomize: () => void
}

/**
 * Floating pill control that appears in immersive fullscreen mode.
 * Auto-hides after 3 seconds of mouse inactivity, reappears on move.
 */
export function ImmersiveOverlay({ onRandomize }: ImmersiveOverlayProps) {
  const store = useSpiralStore()
  const [visible, setVisible] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    setVisible(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setVisible(false), 3000)
  }, [])

  useEffect(() => {
    resetTimer()
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('mousedown', resetTimer)
    return () => {
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('mousedown', resetTimer)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [resetTimer])

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-1.5 py-1 rounded-full border border-white/[0.1] bg-zinc-950/80 backdrop-blur-xl shadow-2xl transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <button
        onClick={() => store.togglePause()}
        className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={store.uiState.isPaused ? 'Play' : 'Pause'}
      >
        {store.uiState.isPaused ? <Play size={14} /> : <Pause size={14} />}
      </button>

      <button
        onClick={onRandomize}
        className="h-8 w-8 flex items-center justify-center rounded-full text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
        aria-label="Randomize"
      >
        <Zap size={14} />
      </button>

      <div className="h-4 w-px bg-white/[0.1]" />

      <button
        onClick={() => store.updateUIState({ isImmersive: false })}
        className="h-8 w-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        aria-label="Exit immersive mode"
      >
        <X size={14} />
      </button>
    </div>
  )
}
