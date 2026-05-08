// src/three/OpeningSequence.jsx
// S4a — Full opening animation: black → TJ laser etch → shatter → DRAWER reassemble → electric hold
//
// Architecture:
//   - Letter paths sampled from offscreen Canvas 2D → mapped to 3D positions
//   - InstancedMesh for all fragments (performance — up to 2000 instances)
//   - Electric arcs = individual Line objects with short lifetime, pooled
//   - GSAP timeline drives all phases via refs (no React state per frame)
//   - Bloom from parent EffectComposer handles all glow
//   - Calls props.onComplete() when sequence ends → S5 helix fades in

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

// ─── Constants ───────────────────────────────────────────────────────────────

const CRIMSON = new THREE.Color('#dc143c')
const CRIMSON_BRIGHT = new THREE.Color('#ff2a5a')
const WHITE = new THREE.Color('#ffffff')
const GOLD = new THREE.Color('#ffaa44')

const FRAGMENT_COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 600 : 1400
const ARC_POOL_SIZE = 60
const FRAGMENT_SIZE = 0.035

// Letter scale in world units
const LETTER_SCALE = 1.6
const LETTER_Z = 0

// ─── Letter path sampler ──────────────────────────────────────────────────────
// Renders text to an offscreen Canvas 2D, samples dark pixels → 3D positions

function sampleLetterPositions(text, canvasW = 512, canvasH = 256, targetCount = 700) {
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Bold condensed look — closest to AutoCAD-style stencil lettering
  const fontSize = Math.floor(canvasH * 0.7)
  ctx.font = `900 ${fontSize}px 'Arial Black', 'Impact', sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvasW / 2, canvasH / 2)

  const imageData = ctx.getImageData(0, 0, canvasW, canvasH)
  const pixels = imageData.data

  // Collect all lit pixel positions
  const litPixels = []
  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const idx = (y * canvasW + x) * 4
      if (pixels[idx] > 128) {
        litPixels.push({ x, y })
      }
    }
  }

  // Downsample to targetCount with uniform spacing
  const step = Math.max(1, Math.floor(litPixels.length / targetCount))
  const sampled = []
  for (let i = 0; i < litPixels.length; i += step) {
    if (sampled.length >= targetCount) break
    sampled.push(litPixels[i])
  }

  // Convert pixel coords → 3D world coords (centered, scaled)
  const worldPositions = sampled.map(({ x, y }) => {
    const wx = ((x / canvasW) - 0.5) * LETTER_SCALE * (canvasW / canvasH)
    const wy = -((y / canvasH) - 0.5) * LETTER_SCALE
    return new THREE.Vector3(wx, wy, LETTER_Z)
  })

  return worldPositions
}

// ─── Arc pool ─────────────────────────────────────────────────────────────────
// Manages a fixed pool of Line objects for electric arcs

function createArcPool(scene, size) {
  const pool = []
  for (let i = 0; i < size; i++) {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, 0.1, 0),
      new THREE.Vector3(0.2, 0, 0),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: CRIMSON_BRIGHT,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const line = new THREE.Line(geometry, material)
    line.visible = false
    line.userData.lifetime = 0
    line.userData.maxLife = 0
    scene.add(line)
    pool.push(line)
  }
  return pool
}

function fireArc(pool, fromPos, toPos, lifetime = 0.18) {
  // Find a free arc
  let arc = null
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].visible) {
      arc = pool[i]
      break
    }
  }
  if (!arc) return // Pool exhausted — skip

  // Build jagged midpoints
  const segments = 4 + Math.floor(Math.random() * 4)
  const points = [fromPos.clone()]
  for (let i = 1; i < segments; i++) {
    const t = i / segments
    const mid = fromPos.clone().lerp(toPos, t)
    const jitter = (1 - Math.abs(t - 0.5) * 2) * 0.15
    mid.x += (Math.random() - 0.5) * jitter
    mid.y += (Math.random() - 0.5) * jitter
    mid.z += (Math.random() - 0.5) * jitter * 0.3
    points.push(mid)
  }
  points.push(toPos.clone())

  arc.geometry.setFromPoints(points)
  arc.geometry.attributes.position.needsUpdate = true
  arc.material.opacity = 0.8 + Math.random() * 0.2
  arc.material.color.set(Math.random() > 0.3 ? CRIMSON_BRIGHT : WHITE)
  arc.visible = true
  arc.userData.lifetime = 0
  arc.userData.maxLife = lifetime
}

function tickArcs(pool, delta) {
  for (let i = 0; i < pool.length; i++) {
    const arc = pool[i]
    if (!arc.visible) continue
    arc.userData.lifetime += delta
    const t = arc.userData.lifetime / arc.userData.maxLife
    if (t >= 1) {
      arc.visible = false
      arc.material.opacity = 0
    } else {
      // Flicker: opacity spikes then fades
      arc.material.opacity = (1 - t * t) * (0.6 + Math.random() * 0.4)
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OpeningSequence({ onComplete }) {
  const { scene } = useThree()

  // Refs for instanced mesh
  const instancedMeshRef = useRef()

  // Animation state — all driven by GSAP, never React state
  const state = useRef({
    phase: 'idle', // idle | etching | shatter | reassemble | hold | done
    // Per-fragment data
    positions: null,       // Float32Array current world positions (3 per frag)
    velocities: null,      // Float32Array velocities (3 per frag)
    homesTJ: null,         // target positions for TJ phase
    homesDrawer: null,     // target positions for DRAWER phase
    scatterTargets: null,  // scatter destinations
    fragmentCount: 0,
    // Phase progress (GSAP animates these scalars)
    etchProgress: 0,       // 0→1: how many fragments are revealed
    shatterProgress: 0,    // 0→1: fragments flying out
    reassembleProgress: 0, // 0→1: fragments pulled to DRAWER
    holdGlow: 0,           // 0→1: final glow intensity multiplier
    // Arc firing rate control
    lastArcTime: 0,
    arcFireInterval: 0.04, // seconds between arc fires during etch/hold
    // Temp matrix for instanced mesh updates
    dummy: new THREE.Object3D(),
    // Arc pool reference
    arcPool: null,
  })

  // Color attribute for instanced mesh
  const colorArray = useMemo(
    () => new Float32Array(FRAGMENT_COUNT * 3),
    []
  )

  // Build geometry + sample letter positions on mount
  useEffect(() => {
    const s = state.current

    // Sample positions for TJ and DRAWER
    const tjCount = Math.floor(FRAGMENT_COUNT * 0.5)
    const drawerCount = FRAGMENT_COUNT - tjCount

    const tjPositions = sampleLetterPositions('TJ', 512, 256, tjCount)
    const drawerPositions = sampleLetterPositions('DRAWER', 800, 200, drawerCount)

    // Pad arrays to FRAGMENT_COUNT
    const allTJ = []
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      allTJ.push(tjPositions[i % tjPositions.length].clone())
    }
    const allDrawer = []
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      allDrawer.push(drawerPositions[i % drawerPositions.length].clone())
    }

    s.fragmentCount = FRAGMENT_COUNT

    // Flat arrays for fast per-frame mutation
    s.homesTJ = new Float32Array(FRAGMENT_COUNT * 3)
    s.homesDrawer = new Float32Array(FRAGMENT_COUNT * 3)
    s.scatterTargets = new Float32Array(FRAGMENT_COUNT * 3)
    s.positions = new Float32Array(FRAGMENT_COUNT * 3)
    s.velocities = new Float32Array(FRAGMENT_COUNT * 3)

    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const i3 = i * 3

      // TJ home positions
      s.homesTJ[i3]     = allTJ[i].x
      s.homesTJ[i3 + 1] = allTJ[i].y
      s.homesTJ[i3 + 2] = allTJ[i].z

      // DRAWER home positions
      s.homesDrawer[i3]     = allDrawer[i].x
      s.homesDrawer[i3 + 1] = allDrawer[i].y
      s.homesDrawer[i3 + 2] = allDrawer[i].z

      // Scatter targets: explosion outward
      const angle = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.5) * Math.PI
      const radius = 3 + Math.random() * 6
      s.scatterTargets[i3]     = Math.cos(angle) * Math.cos(elevation) * radius
      s.scatterTargets[i3 + 1] = Math.sin(elevation) * radius
      s.scatterTargets[i3 + 2] = Math.sin(angle) * Math.cos(elevation) * radius * 0.4

      // Start all fragments hidden at TJ positions (etch will reveal them progressively)
      s.positions[i3]     = allTJ[i].x
      s.positions[i3 + 1] = allTJ[i].y
      s.positions[i3 + 2] = allTJ[i].z
    }

    // Initial color — all crimson
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const i3 = i * 3
      colorArray[i3]     = CRIMSON.r
      colorArray[i3 + 1] = CRIMSON.g
      colorArray[i3 + 2] = CRIMSON.b
    }

    // Create arc pool
    s.arcPool = createArcPool(scene, ARC_POOL_SIZE)

    // Mark as ready for first-frame init (mesh ref not yet committed at useEffect time)
    s.needsInit = true

    // ── GSAP Timeline ──────────────────────────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.5 })

    // Phase 1: Black screen hold (already at 0.5s delay above)

    // Phase 2: TJ laser etch — reveal fragments progressively over 2.8s
    tl.to(s, {
      etchProgress: 1,
      duration: 2.8,
      ease: 'power1.inOut',
      onStart: () => { s.phase = 'etching' },
    })

    // Residual electricity hold — 1.0s after TJ forms
    tl.to(s, {
      holdGlow: 1,
      duration: 0.3,
      ease: 'power2.out',
    })
    tl.to(s, {
      holdGlow: 0.6,
      duration: 0.7,
      ease: 'power1.out',
    })

    // Phase 3: Shatter — 0.6s
    tl.to(s, {
      shatterProgress: 1,
      duration: 0.55,
      ease: 'power3.in',
      onStart: () => { s.phase = 'shatter' },
    })

    // Brief chaos hold — 0.4s
    tl.to(s, { duration: 0.4 })

    // Phase 4: Reassemble into DRAWER — 1.8s, staggered pull-in
    tl.to(s, {
      reassembleProgress: 1,
      duration: 1.8,
      ease: 'power2.inOut',
      onStart: () => { s.phase = 'reassemble' },
    })

    // Phase 5: Electric hold — 1.5s
    tl.to(s, {
      holdGlow: 1,
      duration: 0.4,
      ease: 'power2.out',
      onStart: () => {
        s.phase = 'hold'
        s.arcFireInterval = 0.025 // Faster arcs during hold
      },
    })
    tl.to(s, {
      holdGlow: 0,
      duration: 1.1,
      ease: 'power2.inOut',
    })

    // Phase 6: Fragment drift-out → onComplete → S5 helix fades in
    tl.to(s, {
      duration: 0.8,
      ease: 'power2.in',
      onStart: () => { s.phase = 'done' },
      onComplete: () => {
        if (onComplete) onComplete()
      },
    })

    return () => {
      // Cleanup
      tl.kill()
      if (s.arcPool) {
        s.arcPool.forEach(arc => {
          arc.geometry.dispose()
          arc.material.dispose()
          scene.remove(arc)
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-frame update ──────────────────────────────────────────────────────
  useFrame(({ clock }, delta) => {
    const s = state.current
    const mesh = instancedMeshRef.current
    if (!mesh || !s.positions) return

    // ── First-frame mesh initialization (safe — mesh is committed by now) ──
    if (s.needsInit) {
      s.needsInit = false
      const dummy = s.dummy
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        dummy.position.set(
          s.positions[i * 3],
          s.positions[i * 3 + 1],
          s.positions[i * 3 + 2]
        )
        dummy.scale.setScalar(0) // Hidden until etched
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      // Attach instanced color buffer (separate from vertexColors — no conflict)
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3)
      mesh.instanceColor.needsUpdate = true
      return // Skip rest of frame — let GSAP timeline start
    }

    const dummy = s.dummy
    const t = clock.getElapsedTime()

    // Tick arc lifetimes
    if (s.arcPool) tickArcs(s.arcPool, delta)

    // ── Phase: etching ──────────────────────────────────────────────────────
    if (s.phase === 'etching') {
      const revealCount = Math.floor(s.etchProgress * FRAGMENT_COUNT)

      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        const revealed = i < revealCount

        if (revealed) {
          // Subtle ambient micro-drift once placed
          const drift = 0.003
          dummy.position.set(
            s.homesTJ[i3]     + Math.sin(t * 3.1 + i * 0.7) * drift,
            s.homesTJ[i3 + 1] + Math.cos(t * 2.7 + i * 0.5) * drift,
            s.homesTJ[i3 + 2]
          )
          dummy.scale.setScalar(FRAGMENT_SIZE * (0.85 + Math.sin(t * 4 + i) * 0.15))

          // Color: fresh fragments spark white, then settle crimson
          const age = (revealCount - i) / FRAGMENT_COUNT
          const c = age > 0.05
            ? CRIMSON
            : CRIMSON_BRIGHT.clone().lerp(WHITE, 1 - age / 0.05)
          colorArray[i3]     = c.r
          colorArray[i3 + 1] = c.g
          colorArray[i3 + 2] = c.b
        } else {
          // Hidden
          dummy.scale.setScalar(0)
          dummy.position.set(s.homesTJ[i3], s.homesTJ[i3 + 1], s.homesTJ[i3 + 2])
        }

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // Fire arcs between recently revealed fragments
      if (t - s.lastArcTime > s.arcFireInterval && revealCount > 4) {
        const front = revealCount - 1
        const a = Math.max(0, front - 30)
        const idx1 = a + Math.floor(Math.random() * Math.min(30, front - a))
        const idx2 = a + Math.floor(Math.random() * Math.min(30, front - a))
        if (idx1 !== idx2) {
          const p1 = new THREE.Vector3(s.homesTJ[idx1 * 3], s.homesTJ[idx1 * 3 + 1], 0)
          const p2 = new THREE.Vector3(s.homesTJ[idx2 * 3], s.homesTJ[idx2 * 3 + 1], 0)
          fireArc(s.arcPool, p1, p2, 0.12 + Math.random() * 0.1)
        }
        s.lastArcTime = t
      }
    }

    // ── Phase: shatter ──────────────────────────────────────────────────────
    else if (s.phase === 'shatter') {
      const sp = s.shatterProgress
      // Ease: staggered by fragment index
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        // Per-fragment stagger: later fragments lag behind
        const stagger = (i / FRAGMENT_COUNT) * 0.25
        const localT = Math.max(0, Math.min(1, (sp - stagger) / (1 - stagger)))
        const ease = localT * localT * (3 - 2 * localT) // smoothstep

        const px = s.homesTJ[i3]     + (s.scatterTargets[i3]     - s.homesTJ[i3])     * ease
        const py = s.homesTJ[i3 + 1] + (s.scatterTargets[i3 + 1] - s.homesTJ[i3 + 1]) * ease
        const pz = s.homesTJ[i3 + 2] + (s.scatterTargets[i3 + 2] - s.homesTJ[i3 + 2]) * ease

        dummy.position.set(px, py, pz)
        dummy.scale.setScalar(FRAGMENT_SIZE * (1 - ease * 0.3))

        // Spin during scatter
        dummy.rotation.set(ease * Math.PI * 3 * (i % 2 ? 1 : -1), ease * Math.PI * 2, 0)

        // Color: hot white → crimson during shatter
        const heat = 1 - ease
        colorArray[i3]     = CRIMSON.r + (WHITE.r - CRIMSON.r) * heat * 0.6
        colorArray[i3 + 1] = CRIMSON.g + (WHITE.g - CRIMSON.g) * heat * 0.3
        colorArray[i3 + 2] = CRIMSON.b

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // Arc bursts during shatter — fire from TJ origin positions (correct source)
      if (sp > 0.05 && t - s.lastArcTime > 0.03) {
        const idx1 = Math.floor(Math.random() * FRAGMENT_COUNT)
        const idx2 = Math.floor(Math.random() * FRAGMENT_COUNT)
        const p1 = new THREE.Vector3(s.homesTJ[idx1 * 3], s.homesTJ[idx1 * 3 + 1], 0)
        const p2 = new THREE.Vector3(s.homesTJ[idx2 * 3], s.homesTJ[idx2 * 3 + 1], 0)
        fireArc(s.arcPool, p1, p2, 0.08 + Math.random() * 0.06)
        s.lastArcTime = t
      }
    }

    // ── Phase: reassemble ──────────────────────────────────────────────────
    else if (s.phase === 'reassemble') {
      const rp = s.reassembleProgress

      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        // Stagger: first fragments arrive early, last ones lag
        const stagger = (i / FRAGMENT_COUNT) * 0.4
        const localT = Math.max(0, Math.min(1, (rp - stagger) / (1 - stagger)))
        // Magnetic snap: slow start, fast arrival
        const ease = 1 - Math.pow(1 - localT, 3) // ease out cubic

        const px = s.scatterTargets[i3]     + (s.homesDrawer[i3]     - s.scatterTargets[i3])     * ease
        const py = s.scatterTargets[i3 + 1] + (s.homesDrawer[i3 + 1] - s.scatterTargets[i3 + 1]) * ease
        const pz = s.scatterTargets[i3 + 2] + (s.homesDrawer[i3 + 2] - s.scatterTargets[i3 + 2]) * ease

        dummy.position.set(px, py, pz)
        dummy.scale.setScalar(FRAGMENT_SIZE * (0.7 + ease * 0.3))
        dummy.rotation.set(
          (1 - ease) * Math.PI * 2,
          (1 - ease) * Math.PI * 1.5,
          0
        )

        // Color: orange-gold transit → settles crimson as it arrives
        const heat = 1 - ease
        colorArray[i3]     = CRIMSON.r + (GOLD.r - CRIMSON.r) * heat
        colorArray[i3 + 1] = CRIMSON.g + (GOLD.g - CRIMSON.g) * heat
        colorArray[i3 + 2] = CRIMSON.b + (GOLD.b - CRIMSON.b) * heat * 0.5

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // Arc sparks as fragments land
      if (rp > 0.3 && t - s.lastArcTime > 0.05) {
        const arrivedCount = Math.floor(rp * FRAGMENT_COUNT)
        if (arrivedCount > 10) {
          const idx1 = Math.floor(Math.random() * arrivedCount)
          const idx2 = Math.floor(Math.random() * arrivedCount)
          const p1 = new THREE.Vector3(s.homesDrawer[idx1 * 3], s.homesDrawer[idx1 * 3 + 1], 0)
          const p2 = new THREE.Vector3(s.homesDrawer[idx2 * 3], s.homesDrawer[idx2 * 3 + 1], 0)
          fireArc(s.arcPool, p1, p2, 0.14 + Math.random() * 0.08)
        }
        s.lastArcTime = t
      }
    }

    // ── Phase: hold ────────────────────────────────────────────────────────
    else if (s.phase === 'hold') {
      const glowPulse = s.holdGlow * (0.85 + Math.sin(t * 12) * 0.15)

      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        // Subtle breathing drift
        const drift = 0.004 * glowPulse
        dummy.position.set(
          s.homesDrawer[i3]     + Math.sin(t * 2.3 + i * 0.6) * drift,
          s.homesDrawer[i3 + 1] + Math.cos(t * 1.9 + i * 0.8) * drift,
          s.homesDrawer[i3 + 2]
        )
        dummy.scale.setScalar(FRAGMENT_SIZE * (0.9 + glowPulse * 0.1))
        dummy.rotation.set(0, 0, 0)

        // Pulse color between crimson and bright crimson
        const pulse = 0.5 + glowPulse * 0.5
        colorArray[i3]     = CRIMSON.r + (CRIMSON_BRIGHT.r - CRIMSON.r) * pulse
        colorArray[i3 + 1] = CRIMSON.g + (CRIMSON_BRIGHT.g - CRIMSON.g) * pulse
        colorArray[i3 + 2] = CRIMSON.b + (CRIMSON_BRIGHT.b - CRIMSON.b) * pulse

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }

      // Residual arcs — slower, dying down
      if (t - s.lastArcTime > s.arcFireInterval) {
        const idx1 = Math.floor(Math.random() * FRAGMENT_COUNT)
        const idx2 = Math.floor(Math.random() * FRAGMENT_COUNT)
        const p1 = new THREE.Vector3(s.homesDrawer[idx1 * 3], s.homesDrawer[idx1 * 3 + 1], 0)
        const p2 = new THREE.Vector3(s.homesDrawer[idx2 * 3], s.homesDrawer[idx2 * 3 + 1], 0)
        fireArc(s.arcPool, p1, p2, 0.1 + Math.random() * 0.12)
        s.lastArcTime = t
      }
    }

    // ── Phase: done ────────────────────────────────────────────────────────
    else if (s.phase === 'done') {
      // Fragments drift outward and fade — not an explosion, a release
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        // Slowly expand from DRAWER positions outward
        const drift = 1 + (t - (s._doneStartTime || t)) * 0.4
        if (!s._doneStartTime) s._doneStartTime = t

        dummy.position.set(
          s.homesDrawer[i3]     * drift,
          s.homesDrawer[i3 + 1] * drift,
          s.homesDrawer[i3 + 2]
        )
        const fade = Math.max(0, 1 - (drift - 1) * 1.5)
        dummy.scale.setScalar(FRAGMENT_SIZE * fade)

        // Fade to transparent
        colorArray[i3]     = CRIMSON.r * fade
        colorArray[i3 + 1] = CRIMSON.g * fade
        colorArray[i3 + 2] = CRIMSON.b * fade

        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }

    // Mark buffers dirty
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      {/* Fragment instanced mesh */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[null, null, FRAGMENT_COUNT]}
        frustumCulled={false}
      >
        {/* Tetrahedron for crystal-like fragment silhouette */}
        <tetrahedronGeometry args={[FRAGMENT_SIZE, 0]} />
        <meshBasicMaterial
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}
