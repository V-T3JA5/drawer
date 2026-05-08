import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'

// Crosshair geometry constants
const ARM = 50   // arm length each side from center square edge (px)
const BOX = 5    // center square half-size (px)
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

  // Trail springs — progressively laggier
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
      {/* Trail crosshairs — bottom of stack, lowest opacity */}
      {trails.map((trail, i) => {
        const opacity = 0.03 + (i / TRAIL_COUNT) * 0.09
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
        <CrosshairMark arm={ARM} box={BOX} glow />
      </motion.div>

      {/* Click bursts */}
      <AnimatePresence>
        {bursts.map((burst) => (
          <BurstEffect key={burst.id} x={burst.x} y={burst.y} />
        ))}
      </AnimatePresence>
    </>
  )
}

// The crosshair SVG — two lines crossing, gap in center, small square at gap
function CrosshairMark({ arm, box, glow = false }) {
  const size = (arm + box + 2) * 2
  const half = arm + box + 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-half} ${-half} ${size} ${size}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      {glow && (
        <defs>
          <filter id="ch-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* Bloom layer — fat blurred copy underneath */}
      {glow && (
        <g opacity="0.35" filter="url(#ch-glow)">
          <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#dc143c" strokeWidth="3.5" />
          <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#dc143c" strokeWidth="3.5" />
          <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#dc143c" strokeWidth="3.5" />
          <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#dc143c" strokeWidth="3.5" />
          <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#dc143c" strokeWidth="3.5" />
        </g>
      )}

      {/* Sharp 1px lines — exactly like AutoCAD */}
      <g filter={glow ? 'url(#ch-glow)' : undefined}>
        {/* Horizontal: gap = box width each side */}
        <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#dc143c" strokeWidth="1" />
        <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#dc143c" strokeWidth="1" />
        {/* Vertical */}
        <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#dc143c" strokeWidth="1" />
        <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#dc143c" strokeWidth="1" />
        {/* Center square */}
        <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#dc143c" strokeWidth="1" />
      </g>
    </svg>
  )
}

// Trail crosshair — no glow, just raw lines at low opacity
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
        <line x1={-(arm + box)} y1={0} x2={-box} y2={0} stroke="#dc143c" strokeWidth="1" />
        <line x1={box} y1={0} x2={arm + box} y2={0} stroke="#dc143c" strokeWidth="1" />
        <line x1={0} y1={-(arm + box)} x2={0} y2={-box} stroke="#dc143c" strokeWidth="1" />
        <line x1={0} y1={box} x2={0} y2={arm + box} stroke="#dc143c" strokeWidth="1" />
        <rect x={-box} y={-box} width={box * 2} height={box * 2} fill="none" stroke="#dc143c" strokeWidth="1" />
      </svg>
    </motion.div>
  )
}

// Click burst — line fragments radiate out + expanding square shockwave
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
            height: 1,
            backgroundColor: '#dc143c',
            boxShadow: '0 0 4px 1px rgba(220,20,60,0.8)',
            pointerEvents: 'none',
            zIndex: 9998,
            translateX: '-50%',
            translateY: '-50%',
            rotate: `${f.angle}deg`,
            originX: '50%',
            originY: '50%',
          }}
          initial={{ opacity: 1, x: 0, y: 0, scaleX: 1 }}
          animate={{ opacity: 0, x: f.dx, y: f.dy, scaleX: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.3, 1] }}
        />
      ))}

      {/* Expanding square — mirrors center square */}
      <motion.div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          width: BOX * 2,
          height: BOX * 2,
          border: '1px solid rgba(220,20,60,0.9)',
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

      {/* Second ring, delayed */}
      <motion.div
        style={{
          position: 'fixed',
          top: y,
          left: x,
          width: BOX * 2,
          height: BOX * 2,
          border: '1px solid rgba(220,20,60,0.45)',
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
