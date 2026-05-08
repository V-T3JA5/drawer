import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'

const ARM = 50
const BOX = 5
const TRAIL_COUNT = 6

export default function GlobalCursor() {
  const [hovered, setHovered] = useState(false)
  const [bursts, setBursts] = useState([])
  const burstIdRef = useRef(0)

  const rawX = useMotionValue(-300)
  const rawY = useMotionValue(-300)

  const springCfg = { stiffness: 900, damping: 55, mass: 0.4 }
  const x = useSpring(rawX, springCfg)
  const y = useSpring(rawY, springCfg)

  const trails = Array.from({ length: TRAIL_COUNT }, (_, i) => ({
    // eslint-disable-next-line react-hooks/rules-of-hooks
    x: useSpring(rawX, { stiffness: 500 - i * 55, damping: 48 + i * 3, mass: 0.35 + i * 0.1 }),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    y: useSpring(rawY, { stiffness: 500 - i * 55, damping: 48 + i * 3, mass: 0.35 + i * 0.1 }),
  }))

  const handleMouseMove = useCallback((e) => {
    rawX.set(e.clientX)
    rawY.set(e.clientY)
  }, [rawX, rawY])

  const handleMouseOver = useCallback((e) => {
    const t = e.target
    if (
      t.tagName === 'A' ||
      t.tagName === 'BUTTON' ||
      t.closest('a') ||
      t.closest('button') ||
      t.dataset.cursor === 'hover'
    ) {
      setHovered(true)
    } else {
      setHovered(false)
    }
  }, [])

  const handleClick = useCallback((e) => {
    const id = burstIdRef.current++
    setBursts((prev) => [...prev, { id, x: e.clientX, y: e.clientY }])
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id))
    }, 700)
  }, [])

  useEffect(() => {
    document.documentElement.style.cursor = 'none'
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseover', handleMouseOver, { passive: true })
    window.addEventListener('click', handleClick)
    return () => {
      document.documentElement.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('click', handleClick)
    }
  }, [handleMouseMove, handleMouseOver, handleClick])

  return (
    <>
      {/* Trail crosshairs */}
      {trails.map((trail, i) => {
        const opacity = 0.03 + (i / TRAIL_COUNT) * 0.08
        const armScale = 0.65 + (i / TRAIL_COUNT) * 0.3
        return (
          <TrailCrosshair
            key={`trail-${i}`}
            x={trail.x}
            y={trail.y}
            arm={ARM * armScale}
            box={BOX * armScale}
            opacity={opacity}
            zIndex={9990 + i}
          />
        )
      })}

      {/* Main crosshair */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          x,
          y,
          translateX: '-50%',
          translateY: '-50%',
          pointerEvents: 'none',
          zIndex: 9999,
          willChange: 'transform',
        }}
        animate={{ scale: hovered ? 1.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      >
        <CrosshairMark arm={ARM} box={BOX} />
      </motion.div>

      <AnimatePresence>
        {bursts.map((burst) => (
          <BurstEffect key={burst.id} x={burst.x} y={burst.y} />
        ))}
      </AnimatePresence>
    </>
  )
}

function CrosshairMark({ arm, box }) {
  const size = (arm + box + 2) * 2
  const half = arm + box + 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-half} ${-half} ${size} ${size}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        {/* Outer wide glow — deep crimson bleed */}
        <filter id="neon-outer" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feColorMatrix
            in="blur1"
            type="matrix"
            values="1.5 0 0 0 0.5   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0"
            result="redBlur"
          />
          <feMerge>
            <feMergeNode in="redBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Inner tight glow — bright core halo */}
        <filter id="neon-inner" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.2" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Layer 1 — wide crimson bleed glow */}
      <g filter="url(#neon-outer)" opacity="0.7">
        <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#8b0000" strokeWidth="4" />
        <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#8b0000" strokeWidth="4" />
        <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#8b0000" strokeWidth="4" />
        <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#8b0000" strokeWidth="4" />
        <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#8b0000" strokeWidth="4" />
      </g>

      {/* Layer 2 — mid crimson glow */}
      <g filter="url(#neon-inner)" opacity="0.9">
        <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#dc143c" strokeWidth="2" />
        <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#dc143c" strokeWidth="2" />
        <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#dc143c" strokeWidth="2" />
        <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#dc143c" strokeWidth="2" />
        <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#dc143c" strokeWidth="2" />
      </g>

      {/* Layer 3 — bright white core, 1px sharp */}
      <g opacity="0.95">
        <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#ffffff" strokeWidth="0.75" />
        <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#ffffff" strokeWidth="0.75" />
        <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#ffffff" strokeWidth="0.75" />
        <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#ffffff" strokeWidth="0.75" />
        <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#ffffff" strokeWidth="0.75" />
      </g>
    </svg>
  )
}

function TrailCrosshair({ x, y, arm, box, opacity, zIndex }) {
  const size = (arm + box + 2) * 2
  const half = arm + box + 2

  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
        pointerEvents: 'none',
        zIndex,
        willChange: 'transform',
        opacity,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`${-half} ${-half} ${size} ${size}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* Trail: just the crimson mid layer, no white core */}
        <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#dc143c" strokeWidth="1" />
        <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#dc143c" strokeWidth="1" />
        <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#dc143c" strokeWidth="1" />
        <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#dc143c" strokeWidth="1" />
        <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#dc143c" strokeWidth="1" />
      </svg>
    </motion.div>
  )
}

function BurstEffect({ x, y }) {
  const fragments = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const dist = 30 + Math.random() * 20
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      angle: (Math.atan2(Math.sin(angle), Math.cos(angle)) * 180) / Math.PI,
      len: 5 + Math.random() * 4,
    }
  })

  return (
    <>
      {fragments.map((f) => (
        <motion.div
          key={f.id}
          style={{
            position: 'fixed',
            top: y,
            left: x,
            width: f.len,
            height: 1.5,
            background: 'linear-gradient(90deg, #ffffff, #dc143c)',
            boxShadow: '0 0 6px 2px rgba(220,20,60,0.9), 0 0 12px 4px rgba(139,0,0,0.5)',
            pointerEvents: 'none',
            zIndex: 9998,
            translateX: '-50%',
            translateY: '-50%',
            rotate: `${f.angle}deg`,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scaleX: 1 }}
          animate={{ opacity: 0, x: f.dx, y: f.dy, scaleX: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }}
        />
      ))}

      {/* Expanding square shockwave */}
      <motion.div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          width: BOX * 2,
          height: BOX * 2,
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 8px 2px rgba(220,20,60,0.8), 0 0 20px 6px rgba(139,0,0,0.4)',
          pointerEvents: 'none',
          zIndex: 9998,
          translateX: '-50%',
          translateY: '-50%',
        }}
        initial={{ opacity: 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 10 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      <motion.div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          width: BOX * 2,
          height: BOX * 2,
          border: '1px solid rgba(220,20,60,0.6)',
          boxShadow: '0 0 12px 4px rgba(139,0,0,0.3)',
          pointerEvents: 'none',
          zIndex: 9998,
          translateX: '-50%',
          translateY: '-50%',
        }}
        initial={{ opacity: 0.6, scale: 1 }}
        animate={{ opacity: 0, scale: 6 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.09 }}
      />
    </>
  )
}
