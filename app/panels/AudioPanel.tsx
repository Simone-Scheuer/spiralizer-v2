'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Mic, FileAudio, X, Plus, Music2 } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'
import type { AudioMode, AudioMapping, AudioBand, AudioMappingMode, SpiralConfigV2 } from '@/app/models/types'

// ── Prop types ────────────────────────────────────────────────────────────────

export interface AudioPanelProps {
  fftData: Uint8Array | null
  onInitAudio: () => void
  onSetSource: (source: 'mic' | 'file', file?: File) => Promise<void>
  onDisconnectReactive: () => void
  getScaleName: () => string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MODES: { id: AudioMode; label: string; desc: string }[] = [
  { id: 'off',      label: 'Off',      desc: 'Silent'                         },
  { id: 'generate', label: 'Generate', desc: 'Spiral → ambient music'         },
  { id: 'react',    label: 'React',    desc: 'FFT → spiral params'            },
  { id: 'both',     label: 'Both',     desc: 'Generate + react simultaneously' },
]

const BANDS: { id: AudioBand; label: string; color: string }[] = [
  { id: 'bass',   label: 'Bass',   color: 'text-pink-400   border-pink-400/40   bg-pink-400/10'   },
  { id: 'mid',    label: 'Mid',    color: 'text-cyan-400   border-cyan-400/40   bg-cyan-400/10'   },
  { id: 'treble', label: 'Treble', color: 'text-violet-400 border-violet-400/40 bg-violet-400/10' },
  { id: 'beat',   label: 'Beat',   color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
]
const BAND_INACTIVE = 'text-white/25 border-white/[0.08] hover:text-white/50 hover:border-white/20'

// ── Default reaction presets ──────────────────────────────────────────────────

interface ReactPreset {
  name: string
  mappings: Omit<AudioMapping, 'id'>[]
}

const REACT_PRESETS: ReactPreset[] = [
  {
    name: 'Bass Pulse',
    mappings: [
      { band: 'bass',   parameter: 'lineWidth',      intensity: 0.7, mode: 'multiply' },
      { band: 'beat',   parameter: 'symmetry',       intensity: 1.0, mode: 'set', min: 1, max: 8 },
    ],
  },
  {
    name: 'Spectral Drift',
    mappings: [
      { band: 'treble', parameter: 'angleChange',     intensity: 0.5, mode: 'add' },
      { band: 'mid',    parameter: 'oscillationSpeed',intensity: 0.8, mode: 'multiply' },
      { band: 'bass',   parameter: 'baseOpacity',     intensity: 0.5, mode: 'multiply' },
    ],
  },
  {
    name: 'Wobble Storm',
    mappings: [
      { band: 'bass',   parameter: 'wobbleIntensity', intensity: 1.0, mode: 'set', min: 0, max: 1 },
      { band: 'mid',    parameter: 'wobbleSpeed',     intensity: 0.8, mode: 'multiply' },
      { band: 'beat',   parameter: 'multiLineCount',  intensity: 1.0, mode: 'set', min: 1, max: 6 },
    ],
  },
  {
    name: 'Frequency Garden',
    mappings: [
      { band: 'bass',   parameter: 'stepLength',      intensity: 0.6, mode: 'multiply' },
      { band: 'mid',    parameter: 'rainbowSpeed',    intensity: 0.5, mode: 'add' },
      { band: 'treble', parameter: 'pulseRange',      intensity: 0.7, mode: 'multiply' },
    ],
  },
  {
    name: 'Beat Scatter',
    mappings: [
      { band: 'beat',   parameter: 'angleChange',     intensity: 1.0, mode: 'add' },
      { band: 'beat',   parameter: 'stepsPerFrame',   intensity: 1.0, mode: 'set', min: 1, max: 8 },
      { band: 'bass',   parameter: 'archB',           intensity: 0.9, mode: 'multiply' },
    ],
  },
]

// Numeric params that make musical sense to map
const MAPPABLE_PARAMS: { key: keyof SpiralConfigV2; label: string }[] = [
  { key: 'angleChange',      label: 'Angle Change'      },
  { key: 'stepLength',       label: 'Step Length'       },
  { key: 'stepMultiplier',   label: 'Step Multiplier'   },
  { key: 'speed',            label: 'Speed (delay ms)'  },
  { key: 'lineWidth',        label: 'Line Width'        },
  { key: 'baseOpacity',      label: 'Opacity'           },
  { key: 'symmetry',         label: 'Symmetry'          },
  { key: 'multiLineCount',   label: 'Multi-line Count'  },
  { key: 'oscillationSpeed', label: 'Oscillation Speed' },
  { key: 'wobbleIntensity',  label: 'Wobble Intensity'  },
  { key: 'archB',            label: 'Arch B'            },
  { key: 'lissFreqX',        label: 'Lissajous Freq X'  },
  { key: 'rainbowSpeed',     label: 'Rainbow Speed'     },
  { key: 'pulseRange',       label: 'Pulse Range'       },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-white/25 uppercase tracking-[0.18em]">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, onChange, format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-white/40 flex-none w-16">{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-cyan-400 h-1"
      />
      <span className="text-[10px] font-mono text-white/40 w-8 text-right flex-none">
        {format ? format(value) : Math.round(value * 100) + '%'}
      </span>
    </div>
  )
}

function LayerToggle({
  label, enabled, onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex-1 py-1.5 rounded border text-[9.5px] font-mono transition-colors ${
        enabled
          ? 'border-cyan-400/50 bg-cyan-400/8 text-cyan-300'
          : 'border-white/[0.08] text-white/25 hover:border-white/20 hover:text-white/50'
      }`}
    >
      {label}
    </button>
  )
}

function FFTVisualizer({ fftData }: { fftData: Uint8Array | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    if (!fftData || fftData.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fillRect(0, height - 1, width, 1)
      return
    }

    const bars = 28
    const step = Math.floor(fftData.length / bars)
    const bw   = width / bars

    for (let i = 0; i < bars; i++) {
      let sum = 0
      for (let j = 0; j < step; j++) sum += fftData[i * step + j]
      const val = (sum / step) / 255
      const bh  = Math.max(1, val * height)

      const hue = 320 - (i / bars) * 140
      ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${0.35 + val * 0.65})`
      ctx.fillRect(i * bw + 0.5, height - bh, Math.max(1, bw - 1), bh)
    }
  }, [fftData])

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={48}
      className="w-full rounded bg-black/20 border border-white/[0.05]"
    />
  )
}

interface MappingRowProps {
  mapping: AudioMapping
  onUpdate: (partial: Partial<AudioMapping>) => void
  onDelete: () => void
}

function MappingRow({ mapping, onUpdate, onDelete }: MappingRowProps) {
  const bandInfo = BANDS.find(b => b.id === mapping.band)

  return (
    <div className="rounded border border-white/[0.08] bg-black/20 p-2 space-y-2">
      {/* Band chips + delete */}
      <div className="flex items-center gap-1">
        {BANDS.map(b => (
          <button
            key={b.id}
            onClick={() => onUpdate({ band: b.id })}
            className={`flex-1 text-[8.5px] font-mono py-0.5 rounded border transition-colors ${
              mapping.band === b.id ? b.color : BAND_INACTIVE
            }`}
          >
            {b.label}
          </button>
        ))}
        <button
          onClick={onDelete}
          className="ml-0.5 p-0.5 text-white/20 hover:text-red-400 transition-colors"
          title="Remove mapping"
        >
          <X size={11} />
        </button>
      </div>

      {/* Parameter + mode */}
      <div className="flex items-center gap-1">
        <span className={`text-[9px] font-mono flex-none ${bandInfo?.color.split(' ')[0] ?? 'text-white/40'}`}>→</span>
        <select
          value={mapping.parameter as string}
          onChange={e => onUpdate({ parameter: e.target.value as keyof SpiralConfigV2 })}
          className="flex-1 min-w-0 bg-black/40 border border-white/[0.08] rounded text-[9px] font-mono text-white/60 py-0.5 px-1 focus:outline-none focus:border-white/20"
        >
          {MAPPABLE_PARAMS.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        <select
          value={mapping.mode}
          onChange={e => onUpdate({ mode: e.target.value as AudioMappingMode })}
          className="bg-black/40 border border-white/[0.08] rounded text-[9px] font-mono text-white/60 py-0.5 px-1 focus:outline-none focus:border-white/20"
          title="How band energy is applied: Add=offset, Mul=scale, Set=absolute range"
        >
          <option value="add">Add</option>
          <option value="multiply">Mul</option>
          <option value="set">Set</option>
        </select>
      </div>

      {/* Intensity */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-white/25 flex-none">intensity</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={mapping.intensity}
          onChange={e => onUpdate({ intensity: parseFloat(e.target.value) })}
          className="flex-1 accent-cyan-400 h-1"
        />
        <span className="text-[9px] font-mono text-white/40 w-7 text-right flex-none">
          {Math.round(mapping.intensity * 100)}%
        </span>
      </div>
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function AudioPanel({
  fftData, onInitAudio, onSetSource, onDisconnectReactive, getScaleName,
}: AudioPanelProps) {
  const store = useSpiralStore()
  const audio = store.audioState
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [scaleName, setScaleName]     = useState('—')

  // Poll scale name every 2 seconds when generate is active
  useEffect(() => {
    if (audio.mode !== 'generate' && audio.mode !== 'both') return
    const update = () => setScaleName(getScaleName())
    update()
    const id = setInterval(update, 2000)
    return () => clearInterval(id)
  }, [audio.mode, getScaleName])

  const handleModeChange = useCallback((mode: AudioMode) => {
    if (mode !== 'off') onInitAudio()
    store.updateAudioState({ mode })
    if (mode === 'off') {
      onDisconnectReactive()
      store.updateAudioState({ source: null })
    }
    setSourceError(null)
  }, [store, onInitAudio, onDisconnectReactive])

  const handleMic = useCallback(async () => {
    setSourceError(null)
    onInitAudio()
    try {
      await onSetSource('mic')
      store.updateAudioState({ source: 'mic' })
    } catch {
      setSourceError('Microphone access denied. Check browser permissions.')
    }
  }, [onSetSource, onInitAudio, store])

  const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/flac', 'audio/webm', 'audio/aac']
  const MAX_AUDIO_SIZE = 50 * 1024 * 1024 // 50 MB

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceError(null)
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|flac|webm|aac)$/i)) {
      setSourceError('Unsupported file type. Use MP3, WAV, OGG, M4A, or FLAC.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_AUDIO_SIZE) {
      setSourceError('File too large (max 50 MB).')
      e.target.value = ''
      return
    }
    onInitAudio()
    try {
      await onSetSource('file', file)
      store.updateAudioState({ source: 'file' })
    } catch {
      setSourceError('Could not decode audio file.')
    }
    e.target.value = ''
  }, [onSetSource, onInitAudio, store])

  const addMapping = useCallback(() => {
    const newMapping: AudioMapping = {
      id:        `m_${Date.now()}`,
      band:      'bass',
      parameter: 'angleChange',
      intensity: 0.5,
      mode:      'add',
    }
    store.updateAudioState({ mappings: [...audio.mappings, newMapping] })
  }, [store, audio.mappings])

  const updateMapping = useCallback((id: string, partial: Partial<AudioMapping>) => {
    store.updateAudioState({
      mappings: audio.mappings.map(m => m.id === id ? { ...m, ...partial } : m),
    })
  }, [store, audio.mappings])

  const deleteMapping = useCallback((id: string) => {
    store.updateAudioState({ mappings: audio.mappings.filter(m => m.id !== id) })
  }, [store, audio.mappings])

  return (
    <div className="space-y-5">

      {/* Mode selector */}
      <Section title="Audio Mode">
        <div className="grid grid-cols-2 gap-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`flex flex-col items-start gap-0.5 p-2 rounded border text-left transition-colors ${
                audio.mode === m.id
                  ? 'border-cyan-400/60 bg-cyan-400/8 text-cyan-300'
                  : 'border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <span className="text-xs font-mono font-medium">{m.label}</span>
              <span className="text-[9.5px] font-mono text-white/30 leading-tight">{m.desc}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Generate section */}
      {(audio.mode === 'generate' || audio.mode === 'both') && (
        <Section title="Generate">

          {/* Current scale chip */}
          <div className="flex items-center gap-1.5 py-1 px-2 rounded border border-white/[0.08] bg-white/[0.03]">
            <Music2 size={10} className="text-cyan-400/60 flex-none" />
            <span className="text-[9.5px] font-mono text-cyan-300/70 tracking-wide">{scaleName}</span>
          </div>

          {/* Volume */}
          <SliderRow
            label="Volume"
            value={audio.volume}
            min={0} max={1} step={0.01}
            onChange={v => store.updateAudioState({ volume: v })}
          />

          {/* Density */}
          <SliderRow
            label="Density"
            value={audio.musicDensity}
            min={0} max={1} step={0.01}
            onChange={v => store.updateAudioState({ musicDensity: v })}
          />

          {/* Reverb */}
          <SliderRow
            label="Reverb"
            value={audio.reverbAmount}
            min={0} max={1} step={0.01}
            onChange={v => store.updateAudioState({ reverbAmount: v })}
          />

          {/* Layer toggles */}
          <div>
            <div className="text-[9px] font-mono text-white/20 mb-1.5">Layers</div>
            <div className="flex gap-1">
              <LayerToggle
                label="Drone"
                enabled={audio.droneEnabled}
                onToggle={() => store.updateAudioState({ droneEnabled: !audio.droneEnabled })}
              />
              <LayerToggle
                label="Melody"
                enabled={audio.melodyEnabled}
                onToggle={() => store.updateAudioState({ melodyEnabled: !audio.melodyEnabled })}
              />
              <LayerToggle
                label="Sparkle"
                enabled={audio.sparkleEnabled}
                onToggle={() => store.updateAudioState({ sparkleEnabled: !audio.sparkleEnabled })}
              />
            </div>
          </div>

          <div className="text-[9px] font-mono text-white/15 leading-relaxed pt-0.5">
            FM pad · harmonic partials · filtered noise · spiral math → scale + timbre
          </div>
        </Section>
      )}

      {/* React section */}
      {(audio.mode === 'react' || audio.mode === 'both') && (
        <Section title="React">
          {/* Source picker */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleMic}
              className={`flex items-center justify-center gap-1.5 py-2 rounded border text-[10px] font-mono transition-colors ${
                audio.source === 'mic'
                  ? 'border-pink-400/50 bg-pink-400/8 text-pink-300'
                  : 'border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <Mic size={11} /> Microphone
            </button>

            <label className={`flex items-center justify-center gap-1.5 py-2 rounded border text-[10px] font-mono cursor-pointer transition-colors ${
              audio.source === 'file'
                ? 'border-cyan-400/50 bg-cyan-400/8 text-cyan-300'
                : 'border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60'
            }`}>
              <FileAudio size={11} /> Audio File
              <input type="file" accept=".mp3,.wav,.ogg,.m4a,.flac,.webm,.aac,audio/*" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {sourceError && (
            <p className="text-[9px] font-mono text-red-400/80">{sourceError}</p>
          )}

          {/* FFT Visualizer */}
          <FFTVisualizer fftData={fftData} />

          {!audio.source && (
            <p className="text-[9px] font-mono text-white/20 text-center">
              Select a source above to enable FFT analysis
            </p>
          )}

          {/* Mappings */}
          {audio.mappings.length > 0 && (
            <div className="space-y-1.5">
              {audio.mappings.map(mapping => (
                <MappingRow
                  key={mapping.id}
                  mapping={mapping}
                  onUpdate={partial => updateMapping(mapping.id, partial)}
                  onDelete={() => deleteMapping(mapping.id)}
                />
              ))}
            </div>
          )}

          {/* Reaction presets */}
          <div>
            <div className="text-[9px] font-mono text-white/20 mb-1">Presets</div>
            <div className="flex flex-wrap gap-1">
              {REACT_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => store.updateAudioState({
                    mappings: preset.mappings.map(m => ({ ...m, id: `m_${Date.now()}_${Math.random()}` }))
                  })}
                  className="px-2 py-0.5 rounded border border-white/[0.1] bg-white/[0.03] text-[8.5px] font-mono text-white/40 hover:border-cyan-400/30 hover:text-cyan-300/70 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={addMapping}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-dashed border-white/[0.12] text-[10px] font-mono text-white/30 hover:text-white/60 hover:border-white/25 transition-colors"
          >
            <Plus size={11} /> Add Mapping
          </button>
        </Section>
      )}

      {/* Idle hint */}
      {audio.mode === 'off' && (
        <div className="text-center py-4 space-y-1">
          <div className="text-[10px] font-mono text-white/20">Select a mode to enable audio</div>
          <div className="text-[9px] font-mono text-white/10">AudioContext created on first interaction</div>
        </div>
      )}
    </div>
  )
}
