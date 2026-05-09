// src/three/OpeningSequence.jsx
// Glitch flicker opening — pure DOM, zero lag.
// Font: Share Tech Mono (tech/terminal aesthetic)
// Letters: white base colour, dark neon red glow layers

import { useEffect, useRef } from 'react'

// ─── Timing (ms) ─────────────────────────────────────────────────────────────

const T_IDLE        = 600
const T_FLICKER_IN  = 1400
const T_HOLD        = 1000
const T_FLICKER_OUT = 800
const T_BEAT        = 300
const T_REVEAL      = 2400
const T_HOLD_DRAWER = 1500

// ─── Colours & glow ──────────────────────────────────────────────────────────
// Base letter colour: white
// Glow: dark neon red — #8b0000 core bloom, #6b0000 outer, no bright red (#dc143c)

const LETTER_COLOR = '#ffffff'

// Tight glow — used while flickering / unstable
const GLOW_TIGHT = [
  '0 0 4px rgba(255,255,255,0.9)',
  '0 0 10px rgba(180,0,0,0.8)',
  '0 0 22px rgba(120,0,0,0.6)',
].join(', ')

// Full glow — used when locked solid
const GLOW_FULL = [
  '0 0 4px rgba(255,255,255,1)',
  '0 0 12px rgba(200,0,0,0.9)',
  '0 0 30px rgba(139,0,0,0.8)',
  '0 0 60px rgba(100,0,0,0.5)',
  '0 0 110px rgba(70,0,0,0.25)',
].join(', ')

// Snap flash — very brief white-hot moment when a letter first locks
const GLOW_SNAP = [
  '0 0 6px rgba(255,255,255,1)',
  '0 0 16px rgba(255,255,255,0.8)',
  '0 0 30px rgba(180,0,0,0.9)',
  '0 0 60px rgba(139,0,0,0.7)',
  '0 0 100px rgba(80,0,0,0.4)',
].join(', ')

const FONT = "'Share Tech Mono', 'Courier New', monospace"

const DRAWER_LETTERS = ['D', 'R', 'A', 'W', 'E', 'R']

// ─── Flicker helper ───────────────────────────────────────────────────────────

function flickerOpacity(stability) {
  // stability 0→1: 0 = wildly unstable, 1 = solid
  const base  = stability * 0.85
  const noise = (Math.random() - 0.5) * (1 - stability) * 1.6
  return Math.max(0, Math.min(1, base + noise))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpeningSequence({ onComplete }) {
  const containerRef = useRef(null)
  const tjRef        = useRef(null)
  const drawerRefs   = useRef([])
  const rafRef       = useRef(null)
  const startTime    = useRef(null)
  const doneRef      = useRef(false)

  useEffect(() => {
    const tjEl      = tjRef.current
    const drawerEls = drawerRefs.current
    if (!tjEl) return

    tjEl.style.opacity = '0'
    drawerEls.forEach(el => { if (el) el.style.opacity = '0' })

    startTime.current = performance.now()

    function tick(now) {
      if (doneRef.current) return

      const elapsed = now - startTime.current

      // ── IDLE ────────────────────────────────────────────────────────────
      if (elapsed < T_IDLE) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── FLICKER_IN (TJ) ─────────────────────────────────────────────────
      const tIn = elapsed - T_IDLE
      if (tIn < T_FLICKER_IN) {
        const progress  = tIn / T_FLICKER_IN
        const stability = Math.pow(progress, 2.5)
        const op        = flickerOpacity(stability)

        tjEl.style.opacity    = op
        tjEl.style.textShadow = progress > 0.85 ? GLOW_FULL : GLOW_TIGHT

        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── HOLD (TJ solid) ─────────────────────────────────────────────────
      const tHold = elapsed - T_IDLE - T_FLICKER_IN
      if (tHold < T_HOLD) {
        tjEl.style.opacity    = '1'
        tjEl.style.textShadow = GLOW_FULL
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── FLICKER_OUT (TJ dies) ───────────────────────────────────────────
      const tOut = elapsed - T_IDLE - T_FLICKER_IN - T_HOLD
      if (tOut < T_FLICKER_OUT) {
        const progress  = tOut / T_FLICKER_OUT
        const stability = 1 - Math.pow(progress, 1.5)
        const op        = flickerOpacity(stability)

        tjEl.style.opacity    = op
        tjEl.style.textShadow = GLOW_TIGHT
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      tjEl.style.opacity = '0'

      // ── BEAT (black) ────────────────────────────────────────────────────
      const tBeat = elapsed - T_IDLE - T_FLICKER_IN - T_HOLD - T_FLICKER_OUT
      if (tBeat < T_BEAT) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── REVEAL (DRAWER letters one by one) ──────────────────────────────
      const tReveal = elapsed - T_IDLE - T_FLICKER_IN - T_HOLD - T_FLICKER_OUT - T_BEAT
      if (tReveal < T_REVEAL) {
        const n          = DRAWER_LETTERS.length
        const windowSize = T_REVEAL / n
        const overlap    = 180

        drawerEls.forEach((el, i) => {
          if (!el) return
          const letterStart = i * (windowSize - overlap)
          const letterT     = tReveal - letterStart
          if (letterT < 0) { el.style.opacity = '0'; return }

          const progress  = Math.min(letterT / (windowSize + overlap), 1)
          const stability = Math.pow(progress, 3)
          const op        = flickerOpacity(stability)

          el.style.opacity = op

          if (progress > 0.85 && progress < 0.96) {
            el.style.textShadow = GLOW_SNAP
          } else if (progress >= 0.96) {
            el.style.textShadow = GLOW_FULL
          } else {
            el.style.textShadow = GLOW_TIGHT
          }
        })

        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // All letters locked
      drawerEls.forEach(el => {
        if (!el) return
        el.style.opacity    = '1'
        el.style.textShadow = GLOW_FULL
      })

      // ── HOLD_DRAWER ─────────────────────────────────────────────────────
      const tHoldD = elapsed - T_IDLE - T_FLICKER_IN - T_HOLD - T_FLICKER_OUT - T_BEAT - T_REVEAL
      if (tHoldD < T_HOLD_DRAWER) {
        const pulse = 0.88 + 0.12 * Math.sin((tHoldD / 380) * Math.PI * 2)
        drawerEls.forEach(el => {
          if (!el) return
          el.style.opacity = pulse
        })
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // ── DONE ────────────────────────────────────────────────────────────
      doneRef.current = true
      if (onComplete) onComplete()
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      doneRef.current = true
    }
  }, [onComplete])

  return (
    <div
      ref={containerRef}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         20,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        pointerEvents:  'none',
        userSelect:     'none',
      }}
    >
      {/* TJ */}
      <div
        ref={tjRef}
        style={{
          position:      'absolute',
          fontFamily:    FONT,
          fontSize:      'clamp(80px, 18vw, 220px)',
          fontWeight:    '400',
          letterSpacing: '0.2em',
          color:         LETTER_COLOR,
          opacity:       0,
          willChange:    'opacity, text-shadow',
        }}
      >
        TJ
      </div>

      {/* DRAWER — individual letters */}
      <div
        style={{
          position:   'absolute',
          display:    'flex',
          gap:        'clamp(2px, 0.8vw, 12px)',
          fontFamily: FONT,
          fontSize:   'clamp(52px, 11vw, 140px)',
          fontWeight: '400',
          color:      LETTER_COLOR,
        }}
      >
        {DRAWER_LETTERS.map((letter, i) => (
          <span
            key={letter + i}
            ref={el => { drawerRefs.current[i] = el }}
            style={{
              opacity:    0,
              willChange: 'opacity, text-shadow',
              display:    'inline-block',
            }}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  )
}
