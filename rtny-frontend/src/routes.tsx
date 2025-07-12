import { Routes, Route } from 'react-router-dom'
import { Home } from './components/Home'
import { Events } from './components/Events'
import { EventDetails } from './components/EventDetails'
import { UserProfile } from './components/UserProfile'
import { AuthModal } from './components/AuthModal'
import { Layout } from './components/Layout'

export function Routes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:eventId" element={<EventDetails />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/auth" element={<AuthModal />} />
      </Route>
    </Routes>
  )
}
