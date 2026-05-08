import { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Config
const PARTICLE_COUNT = 280
const ATTRACTION_RADIUS = 140   // px radius around cursor where attraction kicks in
const ATTRACTION_STRENGTH = 0.018
const REPEL_STRENGTH = 3.2      // impulse on click
const REPEL_RADIUS = 120        // px radius of click repel
const DRIFT_SPEED = 0.012       // base ambient drift
const RETURN_STRENGTH = 0.004   // pull back toward home position
const DAMPING = 0.97

// Shared mouse state — updated outside React to avoid re-renders
const mouse = { x: 0, y: 0 }
const clickEvents = [] // { x, y, time }

function trackMouse(e) {
  mouse.x = e.clientX
  mouse.y = e.clientY
}

function trackClick(e) {
  clickEvents.push({ x: e.clientX, y: e.clientY, time: performance.now() })
  // Keep buffer small
  if (clickEvents.length > 10) clickEvents.shift()
}

// Convert screen px to Three.js world units given the camera+viewport
function screenToWorld(screenX, screenY, viewportW, viewportH, camera) {
  // Normalized device coordinates
  const ndcX = (screenX / viewportW) * 2 - 1
  const ndcY = -(screenY / viewportH) * 2 + 1
  const vec = new THREE.Vector3(ndcX, ndcY, 0)
  vec.unproject(camera)
  return vec
}

function Particles() {
  const { size, camera, viewport } = useThree()
  const meshRef = useRef()
  const processedClicks = useRef(new Set())

  // Home positions + velocities — stored in flat arrays, never touch React state
  const homePos = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random spread across viewport, slightly beyond edges so they drift in
      const spread = 1.1
      arr[i * 3 + 0] = (Math.random() - 0.5) * viewport.width * spread
      arr[i * 3 + 1] = (Math.random() - 0.5) * viewport.height * spread
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5
    }
    return arr
  }, [viewport.width, viewport.height])

  const vel = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])

  // Drift phase offsets for ambient oscillation
  const phase = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) arr[i] = Math.random() * Math.PI * 2
    return arr
  }, [])

  // Build BufferGeometry with positions matching homePos
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(homePos) // copy
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [homePos])

  // Material — small glowing points
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      color: new THREE.Color('#dc143c'),
      size: 0.018,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const positions = meshRef.current.geometry.attributes.position.array
    const t = state.clock.elapsedTime

    // Convert mouse to world coords
    const mouseWorld = screenToWorld(mouse.x, mouse.y, size.width, size.height, camera)

    // Process pending click events
    const now = performance.now()
    for (const ev of clickEvents) {
      const evKey = `${ev.x}-${ev.y}-${ev.time}`
      if (!processedClicks.current.has(evKey) && now - ev.time < 100) {
        processedClicks.current.add(evKey)
        const clickWorld = screenToWorld(ev.x, ev.y, size.width, size.height, camera)

        // Apply repel impulse to nearby particles
        const repelRadiusWorld = (REPEL_RADIUS / size.width) * viewport.width

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const ix = i * 3
          const dx = positions[ix] - clickWorld.x
          const dy = positions[ix + 1] - clickWorld.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < repelRadiusWorld && dist > 0.001) {
            const force = (1 - dist / repelRadiusWorld) * REPEL_STRENGTH
            vel[ix] += (dx / dist) * force
            vel[ix + 1] += (dy / dist) * force
            vel[ix + 2] += (Math.random() - 0.5) * force * 0.3
          }
        }
      }
    }

    // Clean processed clicks older than 200ms
    processedClicks.current = new Set(
      [...processedClicks.current].filter((k) => {
        const time = parseFloat(k.split('-')[2])
        return now - time < 200
      })
    )

    const attractRadiusWorld = (ATTRACTION_RADIUS / size.width) * viewport.width

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3

      // Ambient drift — slow sinusoidal wander
      const driftX = Math.sin(t * DRIFT_SPEED * 0.7 + phase[i]) * 0.0008
      const driftY = Math.cos(t * DRIFT_SPEED + phase[i] * 1.3) * 0.0006

      // Return force toward home position
      const hx = homePos[ix]
      const hy = homePos[ix + 1]
      const hz = homePos[ix + 2]
      vel[ix] += (hx - positions[ix]) * RETURN_STRENGTH + driftX
      vel[ix + 1] += (hy - positions[ix + 1]) * RETURN_STRENGTH + driftY
      vel[ix + 2] += (hz - positions[ix + 2]) * RETURN_STRENGTH * 0.5

      // Cursor attraction
      const dx = mouseWorld.x - positions[ix]
      const dy = mouseWorld.y - positions[ix + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < attractRadiusWorld && dist > 0.01) {
        const falloff = 1 - dist / attractRadiusWorld
        const force = falloff * falloff * ATTRACTION_STRENGTH
        vel[ix] += (dx / dist) * force
        vel[ix + 1] += (dy / dist) * force
      }

      // Damping
      vel[ix] *= DAMPING
      vel[ix + 1] *= DAMPING
      vel[ix + 2] *= DAMPING

      // Integrate
      positions[ix] += vel[ix]
      positions[ix + 1] += vel[ix + 1]
      positions[ix + 2] += vel[ix + 2]
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return <points ref={meshRef} geometry={geometry} material={material} />
}

export default function ParticleField() {
  useEffect(() => {
    window.addEventListener('mousemove', trackMouse, { passive: true })
    window.addEventListener('click', trackClick)
    return () => {
      window.removeEventListener('mousemove', trackMouse)
      window.removeEventListener('click', trackClick)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75, near: 0.01, far: 100 }}
        gl={{
          antialias: false, // not needed for points
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]} // cap DPR — particles don't need 2x
        style={{ background: 'transparent' }}
        frameloop="always"
      >
        <Particles />
      </Canvas>
    </div>
  )
}
