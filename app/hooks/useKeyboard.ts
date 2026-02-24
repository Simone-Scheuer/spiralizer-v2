'use client'

import { useEffect, useCallback } from 'react'
import { useSpiralStore } from '@/app/store/spiralStore'
import type { PanelTab } from '@/app/models/types'
import { getShareURL } from '@/app/utils/urlEncoding'
import { toast } from 'sonner'

interface KeyboardHandlers {
  onRandomize: () => void  // randomize + clear + restart (combined)
  onClear: () => void
  onRestart: () => void
  onExport?: () => void
  onShowShortcuts?: () => void
}

const TABS: PanelTab[] = ['shape', 'motion', 'style', 'pattern', 'audio', 'presets']

/**
 * Global keyboard shortcut handler for Uzumaki.
 *
 * Shortcuts:
 *   Space          — Play / Pause
 *   R              — Randomize (respects locks)
 *   U              — Clear canvas
 *   D              — Reset to defaults
 *   F              — Immersive mode toggle
 *   Shift+F        — Browser fullscreen toggle
 *   S              — Save preset (opens dialog via store signal)
 *   L              — Lock all / Unlock all toggle
 *   ?              — Show keyboard shortcut overlay
 *   Ctrl+1–6       — Switch to panel tab 1–6
 *   Ctrl+C         — Copy share URL to clipboard
 *   Ctrl++ / Ctrl+-— Zoom in / out
 *   Ctrl+0         — Reset zoom
 *   Escape         — Exit immersive / screensaver / cancel
 */
export function useKeyboard(handlers: KeyboardHandlers) {
  const store = useSpiralStore()

  const handleKey = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    // Don't fire shortcuts when user is typing in an input
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return
    }

    const ctrl = e.ctrlKey || e.metaKey

    // ── Ctrl/Cmd combos ────────────────────────────────────────────────────
    if (ctrl) {
      switch (e.key) {
        case '1': case '2': case '3': case '4': case '5': case '6': {
          e.preventDefault()
          const idx = parseInt(e.key) - 1
          if (TABS[idx]) store.setActiveTab(TABS[idx])
          return
        }
        case 'c': case 'C': {
          e.preventDefault()
          const url = getShareURL(store.config, store.renderSettings)
          navigator.clipboard.writeText(url).then(
            () => toast.success('Share link copied to clipboard'),
            () => toast.error('Failed to copy link'),
          )
          return
        }
        case '+': case '=': {
          e.preventDefault()
          store.setZoom(Math.min(10, store.uiState.zoom * 1.2))
          return
        }
        case '-': {
          e.preventDefault()
          store.setZoom(Math.max(0.25, store.uiState.zoom * 0.8))
          return
        }
        case '0': {
          e.preventDefault()
          store.setZoom(1)
          return
        }
        case 's': case 'S': {
          e.preventDefault()
          // Signal the UI to open the save preset dialog
          store.updateUIState({ activeTab: 'presets' })
          return
        }
      }
      return
    }

    // ── Any key exits screensaver (except Escape which also exits immersive) ─
    if (store.uiState.isScreensaver && e.key !== 'Escape') {
      store.updateUIState({ isScreensaver: false, isImmersive: false })
      return
    }

    // ── Single key shortcuts ───────────────────────────────────────────────
    switch (e.key) {
      case ' ':
        e.preventDefault()
        store.togglePause()
        break
      case 'r': case 'R':
        e.preventDefault()
        handlers.onRandomize()
        break
      case 'u': case 'U':
        e.preventDefault()
        handlers.onClear()
        break
      case 'd': case 'D':
        e.preventDefault()
        store.resetConfig()
        handlers.onClear()
        break
      case 'f':
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+F → browser fullscreen
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {/* ignore */})
            store.updateUIState({ isFullscreen: true })
          } else {
            document.exitFullscreen().catch(() => {/* ignore */})
            store.updateUIState({ isFullscreen: false })
          }
        } else {
          // F → immersive mode toggle
          store.updateUIState({ isImmersive: !store.uiState.isImmersive })
        }
        break
      case 'F':
        e.preventDefault()
        // Shift+F → browser fullscreen
        if (e.shiftKey) {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {/* ignore */})
            store.updateUIState({ isFullscreen: true })
          } else {
            document.exitFullscreen().catch(() => {/* ignore */})
            store.updateUIState({ isFullscreen: false })
          }
        } else {
          store.updateUIState({ isImmersive: !store.uiState.isImmersive })
        }
        break
      case 's': case 'S':
        e.preventDefault()
        store.setActiveTab('presets')
        break
      case 'l': case 'L': {
        e.preventDefault()
        // Toggle: if any locked, unlock all; else lock all
        const anyLocked = Object.values(store.locks).some(Boolean)
        if (anyLocked) {
          store.unlockAll()
        } else {
          store.lockAll()
        }
        break
      }
      case '?':
        e.preventDefault()
        handlers.onShowShortcuts?.()
        break
      case 'Escape':
        e.preventDefault()
        if (store.uiState.isImmersive) {
          store.updateUIState({ isImmersive: false })
        } else if (store.uiState.isScreensaver) {
          store.updateUIState({ isScreensaver: false })
        }
        break
    }
  }, [store, handlers])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
}
