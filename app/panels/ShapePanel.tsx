'use client'

import { useCallback, useRef } from 'react'
import { Crosshair } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'
import { ParameterSlider } from '@/app/components/ParameterSlider'
import { SpiralTypeSelector, FORMULAS } from '@/app/components/SpiralTypeSelector'
import type { SpiralConfigV2, SpiralType } from '@/app/models/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-white/25 uppercase tracking-[0.18em]">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

interface ShapePanelProps {
  onClear: () => void
  onRestart: () => void
}

export function ShapePanel({ onClear, onRestart }: ShapePanelProps) {
  const store = useSpiralStore()
  const cfg = store.config
  const locks = store.locks
  const constraints = store.constraints
  const padRef = useRef<HTMLDivElement>(null)

  const upd = useCallback(<K extends keyof SpiralConfigV2>(k: K, v: SpiralConfigV2[K]) => {
    store.updateConfig({ [k]: v } as Partial<SpiralConfigV2>)
  }, [store])

  // r(key) — range constraint for key (or undefined if not set)
  const r = (key: string) => constraints.paramRanges[key] ?? null
  const sr = (key: string) => (range: typeof constraints.paramRanges[string] | null) =>
    store.setParamRange(key, range ?? null)

  const handleTypeChange = useCallback((type: SpiralConfigV2['spiralType']) => {
    const family = ['linear', 'exponential', 'fibonacci', 'golden'].includes(type)
      ? 'classic'
      : ['archimedean', 'fermat', 'hyperbolic', 'lituus'].includes(type)
      ? 'archimedean'
      : 'parametric'
    store.updateConfig({ spiralType: type, spiralFamily: family } as Partial<SpiralConfigV2>)
    setTimeout(() => { onClear(); onRestart() }, 50)
  }, [store, onClear, onRestart])

  const handleToggleTypeInPool = useCallback((type: SpiralType) => {
    // Sentinel values from SpiralTypeSelector
    if (type === ('__clear__' as SpiralType)) {
      store.setAllowedSpiralTypes(null)
      return
    }
    const current = constraints.allowedSpiralTypes
    if (current === null) {
      // Currently all types — exclude this one
      const ALL: SpiralType[] = ['linear', 'exponential', 'fibonacci', 'golden',
        'archimedean', 'fermat', 'hyperbolic', 'lituus',
        'lissajous', 'rose', 'harmonograph', 'epitrochoid', 'hypotrochoid']
      store.setAllowedSpiralTypes(ALL.filter(t => t !== type))
    } else if (current.includes(type)) {
      // Remove from pool (if that would leave ≥1 type)
      const next = current.filter(t => t !== type)
      store.setAllowedSpiralTypes(next.length > 0 ? next : current)
    } else {
      // Add to pool
      store.setAllowedSpiralTypes([...current, type])
    }
  }, [store, constraints.allowedSpiralTypes])

  const handlePadClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!padRef.current) return
    const rect = padRef.current.getBoundingClientRect()
    upd('originX', Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
    upd('originY', Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)))
  }, [upd])

  return (
    <div className="space-y-5">
      {/* Spiral type picker */}
      <Section title="Spiral Type">
        <SpiralTypeSelector
          value={cfg.spiralType}
          onChange={handleTypeChange}
          locked={locks.spiralType}
          onToggleLock={() => store.toggleLock('spiralType')}
          allowedTypes={constraints.allowedSpiralTypes}
          onToggleTypeInPool={handleToggleTypeInPool}
        />
      </Section>

      {/* Formula chip */}
      <div className="font-mono text-[9px] text-white/35 bg-white/[0.04] rounded px-2 py-1 break-all leading-snug">
        {FORMULAS[cfg.spiralType]}
      </div>

      {/* Classic params */}
      {cfg.spiralFamily === 'classic' && (
        <Section title="Classic Parameters">
          <ParameterSlider
            label="Step mult."
            value={cfg.stepMultiplier}
            min={0} max={0.05} step={0.001}
            locked={locks.stepMultiplier}
            onToggleLock={() => store.toggleLock('stepMultiplier')}
            onChange={v => upd('stepMultiplier', v)}
            tooltip="Growth multiplier per step. Higher = faster outward expansion."
            range={r('stepMultiplier')} onSetRange={sr('stepMultiplier')}
          />
        </Section>
      )}

      {/* Archimedean params */}
      {cfg.spiralFamily === 'archimedean' && (
        <Section title="Archimedean Parameters">
          <ParameterSlider
            label="A (scale)"
            value={cfg.archA}
            min={0} max={100} step={1}
            locked={locks.archA}
            onToggleLock={() => store.toggleLock('archA')}
            onChange={v => upd('archA', v)}
            tooltip={
              cfg.spiralType === 'archimedean'
                ? "r = a + b·θ — 'a' shifts the spiral start outward from center."
                : cfg.spiralType === 'fermat'
                ? "r = a·√θ — scale factor. Higher = larger spiral."
                : cfg.spiralType === 'hyperbolic'
                ? "r = a/θ — scale factor. Higher = wider initial spread."
                : "r² = a²/θ — scale factor. Higher = wider initial spread."
            }
            range={r('archA')} onSetRange={sr('archA')}
          />
          {cfg.spiralType === 'archimedean' && (
            <ParameterSlider
              label="B (growth)"
              value={cfg.archB}
              min={0.1} max={20} step={0.1}
              locked={locks.archB}
              onToggleLock={() => store.toggleLock('archB')}
              onChange={v => upd('archB', v)}
              tooltip="r = a + b·θ — 'b' controls spacing between successive turns. Higher = wider gaps."
              range={r('archB')} onSetRange={sr('archB')}
            />
          )}
        </Section>
      )}

      {/* Lissajous params */}
      {cfg.spiralType === 'lissajous' && (
        <Section title="Lissajous Parameters">
          <ParameterSlider label="Freq X" value={cfg.lissFreqX} min={1} max={20} step={1}
            locked={locks.lissFreqX} onToggleLock={() => store.toggleLock('lissFreqX')}
            onChange={v => upd('lissFreqX', v)} tooltip="Horizontal oscillation frequency (integer ratios produce closed curves)."
            range={r('lissFreqX')} onSetRange={sr('lissFreqX')} />
          <ParameterSlider label="Freq Y" value={cfg.lissFreqY} min={1} max={20} step={1}
            locked={locks.lissFreqY} onToggleLock={() => store.toggleLock('lissFreqY')}
            onChange={v => upd('lissFreqY', v)} tooltip="Vertical oscillation frequency."
            range={r('lissFreqY')} onSetRange={sr('lissFreqY')} />
          <ParameterSlider label="Phase" value={cfg.lissPhase} min={0} max={360} step={1}
            locked={locks.lissPhase} onToggleLock={() => store.toggleLock('lissPhase')}
            onChange={v => upd('lissPhase', v)} tooltip="Phase offset δ between X and Y axes." unit="°"
            range={r('lissPhase')} onSetRange={sr('lissPhase')} />
        </Section>
      )}

      {/* Rose params */}
      {cfg.spiralType === 'rose' && (
        <Section title="Rose Parameters">
          <ParameterSlider label="K (num.)" value={cfg.roseK} min={1} max={12} step={1}
            locked={locks.roseK} onToggleLock={() => store.toggleLock('roseK')}
            onChange={v => upd('roseK', v)} tooltip="r = cos(k/d · θ). Odd k = k petals, even k = 2k petals. Coprime k/d gives simplest form."
            range={r('roseK')} onSetRange={sr('roseK')} />
          <ParameterSlider label="D (den.)" value={cfg.roseD} min={1} max={12} step={1}
            locked={locks.roseD} onToggleLock={() => store.toggleLock('roseD')}
            onChange={v => upd('roseD', v)} tooltip="Denominator of the k/d petal ratio. Non-coprime values produce sub-patterns."
            range={r('roseD')} onSetRange={sr('roseD')} />
        </Section>
      )}

      {/* Trochoid params */}
      {(cfg.spiralType === 'epitrochoid' || cfg.spiralType === 'hypotrochoid') && (
        <Section title="Trochoid Parameters">
          <ParameterSlider label="R (fixed)" value={cfg.trochoidR} min={10} max={200} step={1}
            locked={locks.trochoidR} onToggleLock={() => store.toggleLock('trochoidR')}
            onChange={v => upd('trochoidR', v)} tooltip="Radius of the fixed circle."
            range={r('trochoidR')} onSetRange={sr('trochoidR')} />
          <ParameterSlider label="r (rolling)" value={cfg.trochoidr} min={1} max={150} step={1}
            locked={locks.trochoidr} onToggleLock={() => store.toggleLock('trochoidr')}
            onChange={v => upd('trochoidr', v)} tooltip="Radius of the rolling circle."
            range={r('trochoidr')} onSetRange={sr('trochoidr')} />
          <ParameterSlider label="d (offset)" value={cfg.trochoidD} min={1} max={150} step={1}
            locked={locks.trochoidD} onToggleLock={() => store.toggleLock('trochoidD')}
            onChange={v => upd('trochoidD', v)} tooltip="Distance from rolling circle center to drawing point. d > r creates outer loops."
            range={r('trochoidD')} onSetRange={sr('trochoidD')} />
        </Section>
      )}

      {/* Harmonograph params */}
      {cfg.spiralType === 'harmonograph' && (
        <Section title="Harmonograph Parameters">
          <ParameterSlider label="Freq 1" value={cfg.harmFreq1} min={0.5} max={10} step={0.1}
            locked={locks.harmFreq1} onToggleLock={() => store.toggleLock('harmFreq1')}
            onChange={v => upd('harmFreq1', v)} tooltip="First pendulum frequency."
            range={r('harmFreq1')} onSetRange={sr('harmFreq1')} />
          <ParameterSlider label="Freq 2" value={cfg.harmFreq2} min={0.5} max={10} step={0.1}
            locked={locks.harmFreq2} onToggleLock={() => store.toggleLock('harmFreq2')}
            onChange={v => upd('harmFreq2', v)} tooltip="Second pendulum frequency. Near-integer ratios create beautiful interference."
            range={r('harmFreq2')} onSetRange={sr('harmFreq2')} />
          <ParameterSlider label="Phase 1" value={cfg.harmPhase1} min={0} max={360} step={1}
            locked={locks.harmPhase1} onToggleLock={() => store.toggleLock('harmPhase1')}
            onChange={v => upd('harmPhase1', v)} tooltip="Phase offset of first pendulum." unit="°"
            range={r('harmPhase1')} onSetRange={sr('harmPhase1')} />
          <ParameterSlider label="Phase 2" value={cfg.harmPhase2} min={0} max={360} step={1}
            locked={locks.harmPhase2} onToggleLock={() => store.toggleLock('harmPhase2')}
            onChange={v => upd('harmPhase2', v)} tooltip="Phase offset of second pendulum." unit="°"
            range={r('harmPhase2')} onSetRange={sr('harmPhase2')} />
          <ParameterSlider label="Decay 1" value={cfg.harmDecay1} min={0.0001} max={0.01} step={0.0001}
            locked={locks.harmDecay1} onToggleLock={() => store.toggleLock('harmDecay1')}
            onChange={v => upd('harmDecay1', v)} tooltip="Decay rate of first pendulum. Higher = converges faster."
            range={r('harmDecay1')} onSetRange={sr('harmDecay1')} />
          <ParameterSlider label="Decay 2" value={cfg.harmDecay2} min={0.0001} max={0.01} step={0.0001}
            locked={locks.harmDecay2} onToggleLock={() => store.toggleLock('harmDecay2')}
            onChange={v => upd('harmDecay2', v)} tooltip="Decay rate of second pendulum."
            range={r('harmDecay2')} onSetRange={sr('harmDecay2')} />
          <ParameterSlider label="Amp 1" value={cfg.harmAmp1} min={10} max={300} step={5}
            locked={locks.harmAmp1} onToggleLock={() => store.toggleLock('harmAmp1')}
            onChange={v => upd('harmAmp1', v)} tooltip="Amplitude of first pendulum."
            range={r('harmAmp1')} onSetRange={sr('harmAmp1')} />
          <ParameterSlider label="Amp 2" value={cfg.harmAmp2} min={10} max={300} step={5}
            locked={locks.harmAmp2} onToggleLock={() => store.toggleLock('harmAmp2')}
            onChange={v => upd('harmAmp2', v)} tooltip="Amplitude of second pendulum."
            range={r('harmAmp2')} onSetRange={sr('harmAmp2')} />
        </Section>
      )}

      {/* Origin XY pad */}
      <Section title="Origin">
        <div
          ref={padRef}
          onClick={handlePadClick}
          className="relative w-full h-28 rounded-lg border border-white/[0.08] bg-black/30 cursor-crosshair overflow-hidden select-none"
        >
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '25% 25%',
            }}
          />
          {/* Crosshair dot */}
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${cfg.originX * 100}%`, top: `${cfg.originY * 100}%` }}
          >
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <div className="absolute w-px h-3.5 bg-cyan-400/90" />
              <div className="absolute h-px w-3.5 bg-cyan-400/90" />
              <div className="w-2 h-2 rounded-full border border-cyan-400/90 bg-cyan-400/20" />
            </div>
          </div>
          <Crosshair size={9} className="absolute bottom-1.5 right-1.5 text-white/15" />
        </div>
        <ParameterSlider label="Origin X" value={cfg.originX} min={0} max={1} step={0.01}
          locked={locks.originX} onToggleLock={() => store.toggleLock('originX')} onChange={v => upd('originX', v)}
          range={r('originX')} onSetRange={sr('originX')} />
        <ParameterSlider label="Origin Y" value={cfg.originY} min={0} max={1} step={0.01}
          locked={locks.originY} onToggleLock={() => store.toggleLock('originY')} onChange={v => upd('originY', v)}
          range={r('originY')} onSetRange={sr('originY')} />
      </Section>
    </div>
  )
}
