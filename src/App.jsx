// src/App.jsx
// Root layout component — global effects always mounted, pages injected via Outlet.
// Router lives in main.jsx only. Do NOT add another router here.
//
// Render order (z-index):
//   ParticleField   z-0   — ambient 3D particles (temporary standalone canvas, absorbed into helix in S5)
//   [page content]  z-1   — Home.jsx canvas, WeekPage, etc (injected by Outlet)
//   TJWatermark     z-9000 — always visible bottom-right
//   GlobalCursor    z-9999 — always on top

import { Outlet } from 'react-router-dom'
import GlobalCursor from './components/GlobalCursor'
import TJWatermark from './components/TJWatermark'
import ParticleField from './components/ParticleField'

export default function App() {
  return (
    <>
      {/* Layer 1: ambient particle canvas (z-0) */}
      <ParticleField />

      {/* Layer 2: page content — Home, WeekPage, etc */}
      <Outlet />

      {/* Layer 3: always-on UI */}
      <TJWatermark />
      <GlobalCursor />
    </>
  )
}
