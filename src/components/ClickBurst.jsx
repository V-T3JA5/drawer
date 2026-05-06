import { useEffect, useRef } from 'react'

export default function ClickBurst() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current

    const burst = (e) => {
      const count = 10
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div')
        const angle = (i / count) * 360
        const distance = 30 + Math.random() * 40
        const size = 2 + Math.random() * 3
        const duration = 400 + Math.random() * 300

        particle.style.cssText = `
          position: fixed;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: rgba(0, 212, 255, ${0.6 + Math.random() * 0.4});
          box-shadow: 0 0 ${size * 2}px rgba(0, 212, 255, 0.8);
          pointer-events: none;
          z-index: 999990;
          transform: translate(-50%, -50%);
          transition: transform ${duration}ms ease-out, opacity ${duration}ms ease-out;
        `

        container.appendChild(particle)

        requestAnimationFrame(() => {
          const rad = (angle * Math.PI) / 180
          const tx = Math.cos(rad) * distance
          const ty = Math.sin(rad) * distance
          particle.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`
          particle.style.opacity = '0'
        })

        setTimeout(() => {
          if (container.contains(particle)) container.removeChild(particle)
        }, duration + 50)
      }

      // Crosshair flash ring
      const ring = document.createElement('div')
      ring.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        width: 8px;
        height: 8px;
        border: 1px solid rgba(0, 212, 255, 0.8);
        border-radius: 50%;
        pointer-events: none;
        z-index: 999989;
        transform: translate(-50%, -50%);
        transition: width 300ms ease-out, height 300ms ease-out, opacity 300ms ease-out;
      `
      container.appendChild(ring)
      requestAnimationFrame(() => {
        ring.style.width = '60px'
        ring.style.height = '60px'
        ring.style.opacity = '0'
      })
      setTimeout(() => {
        if (container.contains(ring)) container.removeChild(ring)
      }, 350)
    }

    window.addEventListener('click', burst)
    return () => window.removeEventListener('click', burst)
  }, [])

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999989 }} />
}
