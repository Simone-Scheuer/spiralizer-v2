import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/**
 * MAX_SEGMENTS: max line segments held in the buffer.
 * 2 vertices per segment; each vertex has x,y,z → 6 floats per segment.
 * 50k segments ≈ 1.2 MB for positions + 1.2 MB for colors.
 */
const MAX_SEGMENTS = 50_000

/**
 * Incremental line-segment geometry using Three.js LineSegments2 + LineMaterial.
 *
 * LineSegments2/LineMaterial are used instead of THREE.LineBasicMaterial because
 * WebGL2 does not support linewidth > 1 via gl.lineWidth(). LineMaterial implements
 * line width in a geometry shader so it works on all modern platforms.
 *
 * Segments are stored as interleaved pairs in flat Float32Arrays:
 *   positions: [x1,y1,z1, x2,y2,z2, x3,y3,z3, x4,y4,z4, ...]
 *   colors:    [r1,g1,b1, r2,g2,b2, r3,g3,b3, r4,g4,b4, ...]
 * where each consecutive pair of vec3s is one segment (start, end).
 *
 * InterleavedBuffers are used so Three.js reads directly from our arrays
 * without creating new typed array copies on each update.
 */
export class SpiralGeometry {
  private segments: Float32Array    // MAX_SEGMENTS * 6: interleaved [x1,y1,z1,x2,y2,z2, ...]
  private rgbColors: Float32Array   // MAX_SEGMENTS * 6: interleaved [r1,g1,b1,r2,g2,b2, ...]

  private geometry: LineSegmentsGeometry
  private material: LineMaterial | null = null
  private line: LineSegments2 | null = null

  private posBuf!: THREE.InstancedInterleavedBuffer
  private colBuf!: THREE.InstancedInterleavedBuffer

  private segmentCount = 0

  constructor() {
    this.segments  = new Float32Array(MAX_SEGMENTS * 6)
    this.rgbColors = new Float32Array(MAX_SEGMENTS * 6)

    this.geometry = new LineSegmentsGeometry()

    // Position attributes — InstancedInterleavedBuffer so each segment instance
    // gets ONE (start, end) pair, not one value per vertex of the base mesh.
    // stride 6 = [x1,y1,z1, x2,y2,z2] per instance; meshPerAttribute = 1.
    this.posBuf = new THREE.InstancedInterleavedBuffer(this.segments, 6, 1)
    this.geometry.setAttribute('instanceStart',
      new THREE.InterleavedBufferAttribute(this.posBuf, 3, 0))
    this.geometry.setAttribute('instanceEnd',
      new THREE.InterleavedBufferAttribute(this.posBuf, 3, 3))

    // Color attributes — same instanced layout
    this.colBuf = new THREE.InstancedInterleavedBuffer(this.rgbColors, 6, 1)
    this.geometry.setAttribute('instanceColorStart',
      new THREE.InterleavedBufferAttribute(this.colBuf, 3, 0))
    this.geometry.setAttribute('instanceColorEnd',
      new THREE.InterleavedBufferAttribute(this.colBuf, 3, 3))

    this.geometry.instanceCount = 0
  }

  /**
   * Append a line segment. Drops oldest 50% if the buffer is full.
   * Alpha is applied as material.opacity (shared across all segments per frame).
   */
  appendSegment(
    x1: number, y1: number,
    x2: number, y2: number,
    r: number, g: number, b: number, a: number
  ): void {
    if (this.segmentCount >= MAX_SEGMENTS) this._dropOldest()

    const si = this.segmentCount * 6
    // Positions
    this.segments[si]   = x1; this.segments[si+1] = y1; this.segments[si+2] = 0
    this.segments[si+3] = x2; this.segments[si+4] = y2; this.segments[si+5] = 0
    // Colors (same color at both ends of segment)
    this.rgbColors[si]   = r; this.rgbColors[si+1] = g; this.rgbColors[si+2] = b
    this.rgbColors[si+3] = r; this.rgbColors[si+4] = g; this.rgbColors[si+5] = b

    if (this.material) this.material.opacity = a

    this.segmentCount++
    this.posBuf.needsUpdate = true
    this.colBuf.needsUpdate = true
    this.geometry.instanceCount = this.segmentCount
  }

  /** Drop the oldest 50% of segments to make room. */
  private _dropOldest(): void {
    const keep = Math.floor(MAX_SEGMENTS / 2)
    const offset = MAX_SEGMENTS - keep
    this.segments.copyWithin(0, offset * 6, this.segmentCount * 6)
    this.rgbColors.copyWithin(0, offset * 6, this.segmentCount * 6)
    this.segmentCount = keep
  }

  /** Attach the LineSegments2 object to the scene (call once on init). */
  addToScene(scene: THREE.Scene, canvasWidth: number, canvasHeight: number): void {
    this.material = new LineMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 2,       // screen pixels (works correctly unlike LineBasicMaterial)
      worldUnits: false,
      resolution: new THREE.Vector2(canvasWidth, canvasHeight),
      depthTest: false,
      depthWrite: false,
    })
    this.line = new LineSegments2(this.geometry, this.material)
    scene.add(this.line)
  }

  /** Update line width (screen pixels). */
  setLineWidth(w: number): void {
    if (this.material) this.material.linewidth = Math.max(0.1, w)
  }

  /** Must be called on canvas resize so LineMaterial computes width correctly. */
  setResolution(w: number, h: number): void {
    if (this.material) this.material.resolution.set(w, h)
  }

  /** Reset: remove all segments and clear the draw count. */
  reset(_scene: THREE.Scene): void {
    this.segmentCount = 0
    this.geometry.instanceCount = 0
    this.posBuf.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material?.dispose()
  }
}
