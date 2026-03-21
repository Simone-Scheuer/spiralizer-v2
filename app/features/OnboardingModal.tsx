'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Zap, Sliders, Save, Video, Keyboard, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'spiralv2_onboarded'

interface Step {
  icon: React.ReactNode
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: <Sparkles size={20} />,
    title: 'Welcome to Uzumaki',
    body: 'A generative spiral art tool. Create mesmerizing spiral animations, tweak every parameter, and export videos for TikTok or anywhere else.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Generate & Explore',
    body: 'Hit Randomize (R) to generate a new spiral instantly. Save any spiral you like as a preset in the Presets tab. Press Space to pause/play.',
  },
  {
    icon: <Sliders size={20} />,
    title: 'Fine-Tune Everything',
    body: 'The left panel has six tabs: Shape, Motion, Style, Pattern, Audio, and Presets. Lock any parameter to keep it fixed when randomizing — great for finding variations on a look you like.',
  },
  {
    icon: <Save size={20} />,
    title: 'Auto-Saved to Your Browser',
    body: 'Your settings, presets, and locks are automatically saved to your browser. Come back anytime and pick up where you left off. Use Share to copy a URL that recreates your exact spiral.',
  },
  {
    icon: <Video size={20} />,
    title: 'Record & Export',
    body: 'Click Record (V) to capture video — defaults to 9:16 TikTok format. Use the dropdown for square or landscape. Export PNG for stills. Press C to center the view.',
  },
  {
    icon: <Keyboard size={20} />,
    title: 'Keyboard Shortcuts',
    body: 'Space: play/pause \u00B7 R: randomize \u00B7 U: clear \u00B7 V: record \u00B7 C: center \u00B7 F: immersive mode \u00B7 ?: show all shortcuts. Scroll to zoom, Alt+drag to pan.',
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true)
      }
    } catch {
      // localStorage unavailable — skip onboarding
    }
  }, [])

  const dismiss = () => {
    setOpen(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-zinc-950 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors z-10"
          aria-label="Close onboarding"
        >
          <X size={14} />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 mb-5">
            {current.icon}
          </div>

          {/* Title */}
          <h2 className="text-white/90 text-lg font-mono font-bold tracking-tight mb-2">
            {current.title}
          </h2>

          {/* Body */}
          <p className="text-white/50 text-sm font-mono leading-relaxed">
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 flex items-center gap-3">
          {/* Dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'bg-cyan-400 w-4'
                    : 'bg-white/15 hover:bg-white/30'
                }`}
              />
            ))}
          </div>

          <div className="flex-1" />

          {/* Back */}
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="h-8 px-3 flex items-center gap-1 rounded-lg border border-white/[0.1] text-white/50 hover:text-white/80 hover:border-white/20 text-xs font-mono transition-colors"
            >
              <ChevronLeft size={12} />
              Back
            </button>
          )}

          {/* Next / Get Started */}
          <button
            onClick={isLast ? dismiss : () => setStep(step + 1)}
            className="h-8 px-4 flex items-center gap-1 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/25 text-xs font-mono font-medium transition-colors"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ChevronRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  )
}
