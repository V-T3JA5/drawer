import { useEffect, useRef } from 'react'

export default function ClickRipple() {
  const canvasRef = useRef(null)
  const particles = useRef([])
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

    const spawnRipple = (x, y) => {
      const count = 12
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
        const speed = 1.5 + Math.random() * 3
        particles.current.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.03 + Math.random() * 0.03,
          size: 1 + Math.random() * 2,
        })
      }
      // Ring
      particles.current.push({
        x, y, type: 'ring',
        radius: 2,
        maxRadius: 40 + Math.random() * 20,
        life: 1,
        decay: 0.04,
      })
    }

    const onClick = (e) => spawnRipple(e.clientX, e.clientY)
    window.addEventListener('click', onClick)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.current = particles.current.filter(p => p.life > 0)

      for (const p of particles.current) {
        p.life -= p.decay

        if (p.type === 'ring') {
          p.radius += (p.maxRadius - p.radius) * 0.15
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0, 212, 255, ${p.life * 0.6})`
          ctx.lineWidth = 1
          ctx.stroke()
        } else {
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.95
          p.vy *= 0.95
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(0, 212, 255, ${p.life * 0.8})`
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('click', onClick)
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
        zIndex: 99997,
      }}
    />
  )
}
