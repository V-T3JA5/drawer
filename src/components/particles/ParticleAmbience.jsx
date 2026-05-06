import { useEffect, useRef } from 'react'

export default function ParticleAmbience() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn ambient particles
    const PARTICLE_COUNT = 60
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 0.5 + Math.random() * 1.5,
      speed: 0.1 + Math.random() * 0.3,
      opacity: 0.1 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    }))

    let t = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.005

      for (const p of particles) {
        p.y -= p.speed
        p.x += p.drift + Math.sin(t + p.phase) * 0.1

        if (p.y < -5) {
          p.y = canvas.height + 5
          p.x = Math.random() * canvas.width
        }
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0

        const pulse = 0.5 + Math.sin(t * 2 + p.phase) * 0.3
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity * pulse})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}
