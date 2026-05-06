import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { WEEKS } from '../data/weeks'
import './Landing.css'

export default function Landing() {
  const canvasRef = useRef(null)
  const navigate  = useNavigate()
  const [phase, setPhase] = useState('init') // init | tj | drawer | helix

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── RENDERER ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 0, 8)
    const clock  = new THREE.Clock()

    // ── PARTICLE SETUP ──────────────────────────────────────────
    const COUNT = 2500
    const pos   = new Float32Array(COUNT * 3)   // current positions
    const target= new Float32Array(COUNT * 3)   // target positions
    const col   = new Float32Array(COUNT * 3)

    // Start: random sphere
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 2.5 + Math.random() * 1.5
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i*3+2] = r * Math.cos(phi)
      col[i*3]   = 0; col[i*3+1] = 0.83; col[i*3+2] = 1
    }
    target.set(pos)

    const geo = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(pos, 3)
    const colAttr = new THREE.BufferAttribute(col, 3)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('color',    colAttr)

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.5 * (300.0 / -mv.z);
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float a = 1.0 - smoothstep(0.3, 0.5, d);
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true, depthWrite: false,
      vertexColors: true, blending: THREE.AdditiveBlending
    })

    const ptsMesh = new THREE.Points(geo, mat)
    scene.add(ptsMesh)

    // ── AMBIENT DUST ────────────────────────────────────────────
    const dustPos = new Float32Array(400 * 3)
    for (let i = 0; i < 400; i++) {
      dustPos[i*3]   = (Math.random()-0.5)*30
      dustPos[i*3+1] = (Math.random()-0.5)*30
      dustPos[i*3+2] = (Math.random()-0.5)*12
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos,3))
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color:0x00d4ff, size:0.03, transparent:true, opacity:0.18,
      blending:THREE.AdditiveBlending, depthWrite:false
    })))

    // ── SINGLE HELIX ────────────────────────────────────────────
    const helixGroup = new THREE.Group()
    helixGroup.visible = false
    scene.add(helixGroup)

    const TURNS=3.5, H=16, RAD=1.8
    // One spiral strand
    const strandPts = []
    for (let i=0; i<=240; i++) {
      const t = i/240
      const a = t * Math.PI*2 * TURNS
      strandPts.push(new THREE.Vector3(
        Math.cos(a)*RAD,
        t*H - H/2,
        Math.sin(a)*RAD
      ))
    }
    const strandCurve = new THREE.CatmullRomCurve3(strandPts)
    const strandGeo   = new THREE.TubeGeometry(strandCurve, 240, 0.007, 6, false)
    helixGroup.add(new THREE.Mesh(strandGeo,
      new THREE.MeshBasicMaterial({ color:0x00d4ff, transparent:true, opacity:0.5 })
    ))

    // 11 week nodes on the spiral
    const nodeWorldPositions = []
    for (let i=0; i<11; i++) {
      const t = i/10
      const a = t * Math.PI*2 * TURNS
      const y = t*H - H/2
      const np = new THREE.Vector3(Math.cos(a)*RAD, y, Math.sin(a)*RAD)
      nodeWorldPositions.push(np)

      // Node sphere
      const nodeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08,12,12),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(WEEKS[i].color) })
      )
      nodeMesh.position.copy(np)
      helixGroup.add(nodeMesh)

      // Small rung line toward center axis
      const rungEnd = new THREE.Vector3(0, y, 0)
      const rungGeo = new THREE.BufferGeometry().setFromPoints([np, rungEnd])
      helixGroup.add(new THREE.Line(rungGeo,
        new THREE.LineBasicMaterial({ color: new THREE.Color(WEEKS[i].color), transparent:true, opacity:0.25 })
      ))
    }

    // ── MOUSE & SCROLL ──────────────────────────────────────────
    const mouse = { x:0, y:0 }
    const onMove = e => {
      mouse.x =  (e.clientX/window.innerWidth  - 0.5)*2
      mouse.y = -(e.clientY/window.innerHeight - 0.5)*2
    }
    window.addEventListener('mousemove', onMove)

    let scrollProg = 0
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollProg = max > 0 ? window.scrollY / max : 0
    }
    window.addEventListener('scroll', onScroll)

    // ── LERP SPEED & MORPH STATE ────────────────────────────────
    let morphing = false
    let morphColor = { r:0, g:0.83, b:1 }
    let lerpSpeed = 0.0  // ramps up during morph

    // ── RENDER LOOP ─────────────────────────────────────────────
    let rafId
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const elapsed = clock.getElapsedTime()
      mat.uniforms.uTime.value = elapsed

      // Smooth camera parallax
      camera.position.x += (mouse.x*0.35 - camera.position.x) * 0.05
      camera.position.y += (mouse.y*0.25 - camera.position.y) * 0.05
      camera.lookAt(0,0,0)

      // Helix scroll rotation
      if (helixGroup.visible) {
        helixGroup.rotation.y = scrollProg * Math.PI * 5
        camera.position.y += (scrollProg*5 - 2.5 - camera.position.y) * 0.04
      }

      // Particle morph lerp (runs every frame)
      if (morphing) {
        lerpSpeed = Math.min(lerpSpeed + 0.002, 0.06)
        let settled = true
        for (let i=0; i<COUNT; i++) {
          const dx = target[i*3]   - pos[i*3]
          const dy = target[i*3+1] - pos[i*3+1]
          const dz = target[i*3+2] - pos[i*3+2]
          if (Math.abs(dx)+Math.abs(dy)+Math.abs(dz) > 0.005) settled = false
          pos[i*3]   += dx * lerpSpeed
          pos[i*3+1] += dy * lerpSpeed
          pos[i*3+2] += dz * lerpSpeed
          col[i*3]   = morphColor.r
          col[i*3+1] = morphColor.g
          col[i*3+2] = morphColor.b
        }
        posAttr.needsUpdate = true
        colAttr.needsUpdate = true
        if (settled) morphing = false
      }

      // Gentle drift when not morphing
      if (!morphing) {
        ptsMesh.rotation.y = elapsed * 0.035
      }

      renderer.render(scene, camera)
    }
    tick()

    // ── HELPER: set target from letter texture ───────────────────
    function setLetterTarget(text, r, g, b) {
      const c = document.createElement('canvas')
      c.width=600; c.height=200
      const ctx = c.getContext('2d')
      ctx.clearRect(0,0,600,200)
      ctx.fillStyle='#fff'
      ctx.font = `bold ${text.length>3?68:120}px Arial`
      ctx.textAlign='center'
      ctx.textBaseline='middle'
      ctx.fillText(text, 300, 100)
      const data = ctx.getImageData(0,0,600,200).data
      const raw=[]
      for (let y=0; y<200; y+=3)
        for (let x=0; x<600; x+=3)
          if (data[(y*600+x)*4+3]>100)
            raw.push((x/600-0.5)*9, -(y/200-0.5)*3, 0)

      if (raw.length===0) return
      for (let i=0; i<COUNT; i++) {
        const si=(i%(raw.length/3))*3
        target[i*3]   = raw[si]   + (Math.random()-0.5)*0.08
        target[i*3+1] = raw[si+1] + (Math.random()-0.5)*0.08
        target[i*3+2] = raw[si+2] + (Math.random()-0.5)*0.2
      }
      morphColor = {r, g, b}
      lerpSpeed  = 0.0
      morphing   = true
    }

    function setExplodeTarget() {
      for (let i=0; i<COUNT; i++) {
        const a = Math.random()*Math.PI*2
        const e = (Math.random()-0.5)*Math.PI
        const d = 5 + Math.random()*10
        target[i*3]   = Math.cos(a)*Math.cos(e)*d
        target[i*3+1] = Math.sin(e)*d
        target[i*3+2] = Math.sin(a)*Math.cos(e)*d
      }
      lerpSpeed = 0.08
      morphing  = true
    }

    // ── OPENING SEQUENCE ────────────────────────────────────────
    // t=0.5s  → TJ forms
    // t=2.5s  → DRAWER forms
    // t=5.0s  → explode
    // t=5.8s  → helix appears
    setTimeout(() => {
      setPhase('tj')
      setLetterTarget('TJ', 0, 0.83, 1.0)
    }, 500)

    setTimeout(() => {
      setPhase('drawer')
      setLetterTarget('DRAWER', 1, 1, 1)
    }, 2500)

    setTimeout(() => {
      setExplodeTarget()
    }, 5000)

    setTimeout(() => {
      ptsMesh.visible = false
      helixGroup.visible = true
      setPhase('helix')
    }, 5800)

    // ── RESIZE ──────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll',    onScroll)
      window.removeEventListener('resize',    onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="landing-wrap">
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* NAV */}
      <nav className="landing-nav">
        <span className="nav-brand">DRAWER <span className="sep">/</span> TJ</span>
        <span className="nav-info">AUTOCAD <span className="sep">/</span> 11 WEEKS</span>
      </nav>

      {/* TJ PHASE */}
      {phase === 'tj' && (
        <div className="center-label animate-in">
          <div className="phase-word">TJ</div>
        </div>
      )}

      {/* DRAWER PHASE */}
      {phase === 'drawer' && (
        <div className="center-label animate-in">
          <div className="phase-word glow">DRAWER</div>
          <div className="phase-sub">Engineering Graphics Guide</div>
        </div>
      )}

      {/* HELIX PHASE */}
      {phase === 'helix' && (
        <>
          <div className="week-cards-wrap">
            {WEEKS.map((week, i) => {
              const t     = i / 10
              const angle = t * Math.PI * 2 * 3.5
              const side  = Math.cos(angle) > 0  // true = left side
              return (
                <div
                  key={week.id}
                  className="hcard"
                  data-hover
                  style={{
                    [side ? 'left' : 'right']: '5%',
                    top: `${6 + i * 8.5}%`,
                    borderColor: week.color + '55',
                    animationDelay: `${i * 0.08}s`
                  }}
                  onClick={() => navigate(`/week/${week.id}`)}
                >
                  <span className="hcard-num" style={{ color: week.color }}>
                    {String(week.id).padStart(2,'0')}
                  </span>
                  <span className="hcard-title">{week.short}</span>
                  <span className="hcard-arrow" style={{ color: week.color }}>›</span>
                </div>
              )
            })}
          </div>

          <div className="scroll-hint">
            <span>SCROLL TO EXPLORE</span>
            <div className="scroll-line" />
          </div>
        </>
      )}

      {/* Scroll height spacer */}
      <div style={{ height:'600vh', position:'absolute', top:0, width:'1px', pointerEvents:'none' }} />
    </div>
  )
}
