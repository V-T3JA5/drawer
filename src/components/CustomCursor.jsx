import { useEffect, useRef, useState } from 'react'
import './CustomCursor.css'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const actualPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
  const rafRef = useRef(null)
  const [clicking, setClicking] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY }
    }

    const onDown = () => setClicking(true)
    const onUp = () => setClicking(false)

    const onHoverIn = (e) => {
      if (e.target.matches('a, button, [data-hover], .week-card, .btn-step, .sidebar-question')) {
        setHovering(true)
      }
    }
    const onHoverOut = (e) => {
      if (e.target.matches('a, button, [data-hover], .week-card, .btn-step, .sidebar-question')) {
        setHovering(false)
      }
    }

    // Smooth cursor follow with lerp
    const lerp = (a, b, t) => a + (b - a) * t
    const animate = () => {
      actualPos.current.x = lerp(actualPos.current.x, posRef.current.x, 0.12)
      actualPos.current.y = lerp(actualPos.current.y, posRef.current.y, 0.12)

      if (dotRef.current) {
        dotRef.current.style.left = posRef.current.x + 'px'
        dotRef.current.style.top = posRef.current.y + 'px'
      }
      if (ringRef.current) {
        ringRef.current.style.left = actualPos.current.x + 'px'
        ringRef.current.style.top = actualPos.current.y + 'px'
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    animate()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseover', onHoverIn)
    document.addEventListener('mouseout', onHoverOut)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseover', onHoverIn)
      document.removeEventListener('mouseout', onHoverOut)
    }
  }, [])

  return (
    <>
      {/* Crosshair cursor — AutoCAD style */}
      <div
        ref={dotRef}
        className={`autocad-cursor ${hovering ? 'hovering' : ''} ${clicking ? 'clicking' : ''}`}
      >
        {/* Horizontal arm left */}
        <div className="arm arm-left" />
        {/* Horizontal arm right */}
        <div className="arm arm-right" />
        {/* Vertical arm top */}
        <div className="arm arm-top" />
        {/* Vertical arm bottom */}
        <div className="arm arm-bottom" />
        {/* Center square */}
        <div className="center-square" />
      </div>

      {/* Lagging outer ring */}
      <div
        ref={ringRef}
        className={`cursor-outer-ring ${hovering ? 'hovering' : ''} ${clicking ? 'clicking' : ''}`}
      />
    </>
  )
}
