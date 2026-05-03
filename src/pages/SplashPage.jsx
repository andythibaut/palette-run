import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import PalletLogo from '@/components/shared/PalletLogo'

export default function SplashPage() {
  const { user, profile, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      if (!user)    { navigate('/auth',      { replace: true }); return }
      if (!profile) { navigate('/onboarding',{ replace: true }); return }
      navigate(profile.role === 'driver' ? '/app' : '/company', { replace: true })
    }, 2000)
    return () => clearTimeout(timer)
  }, [loading, user, profile])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute w-80 h-80 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #F5A623, transparent 70%)' }}
      />

      <div className="animate-bounce-slow">
        <PalletLogo size={80} color="#F5A623" />
      </div>

      <div className="text-center">
        <h1 className="font-bebas text-5xl tracking-widest text-amber">PALETTE RUN</h1>
        <p className="font-mono text-xs tracking-widest text-muted mt-2">BOURSE AUX PALETTES</p>
      </div>

      {/* Loading bar */}
      <div className="w-16 h-0.5 bg-border rounded-full overflow-hidden mt-4">
        <div className="h-full bg-amber rounded-full animate-loading-bar" />
      </div>

      <style>{`
        @keyframes loading-bar { from { width: 0% } to { width: 100% } }
        .animate-loading-bar   { animation: loading-bar 1.8s ease forwards; }
        @keyframes bounce-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .animate-bounce-slow   { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
