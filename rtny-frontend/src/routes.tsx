import { Routes, Route } from 'react-router-dom'
import { Home } from './components/Home'
import { Events } from './components/Events'
import { AuthModal } from './components/AuthModal'
import { Layout } from './components/Layout'
import { UserProfile } from './components/UserProfile'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <Layout>
          <Routes>
            <Route index element={<Home />} />
            <Route path="events" element={<Events />} />
          </Routes>
        </Layout>
      }> 

      </Route>
      <Route path="/profile" element={<UserProfile onClose={() => {}} />} />
      <Route path="/auth" element={<AuthModal isOpen={true} onClose={() => {}} />} />
    </Routes>
  )
}
