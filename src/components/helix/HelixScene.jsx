import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'
import { WEEKS } from '@data/weeks'

const HELIX_RADIUS = 3
const HELIX_HEIGHT = 2.2
const HELIX_TURNS = 2.2

function helixPoint(i, total = 11) {
  const t = i / (total - 1)
  const angle = t * Math.PI * 2 * HELIX_TURNS
  const y = (t - 0.5) * HELIX_HEIGHT * (total - 1)
  return { x: Math.cos(angle) * HELIX_RADIUS, y, z: Math.sin(angle) * HELIX_RADIUS }
}

function HelixBackbone() {
  const points1 = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const angle = t * Math.PI * 2 * HELIX_TURNS
      const y = (t - 0.5) * HELIX_HEIGHT * 10
      pts.push(new THREE.Vector3(Math.cos(angle) * HELIX_RADIUS, y, Math.sin(angle) * HELIX_RADIUS))
    }
    return pts
  }, [])

  const points2 = useMemo(() => points1.map(p => new THREE.Vector3(-p.x, p.y, -p.z)), [points1])
  const curve1 = useMemo(() => new THREE.CatmullRomCurve3(points1), [points1])
  const curve2 = useMemo(() => new THREE.CatmullRomCurve3(points2), [points2])
  const tube1 = useMemo(() => new THREE.TubeGeometry(curve1, 200, 0.025, 8, false), [curve1])
  const tube2 = useMemo(() => new THREE.TubeGeometry(curve2, 200, 0.025, 8, false), [curve2])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00d4ff', emissive: '#00d4ff', emissiveIntensity: 0.4, transparent: true, opacity: 0.5,
  }), [])

  const rungGeo = useMemo(() => {
    const positions = []
    for (let i = 0; i <= 22; i++) {
      const t = i / 21
      const angle = t * Math.PI * 2 * HELIX_TURNS
      const y = (t - 0.5) * HELIX_HEIGHT * 10
      const x = Math.cos(angle) * HELIX_RADIUS
      const z = Math.sin(angle) * HELIX_RADIUS
      positions.push(x, y, z, -x, y, -z)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <group>
      <mesh geometry={tube1} material={mat} />
      <mesh geometry={tube2} material={mat} />
      <lineSegments geometry={rungGeo}>
        <lineBasicMaterial color="#00d4ff" transparent opacity={0.15} />
      </lineSegments>
    </group>
  )
}

function WeekNode({ week, index, onClick }) {
  const meshRef = useRef()
  const pos = helixPoint(index)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.material.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.3
  })

  return (
    <mesh ref={meshRef} position={[pos.x, pos.y, pos.z]} onClick={() => onClick(week.id)}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color={week.color} emissive={week.color} emissiveIntensity={0.8} />
    </mesh>
  )
}

export default function HelixScene() {
  const groupRef = useRef()
  const navigate = useNavigate()
  const { camera } = useThree()
  const rotationRef = useRef(0)

  useEffect(() => {
    const onWheel = (e) => { rotationRef.current += e.deltaY * 0.001 }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += (rotationRef.current - groupRef.current.rotation.y) * 0.05
    camera.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} color="#00d4ff" intensity={2} distance={20} />
      <pointLight position={[5, 5, 5]} color="#ffffff" intensity={0.5} />
      <pointLight position={[-5, -5, -5]} color="#0066ff" intensity={0.3} />
      <group ref={groupRef}>
        <HelixBackbone />
        {WEEKS.map((week, i) => (
          <WeekNode key={week.id} week={week} index={i} onClick={(id) => navigate(`/week/${id}`)} />
        ))}
      </group>
    </>
  )
}
