// src/three/OpeningSequence.jsx
// Full rewrite for new opening style:
//
// Sequence:
//   Phase IDLE        — 0.6s black pause
//   Phase DRAW_TJ     — TJ strokes draw slowly left→right, laser tip crackles arcs
//   Phase HOLD_TJ     — TJ holds, arcs slowly die, ~1s
//   Phase UNDRAW_TJ   — TJ strokes erase themselves in reverse (right→left)
//   Phase BEAT        — ~0.3s pure black between TJ and DRAWER
//   Phase DRAW_DRAWER — each letter of DRAWER draws in sequence, same laser style
//   Phase HOLD_DRAWER — DRAWER holds glowing, arcs die, ~1.5s
//   Phase DONE        — fires onComplete, canvas fades (handled by HelixScene overlay)
//
// Technique:
//   - Canvas2D renders letter strokes onto an offscreen canvas each frame
//   - That canvas is used as a THREE.CanvasTexture on a fullscreen plane mesh
//   - Electric arcs fire from the active draw tip position via arcSystemRef
//   - Font: Arial Black / Impact — heavy, fills space, no font loading required
//
// Camera: z=3.5, fov=55 (set in HelixScene)
// Visible height at z=0 ≈ 6.5 units, width ≈ 11.5 units
// Plane fills viewport exactly.

import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Timing (seconds) ────────────────────────────────────────────────────────

const T_IDLE         = 0.6
const T_DRAW_TJ      = 3.2   // slow deliberate laser draw
const T_HOLD_TJ      = 1.0
const T_UNDRAW_TJ    = 2.0   // reverse erase — slightly faster than draw
const T_BEAT         = 0.35  // black pause between TJ and DRAWER
const T_DRAW_DRAWER  = 4.5   // DRAWER is longer — staggered per letter
const T_HOLD_DRAWER  = 1.5
// DONE fires onComplete — HelixScene overlay handles visual fade

// ─── Style ───────────────────────────────────────────────────────────────────

const CRIMSON      = '#dc143c'
const CRIMSON_GLOW = '#ff2050'
const BG_COLOR     = '#000000'

// Canvas2D resolution — high enough for sharp text, not so high it kills perf
const CVS_W = 2048
const CVS_H = 512

// Arc spawn rate at draw tip (arcs per second)
const ARC_RATE_DRAW = 18
const ARC_RATE_HOLD = 5

// ─── Phase enum ──────────────────────────────────────────────────────────────

const PHASE = {
  IDLE:         'idle',
  DRAW_TJ:      'draw_tj',
  HOLD_TJ:      'hold_tj',
  UNDRAW_TJ:    'undraw_tj',
  BEAT:         'beat',
  DRAW_DRAWER:  'draw_drawer',
  HOLD_DRAWER:  'hold_drawer',
  DONE:         'done',
}

// ─── Letter stroke path builder ───────────────────────────────────────────────
// Returns an array of stroke segments for a given text string.
// Each stroke is { points: [{x,y},...] } — a polyline to draw progressively.
// We use measureText + manual path decomposition via small canvas sampling.
//
// Strategy: render each character at full size, scan columns left→right to find
// the ink boundary per scanline, then build a single continuous stroke path
// that traces along the vertical midline of each column of pixels.
// This gives a convincing "pen traces the letter" effect without needing SVG fonts.

function buildStrokePaths(text, fontSize, canvasW, canvasH) {
  // Offscreen sampling canvas — low res for speed
  const sW = 1024, sH = 256
  const sc  = document.createElement('canvas')
  sc.width  = sW
  sc.height = sH
  const sx  = sc.getContext('2d')

  sx.fillStyle = '#000'
  sx.fillRect(0, 0, sW, sH)
  sx.font         = `900 ${fontSize}px "Arial Black", Impact, sans-serif`
  sx.fillStyle    = '#fff'
  sx.textAlign    = 'center'
  sx.textBaseline = 'middle'
  sx.fillText(text, sW / 2, sH / 2)

  const pixels = sx.getImageData(0, 0, sW, sH).data

  // Build one continuous path: scan left→right column by column,
  // within each column find the vertical midpoint of lit pixels,
  // connect columns with a line. Skip empty columns.
  const path = []

  for (let x = 0; x < sW; x++) {
    const litRows = []
    for (let y = 0; y < sH; y++) {
      const idx = (y * sW + x) * 4
      if (pixels[idx] > 80) litRows.push(y)
    }
    if (litRows.length === 0) {
      // Gap between letters — lift pen if we had points
      if (path.length > 0 && path[path.length - 1] !== null) {
        path.push(null) // null = pen lift
      }
      continue
    }
    // Midpoint of lit pixels in this column
    const midY = litRows[Math.floor(litRows.length / 2)]
    path.push({ x, y: midY, sW, sH })
  }

  // Split on nulls into separate strokes, normalise coordinates to [-1, 1] space
  const strokes = []
  let current = []

  for (const pt of path) {
    if (pt === null) {
      if (current.length > 1) strokes.push(current)
      current = []
    } else {
      current.push({
        // Normalise to [-1, 1] matching canvas aspect
        x: (pt.x / pt.sW) * 2 - 1,
        y: -((pt.y / pt.sH) * 2 - 1),
      })
    }
  }
  if (current.length > 1) strokes.push(current)

  return strokes
}

// ─── Canvas2D renderer ────────────────────────────────────────────────────────
// Draws strokes onto the output canvas up to `progress` (0→1 = all strokes drawn).
// Returns the current tip position {x, y} in normalised [-1,1] space.

function renderStrokes(ctx, strokes, progress, canvasW, canvasH, glowIntensity = 1.0) {
  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, canvasW, canvasH)

  if (strokes.length === 0 || progress <= 0) return null

  // Total points across all strokes
  let totalPoints = 0
  for (const s of strokes) totalPoints += s.length

  const targetPoints = Math.floor(progress * totalPoints)
  if (targetPoints === 0) return null

  let drawn = 0
  let tipX = null, tipY = null

  // Helper: normalised → canvas pixel
  const toCanvas = (nx, ny) => ({
    cx: ((nx + 1) / 2) * canvasW,
    cy: ((1 - (ny + 1) / 2)) * canvasH,
  })

  for (const stroke of strokes) {
    if (drawn >= targetPoints) break
    const take = Math.min(stroke.length, targetPoints - drawn)

    ctx.beginPath()

    for (let i = 0; i < take; i++) {
      const { cx, cy } = toCanvas(stroke[i].x, stroke[i].y)
      if (i === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)

      if (i === take - 1) {
        tipX = stroke[i].x
        tipY = stroke[i].y
      }
    }

    // Outer glow layer
    ctx.strokeStyle = `rgba(220, 20, 60, ${0.3 * glowIntensity})`
    ctx.lineWidth   = 18
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.shadowColor = CRIMSON_GLOW
    ctx.shadowBlur  = 40 * glowIntensity
    ctx.stroke()

    // Main crimson stroke
    ctx.strokeStyle = `rgba(220, 20, 60, ${0.85 * glowIntensity})`
    ctx.lineWidth   = 6
    ctx.shadowBlur  = 20 * glowIntensity
    ctx.stroke()

    // Bright core — near white at full intensity
    ctx.strokeStyle = `rgba(255, 180, 180, ${0.6 * glowIntensity})`
    ctx.lineWidth   = 2
    ctx.shadowBlur  = 10
    ctx.stroke()

    drawn += take
  }

  // Draw active tip dot — bright point at the laser head
  if (tipX !== null && progress < 1.0) {
    const { cx, cy } = toCanvas(tipX, tipY)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30)
    grad.addColorStop(0,   `rgba(255, 255, 255, ${0.9 * glowIntensity})`)
    grad.addColorStop(0.3, `rgba(255, 80, 80,   ${0.7 * glowIntensity})`)
    grad.addColorStop(1,   'rgba(220, 20, 60, 0)')
    ctx.beginPath()
    ctx.arc(cx, cy, 30, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur  = 20
    ctx.fill()
  }

  return tipX !== null ? { x: tipX, y: tipY } : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpeningSequence({ onComplete, arcSystemRef }) {
  const { viewport } = useThree()

  // ── Offscreen canvas + texture ──
  const canvas2D = useMemo(() => {
    const c  = document.createElement('canvas')
    c.width  = CVS_W
    c.height = CVS_H
    return c
  }, [])

  const ctx2D = useMemo(() => canvas2D.getContext('2d'), [canvas2D])

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas2D)
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    return t
  }, [canvas2D])

  // ── Stroke paths — computed once ──
  const tjStrokes     = useMemo(() => buildStrokePaths('TJ',     CVS_H * 0.75, CVS_W, CVS_H), [])
  const drawerStrokes = useMemo(() => buildStrokePaths('DRAWER', CVS_H * 0.72, CVS_W, CVS_H), [])

  // ── Phase state (all refs — no React re-renders) ──
  const phase       = useRef(PHASE.IDLE)
  const phaseTime   = useRef(0)
  const completed   = useRef(false)
  const arcAccum    = useRef(0)
  const idleTimer   = useRef(null)

  // ── Last known tip position for arc spawning ──
  const lastTip = useRef(null)

  // ── Plane mesh ref ──
  const meshRef = useRef()

  // ── Start idle timer on mount ──
  useEffect(() => {
    idleTimer.current = setTimeout(() => {
      phase.current     = PHASE.DRAW_TJ
      phaseTime.current = 0
    }, T_IDLE * 1000)

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      texture.dispose()
    }
  }, [texture])

  // ── Arc spawn helper ──
  const spawnArcAtTip = useCallback((tip, intensityMult) => {
    const sys = arcSystemRef?.current
    if (!sys || !tip) return

    // Convert normalised tip [-1,1] to Three.js world coords on the plane
    const wx = tip.x * (viewport.width  / 2)
    const wy = tip.y * (viewport.height / 2)

    const from = new THREE.Vector3(wx, wy, 0)
    // Arc to a random nearby point
    const to = new THREE.Vector3(
      wx + (Math.random() - 0.5) * 0.6,
      wy + (Math.random() - 0.5) * 0.3,
      0
    )
    sys.spawn(from, to, intensityMult)
  }, [arcSystemRef, viewport])

  // ── Frame loop ──
  useFrame((_, delta) => {
    if (completed.current) return

    const t = phaseTime.current
    phaseTime.current += delta

    let tip          = null
    let arcRate      = 0
    let arcIntensity = 1.0
    let needsUpdate  = true

    switch (phase.current) {

      // ── IDLE — nothing rendered, just waiting ────────────────────────────
      case PHASE.IDLE: {
        ctx2D.fillStyle = BG_COLOR
        ctx2D.fillRect(0, 0, CVS_W, CVS_H)
        needsUpdate = false // don't thrash texture during idle
        break
      }

      // ── DRAW_TJ ─────────────────────────────────────────────────────────
      case PHASE.DRAW_TJ: {
        const progress = Math.min(t / T_DRAW_TJ, 1.0)
        tip = renderStrokes(ctx2D, tjStrokes, progress, CVS_W, CVS_H, 1.0)
        lastTip.current = tip

        arcRate      = ARC_RATE_DRAW
        arcIntensity = 1.0

        if (progress >= 1.0) {
          phase.current     = PHASE.HOLD_TJ
          phaseTime.current = 0
        }
        break
      }

      // ── HOLD_TJ — fully drawn, arcs slowly die ───────────────────────────
      case PHASE.HOLD_TJ: {
        const holdFade = Math.max(0, 1.0 - t / T_HOLD_TJ)
        tip = renderStrokes(ctx2D, tjStrokes, 1.0, CVS_W, CVS_H, 0.7 + holdFade * 0.3)

        arcRate      = ARC_RATE_HOLD * holdFade
        arcIntensity = 0.5 * holdFade
        // Spawn arcs at random positions along the formed TJ
        lastTip.current = tip

        if (t >= T_HOLD_TJ) {
          phase.current     = PHASE.UNDRAW_TJ
          phaseTime.current = 0
        }
        break
      }

      // ── UNDRAW_TJ — strokes erase in reverse ────────────────────────────
      case PHASE.UNDRAW_TJ: {
        // progress goes 1 → 0 as time advances
        const eraseProgress = Math.max(0, 1.0 - t / T_UNDRAW_TJ)
        tip = renderStrokes(ctx2D, tjStrokes, eraseProgress, CVS_W, CVS_H, 0.8)
        lastTip.current = tip

        // Arcs at the erasing tip — slightly lower rate
        arcRate      = ARC_RATE_DRAW * 0.6
        arcIntensity = 0.7

        if (eraseProgress <= 0) {
          phase.current     = PHASE.BEAT
          phaseTime.current = 0
          // Clear canvas to pure black for the beat
          ctx2D.fillStyle = BG_COLOR
          ctx2D.fillRect(0, 0, CVS_W, CVS_H)
        }
        break
      }

      // ── BEAT — black pause ───────────────────────────────────────────────
      case PHASE.BEAT: {
        ctx2D.fillStyle = BG_COLOR
        ctx2D.fillRect(0, 0, CVS_W, CVS_H)
        needsUpdate = false

        if (t >= T_BEAT) {
          phase.current     = PHASE.DRAW_DRAWER
          phaseTime.current = 0
        }
        break
      }

      // ── DRAW_DRAWER — letters draw one after another ─────────────────────
      case PHASE.DRAW_DRAWER: {
        const progress = Math.min(t / T_DRAW_DRAWER, 1.0)
        tip = renderStrokes(ctx2D, drawerStrokes, progress, CVS_W, CVS_H, 1.0)
        lastTip.current = tip

        arcRate      = ARC_RATE_DRAW
        arcIntensity = 1.1

        if (progress >= 1.0) {
          phase.current     = PHASE.HOLD_DRAWER
          phaseTime.current = 0
        }
        break
      }

      // ── HOLD_DRAWER — glowing hold, arcs die ────────────────────────────
      case PHASE.HOLD_DRAWER: {
        const holdFade   = Math.max(0, 1.0 - t / T_HOLD_DRAWER)
        const glowPulse  = 0.8 + 0.2 * Math.sin(t * 5)
        tip = renderStrokes(ctx2D, drawerStrokes, 1.0, CVS_W, CVS_H, glowPulse)
        lastTip.current  = tip

        arcRate      = ARC_RATE_HOLD * holdFade
        arcIntensity = 0.4 * holdFade

        if (t >= T_HOLD_DRAWER) {
          phase.current     = PHASE.DONE
          phaseTime.current = 0
          completed.current = true
          if (onComplete) onComplete()
        }
        break
      }

      default:
        needsUpdate = false
        break
    }

    // ── Update texture ──
    if (needsUpdate) {
      texture.needsUpdate = true
    }

    // ── Spawn arcs at tip ──
    const activeTip = lastTip.current
    if (arcRate > 0 && activeTip) {
      arcAccum.current += arcRate * delta
      const toSpawn = Math.floor(arcAccum.current)
      if (toSpawn > 0) {
        arcAccum.current -= toSpawn
        for (let i = 0; i < toSpawn; i++) {
          spawnArcAtTip(activeTip, arcIntensity)
        }
      }
    }
  })

  // ── Plane sized to fill viewport exactly ──
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <meshBasicMaterial
        map={texture}
        transparent={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
