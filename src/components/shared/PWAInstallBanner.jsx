import { useState } from 'react'
import { usePWAInstall } from '@/lib/usePWAInstall'

export default function PWAInstallBanner() {
  const { canInstall, isInstalled, isIOS, isAndroid, hasNativePrompt, promptInstall } = usePWAInstall()
  const [justInstalled, setJustInstalled] = useState(false)

  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) setJustInstalled(true)
  }

  if (justInstalled) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm mx-4 bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl text-center px-8 py-10">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="font-bebas text-3xl text-gray-800 mb-2">Installation en cours…</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          L'icône <strong className="text-amber">Palette Run</strong> va apparaître sur votre écran d'accueil dans quelques secondes. Fermez ensuite cet onglet.
        </p>
        <button onClick={() => window.close()}
          className="w-full py-4 rounded-2xl font-bold text-white text-base cursor-pointer mb-3"
          style={{ background: "linear-gradient(135deg,#E8920A,#d4830a)", boxShadow: "0 6px 20px rgba(232,146,10,0.3)" }}>
          Fermer cet onglet
        </button>
        <p className="text-xs text-muted">Si l'onglet ne se ferme pas, fermez-le manuellement.</p>
      </div>
    </div>
  )

  if (!canInstall || isInstalled) return null

  const iosSteps = [
    { icon: "⎋", text: "Appuyez sur le bouton Partager en bas de Safari" },
    { icon: "+", text: "Appuyez sur Sur l'écran d'accueil" },
    { icon: "✓", text: "Appuyez sur Ajouter" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm mx-4 mb-8 bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: "slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)" }}>

        <div className="px-6 pt-6 pb-4 text-center"
          style={{ background: "linear-gradient(135deg, #f8fafc, #e8ecf2)", borderBottom: "1px solid #D1D9E6" }}>
          <div className="text-5xl mb-3">📲</div>
          <h3 className="font-bebas text-2xl text-gray-800 leading-tight">Installez Palette Run</h3>
          <p className="text-gray-500 text-sm mt-1">
            Recevez les alertes <strong className="text-amber">même téléphone fermé</strong>
          </p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          {isIOS ? (
            <>
              <p className="text-sm text-sub text-center">Ajoutez l'app à votre écran d'accueil :</p>
              {iosSteps.map(s => (
                <div key={s.icon} className="flex items-center gap-3 bg-hi border border-border rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue/10 border border-blue/20 flex items-center justify-center text-blue font-bold text-sm shrink-0">
                    {s.icon}
                  </div>
                  <p className="text-sm text-gray-700">{s.text}</p>
                </div>
              ))}
              <p className="text-xs text-muted text-center mt-1">Ce message disparaîtra une fois l'app installée.</p>
            </>
          ) : (
            <>
              {[
                { icon: "🔔", text: "Notifications push instantanées" },
                { icon: "⚡", text: "Accès rapide depuis votre écran d'accueil" },
                { icon: "📶", text: "Fonctionne même avec une connexion faible" },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{a.icon}</span>
                  <p className="text-sm text-gray-700">{a.text}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {!isIOS && (
          <div className="px-6 pb-6">
            <button onClick={handleInstall}
              className="w-full py-4 rounded-2xl font-bold text-white text-base cursor-pointer"
              style={{ background: "linear-gradient(135deg,#E8920A,#d4830a)", boxShadow: "0 6px 20px rgba(232,146,10,0.3)" }}>
              📲 Installer l'application
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
