'use client'

import { Lock, LockOpen } from 'lucide-react'

interface ColorPickerProps {
  label: string
  value: string
  locked?: boolean
  onToggleLock?: () => void
  onChange: (v: string) => void
}

export function ColorPicker({ label, value, locked = false, onToggleLock, onChange }: ColorPickerProps) {
  return (
    <div className={`flex items-center gap-2 ${locked ? 'opacity-50' : ''}`}>
      {onToggleLock ? (
        <button
          onClick={onToggleLock}
          className={`w-4 h-4 flex-none flex items-center justify-center rounded transition-colors ${
            locked ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/15 hover:text-white/50'
          }`}
        >
          {locked ? <Lock size={10} strokeWidth={2.5} /> : <LockOpen size={10} strokeWidth={2} />}
        </button>
      ) : (
        <div className="w-4 flex-none" />
      )}
      <span className="flex-1 text-xs font-mono text-white/45 truncate leading-none">{label}</span>
      <label className={`relative flex-none flex items-center gap-1.5 ${locked ? 'pointer-events-none' : 'cursor-pointer'}`}>
        <div
          className="w-7 h-5 rounded border border-white/20 hover:border-white/40 transition-colors"
          style={{ backgroundColor: value }}
        />
        <span className="text-white/30 text-xs font-mono w-16">{value}</span>
        <input
          type="color"
          value={value}
          disabled={locked}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>
    </div>
  )
}
