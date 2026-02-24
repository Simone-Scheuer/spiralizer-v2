'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { SpiralCanvas } from '@/app/features/SpiralCanvas'
import { Toolbar } from '@/app/features/Toolbar'
import { ControlPanel } from '@/app/features/ControlPanel'
import { ImmersiveOverlay } from '@/app/features/ImmersiveOverlay'
import { ShortcutModal } from '@/app/features/ShortcutModal'
import { useSpiralStore } from '@/app/store/spiralStore'
import { useKeyboard } from '@/app/hooks/useKeyboard'
import { useAudio } from '@/app/hooks/useAudio'
import type { useSpiralAnimation } from '@/app/hooks/useSpiralAnimation'
import type { SpiralConfigV2, AudioState, RenderSettings } from '@/app/models/types'
import { getShareURL, parseShareURL } from '@/app/utils/urlEncoding'
import { downloadPNG } from '@/app/utils/screenshot'
import { toast } from 'sonner'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { WebGLFallback } from '@/app/components/WebGLFallback'
import { isWebGLAvailable, isLocalStorageAvailable } from '@/app/utils/validation'

type AnimControls = ReturnType<typeof useSpiralAnimation>

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const store = useSpiralStore()
  const controlsRef = useRef<AnimControls | null>(null)

  // ── Synced refs (avoid re-creating hooks on every render) ────────────────────
  const configRef     = useRef<SpiralConfigV2>(store.config)
  configRef.current   = store.config

  const audioStateRef   = useRef<AudioState>(store.audioState)
  audioStateRef.current = store.audioState

  const renderSettingsRef   = useRef<RenderSettings>(store.renderSettings)
  renderSettingsRef.current = store.renderSettings

  // ── Audio ─────────────────────────────────────────────────────────────────────
  const {
    fftData,
    reactiveModsRef,
    initAudio,
    setAudioSource,
    disconnectReactive,
    getScaleName,
  } = useAudio(configRef, audioStateRef)

  // ── Animation controls ────────────────────────────────────────────────────────
  const handleControls = useCallback((c: AnimControls) => {
    controlsRef.current = c
  }, [])

  const handleClear = useCallback(() => {
    controlsRef.current?.clearCanvas()
  }, [])

  const handleRestart = useCallback(() => {
    controlsRef.current?.restart()
  }, [])

  const handleRandomize = useCallback(() => {
    store.randomize()
    controlsRef.current?.clearCanvas()
    controlsRef.current?.restart()
  }, [store])

  const handleShare = useCallback(() => {
    const url = getShareURL(store.config, store.renderSettings)
    navigator.clipboard.writeText(url).then(
      () => toast.success('Share link copied to clipboard'),
      () => toast.error('Failed to copy link'),
    )
  }, [store.config, store.renderSettings])

  const handleExport = useCallback(() => {
    const renderer = controlsRef.current?.getRenderer()
    if (!renderer) { toast.error('Renderer not ready'); return }
    const dataURL = renderer.getDataURL()
    downloadPNG(dataURL)
    toast.success('PNG exported')
  }, [])

  const handleShowShortcuts = useCallback(() => {
    setShortcutsOpen(prev => !prev)
  }, [])

  // Sync pause state from store → animation controls
  useEffect(() => {
    if (store.uiState.isPaused) {
      controlsRef.current?.pause()
    } else {
      controlsRef.current?.play()
    }
  }, [store.uiState.isPaused])

  // Screensaver cycle with fade transition
  const [screensaverFading, setScreensaverFading] = useState(false)
  useEffect(() => {
    if (!store.uiState.isScreensaver) {
      setScreensaverFading(false)
      return
    }
    const ms = store.uiState.screensaverInterval * 1000
    const FADE_MS = 400
    const id = setInterval(() => {
      setScreensaverFading(true)
      setTimeout(() => {
        store.randomize()
        controlsRef.current?.clearCanvas()
        controlsRef.current?.restart()
        setScreensaverFading(false)
      }, FADE_MS)
    }, ms)
    return () => clearInterval(id)
  }, [store.uiState.isScreensaver, store.uiState.screensaverInterval, store])

  // Exit immersive when screensaver stops (if it was auto-entered)
  useEffect(() => {
    if (!store.uiState.isScreensaver && store.uiState.isImmersive) {
      // Don't auto-exit immersive if user manually entered it
    }
  }, [store.uiState.isScreensaver, store.uiState.isImmersive])

  // ── Cursor auto-hide in immersive/screensaver ─────────────────────────────────
  const [cursorHidden, setCursorHidden] = useState(false)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const isImmersiveOrScreensaver = store.uiState.isImmersive || store.uiState.isScreensaver
    if (!isImmersiveOrScreensaver) {
      setCursorHidden(false)
      return
    }

    const resetCursor = () => {
      setCursorHidden(false)
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
      cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 2000)
    }

    resetCursor()
    window.addEventListener('mousemove', resetCursor)
    window.addEventListener('mousedown', resetCursor)
    return () => {
      window.removeEventListener('mousemove', resetCursor)
      window.removeEventListener('mousedown', resetCursor)
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
      setCursorHidden(false)
    }
  }, [store.uiState.isImmersive, store.uiState.isScreensaver])

  // Keyboard shortcuts
  useKeyboard({
    onRandomize: handleRandomize,
    onClear: handleClear,
    onRestart: handleRestart,
    onShowShortcuts: handleShowShortcuts,
  })

  useEffect(() => setMounted(true), [])

  // ── WebGL detection ──────────────────────────────────────────────────────────
  const [webglOk, setWebglOk] = useState(true)
  useEffect(() => {
    setWebglOk(isWebGLAvailable())
  }, [])

  // ── localStorage fallback toast ──────────────────────────────────────────────
  useEffect(() => {
    if (mounted && !isLocalStorageAvailable()) {
      toast.info('Storage unavailable — settings won\u2019t be saved between sessions.')
    }
  }, [mounted])

  // ── Load config from URL hash on mount ──────────────────────────────────────
  const urlLoadedRef = useRef(false)
  useEffect(() => {
    if (!mounted || urlLoadedRef.current) return
    urlLoadedRef.current = true
    const payload = parseShareURL()
    if (!payload) return
    store.loadConfig(payload.config)
    store.updateRenderSettings(payload.render)
    toast.success('Loaded shared spiral')
    window.history.replaceState(null, '', window.location.pathname)
    setTimeout(() => {
      controlsRef.current?.clearCanvas()
      controlsRef.current?.restart()
    }, 100)
  }, [mounted, store])

  // Prevent SSR/client hydration mismatch
  if (!mounted) return <div className="fixed inset-0 bg-black" />

  // WebGL unavailable — show fallback instead of broken canvas
  if (!webglOk) return <WebGLFallback />

  const audioPanelProps = {
    fftData,
    onInitAudio:          initAudio,
    onSetSource:          setAudioSource,
    onDisconnectReactive: disconnectReactive,
    getScaleName,
  }

  const isImmersive = store.uiState.isImmersive

  return (
    <ErrorBoundary>
    <div
      className="fixed inset-0 flex flex-col bg-black overflow-hidden"
      style={{ cursor: cursorHidden ? 'none' : undefined }}
    >
      {/* Top toolbar — hidden in immersive */}
      <div
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{
          maxHeight: isImmersive ? 0 : 44,
          opacity: isImmersive ? 0 : 1,
        }}
      >
        <Toolbar
          onRandomize={handleRandomize}
          onClear={handleClear}
          onRestart={handleRestart}
          onShare={handleShare}
          onExport={handleExport}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left control panel — hidden in immersive */}
        <div
          className="transition-all duration-300 ease-out overflow-hidden"
          style={{
            maxWidth: isImmersive ? 0 : 999,
            opacity: isImmersive ? 0 : 1,
          }}
        >
          <ControlPanel
            onClear={handleClear}
            onRestart={handleRestart}
            audioPanelProps={audioPanelProps}
          />
        </div>

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden">
          <div
            className="absolute inset-0 transition-opacity duration-400"
            style={{ opacity: screensaverFading ? 0 : 1 }}
            onClick={() => {
              if (store.uiState.isScreensaver) {
                store.updateUIState({ isScreensaver: false, isImmersive: false })
              }
            }}
          >
            <SpiralCanvas
              config={store.config}
              isPaused={store.uiState.isPaused}
              onControls={handleControls}
              reactiveModsRef={reactiveModsRef}
              renderSettingsRef={renderSettingsRef}
            />
          </div>

          {/* Canvas hints — hidden in immersive, auto-fade after 5s */}
          {!isImmersive && (
            <CanvasHints />
          )}
        </main>
      </div>

      {/* Immersive overlay — floating pill */}
      {isImmersive && (
        <ImmersiveOverlay onRandomize={handleRandomize} />
      )}

      {/* Keyboard shortcut modal */}
      <ShortcutModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
    </ErrorBoundary>
  )
}

/** Canvas zoom/pan hints that auto-fade after 5 seconds */
function CanvasHints() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="absolute bottom-3 right-3 text-white/15 text-[10px] font-mono select-none pointer-events-none transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      scroll to zoom · alt+drag to pan · press ? for shortcuts
    </div>
  )
}

