import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { WEEKS } from '../data/weeks'
import './Landing.css'
 
// ─── Generate point cloud from text ──────────────────────────────
function genTextPoints(text, count) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 180
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 512, 180)
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${text.length > 3 ? 65 : 115}px Arial Black, Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 90)
  const data = ctx.getImageData(0, 0, 512, 180).data
  const raw = []
  for (let y = 0; y < 180; y += 3)
    for (let x = 0; x < 512; x += 3)
      if (data[(y * 512 + x) * 4 + 3] > 100)
        raw.push((x / 512 - 0.5) * 8, -(y / 180 - 0.5) * 2.8, 0)
  if (raw.length === 0) return new Float32Array(count * 3)
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const si = (i % (raw.length / 3)) * 3
    out[i*3]   = raw[si]   + (Math.random()-0.5) * 0.07
    out[i*3+1] = raw[si+1] + (Math.random()-0.5) * 0.07
    out[i*3+2] =             (Math.random()-0.5) * 0.18
  }
  return out
}
 
function genSpherePoints(count) {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(2 * Math.random() - 1)
    const r     = 2.2 + Math.random() * 1.4
    out[i*3]   = r * Math.sin(phi) * Math.cos(theta)
    out[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
    out[i*3+2] = r * Math.cos(phi)
  }
  return out
}
 
function genExplodePoints(count) {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const e = (Math.random() - 0.5) * Math.PI
    const d = 6 + Math.random() * 10
    out[i*3]   = Math.cos(a) * Math.cos(e) * d
    out[i*3+1] = Math.sin(e) * d
    out[i*3+2] = Math.sin(a) * Math.cos(e) * d
  }
  return out
}
 
// ─── Particle System ─────────────────────────────────────────────
const COUNT = 2400
 
function Particles({ phase }) {
  const meshRef  = useRef()
  const stateRef = useRef({
    current: genSpherePoints(COUNT),
    target:  genSpherePoints(COUNT),
    speed:   0,
    morphing: false,
    color:   new THREE.Color(0, 0.83, 1),
    targetColor: new THREE.Color(0, 0.83, 1),
  })
 
  // Pre-generate all targets
  const targets = useMemo(() => ({
    sphere:  genSpherePoints(COUNT),
    tj:      genTextPoints('TJ', COUNT),
    drawer:  genTextPoints('DRAWER', COUNT),
    explode: genExplodePoints(COUNT),
  }), [])
 
  // Trigger morph when phase changes
  useEffect(() => {
    const s = stateRef.current
    if (phase === 'tj') {
      s.target = targets.tj
      s.speed  = 0
      s.morphing = true
      s.targetColor = new THREE.Color(0, 0.85, 1)
    } else if (phase === 'drawer') {
      s.target = targets.drawer
      s.speed  = 0
      s.morphing = true
      s.targetColor = new THREE.Color(0.9, 0.95, 1)
    } else if (phase === 'explode') {
      s.target = targets.explode
      s.speed  = 0.12
      s.morphing = true
    }
  }, [phase, targets])
 
  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const s = stateRef.current
    const pos = mesh.geometry.attributes.position
    const col = mesh.geometry.attributes.color
 
    // Particle morph
    if (s.morphing) {
      s.speed = Math.min(s.speed + 0.003, 0.07)
      let settled = true
      for (let i = 0; i < COUNT; i++) {
        const dx = s.target[i*3]   - s.current[i*3]
        const dy = s.target[i*3+1] - s.current[i*3+1]
        const dz = s.target[i*3+2] - s.current[i*3+2]
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.01) settled = false
        s.current[i*3]   += dx * s.speed
        s.current[i*3+1] += dy * s.speed
        s.current[i*3+2] += dz * s.speed
        pos.array[i*3]   = s.current[i*3]
        pos.array[i*3+1] = s.current[i*3+1]
        pos.array[i*3+2] = s.current[i*3+2]
      }
      // Lerp color
      s.color.lerp(s.targetColor, 0.05)
      for (let i = 0; i < COUNT; i++) {
        col.array[i*3]   = s.color.r
        col.array[i*3+1] = s.color.g
        col.array[i*3+2] = s.color.b
      }
      pos.needsUpdate = true
      col.needsUpdate = true
      if (settled) s.morphing = false
    }
 
    // Gentle rotation when idle
    if (!s.morphing && phase !== 'helix') {
      mesh.rotation.y = state.clock.elapsedTime * 0.04
    }
  })
 
  const posArr = useMemo(() => {
    const a = new Float32Array(COUNT * 3)
    const s = genSpherePoints(COUNT)
    a.set(s)
    return a
  }, [])
 
  const colArr = useMemo(() => {
    const a = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) { a[i*3]=0; a[i*3+1]=0.83; a[i*3+2]=1 }
    return a
  }, [])
 
  return (
    <points ref={meshRef} visible={phase !== 'helix'}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posArr, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colArr, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute vec3 color;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 2.8 * (290.0 / -mv.z);
            gl_Position  = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            float a = 1.0 - smoothstep(0.3, 0.5, d);
            gl_FragColor = vec4(vColor, a);
          }
        `}
      />
    </points>
  )
}
 
// ─── Single Helix ─────────────────────────────────────────────────
function Helix({ visible, scrollY }) {
  const groupRef = useRef()
  const TURNS = 3.5, H = 15, RAD = 1.6
 
  useFrame(() => {
    if (!groupRef.current || !visible) return
    groupRef.current.rotation.y = scrollY.current * Math.PI * 5
  })
 
  const { strandPoints, nodeData } = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const a = t * Math.PI * 2 * TURNS
      pts.push(new THREE.Vector3(
        Math.cos(a) * RAD,
        t * H - H / 2,
        Math.sin(a) * RAD
      ))
    }
    const nodes = WEEKS.map((w, i) => {
      const t = i / 10
      const a = t * Math.PI * 2 * TURNS
      return {
        pos: new THREE.Vector3(Math.cos(a)*RAD, t*H-H/2, Math.sin(a)*RAD),
        color: w.color,
        id: w.id
      }
    })
    return { strandPoints: pts, nodeData: nodes }
  }, [])
 
  const curve    = useMemo(() => new THREE.CatmullRomCurve3(strandPoints), [strandPoints])
  const tubeGeo  = useMemo(() => new THREE.TubeGeometry(curve, 200, 0.006, 6, false), [curve])
 
  if (!visible) return null
 
  return (
    <group ref={groupRef}>
      {/* Main spiral strand */}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.45} />
      </mesh>
 
      {/* Nodes + axis rungs */}
      {nodeData.map((n, i) => (
        <group key={i}>
          <mesh position={n.pos}>
            <sphereGeometry args={[0.075, 10, 10]} />
            <meshBasicMaterial color={n.color} />
          </mesh>
          {/* rung toward center axis */}
          <line>
            <bufferGeometry
              setFromPoints={[n.pos, new THREE.Vector3(0, n.pos.y, 0)]}
            />
            <lineBasicMaterial color={n.color} transparent opacity={0.22} />
          </line>
        </group>
      ))}
    </group>
  )
}
 
// ─── Dust particles ───────────────────────────────────────────────
function AmbientDust() {
  const pts = useMemo(() => {
    const a = new Float32Array(350 * 3)
    for (let i = 0; i < 350; i++) {
      a[i*3]   = (Math.random()-0.5)*28
      a[i*3+1] = (Math.random()-0.5)*28
      a[i*3+2] = (Math.random()-0.5)*12
    }
    return a
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pts, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#00d4ff" size={0.03} transparent opacity={0.18}
        blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}
 
// ─── Camera rig ───────────────────────────────────────────────────
function CameraRig({ mouse, scrollY, phase }) {
  useFrame((state) => {
    state.camera.position.x += (mouse.current.x * 0.35 - state.camera.position.x) * 0.05
    if (phase !== 'helix') {
      state.camera.position.y += (mouse.current.y * 0.25 - state.camera.position.y) * 0.05
    } else {
      const target = scrollY.current * 5 - 2.5
      state.camera.position.y += (target - state.camera.position.y) * 0.04
    }
    state.camera.lookAt(0, 0, 0)
  })
  return null
}
 
// ─── Main Landing ─────────────────────────────────────────────────
export default function Landing() {
  const navigate  = useNavigate()
  const [phase, setPhase] = useState('init')
  const mouse     = useRef({ x: 0, y: 0 })
  const scrollY   = useRef(0)
 
  useEffect(() => {
    const onMove = e => {
      mouse.current.x =  (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollY.current = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('scroll',    onScroll)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll',    onScroll)
    }
  }, [])
 
  // Opening sequence timing
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tj'),      500)
    const t2 = setTimeout(() => setPhase('drawer'),  2600)
    const t3 = setTimeout(() => setPhase('explode'), 5200)
    const t4 = setTimeout(() => setPhase('helix'),   6100)
    return () => [t1,t2,t3,t4].forEach(clearTimeout)
  }, [])
 
  const phaseLabels = {
    tj:     { word: 'TJ',     sub: null,                           glow: false },
    drawer: { word: 'DRAWER', sub: 'Engineering Graphics Guide',   glow: true  },
  }
 
  return (
    <div className="landing-wrap">
      {/* R3F Canvas */}
      <div className="canvas-wrap">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <CameraRig mouse={mouse} scrollY={scrollY} phase={phase} />
          <AmbientDust />
          <Particles phase={phase} />
          <Helix visible={phase === 'helix'} scrollY={scrollY} />
        </Canvas>
      </div>
 
      {/* NAV */}
      <nav className="landing-nav">
        <span className="nav-brand">DRAWER <span className="sep">/</span> TJ</span>
        <span className="nav-info">AUTOCAD <span className="sep">/</span> 11 WEEKS</span>
      </nav>
 
      {/* Phase text overlays */}
      <AnimatePresence mode="wait">
        {(phase === 'tj' || phase === 'drawer') && (
          <motion.div
            key={phase}
            className="center-label"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={`phase-word ${phaseLabels[phase].glow ? 'glow' : ''}`}>
              {phaseLabels[phase].word}
            </div>
            {phaseLabels[phase].sub && (
              <motion.div
                className="phase-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {phaseLabels[phase].sub}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Week cards — helix phase */}
      <AnimatePresence>
        {phase === 'helix' && (
          <>
            <div className="week-cards-wrap">
              {WEEKS.map((week, i) => {
                const t     = i / 10
                const angle = t * Math.PI * 2 * 3.5
                const side  = Math.cos(angle) > 0
                return (
                  <motion.div
                    key={week.id}
                    className="hcard"
                    data-hover
                    initial={{ opacity: 0, x: side ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.45, ease: [0.22,1,0.36,1] }}
                    style={{
                      [side ? 'left' : 'right']: '5%',
                      top: `${6 + i * 8.5}%`,
                      borderColor: week.color + '44',
                    }}
                    whileHover={{ x: side ? 6 : -6, scale: 1.025 }}
                    onClick={() => navigate(`/week/${week.id}`)}
                  >
                    <span className="hcard-num" style={{ color: week.color }}>
                      {String(week.id).padStart(2,'0')}
                    </span>
                    <span className="hcard-title">{week.short}</span>
                    <motion.span
                      className="hcard-arrow"
                      style={{ color: week.color }}
                      whileHover={{ x: 3 }}
                    >›</motion.span>
                  </motion.div>
                )
              })}
            </div>
 
            <motion.div
              className="scroll-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <span>SCROLL TO EXPLORE</span>
              <div className="scroll-line" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
 
      {/* Scroll spacer */}
      <div style={{ height:'600vh', position:'absolute', top:0, width:'1px', pointerEvents:'none' }} />
    </div>
  )
}
