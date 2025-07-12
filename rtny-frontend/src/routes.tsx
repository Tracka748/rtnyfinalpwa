import { Routes, Route } from 'react-router-dom'
import { Home } from './components/Home'
import { AuthModal } from './components/AuthModal'
import { Layout } from './components/Layout'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthModal />} />
      </Route>
    </Routes>
  )
}
