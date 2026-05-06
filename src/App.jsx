import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Global always-on effects
import CustomCursor from '@components/cursor/CustomCursor'
import TJWatermark from '@components/watermark/TJWatermark'
import BlueprintGrid from '@components/effects/BlueprintGrid'
import Scanlines from '@components/effects/Scanlines'
import ClickRipple from '@components/effects/ClickRipple'
import ParticleAmbience from '@components/particles/ParticleAmbience'

// Pages
import Landing from '@pages/Landing'
import WeekPage from '@pages/WeekPage'

// Global store
import { useStore } from '@hooks/useStore'

function App() {
  return (
    <BrowserRouter>
      {/* ── Global Effects Layer (always visible) ── */}
      <BlueprintGrid />
      <Scanlines />
      <CustomCursor />
      <TJWatermark />
      <ClickRipple />
      <ParticleAmbience />

      {/* ── Routes ── */}
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/week/:weekId" element={<WeekPage />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  )
}

export default App
