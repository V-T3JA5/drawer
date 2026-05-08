import { useRef } from 'react'
import { motion, useAnimationFrame } from 'framer-motion'

// Iridescent color stops that cycle through — crimson-to-violet-to-teal-to-crimson
// Each stop is an OKLCH hue value so the cycle is perceptually uniform
const HUE_KEYFRAMES = [0, 280, 185, 340, 0] // degrees — crimson → violet → teal → rose → back

export default function TJWatermark() {
  const glowRef = useRef(null)
  const timeRef = useRef(0)

  // Drive the iridescent hue shift via rAF — no React re-renders, pure DOM mutation
  useAnimationFrame((t) => {
    timeRef.current = t
    if (!glowRef.current) return

    // Slow cycle: full rotation every 6 seconds
    const cycle = (t / 6000) % 1
    // Map cycle to hue — smooth interpolation across the stops
    const segmentCount = HUE_KEYFRAMES.length - 1
    const rawSegment = cycle * segmentCount
    const segment = Math.floor(rawSegment)
    const segT = rawSegment - segment
    const h0 = HUE_KEYFRAMES[segment]
    const h1 = HUE_KEYFRAMES[segment + 1]
    // Smooth step interpolation
    const st = segT * segT * (3 - 2 * segT)
    const hue = h0 + (h1 - h0) * st

    // Pulse: 0.6 → 1 brightness, period ~3.5s
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((t / 3500) * Math.PI * 2))

    const alpha = pulse * 0.85
    const glowAlpha = pulse * 0.35
    const glowAlpha2 = pulse * 0.12

    glowRef.current.style.color = `oklch(${0.7 + pulse * 0.2} 0.22 ${hue})`
    glowRef.current.style.textShadow = [
      `0 0 12px oklch(${0.8} 0.28 ${hue} / ${glowAlpha})`,
      `0 0 28px oklch(${0.75} 0.22 ${hue} / ${glowAlpha2 * 1.5})`,
      `0 0 55px oklch(${0.65} 0.18 ${hue} / ${glowAlpha2})`,
    ].join(', ')
    glowRef.current.style.opacity = alpha
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
      {/* Outer ambient bloom — separate div so it can be larger than the text */}
      <motion.div
        style={{
          position: 'absolute',
          inset: '-20px -24px',
          borderRadius: '12px',
          background: 'radial-gradient(ellipse at center, rgba(220, 20, 60, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
        animate={{
          opacity: [0.4, 0.9, 0.4],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* The TJ text itself — hue shift driven by useAnimationFrame above */}
      <span
        ref={glowRef}
        style={{
          display: 'block',
          fontFamily: '"Courier New", "Courier", monospace',
          fontSize: '13px',
          fontWeight: '700',
          letterSpacing: '0.3em',
          lineHeight: 1,
          color: 'rgba(220, 20, 60, 0.85)',
          position: 'relative',
        }}
      >
        TJ
      </span>

      {/* Thin separator line above — reinforces watermark as a design element */}
      <motion.div
        style={{
          width: '100%',
          height: '1px',
          marginBottom: '6px',
          background: 'linear-gradient(90deg, transparent, rgba(220, 20, 60, 0.4), transparent)',
        }}
        animate={{
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          // Offset from the main pulse so they breathe at different rates
          delay: 1.2,
        }}
      />
    </div>
  )
}
