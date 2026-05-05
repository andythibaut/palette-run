import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

// Pages
import SplashPage      from '@/pages/SplashPage'
import AuthPage        from '@/pages/AuthPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import OnboardingPage  from '@/pages/OnboardingPage'
import DriverApp       from '@/pages/DriverApp'
import CompanyApp      from '@/pages/CompanyApp'
import LoadingScreen   from '@/components/shared/LoadingScreen'

// Guard : redirige si non connecté
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/auth" replace />
  return children
}

// Guard : redirige selon le rôle
const RoleRoute = ({ role, children }) => {
  const { profile, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!profile) return <Navigate to="/onboarding" replace />
  if (profile.role !== role) {
    return <Navigate to={profile.role === 'driver' ? '/app' : '/company'} replace />
  }
  return children
}

export default function App() {
  const { init, loading } = useAuthStore()

  useEffect(() => { init() }, [])

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<SplashPage />} />
      <Route path="/auth"          element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/reset"    element={<ResetPasswordPage />} />

      {/* Onboarding — connecté mais sans profil */}
      <Route path="/onboarding" element={
        <PrivateRoute><OnboardingPage /></PrivateRoute>
      } />

      {/* App acheteur */}
      <Route path="/app/*" element={
        <PrivateRoute>
          <RoleRoute role="driver">
            <DriverApp />
          </RoleRoute>
        </PrivateRoute>
      } />

      {/* App vendeur */}
      <Route path="/company/*" element={
        <PrivateRoute>
          <RoleRoute role="company">
            <CompanyApp />
          </RoleRoute>
        </PrivateRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
