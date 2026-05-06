import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'
import { WEEKS } from '@data/weeks'
import { useStore } from '@hooks/useStore'

const HELIX_RADIUS = 3
const HELIX_HEIGHT = 2.2      // vertical gap between weeks
const HELIX_TURNS = 2.2        // total helix turns

// Generate helix point for a given index (0-10)
function helixPoint(i, total = 11) {
  const t = i / (total - 1)
  const angle = t * Math.PI * 2 * HELIX_TURNS
  const y = (t - 0.5) * HELIX_HEIGHT * (total - 1)
  return {
    x: Math.cos(angle) * HELIX_RADIUS,
    y,
    z: Math.sin(angle) * HELIX_RADIUS,
    angle,
  }
}

// The double helix backbone tubes
function HelixBackbone() {
  const points1 = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const angle = t * Math.PI * 2 * HELIX_TURNS
      const y = (t - 0.5) * HELIX_HEIGHT * 10
      pts.push(new THREE.Vector3(
        Math.cos(angle) * HELIX_RADIUS,
        y,
        Math.sin(angle) * HELIX_RADIUS
      ))
    }
    return pts
  }, [])

  const points2 = useMemo(() => {
    return points1.map(p => new THREE.Vector3(-p.x, p.y, -p.z))
  }, [points1])

  const curve1 = useMemo(() => new THREE.CatmullRomCurve3(points1), [points1])
  const curve2 = useMemo(() => new THREE.CatmullRomCurve3(points2), [points2])

  const tube1 = useMemo(() => new THREE.TubeGeometry(curve1, 200, 0.025, 8, false), [curve1])
  const tube2 = useMemo(() => new THREE.TubeGeometry(curve2, 200, 0.025, 8, false), [curve2])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00d4ff',
    emissive: '#00d4ff',
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.5,
  }), [])

  return (
    <group>
      <mesh geometry={tube1} material={mat} />
      <mesh geometry={tube2} material={mat} />

      {/* Cross-rungs between strands */}
      {Array.from({ length: 22 }, (_, i) => {
        const t = i / 21
        const angle = t * Math.PI * 2 * HELIX_TURNS
        const y = (t - 0.5) * HELIX_HEIGHT * 10
        const x1 = Math.cos(angle) * HELIX_RADIUS
        const z1 = Math.sin(angle) * HELIX_RADIUS
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={new Float32Array([x1, y, z1, -x1, y, -z1])}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#00d4ff" transparent opacity={0.15} />
          </line>
        )
      })}
    </group>
  )
}

// Individual week card node on the helix
function WeekNode({ week, index }) {
  const navigate = useNavigate()
  const meshRef = useRef(null)
  const pos = helixPoint(index)

  const handleClick = () => {
    navigate(`/week/${week.id}`)
  }

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      {/* Glowing sphere node */}
      <mesh ref={meshRef} onClick={handleClick} data-hover="true">
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={week.color}
          emissive={week.color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Card panel using Html from drei */}
      <Html
        center
        distanceFactor={12}
        position={[pos.x > 0 ? 1.2 : -1.2, 0, 0]}
        style={{ pointerEvents: 'all' }}
      >
        <div
          onClick={handleClick}
          style={{
            width: '180px',
            padding: '12px 16px',
            background: 'rgba(8, 31, 48, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: '6px',
            cursor: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(0,212,255,0.5)'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.2), inset 0 1px 0 rgba(0,212,255,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(0,212,255,0.1)'
          }}
        >
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.55rem',
            letterSpacing: '0.2em',
            color: 'rgba(0,212,255,0.6)',
            marginBottom: '4px',
          }}>
            WEEK {String(week.id).padStart(2, '0')}
          </div>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#f0f8ff',
            lineHeight: 1.3,
            marginBottom: '3px',
          }}>
            {week.title}
          </div>
          <div style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '0.65rem',
            color: 'rgba(140,180,210,0.7)',
          }}>
            {week.subtitle}
          </div>
        </div>
      </Html>
    </group>
  )
}

// Main scene
export default function HelixScene() {
  const groupRef = useRef(null)
  const scrollVelocity = useStore(s => s.scrollVelocity)
  const { camera } = useThree()
  const rotationRef = useRef(0)

  // Handle scroll to rotate helix
  useEffect(() => {
    const onWheel = (e) => {
      rotationRef.current += e.deltaY * 0.001
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    const target = rotationRef.current
    groupRef.current.rotation.y += (target - groupRef.current.rotation.y) * 0.05

    // Gentle auto-rotation when idle
    const t = state.clock.elapsedTime
    camera.position.y = Math.sin(t * 0.1) * 0.3
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} color="#00d4ff" intensity={2} distance={20} />
      <pointLight position={[5, 5, 5]} color="#ffffff" intensity={0.5} />
      <pointLight position={[-5, -5, -5]} color="#0066ff" intensity={0.3} />

      {/* Helix group */}
      <group ref={groupRef}>
        <HelixBackbone />
        {WEEKS.map((week, i) => (
          <WeekNode key={week.id} week={week} index={i} />
        ))}
      </group>
    </>
  )
}

// Need to add useEffect import
import { useEffect } from 'react'
