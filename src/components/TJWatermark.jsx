import { useRef } from 'react'
import { useAnimationFrame } from 'framer-motion'

export default function TJWatermark() {
  const glowRef = useRef(null)

  // Pure crimson neon pulse — no hue cycling, white core with red bleed
  useAnimationFrame((t) => {
    if (!glowRef.current) return

    // Slow breathing pulse — 0.6 to 1.0 over 3.5s
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t / 3500) * Math.PI * 2))
    // Secondary flutter — slightly faster, low amplitude, keeps it alive
    const flutter = 1 + 0.08 * Math.sin((t / 900) * Math.PI * 2)
    const intensity = pulse * flutter

    glowRef.current.style.opacity = 0.5 + intensity * 0.5
    glowRef.current.style.textShadow = [
      // White core halo — tight
      `0 0 4px rgba(255, 255, 255, ${intensity * 0.9})`,
      // Bright crimson inner glow
      `0 0 10px rgba(220, 20, 60, ${intensity * 0.95})`,
      // Mid crimson bloom
      `0 0 22px rgba(220, 20, 60, ${intensity * 0.6})`,
      // Deep dark red outer bleed
      `0 0 45px rgba(139, 0, 0, ${intensity * 0.35})`,
      `0 0 80px rgba(139, 0, 0, ${intensity * 0.15})`,
    ].join(', ')
  })

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '28px',
        zIndex: 9000,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Separator line above */}
      <div
        style={{
          width: '100%',
          height: '1px',
          marginBottom: '6px',
          background: 'linear-gradient(90deg, transparent, rgba(220, 20, 60, 0.5), transparent)',
          boxShadow: '0 0 6px 1px rgba(220,20,60,0.3)',
        }}
      />

      {/* TJ text — white base, neon crimson glow driven by rAF */}
      <span
        ref={glowRef}
        style={{
          display: 'block',
          fontFamily: '"Courier New", "Courier", monospace',
          fontSize: '13px',
          fontWeight: '700',
          letterSpacing: '0.3em',
          lineHeight: 1,
          color: '#ffffff',
        }}
      >
        TJ
      </span>
    </div>
  )
}
