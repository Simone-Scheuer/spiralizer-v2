'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ShortcutModalProps {
  open: boolean
  onClose: () => void
}

const SECTIONS = [
  {
    title: 'Playback',
    shortcuts: [
      { key: 'Space', desc: 'Play / Pause' },
      { key: 'R', desc: 'Randomize' },
      { key: 'U', desc: 'Clear canvas' },
      { key: 'D', desc: 'Reset to defaults' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { key: 'F', desc: 'Immersive mode' },
      { key: 'Shift+F', desc: 'Browser fullscreen' },
      { key: 'Ctrl + / -', desc: 'Zoom in / out' },
      { key: 'Ctrl+0', desc: 'Reset zoom' },
      { key: 'Dbl-click', desc: 'Reset zoom & pan' },
    ],
  },
  {
    title: 'Controls',
    shortcuts: [
      { key: 'L', desc: 'Lock / Unlock all' },
      { key: 'S', desc: 'Save preset' },
      { key: 'Ctrl+C', desc: 'Copy share URL' },
      { key: 'Ctrl+1-6', desc: 'Switch panel tab' },
    ],
  },
  {
    title: 'Modes',
    shortcuts: [
      { key: 'Esc', desc: 'Exit immersive / screensaver' },
      { key: '?', desc: 'This shortcut guide' },
    ],
  },
]

export function ShortcutModal({ open, onClose }: ShortcutModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 rounded-xl border border-white/[0.1] bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-mono font-bold text-white/80 tracking-wide uppercase">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Close shortcuts"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map(s => (
                  <div key={s.key} className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-white/50">{s.desc}</span>
                    <kbd className="text-[10px] font-mono text-white/70 bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5 whitespace-nowrap">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-white/[0.06] text-center">
          <span className="text-[10px] font-mono text-white/20">
            Press ? or Esc to close
          </span>
        </div>
      </div>
    </div>
  )
}
