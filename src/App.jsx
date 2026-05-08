import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/Home'
import WeekPage from './pages/WeekPage'
import GlobalCursor from './components/GlobalCursor'
import TJWatermark from './components/TJWatermark'
import ParticleField from './components/ParticleField'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/week/:id',
    element: <WeekPage />,
  },
])

export default function App() {
  return (
    <>
      <ParticleField />
      <TJWatermark />
      <GlobalCursor />
      <RouterProvider router={router} />
    </>
  )
}
