import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from '@/pages/Home'
import WeekPage from '@/pages/WeekPage'

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
  return <RouterProvider router={router} />
}
