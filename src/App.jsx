import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import WeekPage from './pages/WeekPage'
import CustomCursor from './components/CustomCursor'
import TJWatermark from './components/TJWatermark'
import BlueprintGrid from './components/BlueprintGrid'
import ClickBurst from './components/ClickBurst'

export default function App() {
  useEffect(() => {
    document.body.style.cursor = 'none'
  }, [])

  return (
    <BrowserRouter>
      {/* Global always-present elements */}
      <BlueprintGrid />
      <CustomCursor />
      <TJWatermark />
      <ClickBurst />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/week/:weekId" element={<WeekPage />} />
      </Routes>
    </BrowserRouter>
  )
}
