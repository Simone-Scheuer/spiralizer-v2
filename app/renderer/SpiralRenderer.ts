import * as THREE from 'three'
import { SpiralGeometry } from './SpiralGeometry'
import { PostProcessor } from './PostProcessor'
import type { RenderSettings } from '@/app/models/types'

/**
 * Core Three.js WebGL renderer for Uzumaki.
 *
 * Accumulation pattern:
 *   - Each frame's new line segments are appended to a persistent SpiralGeometry.
 *   - The geometry is rendered to an accumulation RenderTarget WITHOUT clearing.
 *   - The RenderTarget texture is then blitted to screen via PostProcessor (if effects active)
 *     or directly via screenQuad (when all effects are off).
 *   - To "clear" the spiral: call clear() which resets the RenderTarget.
 *
 * This gives the spiral its "building up" appearance over time.
 */
export class SpiralRenderer {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.OrthographicCamera
  private accumTarget!: THREE.WebGLRenderTarget
  private screenScene!: THREE.Scene
  private screenCamera!: THREE.OrthographicCamera
  private screenQuad!: THREE.Mesh

  private width = 0
  private height = 0
  private _geometry: SpiralGeometry | null = null
  private postProcessor: PostProcessor | null = null
  private renderSettings: RenderSettings | null = null

  get geometry(): SpiralGeometry {
    if (!this._geometry) throw new Error('SpiralRenderer not initialized')
    return this._geometry
  }

  init(canvas: HTMLCanvasElement): void {
    // offsetWidth/offsetHeight account for CSS layout; fall back to canvas intrinsic size
    this.width = canvas.offsetWidth || canvas.clientWidth || canvas.width
    this.height = canvas.offsetHeight || canvas.clientHeight || canvas.height

    // ── WebGL Renderer ──────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,  // needed for PNG export
    })
    // Use full native DPR — no cap, so Retina/HiDPI displays get full resolution
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height, false)
    this.renderer.setClearColor(0x000000, 1)

    // ── Main Scene + Orthographic Camera ────────────────────────────────────
    // Camera maps 1 world unit = 1 CSS pixel, origin at canvas center.
    this.scene = new THREE.Scene()
    this.camera = this._makeOrthoCam(this.width, this.height)

    // ── Accumulation RenderTarget ────────────────────────────────────────────
    // Must be at PHYSICAL pixel size (CSS pixels × DPR), not CSS pixel size.
    // Otherwise the spiral is rendered at low-res and upscaled to screen.
    const dpr = this.renderer.getPixelRatio()
    this.accumTarget = new THREE.WebGLRenderTarget(
      Math.round(this.width * dpr),
      Math.round(this.height * dpr),
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }
    )

    // ── Screen Quad (blit accumTarget → canvas) ──────────────────────────────
    this.screenScene = new THREE.Scene()
    this.screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const quadGeo = new THREE.PlaneGeometry(2, 2)
    const quadMat = new THREE.MeshBasicMaterial({
      map: this.accumTarget.texture,
      depthTest: false,
      depthWrite: false,
    })
    this.screenQuad = new THREE.Mesh(quadGeo, quadMat)
    this.screenScene.add(this.screenQuad)

    // ── Spiral Geometry ──────────────────────────────────────────────────────
    this._geometry = new SpiralGeometry()
    this._geometry.addToScene(this.scene, this.width, this.height)
  }

  private _makeOrthoCam(w: number, h: number): THREE.OrthographicCamera {
    const hw = w / 2
    const hh = h / 2
    const cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, -100, 100)
    cam.position.z = 1
    return cam
  }

  /** Initialise the PostProcessor. Call once after init(), before the first render(). */
  initPostProcessing(settings: RenderSettings): void {
    this.renderSettings = settings
    this.postProcessor = new PostProcessor()
    this.postProcessor.init(this.renderer, this.accumTarget, this.width, this.height)
  }

  /** Update cached render settings — called each frame from the animation loop. */
  updateRenderSettings(settings: RenderSettings): void {
    this.renderSettings = settings
  }

  private _allEffectsOff(s: RenderSettings): boolean {
    return (
      !s.bloomEnabled &&
      !s.chromaticAberrationEnabled &&
      !s.vignetteEnabled &&
      !s.filmGrainEnabled &&
      s.motionTrail === 0
    )
  }

  resize(width: number, height: number): void {
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height

    this.renderer.setSize(width, height, false)

    // Update camera (world units = CSS pixels)
    const hw = width / 2
    const hh = height / 2
    this.camera.left = -hw
    this.camera.right = hw
    this.camera.top = hh
    this.camera.bottom = -hh
    this.camera.updateProjectionMatrix()

    // Resize accumTarget to physical pixel resolution
    const dpr = this.renderer.getPixelRatio()
    this.accumTarget.setSize(Math.round(width * dpr), Math.round(height * dpr))

    // LineMaterial needs the CSS-pixel resolution for correct linewidth computation
    this._geometry?.setResolution(width, height)

    this.postProcessor?.resize(width, height)
  }

  /** Update line width (screen pixels). Call once per tick from the animation loop. */
  setLineWidth(w: number): void {
    this._geometry?.setLineWidth(w)
  }

  /**
   * Add a line segment (from → to) to the accumulation buffer.
   * Color components are normalized 0–1. Opacity is combined into 'a'.
   */
  addLineSegment(
    from: { x: number; y: number },
    to: { x: number; y: number },
    r: number, g: number, b: number, a: number
  ): void {
    this.geometry.appendSegment(from.x, from.y, to.x, to.y, r, g, b, a)
  }

  /**
   * Render the current geometry into the accumulation target (without clearing it),
   * then output to screen — via PostProcessor when effects are active, or direct blit otherwise.
   */
  render(): void {
    // 1. Render incremental geometry into accumTarget (NO autoClear)
    this.renderer.autoClear = false
    this.renderer.setRenderTarget(this.accumTarget)
    this.renderer.render(this.scene, this.camera)

    // 2. Output to screen
    const usePost = this.postProcessor !== null &&
      this.renderSettings !== null &&
      !this._allEffectsOff(this.renderSettings)

    if (usePost) {
      // Post-processing stack → screen
      this.postProcessor!.render(this.renderSettings!)
    } else {
      // Direct blit — zero post-processing overhead
      this.renderer.setRenderTarget(null)
      this.renderer.autoClear = true
      this.renderer.render(this.screenScene, this.screenCamera)
    }
  }

  /** Clear the spiral canvas (resets accumulation buffer and trail to black) */
  clear(): void {
    this._geometry?.reset(this.scene)
    this.renderer.setRenderTarget(this.accumTarget)
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.clear()
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.screenScene, this.screenCamera)
    this.postProcessor?.clearTrail()
  }

  /** Export current canvas as PNG data URL */
  getDataURL(): string {
    return this.renderer.domElement.toDataURL('image/png')
  }

  get canvasWidth(): number { return this.width }
  get canvasHeight(): number { return this.height }

  dispose(): void {
    this.postProcessor?.dispose()
    this._geometry?.dispose()
    this.accumTarget.dispose()
    this.renderer.dispose()
    const mat = this.screenQuad.material as THREE.MeshBasicMaterial
    mat.dispose()
    this.screenQuad.geometry.dispose()
  }
}
