// src/main.jsx
// Vite entry point. Sets up GSAP, Locomotive Scroll v4, and React Router.
//
// LOCOMOTIVE SCROLL INIT STRATEGY (S4 fix):
//   Original S2 code used a single requestAnimationFrame, which fires before React Router
//   has rendered the route component — so [data-scroll-container] didn't exist yet.
//   Fix: MutationObserver watches the DOM and initialises Locomotive the moment
//   [data-scroll-container] appears. Falls back cleanly on pages without it.
//
// KNOWN CONFLICTS (from S2 session log — do not change without reading first):
//   - Locomotive pinned to v4 — v5 dropped scrollerProxy API
//   - GSAP ScrollTrigger sync via scrollerProxy + proxy.scrollTop
//   - React Router v7 createBrowserRouter pattern

import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LocomotiveScroll from 'locomotive-scroll'
import 'locomotive-scroll/dist/locomotive-scroll.css'

import App from './App'
import './styles/globals.css'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

// ─── Routes ──────────────────────────────────────────────────────────────────

import Home from './pages/Home'
import WeekPage from './pages/WeekPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'week/:id', element: <WeekPage /> },
    ],
  },
])

// ─── Locomotive Scroll init ───────────────────────────────────────────────────
// Waits for [data-scroll-container] to appear in the DOM before initialising.
// This handles React Router's async route rendering — the container div in
// Home.jsx / WeekPage.jsx is not in the DOM when main.jsx first executes.

function initLocomotive(container) {
  const locoScroll = new LocomotiveScroll({
    el: container,
    smooth: true,
    multiplier: 1,
    class: 'is-revealed',
  })

  // Sync GSAP ScrollTrigger with Locomotive Scroll
  ScrollTrigger.scrollerProxy(container, {
    scrollTop(value) {
      return arguments.length
        ? locoScroll.scrollTo(value, { duration: 0, disableLerp: true })
        : locoScroll.scroll.instance.scroll.y
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
    },
    pinType: container.style.transform ? 'transform' : 'fixed',
  })

  locoScroll.on('scroll', ScrollTrigger.update)
  ScrollTrigger.addEventListener('refresh', () => locoScroll.update())
  ScrollTrigger.refresh()

  // Expose globally for R3F components and GSAP animations to access
  window.__locomotiveScroll = locoScroll

  return locoScroll
}

// Watch for [data-scroll-container] to appear — fires whenever React Router
// mounts a new page. Re-init on route changes by watching for removal + re-add.
let currentLocoInstance = null

function watchForScrollContainer() {
  const observer = new MutationObserver(() => {
    const container = document.querySelector('[data-scroll-container]')

    if (container && !container.__locoAttached) {
      // Clean up previous instance if navigating between pages
      if (currentLocoInstance) {
        currentLocoInstance.destroy()
        currentLocoInstance = null
        window.__locomotiveScroll = null
      }

      container.__locoAttached = true
      currentLocoInstance = initLocomotive(container)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

watchForScrollContainer()

// ─── React mount ─────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
