import { severityStyles } from '@/lib/transaction'

// ─── Un message d'erreur ──────────────────────────────────────────────────────
export const ErrorMessage = ({ msg }) => {
  const style = severityStyles[msg.severity] || severityStyles.error
  return (
    <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{style.icon}</span>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${style.text}`}>{msg.title}</p>
          <p className="text-sub text-xs mt-1 leading-relaxed">{msg.message}</p>
          {msg.action && (
            <p className={`text-xs mt-2 font-medium ${style.text}`}>→ {msg.action}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Liste de messages ────────────────────────────────────────────────────────
export const ErrorMessages = ({ messages }) => {
  if (!messages?.length) return null
  return (
    <div className="flex flex-col gap-3">
      {messages.map(msg => <ErrorMessage key={msg.code} msg={msg} />)}
    </div>
  )
}

// ─── Modale d'erreur transaction ─────────────────────────────────────────────
export const TransactionErrorModal = ({ messages, isFraud, onClose, onRetry }) => (
  <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
    <div className="w-full bg-surface rounded-t-3xl border border-border border-b-0 p-6"
      style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
      <div className="flex justify-center mb-4">
        <div className="w-9 h-1 rounded-full bg-border" />
      </div>

      <h2 className="font-bebas text-2xl text-white mb-4">
        {isFraud ? '🚨 Transaction bloquée' : '❌ Transaction échouée'}
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        {messages.map(msg => <ErrorMessage key={msg.code} msg={msg} />)}
      </div>

      <div className="flex gap-3">
        <button onClick={onClose}
          className="flex-1 py-3 rounded-2xl border border-border bg-hi text-sub text-sm font-semibold cursor-pointer">
          Fermer
        </button>
        {!isFraud && onRetry && (
          <button onClick={onRetry}
            className="flex-1 py-3 rounded-2xl font-bold text-bg text-sm cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)' }}>
            Réessayer
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  </div>
)

// ─── Modale succès garantie Gold ─────────────────────────────────────────────
export const GoldGuaranteeModal = ({ benefit, daysActive, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
    <div className="w-full bg-surface rounded-3xl border border-amber/40 p-6 text-center"
      style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.6,0.64,1)' }}>
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="font-bebas text-3xl text-gold mb-2">Garantie activée !</h2>
      <p className="text-sub text-sm leading-relaxed mb-4">
        {benefit < 24.90
          ? `Votre bénéfice ce mois-ci (${benefit.toFixed(2)}€) est inférieur au prix de votre abonnement.`
          : `Vous avez utilisé l'application ${daysActive} jours ce mois-ci.`}
      </p>
      <div className="bg-amber/10 border border-amber/30 rounded-2xl p-4 mb-6">
        <p className="font-bebas text-4xl text-amber">+30 jours</p>
        <p className="text-sub text-xs mt-1">crédités automatiquement sur votre abonnement</p>
      </div>
      <button onClick={onClose}
        className="w-full py-4 rounded-2xl font-bold text-bg cursor-pointer"
        style={{ background: 'linear-gradient(135deg,#FFD166,#E8B800)', boxShadow: '0 6px 20px rgba(255,209,102,0.4)' }}>
        Super, merci ! 🥇
      </button>
      <style>{`
        @keyframes popIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  </div>
)
