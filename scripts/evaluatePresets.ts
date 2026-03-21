/**
 * Evaluate all curated presets. Run with: npx tsx scripts/evaluatePresets.ts
 */
import { defaultConfigV2, defaultRenderSettings } from '../app/models/types'
import type { SpiralConfigV2, RenderSettings } from '../app/models/types'
import { evaluateSpiral } from '../app/utils/spiralQuality'

interface Def { name: string; config: Partial<SpiralConfigV2>; render: Partial<RenderSettings> }

const CURATED: Def[] = [
  { name: 'Golden Bloom', config: { spiralFamily:'classic',spiralType:'golden',stepLength:8,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.015,lineWidth:2.5,blendMode:'screen',symmetry:1 }, render:{ bloomEnabled:true,bloomIntensity:0.8 } },
  { name: 'Neon Kaleidoscope', config: { spiralFamily:'classic',spiralType:'linear',stepLength:5,angleChange:10,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.012,lineWidth:1.5,symmetry:6,symmetryRotation:60 }, render:{ bloomEnabled:true,bloomIntensity:0.6 } },
  { name: 'Rose Garden', config: { spiralFamily:'parametric',spiralType:'rose',roseK:5,roseD:2,stepLength:2,speed:10,stepsPerFrame:1,lineWidth:2.5 }, render:{ bloomEnabled:true,bloomIntensity:0.6 } },
  { name: 'Spirograph Dreams', config: { spiralFamily:'parametric',spiralType:'hypotrochoid',trochoidR:80,trochoidr:48,trochoidD:40,stepLength:2,speed:10,stepsPerFrame:1,lineWidth:2,multiLineCount:3,multiLineSpacing:4 }, render:{ bloomEnabled:true,bloomIntensity:0.7 } },
  { name: 'Cosmic Fibonacci', config: { spiralFamily:'classic',spiralType:'fibonacci',stepLength:3,angleChange:30,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.0002,lineWidth:2 }, render:{ bloomEnabled:true,bloomIntensity:1.2 } },
  { name: 'Heartbeat', config: { spiralFamily:'parametric',spiralType:'lissajous',lissFreqX:2,lissFreqY:3,lissPhase:90,stepLength:2,speed:18,stepsPerFrame:1,lineWidth:3,pulseEffect:true,pulseSpeed:1.5,pulseRange:0.4 }, render:{ bloomEnabled:true,bloomIntensity:0.9 } },
  { name: 'Sacred Mandala', config: { spiralFamily:'classic',spiralType:'linear',stepLength:6,angleChange:10,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.01,lineWidth:1.2,symmetry:8,symmetryRotation:45,multiLineCount:2,multiLineSpacing:3 }, render:{ bloomEnabled:true,bloomIntensity:1.0 } },
  { name: 'Aurora', config: { spiralFamily:'archimedean',spiralType:'archimedean',archA:0,archB:3,stepLength:5,speed:10,stepsPerFrame:1,oscillate:true,oscillationSpeed:0.8,lineWidth:2 }, render:{ bloomEnabled:true,bloomIntensity:0.8 } },
  { name: 'Void Dancer', config: { spiralFamily:'parametric',spiralType:'harmonograph',harmFreq1:2,harmFreq2:2.01,harmPhase1:0,harmPhase2:90,harmDecay1:0.0005,harmDecay2:0.0005,harmAmp1:250,harmAmp2:250,stepLength:2,speed:18,stepsPerFrame:1,lineWidth:1 }, render:{ bloomEnabled:true,bloomIntensity:0.6 } },
  { name: 'Supernova', config: { spiralFamily:'classic',spiralType:'exponential',stepLength:4,angleChange:15,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.002,lineWidth:2,blendMode:'add',symmetry:4,symmetryRotation:90 }, render:{ bloomEnabled:true,bloomIntensity:1.5 } },
  { name: 'Hypnotic Pulse', config: { spiralFamily:'classic',spiralType:'linear',stepLength:5,angleChange:10,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.01,oscillate:true,oscillationSpeed:0.6,lineWidth:2 }, render:{ bloomEnabled:true,bloomIntensity:0.7 } },
  { name: 'Electric Lotus', config: { spiralFamily:'parametric',spiralType:'epitrochoid',trochoidR:100,trochoidr:60,trochoidD:80,stepLength:2,speed:18,stepsPerFrame:1,lineWidth:2,symmetry:3,symmetryRotation:120 }, render:{ bloomEnabled:true,bloomIntensity:0.8 } },
  { name: 'Silk Threads', config: { spiralFamily:'archimedean',spiralType:'archimedean',archA:0,archB:5,stepLength:3,speed:18,stepsPerFrame:1,lineWidth:0.8,multiLineCount:5,multiLineSpacing:6 }, render:{ bloomEnabled:true,bloomIntensity:0.4 } },
  { name: 'Quantum Rose', config: { spiralFamily:'parametric',spiralType:'rose',roseK:7,roseD:4,stepLength:3,speed:18,stepsPerFrame:1,lineWidth:1.5 }, render:{ bloomEnabled:true,bloomIntensity:1.2 } },
  { name: 'Fire Dance', config: { spiralFamily:'classic',spiralType:'exponential',stepLength:5,angleChange:15,angleIncrement:0,speed:18,stepsPerFrame:1,stepMultiplier:0.002,oscillate:true,oscillationSpeed:1.2,lineWidth:2.5,blendMode:'add',symmetry:3,symmetryRotation:120 }, render:{ bloomEnabled:true,bloomIntensity:1.3 } },
  { name: 'Diamond Web', config: { spiralFamily:'parametric',spiralType:'lissajous',lissFreqX:3,lissFreqY:4,lissPhase:45,stepLength:2,speed:18,stepsPerFrame:1,lineWidth:1.2,symmetry:5,symmetryRotation:72 }, render:{ bloomEnabled:true,bloomIntensity:0.5 } },
]

console.log('=== CURATED PRESET EVALUATION v2 ===\n')
let passCount = 0

for (const def of CURATED) {
  const config = { ...defaultConfigV2, ...def.config }
  const render = { ...defaultRenderSettings, ...def.render }
  const report = evaluateSpiral(config, render)
  const m = report.metrics
  const status = report.score >= 80 ? '  ' : report.score >= 60 ? '  ' : '  '
  if (report.score >= 70) passCount++
  console.log(`${status} ${def.name} — Score: ${report.score}/100`)
  console.log(`   ${config.spiralFamily}/${config.spiralType} | ${m.stepsPerSec.toFixed(0)} sps`)
  console.log(`   R: 10s=${m.radiusAt10s.toFixed(0)}  20s=${m.radiusAt20s.toFixed(0)}  30s=${m.radiusAt30s.toFixed(0)}`)
  if (m.minGapBetweenTurns < Infinity) console.log(`   Gap: ${m.minGapBetweenTurns.toFixed(1)}px (lw=${config.lineWidth})`)
  if (config.spiralFamily === 'parametric') console.log(`   Periods/20s: ${m.periodsIn20s.toFixed(1)}`)
  if (report.issues.length) report.issues.forEach(i => console.log(`   ! ${i}`))
  console.log()
}
console.log(`\n=== ${passCount}/${CURATED.length} PASS (score >= 70) ===`)
