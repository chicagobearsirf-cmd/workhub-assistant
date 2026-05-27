import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import LoginScreen    from './screens/LoginScreen'
import ChatScreen     from './screens/ChatScreen'
import UploadScreen   from './screens/UploadScreen'
import DashboardScreen from './screens/DashboardScreen'
import { getSession } from './lib/session'

/** Redirects to /chat if already authenticated */
function PublicRoute({ children }) {
  return getSession() ? <Navigate to="/chat" replace /> : children
}

/** Redirects to / (login) if no valid session */
function ProtectedRoute({ children }) {
  return getSession() ? children : <Navigate to="/" replace />
}

/** Inner layout — needs to be inside BrowserRouter to call useLocation */
function AppLayout() {
  const location = useLocation()
  const isLogin  = location.pathname === '/'

  return (
    <div className="flex flex-col h-full bg-[#050d1a]">
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/"          element={<PublicRoute><LoginScreen /></PublicRoute>} />
          <Route path="/chat"      element={<ProtectedRoute><ChatScreen /></ProtectedRoute>} />
          <Route path="/upload"    element={<ProtectedRoute><UploadScreen /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
          {/* Fallback — logged-in users land on /chat, others on login */}
          <Route path="*" element={<Navigate to={getSession() ? '/chat' : '/'} replace />} />
        </Routes>
      </main>
      {!isLogin && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
