'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Zap, Trash2, RotateCcw, RotateCw, Lock, Unlock, Monitor, Maximize, Share2, Download, Circle, Crosshair, ChevronDown } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { VideoFormat } from '@/app/utils/videoRecorder'
import { VIDEO_FORMATS } from '@/app/utils/videoRecorder'

interface ToolbarProps {
  onRandomize: () => void
  onClear: () => void
  onRestart: () => void
  onShare: () => void
  onExport: () => void
  onRecord: (format: VideoFormat) => void
  onCenter: () => void
  isRecording: boolean
  recordingDuration: number
}

interface TipBtnProps {
  tip: string
  onClick: () => void
  children: React.ReactNode
  active?: boolean
  activeClass?: string
  className?: string
}

function TipBtn({ tip, onClick, children, active, activeClass, className = '' }: TipBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`h-7 px-2.5 flex items-center gap-1.5 rounded border text-xs font-mono transition-all duration-100 ${
            active && activeClass
              ? activeClass
              : 'border-white/[0.1] text-white/50 hover:border-white/25 hover:text-white/80 hover:bg-white/[0.04]'
          } ${className}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px] font-mono">
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Toolbar({ onRandomize, onClear, onRestart, onShare, onExport, onRecord, onCenter, isRecording, recordingDuration }: ToolbarProps) {
  const store = useSpiralStore()
  const { uiState, locks } = store
  const anyLocked = Object.values(locks).some(Boolean)

  const handleImmersive = () => {
    store.updateUIState({ isImmersive: !uiState.isImmersive })
  }

  return (
    <header className="flex-none flex items-center gap-1.5 px-3 h-11 border-b border-white/[0.07] bg-zinc-950/95 backdrop-blur-xl z-20 overflow-x-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 flex-none">
        <svg width="18" height="18" viewBox="0 0 24 24" className="text-cyan-400/80" fill="none">
          <path
            d="M12 12c0-1.1.9-2 2-2s2 .9 2 2-.2 3.2-1.5 4.2c-1.7 1.3-4 1.3-5.5 0C7.2 14.8 6.5 12.6 6.5 10.5 6.5 6.9 9 4 12 4c4.1 0 7.5 3.4 7.5 7.5 0 5-4 9-8.5 9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className="text-white/80 font-mono text-xs font-bold tracking-[0.2em] uppercase">
          Uzumaki
        </span>
        <a
          href="https://simonescheuer.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 hover:text-white/50 transition-colors font-mono text-[10px] tracking-wide hidden sm:inline"
        >
          by Mona
        </a>
      </div>

      <div className="h-4 w-px bg-white/[0.08] flex-none" />

      {/* Play/Pause */}
      <TipBtn
        tip={uiState.isPaused ? 'Play (Space)' : 'Pause (Space)'}
        onClick={() => store.togglePause()}
        active={true}
        activeClass={
          uiState.isPaused
            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15'
            : 'border-rose-500/50 text-rose-400 bg-rose-500/8 hover:bg-rose-500/15'
        }
      >
        {uiState.isPaused ? <Play size={12} /> : <Pause size={12} />}
        {uiState.isPaused ? 'Play' : 'Pause'}
      </TipBtn>

      {/* Randomize */}
      <TipBtn
        tip="Randomize (R)"
        onClick={onRandomize}
        active={true}
        activeClass="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/60"
      >
        <Zap size={12} />
        Random
      </TipBtn>

      {/* Clear */}
      <TipBtn tip="Clear canvas (U)" onClick={onClear}>
        <Trash2 size={11} />
        Clear
      </TipBtn>

      {/* Restart */}
      <TipBtn tip="Restart from origin" onClick={onRestart}>
        <RotateCcw size={11} />
        Restart
      </TipBtn>

      {/* Reset */}
      <TipBtn
        tip="Reset to defaults (D)"
        onClick={() => { store.resetConfig(); onClear() }}
      >
        <RotateCw size={11} />
        Reset
      </TipBtn>

      <div className="h-4 w-px bg-white/[0.08] flex-none" />

      {/* Lock all / Unlock all */}
      <TipBtn
        tip={anyLocked ? 'Unlock all (L)' : 'Lock all (L)'}
        onClick={() => anyLocked ? store.unlockAll() : store.lockAll()}
        active={anyLocked}
        activeClass="border-yellow-400/40 text-yellow-300 bg-yellow-400/8 hover:bg-yellow-400/15"
      >
        {anyLocked ? <Lock size={11} /> : <Unlock size={11} />}
        {anyLocked ? 'Locked' : 'Locks'}
      </TipBtn>

      <div className="h-4 w-px bg-white/[0.08] flex-none" />

      {/* Screensaver */}
      <TipBtn
        tip="Screensaver mode — auto-randomizes"
        onClick={() => store.toggleScreensaver()}
        active={uiState.isScreensaver}
        activeClass="border-violet-400/50 text-violet-300 bg-violet-500/8 hover:bg-violet-500/15"
      >
        <Monitor size={11} />
        Screensaver
      </TipBtn>

      {uiState.isScreensaver && (
        <div className="flex items-center">
          {[5, 10, 20, 30, 60].map(v => (
            <button
              key={v}
              onClick={() => store.updateUIState({ screensaverInterval: v })}
              className={`h-7 px-1.5 text-[11px] font-mono transition-all ${
                uiState.screensaverInterval === v
                  ? 'text-violet-300'
                  : 'text-white/25 hover:text-white/50'
              }`}
            >
              {v}s
            </button>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: share, export, fullscreen */}
      <TipBtn
        tip="Share URL (Ctrl+C)"
        onClick={onShare}
        active={true}
        activeClass="border-emerald-500/30 text-emerald-400/70 hover:bg-emerald-500/10 hover:border-emerald-500/50"
      >
        <Share2 size={11} />
        Share
      </TipBtn>

      <TipBtn tip="Export PNG" onClick={onExport}>
        <Download size={11} />
        Export
      </TipBtn>

      <RecordButton
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onRecord={onRecord}
      />

      <div className="h-4 w-px bg-white/[0.08] flex-none" />

      <TipBtn tip="Center view (C)" onClick={onCenter}>
        <Crosshair size={11} />
        Center
      </TipBtn>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleImmersive}
            className="h-7 w-7 flex items-center justify-center rounded border border-white/[0.1] text-white/40 hover:text-white/70 hover:border-white/25 transition-colors"
            aria-label="Immersive mode"
          >
            <Maximize size={12} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px] font-mono">Immersive (F)</TooltipContent>
      </Tooltip>

      {/* Keyboard hints */}
      <span className="text-white/15 text-[10px] font-mono hidden 2xl:block flex-none ml-2">
        Space · R · U · D · L · V · C · F · ?
      </span>
    </header>
  )
}

const FORMAT_OPTIONS: { value: VideoFormat; label: string }[] = [
  { value: 'tiktok',    label: '9:16 TikTok' },
  { value: 'square',    label: '1:1 Square' },
  { value: 'landscape', label: '16:9 Wide' },
  { value: 'native',    label: 'Native' },
]

function RecordButton({
  isRecording,
  recordingDuration,
  onRecord,
}: {
  isRecording: boolean
  recordingDuration: number
  onRecord: (format: VideoFormat) => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat>('tiktok')
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (isRecording) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onRecord(selectedFormat)}
            className="h-7 px-2.5 flex items-center gap-1.5 rounded border text-xs font-mono transition-all duration-100 border-red-500/60 text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse"
          >
            <Circle size={11} fill="currentColor" />
            {formatDuration(recordingDuration)}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px] font-mono">Stop recording</TooltipContent>
      </Tooltip>
    )
  }

  const label = FORMAT_OPTIONS.find(f => f.value === selectedFormat)?.label ?? 'Record'

  return (
    <div ref={dropRef} className="relative flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onRecord(selectedFormat)}
            className="h-7 px-2.5 flex items-center gap-1.5 rounded-l border border-r-0 text-xs font-mono transition-all duration-100 border-white/[0.1] text-white/50 hover:border-white/25 hover:text-white/80 hover:bg-white/[0.04]"
          >
            <Circle size={11} />
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px] font-mono">Record video (V)</TooltipContent>
      </Tooltip>
      <button
        onClick={() => setOpen(!open)}
        className="h-7 px-1 flex items-center rounded-r border text-xs font-mono transition-all duration-100 border-white/[0.1] text-white/35 hover:border-white/25 hover:text-white/70 hover:bg-white/[0.04]"
      >
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-white/[0.12] rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
          {FORMAT_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => { setSelectedFormat(f.value); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                selectedFormat === f.value
                  ? 'text-cyan-400 bg-cyan-400/10'
                  : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]'
              }`}
            >
              {f.label}
              {f.value !== 'native' && (
                <span className="text-white/20 ml-1.5">
                  {VIDEO_FORMATS[f.value].width}x{VIDEO_FORMATS[f.value].height}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
