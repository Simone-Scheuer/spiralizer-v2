'use client'

import { useCallback } from 'react'
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
        className={`w-4 h-4 flex-none flex items-center justify-center rounded transition-colors text-[10px] ${
          locked ? 'text-yellow-400' : 'text-white/15 hover:text-white/50'
        }`}
      >
        {locked ? '🔒' : '○'}
      </button>
      <span className="flex-1 text-xs font-mono text-white/45">{label}</span>
      <button
        onClick={() => !locked && onChange(!value)}
        disabled={locked}
        className={`relative w-8 h-4 rounded-full transition-colors ${value ? 'bg-cyan-500/80' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
            value ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export function MotionPanel() {
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
      <Section title="Speed & Step">
        <ParameterSlider
          label="Delay (ms)"
          value={cfg.speed}
          min={0} max={500} step={1}
          locked={locks.speed}
          onToggleLock={() => store.toggleLock('speed')}
          onChange={v => upd('speed', v)}
          tooltip="Milliseconds between frames. 0 = run every requestAnimationFrame."
          unit="ms"
          range={r('speed')} onSetRange={sr('speed')}
        />
        <div className="text-[10px] font-mono text-white/18 pl-6">0 = max speed (60fps)</div>

        <ParameterSlider
          label="Steps/frame"
          value={cfg.stepsPerFrame}
          min={1} max={50} step={1}
          locked={locks.stepsPerFrame}
          onToggleLock={() => store.toggleLock('stepsPerFrame')}
          onChange={v => upd('stepsPerFrame', v)}
          tooltip="Number of spiral steps computed per tick. Multiplies effective speed."
          range={r('stepsPerFrame')} onSetRange={sr('stepsPerFrame')}
        />

        <ParameterSlider
          label="Step length"
          value={cfg.stepLength}
          min={0.1} max={100} step={0.1}
          locked={locks.stepLength}
          onToggleLock={() => store.toggleLock('stepLength')}
          onChange={v => upd('stepLength', v)}
          tooltip="Base distance between path points."
          range={r('stepLength')} onSetRange={sr('stepLength')}
        />

        <ParameterSlider
          label="Acceleration"
          value={cfg.acceleration}
          min={-0.1} max={0.1} step={0.001}
          locked={locks.acceleration}
          onToggleLock={() => store.toggleLock('acceleration')}
          onChange={v => upd('acceleration', v)}
          tooltip="Speed change per step. Positive = speeds up, negative = slows down."
          range={r('acceleration')} onSetRange={sr('acceleration')}
        />
      </Section>

      <Section title="Angle">
        <ParameterSlider
          label="Angle change"
          value={cfg.angleChange}
          min={0.1} max={360} step={0.1}
          locked={locks.angleChange}
          onToggleLock={() => store.toggleLock('angleChange')}
          onChange={v => upd('angleChange', v)}
          tooltip="Degrees to rotate per step. Core parameter of the spiral shape."
          unit="°"
          range={r('angleChange')} onSetRange={sr('angleChange')}
        />

        <ParameterSlider
          label="Angle incr."
          value={cfg.angleIncrement}
          min={-2} max={2} step={0.01}
          locked={locks.angleIncrement}
          onToggleLock={() => store.toggleLock('angleIncrement')}
          onChange={v => upd('angleIncrement', v)}
          tooltip="Amount the angle change grows per step. Creates tightening/loosening spirals."
          range={r('angleIncrement')} onSetRange={sr('angleIncrement')}
        />
      </Section>

      <Section title="Direction">
        <ToggleRow
          label="Reverse"
          param="reverseDirection"
          value={cfg.reverseDirection}
          locked={locks.reverseDirection}
          onToggleLock={() => store.toggleLock('reverseDirection')}
          onChange={v => upd('reverseDirection', v)}
        />
      </Section>

      <Section title="Oscillation">
        <ToggleRow
          label="Oscillate"
          param="oscillate"
          value={cfg.oscillate}
          locked={locks.oscillate}
          onToggleLock={() => store.toggleLock('oscillate')}
          onChange={v => upd('oscillate', v)}
        />
        {cfg.oscillate && (
          <ParameterSlider
            label="Osc. speed"
            value={cfg.oscillationSpeed}
            min={0.1} max={5} step={0.1}
            locked={locks.oscillationSpeed}
            onToggleLock={() => store.toggleLock('oscillationSpeed')}
            onChange={v => upd('oscillationSpeed', v)}
            tooltip="Oscillation frequency multiplier."
            range={r('oscillationSpeed')} onSetRange={sr('oscillationSpeed')}
          />
        )}
      </Section>

      <Section title="Wobble">
        <ToggleRow
          label="Wobble"
          param="wobble"
          value={cfg.wobble}
          locked={locks.wobble}
          onToggleLock={() => store.toggleLock('wobble')}
          onChange={v => upd('wobble', v)}
        />
        {cfg.wobble && (
          <>
            <ParameterSlider
              label="Intensity"
              value={cfg.wobbleIntensity}
              min={0} max={1} step={0.01}
              locked={locks.wobbleIntensity}
              onToggleLock={() => store.toggleLock('wobbleIntensity')}
              onChange={v => upd('wobbleIntensity', v)}
              tooltip="Random jitter magnitude (0 = none, 1 = full)."
              range={r('wobbleIntensity')} onSetRange={sr('wobbleIntensity')}
            />
            <ParameterSlider
              label="Speed"
              value={cfg.wobbleSpeed}
              min={0.1} max={5} step={0.1}
              locked={locks.wobbleSpeed}
              onToggleLock={() => store.toggleLock('wobbleSpeed')}
              onChange={v => upd('wobbleSpeed', v)}
              tooltip="Wobble frequency multiplier."
              range={r('wobbleSpeed')} onSetRange={sr('wobbleSpeed')}
            />
          </>
        )}
      </Section>
    </div>
  )
}
