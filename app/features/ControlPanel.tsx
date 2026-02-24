'use client'

import { ChevronLeft, ChevronRight, Shapes, Wind, Palette, Grid3x3, Music2, BookMarked } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'
import { ShapePanel } from '@/app/panels/ShapePanel'
import { MotionPanel } from '@/app/panels/MotionPanel'
import { StylePanel } from '@/app/panels/StylePanel'
import { PatternPanel } from '@/app/panels/PatternPanel'
import { AudioPanel } from '@/app/panels/AudioPanel'
import type { AudioPanelProps } from '@/app/panels/AudioPanel'
import { PresetsPanel } from '@/app/panels/PresetsPanel'
import type { PanelTab } from '@/app/models/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const TABS: { id: PanelTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'shape',   label: 'Shape',   Icon: Shapes },
  { id: 'motion',  label: 'Motion',  Icon: Wind },
  { id: 'style',   label: 'Style',   Icon: Palette },
  { id: 'pattern', label: 'Pattern', Icon: Grid3x3 },
  { id: 'audio',   label: 'Audio',   Icon: Music2 },
  { id: 'presets', label: 'Presets', Icon: BookMarked },
]

interface ControlPanelProps {
  onClear: () => void
  onRestart: () => void
  audioPanelProps: AudioPanelProps
}

export function ControlPanel({ onClear, onRestart, audioPanelProps }: ControlPanelProps) {
  const store = useSpiralStore()
  const { uiState } = store
  const collapsed = uiState.panelCollapsed
  const activeTab = uiState.activeTab

  return (
    <aside
      className={`flex-none flex flex-col border-r border-white/[0.07] bg-zinc-950/92 backdrop-blur-2xl transition-all duration-200 overflow-hidden ${
        collapsed ? 'w-11' : 'w-72'
      }`}
    >
      {collapsed ? (
        /* ── Icon Rail (collapsed) ─────────────────────────────────────────── */
        <div className="flex flex-col items-center py-2 gap-0.5 flex-1">
          {/* Expand button */}
          <button
            onClick={() => store.updateUIState({ panelCollapsed: false })}
            className="w-9 h-7 flex items-center justify-center rounded text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors mb-1"
            aria-label="Expand panel"
          >
            <ChevronRight size={14} />
          </button>

          {/* Tab icons */}
          {TABS.map(({ id, label, Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    store.setActiveTab(id)
                    store.updateUIState({ panelCollapsed: false })
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                    activeTab === id
                      ? 'text-cyan-400 bg-cyan-400/10'
                      : 'text-white/30 hover:text-white/70 hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-[11px] font-mono">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      ) : (
        /* ── Expanded Panel ──────────────────────────────────────────────────── */
        <>
          {/* Tab navigation */}
          <div className="flex-none flex items-center border-b border-white/[0.07]">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => store.setActiveTab(id)}
                className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wide transition-colors relative ${
                  activeTab === id
                    ? 'text-cyan-400'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {label}
                {activeTab === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400/70" />
                )}
              </button>
            ))}

            {/* Collapse toggle */}
            <button
              onClick={() => store.updateUIState({ panelCollapsed: true })}
              className="w-8 h-8 flex-none flex items-center justify-center text-white/20 hover:text-white/60 transition-colors border-l border-white/[0.07]"
              aria-label="Collapse panel"
            >
              <ChevronLeft size={13} />
            </button>
          </div>

          {/* Panel content — mask-based scroll shadows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1" style={{ maskImage: 'linear-gradient(to bottom, transparent 0, black 8px, black calc(100% - 8px), transparent 100%)' }}>
            {activeTab === 'shape' && <ShapePanel onClear={onClear} onRestart={onRestart} />}
            {activeTab === 'motion' && <MotionPanel />}
            {activeTab === 'style' && <StylePanel />}
            {activeTab === 'pattern' && <PatternPanel />}
            {activeTab === 'audio' && <AudioPanel {...audioPanelProps} />}
            {activeTab === 'presets' && <PresetsPanel onClear={onClear} onRestart={onRestart} />}
          </div>

          {/* Bottom: spiral info */}
          <div className="flex-none px-3 py-2 border-t border-white/[0.06] flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/20 truncate">
              {store.config.spiralType} · {store.config.spiralFamily}
            </span>
            <div className="flex-1" />
            <span className="text-[9px] font-mono text-white/12">
              {Object.values(store.locks).filter(Boolean).length} locked
            </span>
          </div>
        </>
      )}
    </aside>
  )
}
