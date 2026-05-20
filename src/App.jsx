import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

// Pages
import SplashPage       from '@/pages/SplashPage'
import AuthPage         from '@/pages/AuthPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import OnboardingPage   from '@/pages/OnboardingPage'
import DriverApp        from '@/pages/DriverApp'
import CompanyApp       from '@/pages/CompanyApp'
import PublicMapPage    from '@/pages/PublicMapPage'
import PrivacyPage      from '@/pages/PrivacyPage'
import LoadingScreen    from '@/components/shared/LoadingScreen'
import PWAInstallBanner from '@/components/shared/PWAInstallBanner'

// Redirige les utilisateurs connectés vers leur app
const PublicRoute = ({ children }) => {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (user && profile) {
    return <Navigate to={profile.role === 'driver' ? '/app' : '/company'} replace />
  }
  return children
}

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

function NavigationListener() {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'NAVIGATE') navigate(e.data.url)
    }
    navigator.serviceWorker?.addEventListener('message', handler)
    return () => navigator.serviceWorker?.removeEventListener('message', handler)
  }, [navigate])
  return null
}

function AutoUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(reg => {
      // Vérifie les mises à jour toutes les 60 secondes
      const interval = setInterval(() => reg.update(), 60 * 1000)
      // Recharge quand un nouveau SW prend le contrôle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
      return () => clearInterval(interval)
    })
  }, [])
  return null
}

export default function App() {
  const { init, loading } = useAuthStore()

  useEffect(() => { init() }, [])

  if (loading) return <LoadingScreen />

  return (
    <>
    <PWAInstallBanner />
    <NavigationListener />
    <AutoUpdate />
    <Routes>
      {/* Public — carte démo sans auth */}
      <Route path="/"              element={<PublicMapPage />} />
      <Route path="/splash"        element={<SplashPage />} />
      <Route path="/auth"          element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/reset"    element={<ResetPasswordPage />} />
      <Route path="/privacy"       element={<PrivacyPage />} />

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
    </>
  )
}
