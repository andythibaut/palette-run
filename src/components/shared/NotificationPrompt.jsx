import { useState, useEffect } from 'react'
import { requestNotificationPermission, getNotificationStatus } from '@/lib/notifications'
import PWAInstallBanner from '@/components/shared/PWAInstallBanner'
import { useAuthStore } from '@/store/useAuthStore'

export default function NotificationPrompt({ context, onGranted, onSkip }) {
  const { user } = useAuthStore()
  const [visible,     setVisible]     = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [done,        setDone]        = useState(false)

  useEffect(() => {
    const status = getNotificationStatus()
    if (status === 'default') {
      setVisible(true)
    } else {
      setDone(true) // permission déjà traitée → signal pour déclencher onGranted
    }
  }, [])

  useEffect(() => {
    if (done) onGranted?.()
  }, [done])

  const CONTEXTS = {
    reservation: {
      icon: '📦',
      title: 'Soyez notifié instantanément',
      body: 'Activez les notifications pour savoir quand le commerçant valide votre demande et vous donne l\'adresse de récupération.',
      cta: 'Activer et réserver',
    },
    listing: {
      icon: '🔔',
      title: 'Ne ratez aucun acheteur',
      body: 'Activez les notifications pour être alerté dès qu\'un chauffeur réserve votre annonce.',
      cta: 'Activer et publier',
    },
  }

  const ctx = CONTEXTS[context] || CONTEXTS.reservation

  if (showInstall) {
    return (
      <PWAInstallBanner
        onDismiss={() => { setShowInstall(false); onGranted?.() }}
      />
    )
  }

  if (!visible) return null

  const handleAllow = async () => {
    const granted = await requestNotificationPermission(user?.id)
    setVisible(false)
    if (granted) {
      setShowInstall(true) // Montre le banner PWA ensuite
    } else {
      onSkip?.() // Refusé → on continue quand même
    }
  }

  const handleSkip = () => {
    setVisible(false)
    onSkip?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm mx-4 mb-8 bg-surface border border-border rounded-3xl p-6 shadow-2xl"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>

        <div className="text-4xl text-center mb-4">{ctx.icon}</div>
        <h3 className="font-bebas text-2xl text-white text-center mb-2">{ctx.title}</h3>
        <p className="text-sub text-sm text-center leading-relaxed mb-6">{ctx.body}</p>

        <div className="flex flex-col gap-3">
          <button onClick={handleAllow}
            className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}>
            🔔 {ctx.cta}
          </button>
          <button onClick={handleSkip}
            className="w-full py-3 rounded-xl bg-transparent border-none text-muted text-sm cursor-pointer">
            Continuer sans notifications
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
