import { useEffect } from 'react'
import { useStore } from './useStore'

export function useScrollTracker() {
  const setScrollProgress = useStore(s => s.setScrollProgress)
  const setScrollVelocity = useStore(s => s.setScrollVelocity)

  useEffect(() => {
    let lastY = window.scrollY
    let lastTime = Date.now()
    let velocity = 0

    const onScroll = () => {
      const now = Date.now()
      const currentY = window.scrollY
      const dt = now - lastTime
      velocity = dt > 0 ? (currentY - lastY) / dt : 0

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? currentY / maxScroll : 0

      setScrollProgress(progress)
      setScrollVelocity(velocity)

      lastY = currentY
      lastTime = now
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
}
