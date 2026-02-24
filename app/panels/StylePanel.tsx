'use client'

import { useCallback } from 'react'
import { useSpiralStore } from '@/app/store/spiralStore'
import { ParameterSlider } from '@/app/components/ParameterSlider'
import { ColorPicker } from '@/app/components/ColorPicker'
import type { SpiralConfigV2, BlendMode, RenderSettings, ColorMode } from '@/app/models/types'
import { Lock, LockOpen } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-white/25 uppercase tracking-[0.18em]">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

const BLEND_MODES: BlendMode[] = [
  'source-over', 'add', 'screen', 'multiply', 'overlay',
  'soft-light', 'hard-light', 'color-dodge', 'color-burn',
  'darken', 'lighten', 'difference', 'exclusion',
  'hue', 'saturation', 'luminosity',
]

const COLOR_MODES: ColorMode[] = ['solid', 'rainbow', 'gradient', 'cycle']

interface ToggleRowProps {
  label: string
  value: boolean
  locked?: boolean
  onToggleLock?: () => void
  onChange: (v: boolean) => void
}

function ToggleRow({ label, value, locked = false, onToggleLock, onChange }: ToggleRowProps) {
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

interface RenderToggleProps {
  label: string
  settingKey: keyof RenderSettings
}

function RenderToggle({ label, settingKey }: RenderToggleProps) {
  const store = useSpiralStore()
  const value = store.renderSettings[settingKey] as boolean
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 flex-none" />
      <span className="flex-1 text-xs font-mono text-white/45">{label}</span>
      <button
        onClick={() => store.updateRenderSettings({ [settingKey]: !value })}
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

interface RenderSliderProps {
  label: string
  settingKey: keyof RenderSettings
  min: number
  max: number
  step: number
  tooltip?: string
}

function RenderSlider({ label, settingKey, min, max, step, tooltip }: RenderSliderProps) {
  const store = useSpiralStore()
  const value = store.renderSettings[settingKey] as number
  return (
    <ParameterSlider
      label={label}
      value={value}
      min={min} max={max} step={step}
      onChange={v => store.updateRenderSettings({ [settingKey]: v })}
      tooltip={tooltip}
    />
  )
}

export function StylePanel() {
  const store = useSpiralStore()
  const cfg = store.config
  const locks = store.locks
  const rs = store.renderSettings
  const constraints = store.constraints

  const upd = useCallback(<K extends keyof SpiralConfigV2>(k: K, v: SpiralConfigV2[K]) => {
    store.updateConfig({ [k]: v } as Partial<SpiralConfigV2>)
  }, [store])

  const r = (key: string) => constraints.paramRanges[key] ?? null
  const sr = (key: string) => (range: typeof constraints.paramRanges[string] | null) =>
    store.setParamRange(key, range ?? null)

  // Color mode pool helpers
  const colorPool = constraints.allowedColorModes
  const allColorModesInPool = colorPool === null || colorPool.length === 0
  const isColorModeInPool = (mode: ColorMode) =>
    colorPool === null || colorPool.includes(mode)

  const toggleColorModeInPool = (mode: ColorMode) => {
    if (colorPool === null) {
      store.setAllowedColorModes(COLOR_MODES.filter(m => m !== mode))
    } else if (colorPool.includes(mode)) {
      const next = colorPool.filter(m => m !== mode)
      store.setAllowedColorModes(next.length > 0 ? next : colorPool)
    } else {
      store.setAllowedColorModes([...colorPool, mode])
    }
  }

  const poolCount = allColorModesInPool ? COLOR_MODES.length : (colorPool?.length ?? 0)

  return (
    <div className="space-y-5">
      {/* Color Mode */}
      <Section title="Color Mode">
        <div className="space-y-1.5">
          {/* Header: lock + pool indicator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => store.toggleLock('colorMode')}
              className={`flex items-center gap-1 text-[9px] font-mono transition-colors ${
                locks.colorMode ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/20 hover:text-white/50'
              }`}
              title={locks.colorMode ? 'Click to unlock' : 'Double-click any mode to lock'}
            >
              {locks.colorMode ? '🔒 locked · click to unlock' : 'dbl-click to lock'}
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-violet-400/60">
                pool: {allColorModesInPool ? 'all' : `${poolCount}/${COLOR_MODES.length}`}
              </span>
              {!allColorModesInPool && (
                <button
                  onClick={() => store.setAllowedColorModes(null)}
                  className="text-[9px] font-mono text-white/20 hover:text-white/50 transition-colors"
                >
                  reset
                </button>
              )}
            </div>
          </div>

          {/* Mode chips with pool badges */}
          <div className={`grid grid-cols-2 gap-1 ${locks.colorMode ? 'opacity-60' : ''}`}>
            {COLOR_MODES.map(mode => {
              const inPool = isColorModeInPool(mode)
              return (
                <div key={mode} className="relative">
                  <button
                    onClick={() => { if (!locks.colorMode) upd('colorMode', mode) }}
                    onDoubleClick={e => { e.preventDefault(); store.toggleLock('colorMode') }}
                    className={`w-full py-1.5 text-xs font-mono rounded border transition-colors ${
                      locks.colorMode
                        ? cfg.colorMode === mode
                          ? 'border-yellow-400/50 bg-yellow-400/8 text-yellow-300'
                          : 'border-white/[0.05] text-white/25 cursor-not-allowed'
                        : cfg.colorMode === mode
                        ? 'border-cyan-400/60 text-cyan-300 bg-cyan-400/10'
                        : inPool
                        ? 'border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60'
                        : 'border-white/[0.04] text-white/18 hover:border-white/12 hover:text-white/35'
                    }`}
                  >
                    {mode}
                  </button>
                  {/* Pool toggle badge */}
                  <span
                    onClick={() => toggleColorModeInPool(mode)}
                    title={inPool ? 'In pool — click to exclude' : 'Excluded — click to include'}
                    className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border flex items-center justify-center transition-colors cursor-pointer z-10 ${
                      inPool
                        ? 'bg-violet-500/70 border-violet-400/80 hover:bg-violet-400/90'
                        : 'bg-transparent border-white/20 hover:border-violet-400/50'
                    }`}
                  >
                    {inPool && (
                      <svg width="6" height="6" viewBox="0 0 6 6">
                        <path d="M1 3 L2.5 4.5 L5 1.5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Solid color */}
      {cfg.colorMode === 'solid' && (
        <Section title="Color">
          <ColorPicker
            label="Base color"
            value={cfg.color}
            locked={locks.color}
            onToggleLock={() => store.toggleLock('color')}
            onChange={v => upd('color', v)}
          />
        </Section>
      )}

      {/* Rainbow */}
      {cfg.colorMode === 'rainbow' && (
        <Section title="Rainbow">
          <ParameterSlider label="Speed" value={cfg.rainbowSpeed} min={0.1} max={10} step={0.1}
            locked={locks.rainbowSpeed} onToggleLock={() => store.toggleLock('rainbowSpeed')}
            onChange={v => upd('rainbowSpeed', v)} tooltip="Hue cycling speed."
            range={r('rainbowSpeed')} onSetRange={sr('rainbowSpeed')} />
        </Section>
      )}

      {/* Gradient */}
      {cfg.colorMode === 'gradient' && (
        <Section title="Gradient">
          <ColorPicker label="Color A" value={cfg.gradientColorA}
            locked={locks.gradientColorA} onToggleLock={() => store.toggleLock('gradientColorA')}
            onChange={v => upd('gradientColorA', v)} />
          <ColorPicker label="Color B" value={cfg.gradientColorB}
            locked={locks.gradientColorB} onToggleLock={() => store.toggleLock('gradientColorB')}
            onChange={v => upd('gradientColorB', v)} />
          <ParameterSlider label="Speed" value={cfg.gradientSpeed} min={0.1} max={5} step={0.1}
            locked={locks.gradientSpeed} onToggleLock={() => store.toggleLock('gradientSpeed')}
            onChange={v => upd('gradientSpeed', v)}
            range={r('gradientSpeed')} onSetRange={sr('gradientSpeed')} />
          <ToggleRow label="Reverse" value={cfg.gradientReverse}
            locked={locks.gradientReverse} onToggleLock={() => store.toggleLock('gradientReverse')}
            onChange={v => upd('gradientReverse', v)} />
        </Section>
      )}

      {/* Line */}
      <Section title="Line">
        <ParameterSlider label="Width" value={cfg.lineWidth} min={0.1} max={40} step={0.1}
          locked={locks.lineWidth} onToggleLock={() => store.toggleLock('lineWidth')}
          onChange={v => upd('lineWidth', v)} tooltip="Stroke width in pixels."
          range={r('lineWidth')} onSetRange={sr('lineWidth')} />
        <ParameterSlider label="Opacity" value={cfg.baseOpacity} min={0} max={1} step={0.01}
          locked={locks.baseOpacity} onToggleLock={() => store.toggleLock('baseOpacity')}
          onChange={v => upd('baseOpacity', v)} tooltip="Global line opacity (0 = invisible, 1 = fully opaque)."
          range={r('baseOpacity')} onSetRange={sr('baseOpacity')} />
        <ToggleRow label="Fade opacity" value={cfg.fadeOpacity}
          locked={locks.fadeOpacity} onToggleLock={() => store.toggleLock('fadeOpacity')}
          onChange={v => upd('fadeOpacity', v)} />
      </Section>

      {/* Blend Mode */}
      <Section title="Blend Mode">
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.toggleLock('blendMode')}
            className={`w-4 h-4 flex-none flex items-center justify-center rounded transition-colors ${
              locks.blendMode ? 'text-yellow-400' : 'text-white/15 hover:text-white/50'
            }`}
          >
            {locks.blendMode
              ? <Lock size={10} strokeWidth={2.5} />
              : <LockOpen size={10} strokeWidth={2} />}
          </button>
          <select
            value={cfg.blendMode}
            disabled={locks.blendMode}
            onChange={e => upd('blendMode', e.target.value as BlendMode)}
            className="flex-1 bg-zinc-900/80 border border-white/[0.1] text-white/70 text-xs font-mono rounded px-2 py-1.5 outline-none focus:border-cyan-400/40 disabled:opacity-50"
          >
            {BLEND_MODES.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* GPU Effects */}
      <Section title="GPU Effects">
        <div className="space-y-3 pt-1">
          {/* Bloom */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 flex-none" />
              <span className="flex-1 text-[10px] font-mono text-white/35 uppercase tracking-wider">Bloom</span>
              <button
                onClick={() => store.updateRenderSettings({ bloomEnabled: !rs.bloomEnabled })}
                className={`relative w-8 h-4 rounded-full transition-colors ${rs.bloomEnabled ? 'bg-cyan-500/80' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${rs.bloomEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
            {rs.bloomEnabled && (
              <div className="space-y-1.5 pl-0">
                <RenderSlider label="Intensity" settingKey="bloomIntensity" min={0} max={3} step={0.05}
                  tooltip="Bloom brightness multiplier." />
                <RenderSlider label="Threshold" settingKey="bloomThreshold" min={0} max={1} step={0.01}
                  tooltip="Luminance threshold below which bloom is not applied." />
                <RenderSlider label="Radius" settingKey="bloomRadius" min={0} max={1} step={0.01}
                  tooltip="Bloom spread radius." />
              </div>
            )}
          </div>

          {/* Motion Trail */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 flex-none" />
              <span className="flex-1 text-[10px] font-mono text-white/35 uppercase tracking-wider">Motion Trail</span>
            </div>
            <RenderSlider label="Trail" settingKey="motionTrail" min={0} max={0.99} step={0.01}
              tooltip="Persistence of vision effect. 0 = sharp, 0.99 = heavy trail (phosphor)." />
          </div>

          {/* Chromatic Aberration */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 flex-none" />
              <span className="flex-1 text-[10px] font-mono text-white/35 uppercase tracking-wider">Chromatic Ab.</span>
              <button
                onClick={() => store.updateRenderSettings({ chromaticAberrationEnabled: !rs.chromaticAberrationEnabled })}
                className={`relative w-8 h-4 rounded-full transition-colors ${rs.chromaticAberrationEnabled ? 'bg-cyan-500/80' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${rs.chromaticAberrationEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
            {rs.chromaticAberrationEnabled && (
              <RenderSlider label="Amount" settingKey="chromaticAberration" min={0} max={0.02} step={0.0005}
                tooltip="RGB channel offset. Creates color fringing on edges." />
            )}
          </div>

          {/* Vignette */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 flex-none" />
              <span className="flex-1 text-[10px] font-mono text-white/35 uppercase tracking-wider">Vignette</span>
              <button
                onClick={() => store.updateRenderSettings({ vignetteEnabled: !rs.vignetteEnabled })}
                className={`relative w-8 h-4 rounded-full transition-colors ${rs.vignetteEnabled ? 'bg-cyan-500/80' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${rs.vignetteEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
            {rs.vignetteEnabled && (
              <RenderSlider label="Intensity" settingKey="vignetteIntensity" min={0} max={1} step={0.01}
                tooltip="Edge darkening intensity." />
            )}
          </div>

          {/* Film Grain */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 flex-none" />
              <span className="flex-1 text-[10px] font-mono text-white/35 uppercase tracking-wider">Film Grain</span>
              <button
                onClick={() => store.updateRenderSettings({ filmGrainEnabled: !rs.filmGrainEnabled })}
                className={`relative w-8 h-4 rounded-full transition-colors ${rs.filmGrainEnabled ? 'bg-cyan-500/80' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${rs.filmGrainEnabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
            {rs.filmGrainEnabled && (
              <RenderSlider label="Amount" settingKey="filmGrain" min={0} max={1} step={0.01}
                tooltip="Noise intensity overlaid on the final image." />
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
