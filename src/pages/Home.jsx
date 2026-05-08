// src/pages/Home.jsx
// S4: Opening sequence host. S5 will add helix content after onComplete fires.

import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import OpeningSequence from '../three/OpeningSequence'

export default function Home() {
  const [sequenceDone, setSequenceDone] = useState(false)

  return (
    // data-scroll-container REQUIRED — Locomotive Scroll v4 won't attach without this
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
      {/* Main R3F canvas — alpha:true so it composites over ParticleField once fragments fade */}
      <Canvas
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        camera={{ position: [0, 0, 8], fov: 60, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.05} />

        <OpeningSequence onComplete={() => setSequenceDone(true)} />

        {/* Bloom — low threshold ensures all fragments + arcs glow */}
        <EffectComposer>
          <Bloom
            kernelSize={KernelSize.LARGE}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.4}
            intensity={2.2}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* S5 mounts helix scroll UI here after onComplete fires */}
      {sequenceDone && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
