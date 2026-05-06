import { useState, useEffect, useRef } from 'react'

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&'

/**
 * useGlitchText — scrambles text then resolves to final value
 * @param {string} text — target text to resolve to
 * @param {number} duration — ms to run glitch effect
 * @param {boolean} trigger — re-trigger on change
 */
export function useGlitchText(text, duration = 600, trigger = true) {
  const [display, setDisplay] = useState(text)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!trigger) return
    const startTime = Date.now()
    const len = text.length

    const update = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const resolvedChars = Math.floor(progress * len)

      const scrambled = text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          if (i < resolvedChars) return char
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        })
        .join('')

      setDisplay(scrambled)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(update)
      } else {
        setDisplay(text)
      }
    }

    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [text, trigger])

  return display
}
