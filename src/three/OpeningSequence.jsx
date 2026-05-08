// src/three/OpeningSequence.jsx
// S4a — black → TJ etch → shatter → DRAWER reassemble → hold → clear → onComplete
//
// Fixes in this version:
//   - Arcs removed entirely
//   - Fragment color: white core + crimson (matches cursor)
//   - Fragment size corrected for camera fov=60 z=8
//   - Letter scale corrected — fills screen properly
//   - Done phase: fast scale-to-zero so transition is visible

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'

// ─── Constants ────────────────────────────────────────────────────────────────
// Camera z=8, fov=60 → visible height ≈ 9.24 units, width ≈ 16.4 units
// TJ should fill ~35% of screen width → ~5.7 units
// DRAWER should fill ~70% of screen width → ~11 units

const FRAGMENT_COUNT  = typeof window !== 'undefined' && window.innerWidth < 768 ? 500 : 1200
const FRAGMENT_SIZE   = 0.06
const TJ_SCALE_X      = 5.5
const TJ_SCALE_Y      = 2.8
const DRAWER_SCALE_X  = 10.5
const DRAWER_SCALE_Y  = 2.4

// White core + crimson glow — same aesthetic as the cursor
const WHITE          = new THREE.Color('#ffffff')
const CRIMSON        = new THREE.Color('#dc143c')
const CRIMSON_BRIGHT = new THREE.Color('#ff2050')

// ─── Letter sampler ───────────────────────────────────────────────────────────

function sampleLetterPositions(text, targetCount, scaleX, scaleY) {
  const W = 512, H = 200
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  const fontSize = Math.floor(H * 0.78)
  ctx.font = `900 ${fontSize}px 'Arial Black', 'Impact', sans-serif`
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, H / 2)

  const pixels = ctx.getImageData(0, 0, W, H).data
  const lit = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pixels[(y * W + x) * 4] > 128) lit.push({ x, y })
    }
  }

  // Shuffle for organic reveal order
  for (let i = lit.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lit[i], lit[j]] = [lit[j], lit[i]]
  }

  const step = Math.max(1, Math.floor(lit.length / targetCount))
  const positions = []
  for (let i = 0; i < lit.length && positions.length < targetCount; i += step) {
    const { x, y } = lit[i]
    positions.push(new THREE.Vector3(
      ((x / W) - 0.5) * scaleX,
      -((y / H) - 0.5) * scaleY,
      0
    ))
  }
  return positions
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpeningSequence({ onComplete }) {
  const meshRef = useRef()

  const state = useRef({
    phase: 'idle',
    homesTJ:      null,
    homesDrawer:  null,
    scatter:      null,
    etchProgress: 0,
    shatterProgress: 0,
    reassembleProgress: 0,
    holdProgress: 0,
    doneProgress: 0,
    needsInit: false,
    dummy: new THREE.Object3D(),
  })

  const colorArray = useMemo(() => new Float32Array(FRAGMENT_COUNT * 3), [])

  useEffect(() => {
    const s = state.current
    const half = Math.floor(FRAGMENT_COUNT / 2)

    const tjRaw     = sampleLetterPositions('TJ',     half,            TJ_SCALE_X,     TJ_SCALE_Y)
    const drawerRaw = sampleLetterPositions('DRAWER', FRAGMENT_COUNT - half, DRAWER_SCALE_X, DRAWER_SCALE_Y)

    // Pad to FRAGMENT_COUNT by repeating
    s.homesTJ     = new Float32Array(FRAGMENT_COUNT * 3)
    s.homesDrawer = new Float32Array(FRAGMENT_COUNT * 3)
    s.scatter     = new Float32Array(FRAGMENT_COUNT * 3)

    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const tj  = tjRaw[i % tjRaw.length]
      const dr  = drawerRaw[i % drawerRaw.length]
      const i3  = i * 3

      s.homesTJ[i3]     = tj.x
      s.homesTJ[i3 + 1] = tj.y
      s.homesTJ[i3 + 2] = 0

      s.homesDrawer[i3]     = dr.x
      s.homesDrawer[i3 + 1] = dr.y
      s.homesDrawer[i3 + 2] = 0

      // Scatter: outward burst, moderate radius so reassemble reads clearly
      const angle     = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.5) * Math.PI * 0.6
      const radius    = 4 + Math.random() * 5
      s.scatter[i3]     = Math.cos(angle) * Math.cos(elevation) * radius
      s.scatter[i3 + 1] = Math.sin(elevation) * radius
      s.scatter[i3 + 2] = (Math.random() - 0.5) * 1.5
    }

    // Initial colors — crimson
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      colorArray[i * 3]     = CRIMSON.r
      colorArray[i * 3 + 1] = CRIMSON.g
      colorArray[i * 3 + 2] = CRIMSON.b
    }

    s.needsInit = true

    // ── GSAP timeline ─────────────────────────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.6 })

    // Phase 1: TJ etch — 2.5s
    tl.to(s, {
      etchProgress: 1,
      duration: 2.5,
      ease: 'power1.inOut',
      onStart: () => { s.phase = 'etching' },
    })

    // Hold TJ formed — 1s
    tl.to(s, { holdProgress: 1, duration: 0.3, ease: 'power2.out' })
    tl.to(s, { holdProgress: 0.5, duration: 0.7, ease: 'power1.out' })

    // Phase 2: Shatter — 0.5s
    tl.to(s, {
      shatterProgress: 1,
      duration: 0.5,
      ease: 'power3.in',
      onStart: () => { s.phase = 'shatter' },
    })

    // Chaos hold — 0.35s
    tl.to(s, { duration: 0.35 })

    // Phase 3: Reassemble into DRAWER — 1.8s
    tl.to(s, {
      reassembleProgress: 1,
      duration: 1.8,
      ease: 'power2.inOut',
      onStart: () => { s.phase = 'reassemble' },
    })

    // Hold DRAWER — 1.5s with glow pulse
    tl.to(s, { holdProgress: 1, duration: 0.4, ease: 'power2.out',
      onStart: () => { s.phase = 'hold' },
    })
    tl.to(s, { holdProgress: 0, duration: 1.1, ease: 'power2.in' })

    // Phase 4: Clear — fast scale to zero, then fire onComplete
    tl.to(s, {
      doneProgress: 1,
      duration: 0.6,
      ease: 'power2.in',
      onStart: () => { s.phase = 'done' },
      onComplete: () => { if (onComplete) onComplete() },
    })

    return () => { tl.kill() }
  }, []) // eslint-disable-line

  useFrame(({ clock }) => {
    const s     = state.current
    const mesh  = meshRef.current
    if (!mesh || !s.homesTJ) return

    // First-frame init — mesh ref now committed
    if (s.needsInit) {
      s.needsInit = false
      const d = s.dummy
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        d.position.set(s.homesTJ[i*3], s.homesTJ[i*3+1], 0)
        d.scale.setScalar(0)
        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3)
      mesh.instanceColor.needsUpdate = true
      return
    }

    const d = s.dummy
    const t = clock.getElapsedTime()

    // ── etching ───────────────────────────────────────────────────────────────
    if (s.phase === 'etching') {
      const reveal = Math.floor(s.etchProgress * FRAGMENT_COUNT)

      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        if (i < reveal) {
          // Micro-drift once placed
          d.position.set(
            s.homesTJ[i3]     + Math.sin(t * 3 + i * 0.7) * 0.003,
            s.homesTJ[i3 + 1] + Math.cos(t * 2.5 + i * 0.5) * 0.003,
            0
          )
          d.scale.setScalar(FRAGMENT_SIZE)

          // Newest fragments: white. Settled fragments: crimson.
          const freshness = Math.max(0, 1 - (reveal - i) / 60)
          colorArray[i3]     = CRIMSON.r + (WHITE.r - CRIMSON.r) * freshness
          colorArray[i3 + 1] = CRIMSON.g + (WHITE.g - CRIMSON.g) * freshness
          colorArray[i3 + 2] = CRIMSON.b + (WHITE.b - CRIMSON.b) * freshness
        } else {
          d.position.set(s.homesTJ[i3], s.homesTJ[i3+1], 0)
          d.scale.setScalar(0)
        }
        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
    }

    // ── shatter ───────────────────────────────────────────────────────────────
    else if (s.phase === 'shatter') {
      const sp = s.shatterProgress
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3  = i * 3
        const lag = (i / FRAGMENT_COUNT) * 0.2
        const lt  = Math.max(0, Math.min(1, (sp - lag) / (1 - lag)))
        const e   = lt * lt * (3 - 2 * lt) // smoothstep

        d.position.set(
          s.homesTJ[i3]     + (s.scatter[i3]     - s.homesTJ[i3])     * e,
          s.homesTJ[i3 + 1] + (s.scatter[i3 + 1] - s.homesTJ[i3 + 1]) * e,
          s.scatter[i3 + 2] * e
        )
        d.scale.setScalar(FRAGMENT_SIZE * (1 - e * 0.4))
        d.rotation.set(e * Math.PI * 2 * (i % 2 ? 1 : -1), e * Math.PI * 3, 0)

        // Flash white on explosion
        const flash = 1 - e
        colorArray[i3]     = CRIMSON.r + (WHITE.r - CRIMSON.r) * flash * 0.7
        colorArray[i3 + 1] = CRIMSON.g + (WHITE.g - CRIMSON.g) * flash * 0.4
        colorArray[i3 + 2] = CRIMSON.b

        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
    }

    // ── reassemble ────────────────────────────────────────────────────────────
    else if (s.phase === 'reassemble') {
      const rp = s.reassembleProgress
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3  = i * 3
        const lag = (i / FRAGMENT_COUNT) * 0.35
        const lt  = Math.max(0, Math.min(1, (rp - lag) / (1 - lag)))
        const e   = 1 - Math.pow(1 - lt, 3) // ease out cubic — magnetic snap

        d.position.set(
          s.scatter[i3]     + (s.homesDrawer[i3]     - s.scatter[i3])     * e,
          s.scatter[i3 + 1] + (s.homesDrawer[i3 + 1] - s.scatter[i3 + 1]) * e,
          s.scatter[i3 + 2] * (1 - e)
        )
        d.scale.setScalar(FRAGMENT_SIZE * (0.6 + e * 0.4))
        d.rotation.set((1 - e) * Math.PI, (1 - e) * Math.PI * 1.5, 0)

        // Transit: white flash as it snaps in, then crimson
        const snap = Math.max(0, 1 - (e - 0.8) / 0.2) * (e > 0.8 ? 1 : 0)
        colorArray[i3]     = CRIMSON.r + (WHITE.r - CRIMSON.r) * snap * 0.8
        colorArray[i3 + 1] = CRIMSON.g + (WHITE.g - CRIMSON.g) * snap * 0.5
        colorArray[i3 + 2] = CRIMSON.b + (WHITE.b - CRIMSON.b) * snap * 0.3

        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
    }

    // ── hold ──────────────────────────────────────────────────────────────────
    else if (s.phase === 'hold') {
      const glow = s.holdProgress * (0.8 + Math.sin(t * 10) * 0.2)

      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3 = i * 3
        d.position.set(
          s.homesDrawer[i3]     + Math.sin(t * 2 + i * 0.6) * 0.003 * glow,
          s.homesDrawer[i3 + 1] + Math.cos(t * 1.7 + i * 0.8) * 0.003 * glow,
          0
        )
        d.scale.setScalar(FRAGMENT_SIZE)
        d.rotation.set(0, 0, 0)

        // Pulse between crimson and white+crimson
        colorArray[i3]     = CRIMSON.r + (WHITE.r - CRIMSON.r) * glow * 0.5
        colorArray[i3 + 1] = CRIMSON.g + (WHITE.g - CRIMSON.g) * glow * 0.3
        colorArray[i3 + 2] = CRIMSON.b + (WHITE.b - CRIMSON.b) * glow * 0.2

        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
    }

    // ── done — scale to zero fast, screen clears ──────────────────────────────
    else if (s.phase === 'done') {
      const dp = s.doneProgress
      // Staggered scale-out: first fragments disappear first
      for (let i = 0; i < FRAGMENT_COUNT; i++) {
        const i3  = i * 3
        const lag = (i / FRAGMENT_COUNT) * 0.4
        const lt  = Math.max(0, Math.min(1, (dp - lag) / (1 - lag)))

        d.position.set(s.homesDrawer[i3], s.homesDrawer[i3+1], 0)
        d.scale.setScalar(FRAGMENT_SIZE * (1 - lt))

        colorArray[i3]     = CRIMSON.r
        colorArray[i3 + 1] = CRIMSON.g
        colorArray[i3 + 2] = CRIMSON.b

        d.updateMatrix()
        mesh.setMatrixAt(i, d.matrix)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, FRAGMENT_COUNT]}
      frustumCulled={false}
    >
      <tetrahedronGeometry args={[FRAGMENT_SIZE, 0]} />
      <meshBasicMaterial
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
