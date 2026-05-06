import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { WEEKS } from '../data/weeks'
import './Landing.css'

export default function Landing() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── RENDERER ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.set(0, 0, 8)
    const clock = new THREE.Clock()

    // ── PARTICLES ───────────────────────────────────────────────
    const COUNT = 2800
    const pos = new Float32Array(COUNT * 3)
    const col = new Float32Array(COUNT * 3)
    const sz  = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 2.5 + Math.random()
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i*3+2] = r * Math.cos(phi)
      col[i*3]   = 0; col[i*3+1] = 0.83; col[i*3+2] = 1
      sz[i] = Math.random() * 3 + 1
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
    geo.setAttribute('size',     new THREE.BufferAttribute(sz, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (280.0 / -mv.z);
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

    const pts = new THREE.Points(geo, mat)
    scene.add(pts)

    // ── AMBIENT DUST ────────────────────────────────────────────
    const dustCount = 500
    const dustPos = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i++) {
      dustPos[i*3]   = (Math.random() - 0.5) * 28
      dustPos[i*3+1] = (Math.random() - 0.5) * 28
      dustPos[i*3+2] = (Math.random() - 0.5) * 12
    }
    const dustGeo = new THREE.BufferGeometry()
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x00d4ff, size: 0.025, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false
    })))

    // ── HELIX ───────────────────────────────────────────────────
    const helixGroup = new THREE.Group()
    helixGroup.visible = false
    scene.add(helixGroup)

    const TURNS = 3.5, HEIGHT = 16, RADIUS = 1.8
    const hPts = []
    for (let i = 0; i <= 220; i++) {
      const t = i / 220
      const a = t * Math.PI * 2 * TURNS
      hPts.push(new THREE.Vector3(Math.cos(a) * RADIUS, t * HEIGHT - HEIGHT/2, Math.sin(a) * RADIUS))
    }
    const curve = new THREE.CatmullRomCurve3(hPts)
    helixGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 220, 0.007, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.35 })
    ))

    // Connector lines (horizontal rungs)
    for (let i = 0; i < 11; i++) {
      const t = i / 10
      const a = t * Math.PI * 2 * TURNS
      const y = t * HEIGHT - HEIGHT/2
      const start = new THREE.Vector3(Math.cos(a) * RADIUS, y, Math.sin(a) * RADIUS)
      const end   = new THREE.Vector3(-Math.cos(a) * RADIUS * 0.3, y, -Math.sin(a) * RADIUS * 0.3)
      const rungGeo = new THREE.BufferGeometry().setFromPoints([start, end])
      helixGroup.add(new THREE.Line(rungGeo, new THREE.LineBasicMaterial({
        color: new THREE.Color(WEEKS[i].color), transparent: true, opacity: 0.5
      })))

      // Node
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(WEEKS[i].color) })
      )
      node.position.copy(start)
      helixGroup.add(node)
    }

    // ── MOUSE ───────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 }
    const onMove = e => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove)

    // ── SCROLL ──────────────────────────────────────────────────
    let scrollProg = 0
    const onScroll = () => {
      scrollProg = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
    }
    window.addEventListener('scroll', onScroll)

    // ── RENDER LOOP ─────────────────────────────────────────────
    let rafId
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      mat.uniforms.uTime.value = clock.getElapsedTime()

      camera.position.x += (mouse.x * 0.35 - camera.position.x) * 0.05
      camera.position.y += (mouse.y * 0.25 - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)

      if (helixGroup.visible) {
        helixGroup.rotation.y = scrollProg * Math.PI * 5
        camera.position.y += (scrollProg * 5 - 2.5 - camera.position.y) * 0.04
      }

      pts.rotation.y = clock.getElapsedTime() * 0.04
      renderer.render(scene, camera)
    }
    tick()

    // ── OPENING SEQUENCE ────────────────────────────────────────
    const morphTo = (targets, r, g, b, dur = 1.2) => {
      for (let i = 0; i < COUNT; i++) {
        const ti = (i % (targets.length / 3)) * 3
        const tx = targets[ti], ty = targets[ti+1], tz = targets[ti+2]
        gsap.to({}, {
          duration: dur * (0.7 + Math.random() * 0.6),
          ease: 'power2.inOut',
          delay: Math.random() * 0.25,
          onUpdate() {
            const p = this.progress()
            pos[i*3]   += (tx - pos[i*3])   * p * 0.1
            pos[i*3+1] += (ty - pos[i*3+1]) * p * 0.1
            pos[i*3+2] += (tz - pos[i*3+2]) * p * 0.1
            col[i*3] = r; col[i*3+1] = g; col[i*3+2] = b
          }
        })
      }
      geo.attributes.position.needsUpdate = true
      geo.attributes.color.needsUpdate = true
    }

    const explode = () => {
      for (let i = 0; i < COUNT; i++) {
        const a = Math.random() * Math.PI * 2
        const e = (Math.random() - 0.5) * Math.PI
        const d = 4 + Math.random() * 9
        const tx = Math.cos(a)*Math.cos(e)*d
        const ty = Math.sin(e)*d
        const tz = Math.sin(a)*Math.cos(e)*d
        gsap.to({}, {
          duration: 0.7 + Math.random() * 0.5,
          ease: 'expo.out',
          onUpdate() {
            const p = this.progress()
            pos[i*3]   += (tx - pos[i*3])   * p * 0.12
            pos[i*3+1] += (ty - pos[i*3+1]) * p * 0.12
            pos[i*3+2] += (tz - pos[i*3+2]) * p * 0.12
          }
        })
      }
      geo.attributes.position.needsUpdate = true
    }

    setTimeout(() => {
      setPhase('tj')
      morphTo(genLetterPts('TJ', COUNT), 0, 0.83, 1)

      setTimeout(() => {
        setPhase('drawer')
        morphTo(genLetterPts('DRAWER', COUNT), 1, 1, 1, 1.4)

        setTimeout(() => {
          explode()
          setTimeout(() => {
            pts.visible = false
            helixGroup.visible = true
            setPhase('helix')
            gsap.from(helixGroup.scale, { x:0.2, y:0.2, z:0.2, duration:1.4, ease:'power3.out' })
          }, 850)
        }, 2400)
      }, 2200)
    }, 500)

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
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [])

  return (
    <div className="landing-wrap">
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* NAV */}
      <nav className="landing-nav">
        <span className="nav-brand">DRAWER <span className="sep">/</span> TJ</span>
        <span className="nav-info">AUTOCAD LEARNING <span className="sep">/</span> 11 WEEKS</span>
      </nav>

      {/* TJ PHASE */}
      {phase === 'tj' && (
        <div className="center-text animate-in">
          <div className="big-label">TJ</div>
        </div>
      )}

      {/* DRAWER PHASE */}
      {phase === 'drawer' && (
        <div className="center-text animate-in">
          <div className="big-label glow-text">DRAWER</div>
          <div className="sub-label">Engineering Graphics Guide</div>
        </div>
      )}

      {/* HELIX PHASE — week cards */}
      {phase === 'helix' && (
        <>
          <div className="week-cards-wrap">
            {WEEKS.map((week, i) => {
              const t = i / 10
              const angle = t * Math.PI * 2 * 3.5
              const side  = Math.cos(angle) > 0
              return (
                <div
                  key={week.id}
                  className="helix-card"
                  data-hover
                  style={{
                    [side ? 'left' : 'right']: '6%',
                    top: `${6 + i * 8.2}%`,
                    borderColor: week.color + '44',
                    animationDelay: `${i * 0.07}s`
                  }}
                  onClick={() => navigate(`/week/${week.id}`)}
                >
                  <div className="hc-week" style={{ color: week.color }}>
                    W{String(week.id).padStart(2,'0')}
                  </div>
                  <div className="hc-title">{week.short}</div>
                  <div className="hc-arrow" style={{ color: week.color }}>›</div>
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
      <div style={{ height: '600vh', position: 'absolute', top: 0, width: '1px', pointerEvents: 'none' }} />
    </div>
  )
}

// ── Generate point cloud for text ─────────────────────────────────
function genLetterPts(text, count) {
  const c = document.createElement('canvas')
  c.width = 600; c.height = 220
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${text.length > 3 ? 72 : 130}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 300, 110)
  const data = ctx.getImageData(0, 0, 600, 220).data
  const raw = []
  for (let y = 0; y < 220; y += 3) {
    for (let x = 0; x < 600; x += 3) {
      if (data[(y * 600 + x) * 4 + 3] > 120) {
        raw.push((x/600 - 0.5)*9, -(y/220 - 0.5)*3.2, 0)
      }
    }
  }
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const si = (i % (raw.length/3)) * 3
    out[i*3]   = raw[si]   + (Math.random()-0.5)*0.06
    out[i*3+1] = raw[si+1] + (Math.random()-0.5)*0.06
    out[i*3+2] = raw[si+2] + (Math.random()-0.5)*0.15
  }
  return out
}
