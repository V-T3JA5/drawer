// src/components/TJWatermark.jsx
// Fixed: text is now crimson (was white). Slow fade in/out breathing pulse.
// All animation via useAnimationFrame — zero React re-renders per frame.

import { useRef } from 'react'
import { useAnimationFrame } from 'framer-motion'

export default function TJWatermark() {
  const glowRef = useRef(null)
  const lineRef = useRef(null)

  useAnimationFrame((t) => {
    if (!glowRef.current) return

    // Slow breathing — full cycle 4s, range 0.3 → 1.0
    const pulse   = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((t / 4000) * Math.PI * 2))
    // Secondary flutter — 1.1s period, low amplitude
    const flutter = 1 + 0.06 * Math.sin((t / 1100) * Math.PI * 2)
    const intensity = pulse * flutter

    // Opacity fades in and out with the pulse
    glowRef.current.style.opacity = intensity

    glowRef.current.style.textShadow = [
      // Tight crimson core
      `0 0 6px rgba(220, 20, 60, ${intensity * 1.0})`,
      // Mid bloom
      `0 0 18px rgba(220, 20, 60, ${intensity * 0.7})`,
      // Outer dark red bleed
      `0 0 40px rgba(139, 0, 0, ${intensity * 0.4})`,
      `0 0 80px rgba(139, 0, 0, ${intensity * 0.15})`,
    ].join(', ')

    // Separator line breathes slightly offset from text
    if (lineRef.current) {
      const linePhase = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(((t - 600) / 4000) * Math.PI * 2))
      lineRef.current.style.opacity = linePhase * 0.6
    }
  })

  return (
    <div
      style={{
        position:      'fixed',
        bottom:        '24px',
        right:         '28px',
        zIndex:        9000,
        pointerEvents: 'none',
        userSelect:    'none',
      }}
    >
      {/* Separator line */}
      <div
        ref={lineRef}
        style={{
          width:        '100%',
          height:       '1px',
          marginBottom: '6px',
          background:   'linear-gradient(90deg, transparent, rgba(220, 20, 60, 0.7), transparent)',
          boxShadow:    '0 0 6px 1px rgba(220,20,60,0.4)',
        }}
      />

      {/* TJ — crimson, not white */}
      <span
        ref={glowRef}
        style={{
          display:     'block',
          fontFamily:  '"Courier New", "Courier", monospace',
          fontSize:    '13px',
          fontWeight:  '700',
          letterSpacing: '0.3em',
          lineHeight:  1,
          color:       '#dc143c',   // ← crimson, was #ffffff
        }}
      >
        TJ
      </span>
    </div>
  )
}
