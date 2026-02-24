'use client'

export function WebGLFallback() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="text-6xl">&#x1F300;</div>
        <h1 className="text-white text-xl font-mono">WebGL Required</h1>
        <p className="text-white/50 text-sm font-mono leading-relaxed">
          Uzumaki requires WebGL to render spirals. Please use a modern browser
          with hardware acceleration enabled.
        </p>
        <div className="text-white/25 text-xs font-mono space-y-1">
          <p>Chrome, Firefox, Safari, and Edge all support WebGL.</p>
          <p>Check your browser settings if hardware acceleration is disabled.</p>
        </div>
      </div>
    </div>
  )
}
