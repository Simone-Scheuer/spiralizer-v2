'use client'

import { useState, useCallback } from 'react'
import { Search, Plus, Trash2, X, Share2 } from 'lucide-react'
import { useSpiralStore } from '@/app/store/spiralStore'
import { generateThumbnail } from '@/app/components/PresetThumbnail'
import { getShareURL } from '@/app/utils/urlEncoding'
import { sanitizeString } from '@/app/utils/validation'
import { toast } from 'sonner'

const MAX_PRESET_NAME_LENGTH = 50

interface PresetsPanelProps {
  onRestart: () => void
  onClear: () => void
}

export function PresetsPanel({ onRestart, onClear }: PresetsPanelProps) {
  const store = useSpiralStore()
  const [query, setQuery] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = store.presets.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleSave = useCallback(async () => {
    const name = sanitizeString(saveName.trim(), MAX_PRESET_NAME_LENGTH)
    if (!name) return
    setSaving(true)
    const thumb = await generateThumbnail(store.config)
    store.savePreset(name, thumb)
    setSaveName('')
    setSaving(false)
  }, [store, saveName])

  const handleLoad = useCallback((id: string) => {
    store.loadPreset(id)
    onClear()
    setTimeout(onRestart, 50)
  }, [store, onClear, onRestart])

  return (
    <div className="space-y-4">
      {/* Save current */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono text-white/25 uppercase tracking-[0.18em]">Save Current</div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Preset name…"
            maxLength={MAX_PRESET_NAME_LENGTH}
            className="flex-1 bg-zinc-900/80 border border-white/[0.1] text-white/80 text-xs font-mono rounded px-2.5 py-1.5 outline-none focus:border-cyan-400/40 placeholder:text-white/20"
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim() || saving}
            className="px-2.5 py-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 text-xs font-mono transition-colors hover:bg-cyan-400/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {saving ? (
              <div className="w-3 h-3 border border-cyan-300/60 border-t-cyan-300 rounded-full animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Search */}
      {store.presets.length > 4 && (
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search presets…"
            className="w-full bg-zinc-900/80 border border-white/[0.1] text-white/70 text-xs font-mono rounded px-2.5 py-1.5 pl-7 outline-none focus:border-white/20 placeholder:text-white/20"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X size={10} />
            </button>
          )}
        </div>
      )}

      {/* Preset grid */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-white/20 text-xs font-mono">
          {store.presets.length === 0
            ? 'No presets yet. Save one above.'
            : 'No presets match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(preset => (
            <div
              key={preset.id}
              className="group relative rounded-lg border border-white/[0.08] overflow-hidden bg-zinc-900/50 hover:border-white/20 transition-colors cursor-pointer"
              onClick={() => handleLoad(preset.id)}
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-black">
                {preset.thumbnail ? (
                  <img
                    src={preset.thumbnail}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10 text-xs font-mono">
                    {preset.config.spiralType}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-1.5">
                <div className="text-[10px] font-mono text-white/70 truncate leading-none">{preset.name}</div>
                <div className="text-[9px] font-mono text-white/25 mt-0.5">
                  {preset.config.spiralType}
                </div>
              </div>

              {/* Overlay actions */}
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    const url = getShareURL(preset.config, preset.renderSettings)
                    navigator.clipboard.writeText(url).then(
                      () => toast.success('Preset link copied'),
                      () => toast.error('Failed to copy link'),
                    )
                  }}
                  className="w-5 h-5 rounded flex items-center justify-center bg-black/60 text-white/30 hover:text-cyan-400"
                >
                  <Share2 size={10} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); store.deletePreset(preset.id) }}
                  className="w-5 h-5 rounded flex items-center justify-center bg-black/60 text-white/30 hover:text-red-400"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
