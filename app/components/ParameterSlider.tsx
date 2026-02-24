'use client'

import { useState, useRef } from 'react'
import { Lock, LockOpen, Sliders } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ParamRange } from '@/app/models/types'

interface ParameterSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  locked?: boolean
  onToggleLock?: () => void
  onChange: (v: number) => void
  tooltip?: string
  unit?: string
  /** Current randomization range constraint (null = no constraint = full schema range). */
  range?: ParamRange | null
  /** Called when the user sets or clears the range. Pass null to remove the constraint. */
  onSetRange?: (range: ParamRange | null) => void
}

export function ParameterSlider({
  label, value, min, max, step,
  locked = false, onToggleLock, onChange, tooltip, unit,
  range, onSetRange,
}: ParameterSliderProps) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [showRange, setShowRange] = useState(false)

  // Local editable strings for the range inputs (so partial typing works)
  const [rangeMinStr, setRangeMinStr] = useState('')
  const [rangeMaxStr, setRangeMaxStr] = useState('')

  const fmt = (v: number) =>
    step < 0.01
      ? v.toExponential(2)
      : v % 1 === 0
      ? String(v)
      : v.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 1)

  const commitEdit = (raw: string) => {
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
    setEditing(false)
  }

  const openRange = () => {
    setRangeMinStr(fmt(range?.min ?? min))
    setRangeMaxStr(fmt(range?.max ?? max))
    setShowRange(true)
  }

  const commitRange = (minRaw: string, maxRaw: string) => {
    if (!onSetRange) return
    const lo = parseFloat(minRaw)
    const hi = parseFloat(maxRaw)
    if (!isNaN(lo) && !isNaN(hi)) {
      const clampedLo = Math.min(max, Math.max(min, lo))
      const clampedHi = Math.min(max, Math.max(min, hi))
      onSetRange({ min: clampedLo, max: clampedHi > clampedLo ? clampedHi : clampedLo })
    }
  }

  const clearRange = () => {
    onSetRange?.(null)
    setShowRange(false)
  }

  // Width fraction helpers for the range band overlay
  const trackFrac = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)))
  const rangeLeft  = range ? trackFrac(range.min) : 0
  const rangeWidth = range ? Math.max(0, trackFrac(range.max) - rangeLeft) : 0

  const labelEl = (
    <span className="w-24 flex-none text-xs font-mono text-white/45 truncate leading-none">
      {label}
    </span>
  )

  const hasRange = range !== null && range !== undefined
  const showRangeBtn = !!onSetRange

  return (
    <div className={`space-y-0.5 ${locked ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        {/* Lock toggle */}
        {onToggleLock ? (
          <button
            onClick={onToggleLock}
            className={`w-4 h-4 flex-none flex items-center justify-center rounded transition-colors ${
              locked ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/15 hover:text-white/50'
            }`}
          >
            {locked
              ? <Lock size={10} strokeWidth={2.5} />
              : <LockOpen size={10} strokeWidth={2} />
            }
          </button>
        ) : (
          <div className="w-4 flex-none" />
        )}

        {/* Label with optional tooltip */}
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-24 flex-none text-xs font-mono text-white/45 truncate leading-none cursor-help underline decoration-dotted decoration-white/25 underline-offset-2">
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs max-w-52 font-mono">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : labelEl}

        {/* Slider with range band overlay */}
        <div className="flex-1 relative">
          {/* Range band behind the slider track */}
          {hasRange && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-violet-400/35 pointer-events-none z-10"
              style={{ left: `${rangeLeft * 100}%`, width: `${rangeWidth * 100}%` }}
            />
          )}
          <Slider
            value={[value]}
            min={min}
            max={max}
            step={step}
            disabled={locked}
            onValueChange={([v]) => onChange(v)}
            className="[&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-cyan-500/70 [&_[data-slot=slider-thumb]]:border-cyan-500/80 [&_[data-slot=slider-thumb]]:bg-zinc-900 [&_[data-slot=slider-thumb]]:size-3.5"
          />
        </div>

        {/* Value display / editable */}
        {editing ? (
          <input
            autoFocus
            type="number"
            value={inputVal}
            min={min}
            max={max}
            step={step}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => commitEdit(inputVal)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit(inputVal)
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-16 text-right text-xs font-mono bg-zinc-900 border border-cyan-400/60 text-white rounded px-1 py-0.5 outline-none flex-none"
          />
        ) : (
          <button
            onClick={() => { if (!locked) { setInputVal(fmt(value)); setEditing(true) } }}
            className={`w-16 text-right text-xs font-mono flex-none transition-colors ${
              locked ? 'text-white/30 cursor-default' : 'text-white/40 hover:text-white/70 cursor-text'
            }`}
          >
            {fmt(value)}{unit && <span className="text-white/20 text-[10px] ml-0.5">{unit}</span>}
          </button>
        )}

        {/* Range toggle button */}
        {showRangeBtn && (
          <button
            onClick={() => showRange ? setShowRange(false) : openRange()}
            title={hasRange ? `Range: ${fmt(range!.min)}–${fmt(range!.max)}` : 'Set randomization range'}
            className={`w-4 h-4 flex-none flex items-center justify-center rounded transition-colors ${
              hasRange
                ? 'text-violet-400 hover:text-violet-300'
                : showRange
                ? 'text-white/50'
                : 'text-white/15 hover:text-white/50'
            }`}
          >
            <Sliders size={10} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Range editor row */}
      {showRange && onSetRange && (
        <div className="flex items-center gap-1.5 pl-6 pr-1 py-0.5">
          <span className="text-[9px] font-mono text-violet-400/70 w-7 flex-none">Min</span>
          <input
            type="number"
            value={rangeMinStr}
            min={min}
            max={max}
            step={step}
            onChange={e => setRangeMinStr(e.target.value)}
            onBlur={() => commitRange(rangeMinStr, rangeMaxStr)}
            onKeyDown={e => { if (e.key === 'Enter') commitRange(rangeMinStr, rangeMaxStr) }}
            className="w-16 text-right text-[10px] font-mono bg-black/40 border border-violet-400/30 text-violet-200/80 rounded px-1 py-0.5 outline-none focus:border-violet-400/60 flex-none"
          />
          <span className="text-[9px] font-mono text-white/20">–</span>
          <span className="text-[9px] font-mono text-violet-400/70 w-7 flex-none">Max</span>
          <input
            type="number"
            value={rangeMaxStr}
            min={min}
            max={max}
            step={step}
            onChange={e => setRangeMaxStr(e.target.value)}
            onBlur={() => commitRange(rangeMinStr, rangeMaxStr)}
            onKeyDown={e => { if (e.key === 'Enter') commitRange(rangeMinStr, rangeMaxStr) }}
            className="w-16 text-right text-[10px] font-mono bg-black/40 border border-violet-400/30 text-violet-200/80 rounded px-1 py-0.5 outline-none focus:border-violet-400/60 flex-none"
          />
          {hasRange && (
            <button
              onClick={clearRange}
              title="Clear range constraint"
              className="ml-auto text-[9px] font-mono text-white/20 hover:text-red-400/60 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
}
