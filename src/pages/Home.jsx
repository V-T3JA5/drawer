// src/pages/Home.jsx
// S4b — Opening sequence host.
// Mounts HelixScene (which owns the R3F canvas + opening animation).
// Locks Locomotive Scroll during the sequence, unlocks on completion.
// S5 fills the helix scroll experience after openingDone fires.
//
// REQUIRED: data-scroll-container on outermost div — Locomotive Scroll v4
// will not attach without it (see main.jsx MutationObserver + project bible).

import { useEffect, useRef } from 'react'
import HelixScene from '../three/HelixScene'
import useSceneStore from '../store/scene'

export default function Home() {
  const openingDone = useSceneStore((s) => s.openingDone)
  const containerRef = useRef(null)

  // Lock / unlock Locomotive Scroll around the opening sequence.
  // During the sequence the page must not scroll — it would break the
  // GSAP ScrollTrigger sync and the helix entry (S5).
  useEffect(() => {
    const loco = window.__locomotiveScroll
    if (!loco) return

    if (!openingDone) {
      // Lock scroll at position 0 for the duration of the opening
      loco.stop()
    } else {
      loco.start()
    }
  }, [openingDone])

  return (
    <div
      ref={containerRef}
      data-scroll-container
      style={{
        position:   'fixed',
        inset:      0,
        width:      '100vw',
        height:     '100vh',
        background: '#000000',
        overflow:   'hidden',
      }}
    >
      {/* HelixScene owns the single R3F canvas.
          During the opening it covers the full viewport (z-10, pointer-events:none).
          After openingDone it re-enables pointer events for card interaction (S5). */}
      <HelixScene />

      {/* S5 mounts helix scroll content here once openingDone is true.
          Kept as an invisible placeholder now so the DOM structure is stable. */}
      <div
        data-scroll
        style={{
          position:      'absolute',
          inset:         0,
          zIndex:        2,
          pointerEvents: openingDone ? 'auto' : 'none',
          opacity:       openingDone ? 1 : 0,
          transition:    'opacity 0.8s ease',
        }}
      >
        {/* S5 fills this */}
      </div>
    </div>
  )
}
