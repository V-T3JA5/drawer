/**
 * HelixScene.jsx — S4 (complete)
 *
 * The single Three.js / R3F Canvas for the homepage.
 *
 * Canvas singleton rule (project bible):
 * ParticleField.jsx currently runs its own canvas at z-0.
 * This canvas sits at z-10 with pointer-events: none during the opening sequence.
 * In S5 the particle logic moves here and ParticleField.jsx is retired.
 *
 * After the opening sequence fires onComplete:
 * - Zustand openingDone is set to true
 * - A fullscreen black overlay fades out (the helix transition)
 * - Pointer events on the canvas are re-enabled for card interaction (S5)
 *
 * S5 fills: helix geometry, week cards, pivot objects, particle absorption.
 */

import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { createArcSystem } from './electricArcSystem'
import OpeningSequence from './OpeningSequence'
import useSceneStore from '../store/scene'

// ─── Bloom tuning ─────────────────────────────────────────────────────────────
// Low threshold so crimson additive fragments contribute fully.
// High strength gives the neon electric look.
const BLOOM_THRESHOLD = 0.05
const BLOOM_STRENGTH  = 2.8
const BLOOM_RADIUS    = 0.7

// ─── ArcSystemManager ─────────────────────────────────────────────────────────
// Lives inside the Canvas. Creates the arc pool, attaches it to the scene,
// exposes it via arcSystemRef, and ticks it every frame.

function ArcSystemManager({ arcSystemRef }) {
  const { scene } = useThree()

  useEffect(() => {
    const group = new THREE.Group()
    group.name = 'arc-system'
    scene.add(group)

    const system = createArcSystem(group, 100, new THREE.Color(0xdc143c))
    arcSystemRef.current = system

    return () => {
      system.dispose()
      scene.remove(group)
      arcSystemRef.current = null
    }
  }, [scene, arcSystemRef])

  useFrame((_, delta) => {
    if (arcSystemRef.current) arcSystemRef.current.update(delta)
  })

  return null
}

// ─── HelixTransitionOverlay ───────────────────────────────────────────────────
// A black fullscreen div that fades out once the opening sequence completes,
// giving the illusion of the helix "fading in from behind" the DRAWER particles.

function HelixTransitionOverlay({ visible, onFadeComplete }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!visible || !overlayRef.current) return

    // Opening done — fade the overlay out
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 1.2,
      ease: 'power2.inOut',
      onComplete: () => {
        if (onFadeComplete) onFadeComplete()
      },
    })
  }, [visible, onFadeComplete])

  return (
    <div
      ref={overlayRef}
      style={{
        position:       'absolute',
        inset:          0,
        background:     '#000000',
        opacity:        1,
        zIndex:         5,
        pointerEvents:  'none',
      }}
    />
  )
}

// ─── SceneContents ────────────────────────────────────────────────────────────
// Renders inside the R3F Canvas.

function SceneContents({ onOpeningComplete }) {
  // The ref is created here and passed as a ref object to both ArcSystemManager
  // (which populates it) and OpeningSequence (which reads .current in useFrame).
  // This avoids the null race condition of passing .current at render time.
  const arcSystemRef = useRef(null)

  return (
    <>
      <ambientLight intensity={0} />

      {/* Arc system must mount before OpeningSequence in the tree.
          Both receive the same ref object — ArcSystemManager writes it,
          OpeningSequence reads it inside useFrame (well after mount). */}
      <ArcSystemManager arcSystemRef={arcSystemRef} />

      <OpeningSequence
        arcSystemRef={arcSystemRef}
        onComplete={onOpeningComplete}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={BLOOM_THRESHOLD}
          luminanceSmoothing={0.4}
          intensity={BLOOM_STRENGTH}
          radius={BLOOM_RADIUS}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// ─── HelixScene ───────────────────────────────────────────────────────────────

export default function HelixScene() {
  const setOpeningDone = useSceneStore((s) => s.setOpeningDone)
  const openingDone    = useSceneStore((s) => s.openingDone)
  const overlayRef     = useRef(null)

  const handleOpeningComplete = useCallback(() => {
    setOpeningDone(true)
  }, [setOpeningDone])

  const handleOverlayFadeComplete = useCallback(() => {
    // Re-enable pointer events on the canvas wrapper for S5 card interaction
    if (overlayRef.current) overlayRef.current.style.pointerEvents = 'auto'
  }, [])

  return (
    <div
      ref={overlayRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        10,
        pointerEvents: 'none',
        background:    '#000000',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 55, near: 0.1, far: 100 }}
        gl={{
          antialias:        true,
          alpha:            false,
          powerPreference:  'high-performance',
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]}
        frameloop="always"
        style={{ background: '#000000' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#000000'), 1)
        }}
      >
        <SceneContents onOpeningComplete={handleOpeningComplete} />
      </Canvas>

      {/* Helix transition fade overlay — sits above canvas, below cursor */}
      <HelixTransitionOverlay
        visible={openingDone}
        onFadeComplete={handleOverlayFadeComplete}
      />
    </div>
  )
}
