/**
 * OpeningSequence.jsx
 *
 * Renders inside HelixScene's R3F Canvas.
 * Manages all fragment geometry, electric arc system, and the full animation timeline:
 *
 * Phase 0 — IDLE           Black screen, 0.5s pause
 * Phase 1 — ETCH           TJ fragments appear progressively (laser etch)
 * Phase 2 — HOLD_TJ        TJ crackles with residual electricity
 * Phase 3 — SHATTER        Fragments scatter with velocity + gravity
 * Phase 4 — REASSEMBLE     Fragments magnetise into DRAWER positions
 * Phase 5 — GLOW_HOLD      DRAWER glows + arcs slowly die
 * Phase 6 — DONE           Fires onComplete callback → helix transition
 *
 * Props:
 *   onComplete   {function}  — Called when opening sequence finishes
 *   arcSystemRef {React.MutableRefObject} — Ref to arc system (populated async by ArcSystemManager)
 *                              Read .current inside useFrame, not at render time.
 */

import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleLetterPositions } from '../utils/letterSampler'

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAGMENT_COUNT        = 1200
const MOBILE_FRAGMENT_COUNT = 600
const CRIMSON               = new THREE.Color(0xdc143c)

const T_IDLE       = 0.5
const T_ETCH       = 2.8
const T_HOLD_TJ    = 1.2
const T_SHATTER    = 1.0
const T_REASSEMBLE = 1.8
const T_GLOW_HOLD  = 1.5

const ARC_RATE_ETCH       = 14
const ARC_RATE_HOLD_TJ    = 8
const ARC_RATE_SHATTER    = 20
const ARC_RATE_REASSEMBLE = 12
const ARC_RATE_GLOW_HOLD  = 4

const SCATTER_SPEED_MIN = 0.8
const SCATTER_SPEED_MAX = 3.2
const GRAVITY           = -0.4
const PULL_EASE         = 4.5

const PHASE = {
  IDLE:       0,
  ETCH:       1,
  HOLD_TJ:    2,
  SHATTER:    3,
  REASSEMBLE: 4,
  GLOW_HOLD:  5,
  DONE:       6,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpeningSequence({ onComplete, arcSystemRef }) {
  const { size } = useThree()

  const isMobile      = size.width < 768
  const fragmentCount = isMobile ? MOBILE_FRAGMENT_COUNT : FRAGMENT_COUNT

  // ── Sampled letter positions ──────────────────────────────────────────────
  const { tjPositions, drawerPositions } = useMemo(() => {
    const canvasW = 1024
    const canvasH = 256

    const rawTJ = sampleLetterPositions('TJ',     canvasW, canvasH, 180, fragmentCount, 0.1)
    const rawDR = sampleLetterPositions('DRAWER', canvasW, canvasH, 140, fragmentCount, 0.1)

    const pad = (arr) => {
      if (arr.length >= fragmentCount * 3) return arr.slice(0, fragmentCount * 3)
      const out = new Float32Array(fragmentCount * 3)
      out.set(arr)
      return out
    }

    return {
      tjPositions:     pad(rawTJ),
      drawerPositions: pad(rawDR),
    }
  }, [fragmentCount])

  // ── Refs ──────────────────────────────────────────────────────────────────
  const meshRef      = useRef()
  const materialRef  = useRef()
  const fragState    = useRef(null)
  const arcAccum     = useRef(0)
  const phase        = useRef(PHASE.IDLE)
  const phaseTime    = useRef(0)
  const etchReveal   = useRef(0)
  const completed    = useRef(false)
  const idleTimerRef = useRef(null)

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const _va   = useMemo(() => new THREE.Vector3(), [])
  const _vb   = useMemo(() => new THREE.Vector3(), [])

  // ── Geometry & material ───────────────────────────────────────────────────
  const geometry = useMemo(() => new THREE.BoxGeometry(0.018, 0.018, 0.004), [])

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color:       CRIMSON,
    transparent: true,
    opacity:     0,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), [])

  useEffect(() => { materialRef.current = material }, [material])

  // ── Init per-fragment state ───────────────────────────────────────────────
  useEffect(() => {
    const n = fragmentCount

    fragState.current = {
      px:        new Float32Array(n),
      py:        new Float32Array(n),
      pz:        new Float32Array(n),
      vx:        new Float32Array(n),
      vy:        new Float32Array(n),
      vz:        new Float32Array(n),
      opacity:   new Float32Array(n),
      etchOrder: new Uint16Array(n),
      revealed:  new Uint8Array(n),
      pullDelay: new Float32Array(n),
    }

    // Randomise etch reveal order (Fisher-Yates)
    const order = Array.from({ length: n }, (_, i) => i)
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    fragState.current.etchOrder.set(order)

    for (let i = 0; i < n; i++) {
      fragState.current.pullDelay[i] = Math.random() * 0.6
    }

    for (let i = 0; i < n; i++) {
      fragState.current.px[i] = tjPositions[i * 3 + 0]
      fragState.current.py[i] = tjPositions[i * 3 + 1]
      fragState.current.pz[i] = tjPositions[i * 3 + 2]
    }

    if (meshRef.current) {
      const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0)
      for (let i = 0; i < n; i++) {
        meshRef.current.setMatrixAt(i, zeroMatrix)
      }
      meshRef.current.instanceMatrix.needsUpdate = true
    }

    idleTimerRef.current = setTimeout(() => {
      phase.current      = PHASE.ETCH
      phaseTime.current  = 0
      etchReveal.current = 0
    }, T_IDLE * 1000)

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      geometry.dispose()
      material.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentCount])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const spawnRandomArcs = useCallback((count, intensityMult) => {
    // Read .current here — guaranteed populated by the time arcs are needed
    const sys = arcSystemRef?.current
    if (!sys || !fragState.current) return

    const fs    = fragState.current
    const total = fragmentCount

    for (let a = 0; a < count; a++) {
      let idxA = -1, idxB = -1, att = 0

      while (att++ < 20 && idxA < 0) {
        const r = Math.floor(Math.random() * total)
        if (fs.revealed[r] === 1) idxA = r
      }
      att = 0
      while (att++ < 20 && idxB < 0) {
        const r = Math.floor(Math.random() * total)
        if (fs.revealed[r] === 1 && r !== idxA) idxB = r
      }

      if (idxA < 0 || idxB < 0) continue

      _va.set(fs.px[idxA], fs.py[idxA], fs.pz[idxA])
      _vb.set(fs.px[idxB], fs.py[idxB], fs.pz[idxB])

      if (_va.distanceTo(_vb) < 0.8) {
        sys.spawn(_va, _vb, intensityMult)
      }
    }
  }, [arcSystemRef, fragmentCount, _va, _vb])

  const startShatter = useCallback(() => {
    if (!fragState.current) return
    phase.current     = PHASE.SHATTER
    phaseTime.current = 0

    for (let i = 0; i < fragmentCount; i++) {
      const angle     = Math.random() * Math.PI * 2
      const elevation = (Math.random() - 0.5) * Math.PI
      const speed     = SCATTER_SPEED_MIN + Math.random() * (SCATTER_SPEED_MAX - SCATTER_SPEED_MIN)
      fragState.current.vx[i] = Math.cos(angle) * Math.cos(elevation) * speed
      fragState.current.vy[i] = Math.sin(elevation) * speed
      fragState.current.vz[i] = Math.sin(angle) * Math.cos(elevation) * speed * 0.4
    }
  }, [fragmentCount])

  const startReassemble = useCallback(() => {
    phase.current     = PHASE.REASSEMBLE
    phaseTime.current = 0
  }, [])

  // ── Frame loop ────────────────────────────────────────────────────────────

  useFrame((_, delta) => {
    if (!fragState.current || !meshRef.current || completed.current) return

    const fs  = fragState.current
    const n   = fragmentCount
    const t   = phaseTime.current
    const mat = materialRef.current
    phaseTime.current += delta

    let arcRate      = 0
    let arcIntensity = 1.0

    switch (phase.current) {

      case PHASE.ETCH: {
        const progress     = Math.min(t / T_ETCH, 1.0)
        const targetReveal = Math.floor(progress * n)

        for (let r = etchReveal.current; r < targetReveal; r++) {
          const idx = fs.etchOrder[r]
          fs.revealed[idx] = 1
          fs.opacity[idx]  = 1.0
        }
        etchReveal.current = targetReveal

        for (let i = 0; i < n; i++) {
          if (fs.revealed[i] === 1) {
            dummy.position.set(fs.px[i], fs.py[i], fs.pz[i])
            dummy.rotation.set(
              (Math.random() - 0.5) * 0.2,
              (Math.random() - 0.5) * 0.2,
              (Math.random() - 0.5) * 0.2
            )
            dummy.scale.setScalar(1)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
          }
        }

        if (mat) mat.opacity = 1.0
        arcRate      = ARC_RATE_ETCH
        arcIntensity = 0.8

        if (progress >= 1.0) {
          for (let i = 0; i < n; i++) fs.revealed[i] = 1
          phase.current     = PHASE.HOLD_TJ
          phaseTime.current = 0
        }
        break
      }

      case PHASE.HOLD_TJ: {
        arcRate      = ARC_RATE_HOLD_TJ
        arcIntensity = 0.6
        if (t >= T_HOLD_TJ) startShatter()
        break
      }

      case PHASE.SHATTER: {
        arcRate              = ARC_RATE_SHATTER
        arcIntensity         = 1.2
        const flightProgress = Math.min(t / T_SHATTER, 1.0)

        for (let i = 0; i < n; i++) {
          fs.px[i] += fs.vx[i] * delta
          fs.py[i] += (fs.vy[i] + GRAVITY * flightProgress) * delta
          fs.pz[i] += fs.vz[i] * delta

          dummy.position.set(fs.px[i], fs.py[i], fs.pz[i])
          const spin = delta * 4
          dummy.rotation.x += (Math.random() - 0.5) * spin
          dummy.rotation.y += (Math.random() - 0.5) * spin
          dummy.scale.setScalar(1)
          dummy.updateMatrix()
          meshRef.current.setMatrixAt(i, dummy.matrix)
        }

        if (flightProgress >= 1.0) startReassemble()
        break
      }

      case PHASE.REASSEMBLE: {
        arcRate      = ARC_RATE_REASSEMBLE
        arcIntensity = 1.0
        let allLocked = true

        for (let i = 0; i < n; i++) {
          const delay    = fs.pullDelay[i]
          const localT   = Math.max(0, t - delay)
          const localDur = T_REASSEMBLE - delay
          const p        = localDur > 0 ? Math.min(localT / localDur, 1.0) : 1.0
          const ease     = 1.0 - Math.pow(1.0 - p, PULL_EASE)

          const tx = drawerPositions[i * 3 + 0]
          const ty = drawerPositions[i * 3 + 1]
          const tz = drawerPositions[i * 3 + 2]

          fs.px[i] += (tx - fs.px[i]) * ease * delta * 6
          fs.py[i] += (ty - fs.py[i]) * ease * delta * 6
          fs.pz[i] += (tz - fs.pz[i]) * ease * delta * 6

          dummy.position.set(fs.px[i], fs.py[i], fs.pz[i])
          dummy.rotation.set(0, 0, 0)
          dummy.scale.setScalar(1)
          dummy.updateMatrix()
          meshRef.current.setMatrixAt(i, dummy.matrix)

          if (p < 0.98) allLocked = false
        }

        if (allLocked || t >= T_REASSEMBLE + 0.3) {
          for (let i = 0; i < n; i++) {
            fs.px[i] = drawerPositions[i * 3 + 0]
            fs.py[i] = drawerPositions[i * 3 + 1]
            fs.pz[i] = drawerPositions[i * 3 + 2]
            dummy.position.set(fs.px[i], fs.py[i], fs.pz[i])
            dummy.rotation.set(0, 0, 0)
            dummy.scale.setScalar(1)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
          }
          phase.current     = PHASE.GLOW_HOLD
          phaseTime.current = 0
        }
        break
      }

      case PHASE.GLOW_HOLD: {
        const fadeRatio  = Math.max(0, 1.0 - t / T_GLOW_HOLD)
        arcRate          = ARC_RATE_GLOW_HOLD * fadeRatio
        arcIntensity     = 0.5 * fadeRatio
        if (mat) mat.opacity = 0.85 + 0.15 * Math.sin(t * 6)

        if (t >= T_GLOW_HOLD) {
          phase.current     = PHASE.DONE
          completed.current = true
          if (onComplete) onComplete()
        }
        break
      }

      default:
        break
    }

    // Arc spawning
    if (arcRate > 0) {
      arcAccum.current += arcRate * delta
      const toSpawn = Math.floor(arcAccum.current)
      if (toSpawn > 0) {
        arcAccum.current -= toSpawn
        spawnRandomArcs(toSpawn, arcIntensity)
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, fragmentCount]}
      frustumCulled={false}
    />
  )
}
