/**
 * electricArcSystem.js
 *
 * Creates and manages a pool of reusable Three.js Line objects that simulate
 * electric arcs between fragment positions. Arcs are short-lived, jittered,
 * and spawned/expired via an update tick.
 *
 * Designed to be used inside an R3F useFrame loop.
 */

import * as THREE from 'three'

const ARC_LIFETIME_MIN = 0.04  // seconds
const ARC_LIFETIME_MAX = 0.14
const ARC_SEGMENTS = 6         // midpoint jitters per arc
const ARC_JITTER = 0.12        // world units of random displacement

/**
 * createArcSystem
 *
 * @param {THREE.Scene | THREE.Group} parent   - Scene or group to add arcs to
 * @param {number}                   poolSize  - Max concurrent arcs (keep ≤120 for perf)
 * @param {THREE.Color}              color     - Arc colour (crimson)
 *
 * @returns {{ update, spawn, dispose }}
 */
export function createArcSystem(parent, poolSize = 80, color = new THREE.Color(0xdc143c)) {
  const pool = []

  // Build a pool of reusable Line objects with pre-allocated geometry
  for (let i = 0; i < poolSize; i++) {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array((ARC_SEGMENTS + 2) * 3) // start + N jitters + end
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const line = new THREE.Line(geometry, material)
    line.frustumCulled = false
    line.visible = false
    parent.add(line)

    pool.push({
      line,
      active: false,
      lifetime: 0,
      maxLifetime: 0,
      fromPos: new THREE.Vector3(),
      toPos: new THREE.Vector3(),
    })
  }

  /**
   * spawn
   * Activates a pooled arc between two world positions.
   *
   * @param {THREE.Vector3} from
   * @param {THREE.Vector3} to
   * @param {number}        intensityMult  - 1.0 = normal, higher = brighter
   */
  function spawn(from, to, intensityMult = 1.0) {
    // Find an inactive slot
    const slot = pool.find(s => !s.active)
    if (!slot) return // Pool exhausted — drop this arc

    slot.active = true
    slot.lifetime = 0
    slot.maxLifetime = ARC_LIFETIME_MIN + Math.random() * (ARC_LIFETIME_MAX - ARC_LIFETIME_MIN)
    slot.fromPos.copy(from)
    slot.toPos.copy(to)
    slot.line.visible = true
    slot.line.material.opacity = Math.min(1.0, (0.6 + Math.random() * 0.4) * intensityMult)

    _rebuildArcGeometry(slot)
  }

  function _rebuildArcGeometry(slot) {
    const positions = slot.line.geometry.attributes.position.array
    const totalPoints = ARC_SEGMENTS + 2

    const from = slot.fromPos
    const to = slot.toPos

    // Start
    positions[0] = from.x
    positions[1] = from.y
    positions[2] = from.z

    // Jittered midpoints
    for (let j = 1; j <= ARC_SEGMENTS; j++) {
      const t = j / (ARC_SEGMENTS + 1)
      const lx = from.x + (to.x - from.x) * t
      const ly = from.y + (to.y - from.y) * t
      const lz = from.z + (to.z - from.z) * t

      positions[j * 3 + 0] = lx + (Math.random() - 0.5) * ARC_JITTER
      positions[j * 3 + 1] = ly + (Math.random() - 0.5) * ARC_JITTER
      positions[j * 3 + 2] = lz + (Math.random() - 0.5) * ARC_JITTER
    }

    // End
    const lastIdx = totalPoints - 1
    positions[lastIdx * 3 + 0] = to.x
    positions[lastIdx * 3 + 1] = to.y
    positions[lastIdx * 3 + 2] = to.z

    slot.line.geometry.attributes.position.needsUpdate = true
    slot.line.geometry.setDrawRange(0, totalPoints)
  }

  /**
   * update
   * Must be called every frame from useFrame with delta time.
   * Re-jitters active arcs and expires them when lifetime ends.
   *
   * @param {number} delta - seconds since last frame
   */
  function update(delta) {
    for (const slot of pool) {
      if (!slot.active) continue

      slot.lifetime += delta
      const progress = slot.lifetime / slot.maxLifetime

      if (progress >= 1.0) {
        // Expire
        slot.active = false
        slot.line.visible = false
        slot.line.material.opacity = 0
        continue
      }

      // Fade out in last 40% of lifetime
      if (progress > 0.6) {
        slot.line.material.opacity *= 1.0 - (progress - 0.6) / 0.4
      }

      // Re-jitter midpoints every frame for crackling look
      _rebuildArcGeometry(slot)
    }
  }

  /**
   * dispose
   * Clean up all Three.js resources.
   */
  function dispose() {
    for (const slot of pool) {
      slot.line.geometry.dispose()
      slot.line.material.dispose()
      parent.remove(slot.line)
    }
    pool.length = 0
  }

  return { update, spawn, dispose }
}
