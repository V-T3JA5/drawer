import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'
import '@/styles/globals.css'
import App from './App'

// Register GSAP plugins once at the top level
gsap.registerPlugin(ScrollTrigger)

// Locomotive Scroll instance is created after the DOM mounts.
// It is stored on window so any component can reference it without
// prop-drilling or context — R3F components need direct access.
// The scrollerProxy call below is the bridge that makes ScrollTrigger
// read Locomotive's virtual scroll position instead of window.scrollY.

let locomotiveScroll

function initScroll() {
  const scrollContainer = document.querySelector('[data-scroll-container]')

  if (!scrollContainer) {
    // Page did not mount a scroll container yet — this should not happen
    // if App renders synchronously, but guard anyway.
    console.warn('[DRAWER] No [data-scroll-container] found on init.')
    return
  }

  locomotiveScroll = new LocomotiveScroll({
    el: scrollContainer,
    smooth: true,
    multiplier: 0.9,
    lerp: 0.08,
    smartphone: { smooth: true },
    tablet: { smooth: true, breakpoint: 1024 },
  })

  // Tell GSAP ScrollTrigger to use Locomotive's scroll position
  // instead of window scroll. This is the required sync layer.
  ScrollTrigger.scrollerProxy(scrollContainer, {
    scrollTop(value) {
      if (arguments.length) {
        locomotiveScroll.scrollTo(value, { duration: 0, disableLerp: true })
      }
      return locomotiveScroll.scroll.instance.scroll.y
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }
    },
    pinType: scrollContainer.style.transform ? 'transform' : 'fixed',
  })

  // Each time Locomotive updates its scroll position, tell ScrollTrigger
  locomotiveScroll.on('scroll', ScrollTrigger.update)

  // Each time ScrollTrigger refreshes (resize, etc.), refresh Locomotive too
  ScrollTrigger.addEventListener('refresh', () => locomotiveScroll.update())

  // Initial refresh so both systems start in sync
  ScrollTrigger.refresh()

  // Expose globally for R3F components and GSAP animations to reference
  window.__locomotiveScroll = locomotiveScroll
}

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Init scroll after first paint so the DOM is present
requestAnimationFrame(() => {
  initScroll()
})
