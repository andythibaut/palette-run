import { usePWAInstall } from '@/lib/usePWAInstall'

export default function PWAInstallBanner({ onDismiss }) {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall()

  if (!canInstall || isInstalled) {
    onDismiss?.()
    return null
  }

  const handleInstall = async () => {
    await promptInstall()
    onDismiss?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm mx-4 mb-8 bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)' }}>

        {/* Header coloré */}
        <div className="px-6 pt-6 pb-4 text-center"
          style={{ background: 'linear-gradient(135deg, #1a1f2e, #0f1420)' }}>
          <div className="text-5xl mb-3">📲</div>
          <h3 className="font-bebas text-2xl text-white leading-tight">
            Installez Palette Run
          </h3>
          <p className="text-sub text-sm mt-1 leading-relaxed">
            Recevez les alertes <strong className="text-amber">même téléphone fermé</strong> — ne ratez plus jamais une annonce
          </p>
        </div>

        {/* Avantages */}
        <div className="px-6 py-4 flex flex-col gap-2.5">
          {[
            { icon: '🔔', text: 'Notifications push instantanées' },
            { icon: '⚡', text: 'Accès rapide depuis votre écran d\'accueil' },
            { icon: '📶', text: 'Fonctionne même avec une connexion faible' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl shrink-0">{a.icon}</span>
              <p className="text-sm text-white/80">{a.text}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button onClick={handleInstall}
            className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}>
            📲 Installer l'application
          </button>
          <button onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-transparent border-none text-muted text-sm cursor-pointer">
            Continuer dans le navigateur
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
