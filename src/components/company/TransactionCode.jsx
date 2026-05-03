import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Commerçant : génère et affiche le code ───────────────────────────────────
export function TransactionCodeGenerator({ listingId, companyId, driverId, driverName, onSuccess, onCancel }) {
  const [code,      setCode]      = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [timeLeft,  setTimeLeft]  = useState(900) // 15 min en secondes
  const [loading,   setLoading]   = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const generateCode = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('generate_transaction_code', {
      p_listing_id: listingId,
      p_company_id: companyId,
      p_driver_id:  driverId,
    })
    setLoading(false)
    if (error || !data?.success) return
    setCode(data.code)
    setExpiresAt(new Date(data.expires_at))
    setTimeLeft(900)
  }

  // Timer compte à rebours
  useEffect(() => {
    if (!code) return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); setCode(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [code])

  // Écoute confirmation du chauffeur en temps réel
  useEffect(() => {
    if (!listingId) return
    const sub = supabase
      .channel('transaction-confirm')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'transactions',
        filter: `listing_id=eq.${listingId}`,
      }, payload => {
        if (payload.new.status === 'confirmed') {
          setConfirmed(true)
          setTimeout(() => onSuccess(payload.new), 1500)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [listingId])

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const urgency = timeLeft < 120

  if (confirmed) return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="text-6xl animate-bounce">✅</div>
      <h2 className="font-bebas text-3xl text-green">Transaction confirmée !</h2>
      <p className="text-sub text-sm">L'annonce est retirée de la carte.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Validation transaction</p>
        <h2 className="font-bebas text-2xl text-white">Chauffeur : {driverName}</h2>
        <p className="text-sub text-sm mt-1">Donnez ce code à voix vive au chauffeur devant vous.</p>
      </div>

      {!code ? (
        <button onClick={generateCode} disabled={loading}
          className="w-full py-5 rounded-2xl font-bold text-bg text-lg cursor-pointer disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}>
          {loading ? 'Génération…' : '🔢 Générer le code'}
        </button>
      ) : (
        <>
          {/* Code affiché en grand */}
          <div className={`rounded-3xl border-2 p-8 text-center transition-colors ${urgency ? 'border-red/60 bg-red/10' : 'border-amber/60 bg-amber/10'}`}>
            <p className="text-xs font-mono tracking-widest mb-3" style={{ color: urgency ? '#EF4444' : '#F5A623' }}>
              CODE À DONNER AU CHAUFFEUR
            </p>
            <div className="font-bebas text-8xl leading-none" style={{ color: urgency ? '#EF4444' : '#F5A623', letterSpacing: '0.3em' }}>
              {code}
            </div>
            <div className={`mt-4 font-mono text-2xl ${urgency ? 'text-red' : 'text-sub'}`}>
              {mins}:{secs}
            </div>
            {urgency && <p className="text-red text-xs mt-2">⚠️ Code bientôt expiré</p>}
          </div>

          {/* Regénérer */}
          <button onClick={generateCode}
            className="w-full py-3 rounded-2xl border border-border bg-hi text-sub text-sm font-semibold cursor-pointer">
            🔄 Regénérer un nouveau code
          </button>

          {/* En attente confirmation */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <p className="text-indigo-300 text-sm">En attente de confirmation du chauffeur…</p>
          </div>
        </>
      )}

      <button onClick={onCancel}
        className="w-full py-3 rounded-2xl border border-border bg-transparent text-muted text-sm cursor-pointer">
        Annuler
      </button>
    </div>
  )
}

// ─── Chauffeur : saisit le code ────────────────────────────────────────────────
export function TransactionCodeInput({ transactionId, onSuccess, onCancel }) {
  const [digits,  setDigits]  = useState(['', ''])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]; next[i] = val; setDigits(next)
    setError(null)
    if (val && i === 0) document.getElementById('code-1')?.focus()
  }

  const handleConfirm = async () => {
    const code = digits.join('')
    if (code.length < 2) { setError('Entrez les 2 chiffres du code'); return }
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('driver_confirm_transaction', {
      p_transaction_id: transactionId,
      p_code:           code,
    })

    setLoading(false)

    if (rpcError || !data?.success) {
      const errorMessages = {
        CODE_INVALID:      'Code incorrect. Demandez au commerçant de vérifier.',
        CODE_EXPIRED:      'Code expiré. Demandez au commerçant d\'en générer un nouveau.',
        CODE_ALREADY_USED: 'Ce code a déjà été utilisé.',
        TRANSACTION_FAILED:'Transaction impossible. Contactez le support.',
      }
      setError(errorMessages[data?.error] || 'Erreur inconnue. Réessayez.')
      setDigits(['', ''])
      document.getElementById('code-0')?.focus()
      return
    }

    setSuccess(true)
    setTimeout(() => onSuccess(data), 1500)
  }

  if (success) return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="text-6xl animate-bounce">🎉</div>
      <h2 className="font-bebas text-3xl text-green">Transaction confirmée !</h2>
      <p className="text-sub text-sm">Les palettes sont à vous.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Confirmation</p>
        <h2 className="font-bebas text-2xl text-white">Entrez le code</h2>
        <p className="text-sub text-sm mt-1">Saisissez le code à 2 chiffres que le commerçant vient de vous donner.</p>
      </div>

      {/* 2 cases */}
      <div className="flex gap-4 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            id={`code-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`code-${i-1}`)?.focus() }}
            autoFocus={i === 0}
            className={`w-24 h-28 rounded-2xl text-center font-bebas text-6xl outline-none border-2 bg-hi transition-colors ${
              error ? 'border-red text-red' : d ? 'border-amber text-amber' : 'border-border text-white'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="bg-red/10 border border-red/30 rounded-2xl px-4 py-3 text-center">
          <p className="text-red text-sm">❌ {error}</p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={loading || digits.some(d => d === '')}
        className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg,#2ECC71,#27AE60)', boxShadow: '0 6px 20px rgba(46,204,113,0.4)' }}
      >
        {loading ? 'Vérification…' : '✅ Confirmer la transaction'}
      </button>

      <button onClick={onCancel}
        className="w-full py-3 rounded-2xl border border-border bg-transparent text-muted text-sm cursor-pointer">
        Annuler
      </button>
    </div>
  )
}
