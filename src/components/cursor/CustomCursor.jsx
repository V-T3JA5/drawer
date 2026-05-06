import { useEffect, useRef } from 'react'
import { useStore } from '@hooks/useStore'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const pos = useRef({ x: 0, y: 0 })
  const ringPos = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)

  const setCursorPos = useStore(s => s.setCursorPos)
  const setCursorHovered = useStore(s => s.setCursorHovered)
  const setCursorClicked = useStore(s => s.setCursorClicked)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // Animate ring with lag
    const animateRing = () => {
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.12
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.12

      dot.style.left = `${pos.current.x}px`
      dot.style.top = `${pos.current.y}px`
      ring.style.left = `${ringPos.current.x}px`
      ring.style.top = `${ringPos.current.y}px`

      rafRef.current = requestAnimationFrame(animateRing)
    }
    animateRing()

    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
      setCursorPos({ x: e.clientX, y: e.clientY })
    }

    const onEnterHover = (e) => {
      const el = e.target
      const isInteractive = el.matches('a, button, [data-hover], [role="button"]')
      if (isInteractive) {
        dot.style.width = '6px'
        dot.style.height = '6px'
        ring.style.width = '56px'
        ring.style.height = '56px'
        ring.style.borderColor = 'rgba(0,212,255,0.8)'
        setCursorHovered(true)
      }
    }

    const onLeaveHover = (e) => {
      dot.style.width = '12px'
      dot.style.height = '12px'
      ring.style.width = '36px'
      ring.style.height = '36px'
      ring.style.borderColor = 'rgba(0,212,255,0.5)'
      setCursorHovered(false)
    }

    const onMouseDown = () => {
      dot.style.transform = 'translate(-50%, -50%) scale(0.7)'
      ring.style.transform = 'translate(-50%, -50%) scale(0.85)'
      setCursorClicked(true)
    }

    const onMouseUp = () => {
      dot.style.transform = 'translate(-50%, -50%) scale(1)'
      ring.style.transform = 'translate(-50%, -50%) scale(1)'
      setCursorClicked(false)
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onEnterHover)
    document.addEventListener('mouseout', onLeaveHover)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onEnterHover)
      document.removeEventListener('mouseout', onLeaveHover)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{
          position: 'fixed',
          width: '12px',
          height: '12px',
          background: '#00d4ff',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          mixBlendMode: 'screen',
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.2s ease, height 0.2s ease, transform 0.1s ease',
          boxShadow: '0 0 10px #00d4ff, 0 0 20px rgba(0,212,255,0.5)',
          left: 0,
          top: 0,
        }}
      />
      <div
        ref={ringRef}
        className="cursor-ring"
        style={{
          position: 'fixed',
          width: '36px',
          height: '36px',
          border: '1px solid rgba(0,212,255,0.5)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99998,
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1), height 0.25s cubic-bezier(0.16,1,0.3,1), border-color 0.2s ease',
          left: 0,
          top: 0,
        }}
      />
    </>
  )
}
