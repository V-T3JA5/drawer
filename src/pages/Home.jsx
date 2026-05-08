// src/pages/Home.jsx
// S4: Opening sequence host. S5 will add helix content after onComplete fires.

import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import OpeningSequence from '../three/OpeningSequence'

export default function Home() {
  const [sequenceDone, setSequenceDone] = useState(false)

  const handleSequenceComplete = useCallback(() => {
    setSequenceDone(true)
    // S5 will use this to reveal the helix scroll experience
  }, [])

  return (
    // data-scroll-container required for Locomotive Scroll v4 + GSAP ScrollTrigger sync
    // Added here per S2 critical reminder
    <div
      data-scroll-container
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Main canvas — opening sequence now, helix in S5. z-index 1 so it's above ParticleField (z-0) */}
      <Canvas
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        {/* Minimal ambient — bloom will handle most of the glow */}
        <ambientLight intensity={0.05} />

        <OpeningSequence onComplete={handleSequenceComplete} />

        {/* Post-processing bloom — crimson/white glow for fragments + arcs */}
        <EffectComposer>
          <Bloom
            kernelSize={KernelSize.LARGE}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.4}
            intensity={1.8}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* S5 will mount the helix UI overlay here when sequenceDone === true */}
      {sequenceDone && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            // S5 mounts helix scroll content here
          }}
        />
      )}
    </div>
  )
}
