import { useEffect, useRef, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { useStore } from '@hooks/useStore'
import HelixScene from '@components/helix/HelixScene'

export default function Landing() {
  const isLoading = useStore(s => s.isLoading)
  const setLoading = useStore(s => s.setLoading)

  // Simulate intro → then show helix
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* ── 3D Canvas (full screen, behind everything) ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2 }}>
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <HelixScene />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Intro overlay (shows during loading) ── */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000508',
          }}
        >
          <IntroSequence />
        </motion.div>
      )}

      {/* ── UI layer over canvas ── */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ position: 'relative', zIndex: 5, height: '100vh', pointerEvents: 'none' }}
        >
          {/* Top left brand */}
          <div style={{ 
            position: 'absolute', top: 32, left: 40,
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.3em',
            color: 'rgba(0,212,255,0.6)',
            textTransform: 'uppercase',
          }}>
            DRAWER / TJ
          </div>

          {/* Top right label */}
          <div style={{
            position: 'absolute', top: 32, right: 40,
            fontFamily: 'Space Mono, monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'rgba(0,212,255,0.4)',
          }}>
            AUTOCAD LEARNING / 11 WEEKS
          </div>

          {/* Scroll hint at bottom (above watermark) */}
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              pointerEvents: 'none',
            }}
          >
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.25em',
              color: 'rgba(0,212,255,0.4)',
            }}>SCROLL TO EXPLORE</span>
            <div style={{
              width: 1,
              height: 30,
              background: 'linear-gradient(to bottom, rgba(0,212,255,0.5), transparent)',
            }} />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

// ── Intro animation: TJ → DRAWER ──────────────────────
function IntroSequence() {
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      {/* TJ appears first */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0, 1, 1, 0],
          scale: [0.8, 1, 1, 1.15],
          filter: ['blur(20px)', 'blur(0px)', 'blur(0px)', 'blur(8px)'],
        }}
        transition={{
          duration: 2.4,
          times: [0, 0.25, 0.7, 1],
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(4rem, 12vw, 9rem)',
          color: '#00d4ff',
          letterSpacing: '0.05em',
          textShadow: '0 0 30px #00d4ff, 0 0 60px rgba(0,212,255,0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        TJ
      </motion.div>

      {/* DRAWER appears after TJ fades */}
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.5em' }}
        animate={{ opacity: [0, 0, 1], letterSpacing: ['0.5em', '0.3em', '0.08em'] }}
        transition={{
          duration: 2.8,
          times: [0, 0.6, 1],
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(3.5rem, 10vw, 8rem)',
          color: '#00d4ff',
          textShadow: '0 0 20px #00d4ff, 0 0 50px rgba(0,212,255,0.4)',
        }}
      >
        DRAWER
      </motion.div>
    </div>
  )
}
