import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js'
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js'
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js'
import type { RenderSettings } from '@/app/models/types'

/**
 * Custom shader for motion trail blending (ping-pong).
 * Blends the current frame (accumTarget) with the previous trail accumulation.
 */
const MixShader = {
  uniforms: {
    tDiffuse:  { value: null as THREE.Texture | null },  // current frame
    tPrevious: { value: null as THREE.Texture | null },  // previous trail
    mixFactor: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform sampler2D tPrevious;
    uniform float mixFactor;
    varying vec2 vUv;
    void main() {
      vec4 current  = texture2D(tDiffuse,  vUv);
      vec4 previous = texture2D(tPrevious, vUv);
      gl_FragColor  = mix(current, previous, mixFactor);
    }
  `,
}

/**
 * EffectComposer wrapper for Uzumaki GPU post-processing.
 *
 * Pipeline (per frame):
 *   1. [optional] Motion trail blend: mix(accumTarget, prevTrail) → currTrail
 *   2. Manually blit sourceTexture into composer.readBuffer (avoids TexturePass/needsSwap issues)
 *   3. EffectComposer: Bloom → ChromaticAberration → Vignette → FilmGrain → screen
 *      (or direct blit if no composer passes are enabled, e.g. motionTrail-only)
 *
 * Caller is responsible for calling render() only when at least one effect is active.
 * When all effects are off, SpiralRenderer uses direct blit instead (no composer overhead).
 */
export class PostProcessor {
  private renderer: THREE.WebGLRenderer | null = null
  private accumTarget: THREE.WebGLRenderTarget | null = null
  private composer: EffectComposer | null = null
  private bloomPass: UnrealBloomPass | null = null
  private chromaPass: ShaderPass | null = null
  private vigPass: ShaderPass | null = null
  private filmPass: FilmPass | null = null

  // Simple fullscreen-quad scene used to blit any texture into a render target.
  // We manually seed composer.readBuffer with this before calling composer.render(),
  // so every pass receives the current frame's content without TexturePass complications.
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private copyMat: THREE.MeshBasicMaterial | null = null
  private copyMesh: THREE.Mesh | null = null

  // Motion trail ping-pong buffers
  private trailTargetA: THREE.WebGLRenderTarget | null = null
  private trailTargetB: THREE.WebGLRenderTarget | null = null
  // Trail blend scene (full-screen quad)
  private trailScene: THREE.Scene | null = null
  private trailCamera: THREE.OrthographicCamera | null = null
  private trailMesh: THREE.Mesh | null = null
  private trailMat: THREE.ShaderMaterial | null = null
  // Which target receives this frame's trail output (0=A, 1=B)
  private trailWriteIdx = 0

  init(
    renderer: THREE.WebGLRenderer,
    accumTarget: THREE.WebGLRenderTarget,
    width: number,
    height: number
  ): void {
    this.renderer = renderer
    this.accumTarget = accumTarget

    const dpr = renderer.getPixelRatio()
    const physW = Math.round(width * dpr)
    const physH = Math.round(height * dpr)

    const rtOpts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    } satisfies THREE.RenderTargetOptions

    // ── Motion trail ping-pong render targets (physical pixel size) ──────────
    this.trailTargetA = new THREE.WebGLRenderTarget(physW, physH, rtOpts)
    this.trailTargetB = new THREE.WebGLRenderTarget(physW, physH, rtOpts)

    // Full-screen quad scene for trail blend pass
    this.trailScene = new THREE.Scene()
    this.trailCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.trailMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MixShader.uniforms),
      vertexShader: MixShader.vertexShader,
      fragmentShader: MixShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    })
    this.trailMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.trailMat)
    this.trailScene.add(this.trailMesh)

    // ── Copy scene (seed composer.readBuffer each frame) ─────────────────────
    // A plain MeshBasicMaterial fullscreen quad. We render sourceTexture into
    // composer.readBuffer using this before composer.render() runs, so the first
    // effect pass (BloomPass etc.) receives the current frame — not a stale buffer.
    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.copyMat = new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false })
    this.copyMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMat)
    this.copyScene.add(this.copyMesh)

    // ── EffectComposer (outputs to screen) ───────────────────────────────────
    // setSize takes CSS pixels; composer multiplies internally by pixelRatio.
    // No TexturePass — we seed readBuffer manually above each render() call.
    this.composer = new EffectComposer(renderer)
    this.composer.setSize(width, height)

    // Bloom (disabled by default; enabled/parameterised via render())
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.5,   // strength — overwritten each frame
      0.4,   // radius
      0.85   // threshold
    )
    this.bloomPass.enabled = false
    this.composer.addPass(this.bloomPass)

    // Chromatic aberration (RGBShift)
    this.chromaPass = new ShaderPass(RGBShiftShader)
    this.chromaPass.enabled = false
    this.composer.addPass(this.chromaPass)

    // Vignette
    this.vigPass = new ShaderPass(VignetteShader)
    this.vigPass.enabled = false
    this.composer.addPass(this.vigPass)

    // Film grain
    this.filmPass = new FilmPass(0.5, false)
    this.filmPass.enabled = false
    this.composer.addPass(this.filmPass)
  }

  /**
   * Render through the post-processing stack to screen.
   * Only call this when at least one effect is active (SpiralRenderer checks allEffectsOff).
   */
  render(settings: RenderSettings): void {
    if (!this.renderer || !this.accumTarget || !this.composer || !this.copyMat || !this.copyScene || !this.copyCamera) return

    let sourceTexture: THREE.Texture = this.accumTarget.texture

    // ── Motion trail blend ───────────────────────────────────────────────────
    if (settings.motionTrail > 0 && this.trailMat && this.trailScene && this.trailCamera) {
      const prevTarget = this.trailWriteIdx === 0 ? this.trailTargetB : this.trailTargetA
      const currTarget = this.trailWriteIdx === 0 ? this.trailTargetA : this.trailTargetB

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.trailMat.uniforms['tDiffuse'].value  = this.accumTarget.texture
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.trailMat.uniforms['tPrevious'].value = prevTarget!.texture
      this.trailMat.uniforms['mixFactor'].value  = settings.motionTrail

      this.renderer.autoClear = true
      this.renderer.setRenderTarget(currTarget!)
      this.renderer.render(this.trailScene, this.trailCamera)
      this.renderer.setRenderTarget(null)

      // Advance ping-pong index and use the freshly written target as source
      this.trailWriteIdx = 1 - this.trailWriteIdx
      sourceTexture = currTarget!.texture
    }

    // ── Update pass params ───────────────────────────────────────────────────

    if (this.bloomPass) {
      this.bloomPass.enabled = settings.bloomEnabled
      if (settings.bloomEnabled) {
        this.bloomPass.strength  = settings.bloomIntensity
        this.bloomPass.radius    = settings.bloomRadius
        this.bloomPass.threshold = settings.bloomThreshold
      }
    }

    if (this.chromaPass) {
      this.chromaPass.enabled = settings.chromaticAberrationEnabled
      if (settings.chromaticAberrationEnabled) {
        // RGBShiftShader `amount` is a fraction of screen width (0–1).
        // Map the user's 0–1 value to a usable range (0–0.02).
        this.chromaPass.uniforms['amount'].value = settings.chromaticAberration * 0.02
      }
    }

    if (this.vigPass) {
      this.vigPass.enabled = settings.vignetteEnabled
      if (settings.vignetteEnabled) {
        this.vigPass.uniforms['offset'].value    = 1.0
        this.vigPass.uniforms['darkness'].value  = settings.vignetteIntensity * 2
      }
    }

    if (this.filmPass) {
      this.filmPass.enabled = settings.filmGrainEnabled
      if (settings.filmGrainEnabled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(this.filmPass.uniforms as Record<string, { value: unknown }>)['intensity'].value = settings.filmGrain
      }
    }

    const anyPassEnabled = (
      (this.bloomPass?.enabled ?? false) ||
      (this.chromaPass?.enabled ?? false) ||
      (this.vigPass?.enabled ?? false) ||
      (this.filmPass?.enabled ?? false)
    )

    // ── Seed composer.readBuffer with current source texture ─────────────────
    // Blit sourceTexture → composer.readBuffer so every pass gets the current
    // frame when it reads readBuffer. This is the fix for the fade-in issue:
    // passes no longer read a stale buffer from the previous frame.
    this.copyMat.map = sourceTexture
    this.renderer.autoClear = true
    this.renderer.setRenderTarget(this.composer.readBuffer)
    this.renderer.render(this.copyScene, this.copyCamera)

    if (anyPassEnabled) {
      // ── Run composer → screen ──────────────────────────────────────────────
      this.renderer.autoClear = false
      this.composer.render()
    } else {
      // Only motionTrail is active; no composer passes — blit trail output to screen
      this.renderer.autoClear = true
      this.renderer.setRenderTarget(null)
      this.renderer.render(this.copyScene, this.copyCamera)
    }
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return

    const dpr = this.renderer.getPixelRatio()
    const physW = Math.round(width * dpr)
    const physH = Math.round(height * dpr)

    this.trailTargetA?.setSize(physW, physH)
    this.trailTargetB?.setSize(physW, physH)
    this.composer?.setSize(width, height)
    this.bloomPass?.resolution.set(width, height)
  }

  /** Clear both trail buffers — call when the spiral canvas is cleared. */
  clearTrail(): void {
    if (!this.renderer) return

    const prev = this.renderer.getRenderTarget()
    this.renderer.autoClear = true
    for (const rt of [this.trailTargetA, this.trailTargetB]) {
      if (rt) {
        this.renderer.setRenderTarget(rt)
        this.renderer.clear()
      }
    }
    this.renderer.setRenderTarget(prev)
    this.trailWriteIdx = 0
  }

  dispose(): void {
    this.trailTargetA?.dispose()
    this.trailTargetB?.dispose()
    this.trailMat?.dispose()
    ;(this.trailMesh?.geometry as THREE.BufferGeometry | undefined)?.dispose()
    this.copyMat?.dispose()
    ;(this.copyMesh?.geometry as THREE.BufferGeometry | undefined)?.dispose()
    this.bloomPass?.dispose()
    this.composer?.dispose()
  }
}
