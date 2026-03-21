/**
 * Uzumaki — Video recorder using MediaRecorder API.
 * Captures the WebGL canvas stream and exports as WebM/MP4.
 * Supports format presets for TikTok (9:16), Square, Landscape, and Native.
 */

export type VideoFormat = 'tiktok' | 'square' | 'landscape' | 'native'

export interface VideoFormatConfig {
  label: string
  width: number
  height: number
}

export const VIDEO_FORMATS: Record<Exclude<VideoFormat, 'native'>, VideoFormatConfig> = {
  tiktok:    { label: '9:16 TikTok',  width: 1080, height: 1920 },
  square:    { label: '1:1 Square',    width: 1080, height: 1080 },
  landscape: { label: '16:9 Wide',     width: 1920, height: 1080 },
}

export interface VideoRecorderState {
  isRecording: boolean
  duration: number // seconds elapsed
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startTime = 0
  private timerInterval: ReturnType<typeof setInterval> | null = null
  private onStateChange: ((state: VideoRecorderState) => void) | null = null
  private cropCanvas: HTMLCanvasElement | null = null
  private cropCtx: CanvasRenderingContext2D | null = null
  private cropRafId: number | null = null

  setOnStateChange(cb: (state: VideoRecorderState) => void): void {
    this.onStateChange = cb
  }

  private emit(): void {
    this.onStateChange?.({
      isRecording: this.mediaRecorder?.state === 'recording',
      duration: this.mediaRecorder?.state === 'recording'
        ? Math.floor((performance.now() - this.startTime) / 1000)
        : 0,
    })
  }

  start(canvas: HTMLCanvasElement, frameRate = 60, format: VideoFormat = 'native'): boolean {
    if (this.mediaRecorder?.state === 'recording') return false

    let recordCanvas: HTMLCanvasElement
    let sourceCanvas: HTMLCanvasElement | null = null

    if (format !== 'native') {
      const fmt = VIDEO_FORMATS[format]
      // Create a hidden canvas at the target resolution
      this.cropCanvas = document.createElement('canvas')
      this.cropCanvas.width = fmt.width
      this.cropCanvas.height = fmt.height
      this.cropCtx = this.cropCanvas.getContext('2d')
      if (!this.cropCtx) return false

      sourceCanvas = canvas
      recordCanvas = this.cropCanvas

      // Start a render loop that center-crops the source onto the target
      const drawCrop = () => {
        if (!this.cropCtx || !sourceCanvas) return
        const src = sourceCanvas
        const tw = fmt.width
        const th = fmt.height
        const targetAspect = tw / th
        const srcAspect = src.width / src.height

        let sx: number, sy: number, sw: number, sh: number
        if (srcAspect > targetAspect) {
          // Source is wider — crop sides
          sh = src.height
          sw = sh * targetAspect
          sx = (src.width - sw) / 2
          sy = 0
        } else {
          // Source is taller — crop top/bottom
          sw = src.width
          sh = sw / targetAspect
          sx = 0
          sy = (src.height - sh) / 2
        }

        this.cropCtx.clearRect(0, 0, tw, th)
        this.cropCtx.drawImage(src, sx, sy, sw, sh, 0, 0, tw, th)
        this.cropRafId = requestAnimationFrame(drawCrop)
      }
      drawCrop()
    } else {
      recordCanvas = canvas
    }

    const stream = recordCanvas.captureStream(frameRate)
    if (!stream) return false

    // Try codecs in order of TikTok compatibility
    const codecs = [
      'video/mp4;codecs=avc1',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    const mimeType = codecs.find(c => MediaRecorder.isTypeSupported(c)) ?? 'video/webm'

    this.chunks = []
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 10_000_000, // 10 Mbps for crisp output
    })

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.onstop = () => {
      this.cleanupCrop()
      this.cleanupTimer()
      if (this.chunks.length === 0) return
      const blob = new Blob(this.chunks, { type: mimeType })
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `uzumaki-${Date.now()}.${ext}`
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      this.emit()
    }

    this.mediaRecorder.start(100)
    this.startTime = performance.now()

    this.timerInterval = setInterval(() => this.emit(), 1000)
    this.emit()
    return true
  }

  stop(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop()
    }
  }

  private cleanupCrop(): void {
    if (this.cropRafId !== null) {
      cancelAnimationFrame(this.cropRafId)
      this.cropRafId = null
    }
    this.cropCanvas = null
    this.cropCtx = null
  }

  private cleanupTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  dispose(): void {
    this.stop()
    this.cleanupCrop()
    this.cleanupTimer()
    this.mediaRecorder = null
    this.chunks = []
    this.onStateChange = null
  }
}
