'use client'

import { useCallback } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'
import { ParameterSlider } from '@/app/components/ParameterSlider'
import type { SpiralConfigV2 } from '@/app/models/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-white/25 uppercase tracking-[0.18em]">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  param: keyof SpiralConfigV2
  value: boolean
  locked: boolean
  onToggleLock: () => void
  onChange: (v: boolean) => void
}

function ToggleRow({ label, value, locked, onToggleLock, onChange }: ToggleRowProps) {
  return (
    <div className={`flex items-center gap-2 ${locked ? 'opacity-50' : ''}`}>
      <button
        onClick={onToggleLock}
        className={`w-4 h-4 flex-none flex items-center justify-center rounded transition-colors ${
          locked ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/15 hover:text-white/50'
        }`}
      >
        {locked ? <Lock size={10} strokeWidth={2.5} /> : <LockOpen size={10} strokeWidth={2} />}
      </button>
      <span className="flex-1 text-xs font-mono text-white/45">{label}</span>
      <button
        onClick={() => !locked && onChange(!value)}
        disabled={locked}
        className={`relative w-8 h-4 rounded-full transition-colors ${value ? 'bg-cyan-500/80' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${value ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}

export function PatternPanel() {
  const store = useSpiralStore()
  const cfg = store.config
  const locks = store.locks
  const constraints = store.constraints

  const upd = useCallback(<K extends keyof SpiralConfigV2>(k: K, v: SpiralConfigV2[K]) => {
    store.updateConfig({ [k]: v } as Partial<SpiralConfigV2>)
  }, [store])

  const r = (key: string) => constraints.paramRanges[key] ?? null
  const sr = (key: string) => (range: typeof constraints.paramRanges[string] | null) =>
    store.setParamRange(key, range ?? null)

  return (
    <div className="space-y-5">
      <Section title="Multi-Line">
        <ParameterSlider
          label="Count"
          value={cfg.multiLineCount}
          min={1} max={30} step={1}
          locked={locks.multiLineCount}
          onToggleLock={() => store.toggleLock('multiLineCount')}
          onChange={v => upd('multiLineCount', v)}
          tooltip="Number of parallel spiral lines drawn simultaneously."
          range={r('multiLineCount')} onSetRange={sr('multiLineCount')}
        />
        <ParameterSlider
          label="Spacing"
          value={cfg.multiLineSpacing}
          min={0} max={50} step={0.5}
          locked={locks.multiLineSpacing}
          onToggleLock={() => store.toggleLock('multiLineSpacing')}
          onChange={v => upd('multiLineSpacing', v)}
          tooltip="Angular gap between each parallel line."
          range={r('multiLineSpacing')} onSetRange={sr('multiLineSpacing')}
        />
        <ParameterSlider
          label="Rot. offset"
          value={cfg.rotationOffset}
          min={0} max={360} step={1}
          locked={locks.rotationOffset}
          onToggleLock={() => store.toggleLock('rotationOffset')}
          onChange={v => upd('rotationOffset', v)}
          tooltip="Initial rotation offset applied to all lines."
          unit="°"
          range={r('rotationOffset')} onSetRange={sr('rotationOffset')}
        />
      </Section>

      <Section title="Symmetry">
        <ParameterSlider
          label="Copies"
          value={cfg.symmetry}
          min={1} max={12} step={1}
          locked={locks.symmetry}
          onToggleLock={() => store.toggleLock('symmetry')}
          onChange={v => upd('symmetry', v)}
          tooltip="Number of radially-mirrored copies. 1 = no symmetry, 4 = 4-fold symmetry."
          range={r('symmetry')} onSetRange={sr('symmetry')}
        />
        <ParameterSlider
          label="Rotation"
          value={cfg.symmetryRotation}
          min={0} max={360} step={1}
          locked={locks.symmetryRotation}
          onToggleLock={() => store.toggleLock('symmetryRotation')}
          onChange={v => upd('symmetryRotation', v)}
          tooltip="Angular offset between symmetry copies."
          unit="°"
          range={r('symmetryRotation')} onSetRange={sr('symmetryRotation')}
        />
      </Section>

      <Section title="Pulse">
        <ToggleRow
          label="Pulse effect"
          param="pulseEffect"
          value={cfg.pulseEffect}
          locked={locks.pulseEffect}
          onToggleLock={() => store.toggleLock('pulseEffect')}
          onChange={v => upd('pulseEffect', v)}
        />
        {cfg.pulseEffect && (
          <>
            <ParameterSlider
              label="Speed"
              value={cfg.pulseSpeed}
              min={0.1} max={10} step={0.1}
              locked={locks.pulseSpeed}
              onToggleLock={() => store.toggleLock('pulseSpeed')}
              onChange={v => upd('pulseSpeed', v)}
              tooltip="Line width pulsation frequency."
              range={r('pulseSpeed')} onSetRange={sr('pulseSpeed')}
            />
            <ParameterSlider
              label="Range"
              value={cfg.pulseRange}
              min={0} max={1} step={0.01}
              locked={locks.pulseRange}
              onToggleLock={() => store.toggleLock('pulseRange')}
              onChange={v => upd('pulseRange', v)}
              tooltip="Pulse amplitude (0 = no variation, 1 = full width range)."
              range={r('pulseRange')} onSetRange={sr('pulseRange')}
            />
          </>
        )}
      </Section>
    </div>
  )
}
