'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  defaultConfigV2,
  defaultRenderSettings,
  defaultAudioState,
  defaultUIState,
  defaultLocks,
  defaultConstraints,
} from '@/app/models/types'
import type {
  SpiralConfigV2,
  SpiralConfigLocks,
  SpiralPreset,
  RenderSettings,
  AudioState,
  UIState,
  PanelTab,
  SpiralType,
  ColorMode,
  ParamRange,
  RandomizationConstraints,
} from '@/app/models/types'
import { createRandomConfig } from '@/app/utils/randomize'

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  config: 'spiralv2_config',
  locks: 'spiralv2_locks',
  presets: 'spiralv2_presets',
  render: 'spiralv2_render',
  constraints: 'spiralv2_constraints',
} as const

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded — silently ignore
  }
}

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface SpiralStore {
  // State slices
  config: SpiralConfigV2
  locks: SpiralConfigLocks
  presets: SpiralPreset[]
  renderSettings: RenderSettings
  audioState: AudioState
  uiState: UIState
  constraints: RandomizationConstraints

  // Config actions
  updateConfig: (partial: Partial<SpiralConfigV2>) => void
  resetConfig: () => void
  loadConfig: (config: SpiralConfigV2) => void

  // Lock actions
  toggleLock: (param: keyof SpiralConfigV2) => void
  lockAll: () => void
  unlockAll: () => void

  // Randomize
  randomize: () => void

  // Presets
  savePreset: (name: string, thumbnail?: string) => string  // returns new preset id
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void

  // Render settings
  updateRenderSettings: (partial: Partial<RenderSettings>) => void

  // Audio state
  updateAudioState: (partial: Partial<AudioState>) => void

  // UI state
  updateUIState: (partial: Partial<UIState>) => void
  setActiveTab: (tab: PanelTab) => void
  setZoom: (zoom: number) => void
  togglePause: () => void
  toggleScreensaver: () => void

  // Randomization constraints
  setAllowedSpiralTypes: (types: SpiralType[] | null) => void
  setAllowedColorModes: (modes: ColorMode[] | null) => void
  setParamRange: (key: string, range: ParamRange | null) => void
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useSpiralStore = create<SpiralStore>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial State (hydrated from localStorage) ──────────────────────────
    config: load(KEYS.config, defaultConfigV2),
    locks: load(KEYS.locks, defaultLocks()),
    presets: (() => {
      if (typeof window === 'undefined') return []
      try {
        const raw = localStorage.getItem(KEYS.presets)
        return raw ? (JSON.parse(raw) as SpiralPreset[]) : []
      } catch {
        return []
      }
    })(),
    renderSettings: load(KEYS.render, defaultRenderSettings),
    audioState: defaultAudioState,
    uiState: defaultUIState,
    constraints: load(KEYS.constraints, defaultConstraints()),

    // ── Config ──────────────────────────────────────────────────────────────
    updateConfig(partial) {
      set(state => {
        const next = { ...state.config, ...partial }
        save(KEYS.config, next)
        return { config: next }
      })
    },

    resetConfig() {
      save(KEYS.config, defaultConfigV2)
      set({ config: defaultConfigV2 })
    },

    loadConfig(config) {
      save(KEYS.config, config)
      set({ config })
    },

    // ── Locks ────────────────────────────────────────────────────────────────
    toggleLock(param) {
      set(state => {
        const next = { ...state.locks, [param]: !state.locks[param] }
        save(KEYS.locks, next)
        return { locks: next }
      })
    },

    lockAll() {
      set(state => {
        const next = { ...state.locks }
        for (const key in next) {
          (next as Record<string, boolean>)[key] = true
        }
        save(KEYS.locks, next)
        return { locks: next }
      })
    },

    unlockAll() {
      const next = defaultLocks()
      save(KEYS.locks, next)
      set({ locks: next })
    },

    // ── Randomize ────────────────────────────────────────────────────────────
    randomize() {
      const { config, locks, constraints } = get()
      const next = createRandomConfig(config, locks, constraints)
      save(KEYS.config, next)
      set({ config: next })
    },

    // ── Presets ──────────────────────────────────────────────────────────────
    savePreset(name, thumbnail = '') {
      const { config, renderSettings } = get()
      const id = `preset_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const preset: SpiralPreset = {
        id,
        name,
        config: { ...config },
        renderSettings: { ...renderSettings },
        thumbnail,
        createdAt: Date.now(),
      }
      set(state => {
        const next = [preset, ...state.presets]
        save(KEYS.presets, next)
        return { presets: next }
      })
      return id
    },

    loadPreset(id) {
      const { presets } = get()
      const preset = presets.find(p => p.id === id)
      if (!preset) return
      save(KEYS.config, preset.config)
      save(KEYS.render, preset.renderSettings)
      set({ config: preset.config, renderSettings: preset.renderSettings })
    },

    deletePreset(id) {
      set(state => {
        const next = state.presets.filter(p => p.id !== id)
        save(KEYS.presets, next)
        return { presets: next }
      })
    },

    // ── Render Settings ──────────────────────────────────────────────────────
    updateRenderSettings(partial) {
      set(state => {
        const next = { ...state.renderSettings, ...partial }
        save(KEYS.render, next)
        return { renderSettings: next }
      })
    },

    // ── Audio State ──────────────────────────────────────────────────────────
    updateAudioState(partial) {
      set(state => ({ audioState: { ...state.audioState, ...partial } }))
    },

    // ── UI State ─────────────────────────────────────────────────────────────
    updateUIState(partial) {
      set(state => ({ uiState: { ...state.uiState, ...partial } }))
    },

    setActiveTab(tab) {
      set(state => ({ uiState: { ...state.uiState, activeTab: tab } }))
    },

    setZoom(zoom) {
      set(state => ({ uiState: { ...state.uiState, zoom } }))
    },

    togglePause() {
      set(state => ({
        uiState: { ...state.uiState, isPaused: !state.uiState.isPaused },
      }))
    },

    toggleScreensaver() {
      set(state => ({
        uiState: { ...state.uiState, isScreensaver: !state.uiState.isScreensaver },
      }))
    },

    // ── Randomization Constraints ─────────────────────────────────────────────
    setAllowedSpiralTypes(types) {
      set(state => {
        const next: RandomizationConstraints = { ...state.constraints, allowedSpiralTypes: types }
        save(KEYS.constraints, next)
        return { constraints: next }
      })
    },

    setAllowedColorModes(modes) {
      set(state => {
        const next: RandomizationConstraints = { ...state.constraints, allowedColorModes: modes }
        save(KEYS.constraints, next)
        return { constraints: next }
      })
    },

    setParamRange(key, range) {
      set(state => {
        const paramRanges = { ...state.constraints.paramRanges }
        if (range === null) {
          delete paramRanges[key]
        } else {
          paramRanges[key] = range
        }
        const next: RandomizationConstraints = { ...state.constraints, paramRanges }
        save(KEYS.constraints, next)
        return { constraints: next }
      })
    },
  }))
)
