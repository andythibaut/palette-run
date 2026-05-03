import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt        = (n) => n?.toFixed(2) + ' €'
const fmtTime    = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

// ─── Jauge de rentabilité ─────────────────────────────────────────────────────
const ProfitabilityGauge = ({ buyPrice, resalePrice }) => {
  if (!resalePrice) return null
  const profit     = resalePrice - buyPrice
  const isPositive = profit > 0
  const isWarning  = profit > 0 && profit < 1
  const isLoss     = profit <= 0

  return (
    <div className={`rounded-xl px-3 py-2 flex items-center gap-2 text-xs ${
      isLoss    ? 'bg-red/10 border border-red/30'    :
      isWarning ? 'bg-orange/10 border border-orange/30' :
                  'bg-green/10 border border-green/30'
    }`}>
      <span>{isLoss ? '⚠️' : isWarning ? '📉' : '📈'}</span>
      <div className="flex-1">
        {isLoss ? (
          <p className="text-red font-semibold">Perte à ce prix — vous perdrez {fmt(Math.abs(profit))} par palette</p>
        ) : isWarning ? (
          <p className="text-orange font-semibold">Marge faible — seulement {fmt(profit)} de bénéfice par palette</p>
        ) : (
          <p className="text-green font-semibold">Bénéfice potentiel : {fmt(profit)} / palette</p>
        )}
        {resalePrice && <p className="opacity-70 mt-0.5">Revente configurée : {fmt(resalePrice)}</p>}
      </div>
    </div>
  )
}

// ─── Boutons d'enchère ────────────────────────────────────────────────────────
const BidButtons = ({ currentPrice, lockStep, lockTimeLeft, cancelBlocked, cancelBlockedUntil, isLeader, onBid, onCancel, loading }) => {
  const steps = [
    { step: 0.10, label: '+10¢', color: '#2ECC71', desc: 'Enchères libres',     minStep: null },
    { step: 0.20, label: '+20¢', color: '#F97316', desc: 'Gel 30 min',         minStep: 0.20 },
    { step: 0.50, label: '+50¢', color: '#EF4444', desc: 'Gel 2h',             minStep: 0.50 },
  ]

  const isStepEnabled = (step) => {
    if (loading)   return false
    if (isLeader)  return false   // leader ne peut pas rebidder sur lui-même
    if (lockStep && step < lockStep && lockTimeLeft > 0) return false
    if (step === 0.50 && cancelBlocked) return false
    return true
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {steps.map(s => {
          const enabled = isStepEnabled(s.step)
          const newPrice = currentPrice + s.step
          return (
            <button key={s.step} onClick={() => enabled && onBid(s.step)} disabled={!enabled}
              className="flex-1 py-3 px-2 rounded-2xl flex flex-col items-center gap-1 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed border-2"
              style={{
                borderColor: enabled ? `${s.color}66` : '#1C2330',
                background:  enabled ? `${s.color}18` : '#1A2030',
              }}
            >
              <span className="font-bebas text-xl leading-none" style={{ color: enabled ? s.color : '#4A5568' }}>{s.label}</span>
              <span className="font-mono text-xs leading-none" style={{ color: enabled ? s.color : '#4A5568' }}>{fmt(newPrice)}</span>
              <span className="text-[9px] text-muted leading-none">{s.desc}</span>
              {s.step === 0.50 && cancelBlocked && (
                <span className="text-[8px] text-red leading-none">🔒 Bloqué</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Annuler +50¢ si leader et gel 2h actif */}
      {isLeader && lockStep === 0.50 && lockTimeLeft > 0 && (
        <button onClick={onCancel} disabled={loading}
          className="w-full py-2.5 rounded-xl border border-red/40 bg-red/10 text-red text-sm font-semibold cursor-pointer disabled:opacity-40">
          Annuler ma surenchère +50¢
          {cancelBlockedUntil && <span className="text-xs opacity-70 block mt-0.5">({3 - 0} annulations restantes ce mois)</span>}
        </button>
      )}

      {isLeader && !loading && (
        <p className="text-center text-xs text-muted">Vous êtes en tête — attendez qu'un autre chauffeur surenchérisse</p>
      )}
    </div>
  )
}

// ─── Timer enchère (30 min max) ───────────────────────────────────────────────
const BidTimer = ({ bidExpiresAt, lockStep, lockExpiresAt }) => {
  const [bidLeft,  setBidLeft]  = useState(0)
  const [lockLeft, setLockLeft] = useState(0)

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      if (bidExpiresAt)  setBidLeft( Math.max(0, Math.floor((new Date(bidExpiresAt)  - now) / 1000)))
      if (lockExpiresAt) setLockLeft(Math.max(0, Math.floor((new Date(lockExpiresAt) - now) / 1000)))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [bidExpiresAt, lockExpiresAt])

  const bidUrgent  = bidLeft  < 300  // < 5 min
  const lockUrgent = lockLeft < 120  // < 2 min

  return (
    <div className="flex flex-col gap-2">
      {/* Timer enchère globale */}
      {bidExpiresAt && bidLeft > 0 && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${bidUrgent ? 'bg-red/10 border border-red/30' : 'bg-indigo-500/10 border border-indigo-500/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${bidUrgent ? 'bg-red' : 'bg-indigo-400'}`}/>
            <span className={`text-xs ${bidUrgent ? 'text-red' : 'text-indigo-300'}`}>
              {bidUrgent ? '⚠️ Fin imminente' : 'Clôture automatique'}
            </span>
          </div>
          <span className={`font-mono font-bold text-sm ${bidUrgent ? 'text-red' : 'text-indigo-300'}`}>
            {fmtTime(bidLeft)}
          </span>
        </div>
      )}

      {/* Timer gel actif */}
      {lockExpiresAt && lockLeft > 0 && lockStep && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${lockStep === 0.50 ? 'bg-red/10 border border-red/30' : 'bg-orange/10 border border-orange/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${lockStep === 0.50 ? 'bg-red' : 'bg-orange'}`}/>
            <span className={`text-xs ${lockStep === 0.50 ? 'text-red' : 'text-orange'}`}>
              {lockStep === 0.50 ? '🔒 Gel 2h — confirmation auto' : '⏸ Gel 30 min'}
            </span>
          </div>
          <span className={`font-mono font-bold text-sm ${lockStep === 0.50 ? 'text-red' : 'text-orange'}`}>
            {fmtTime(lockLeft)}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Distance concurrent ──────────────────────────────────────────────────────
const CompetitorDistance = ({ myDistKm, competitorDistKm, competitorName }) => {
  if (!competitorDistKm) return null
  const iAhead = myDistKm < competitorDistKm
  const diff   = Math.abs(myDistKm - competitorDistKm).toFixed(1)

  return (
    <div className={`rounded-xl px-3 py-2.5 flex items-center gap-3 ${iAhead ? 'bg-green/10 border border-green/30' : 'bg-red/10 border border-red/30'}`}>
      <span className="text-lg">{iAhead ? '🟢' : '🔴'}</span>
      <div className="flex-1">
        <p className={`text-xs font-semibold ${iAhead ? 'text-green' : 'text-red'}`}>
          {iAhead ? `Vous êtes ${diff} km plus proche` : `Concurrent ${diff} km plus proche`}
        </p>
        <div className="flex gap-4 mt-1">
          <span className="text-[10px] text-sub">📍 Vous : {myDistKm?.toFixed(1)} km</span>
          <span className="text-[10px] text-sub">📍 {competitorName?.split(' ')[0] || 'Concurrent'} : {competitorDistKm?.toFixed(1)} km</span>
        </div>
      </div>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function BidPanel({ listing, profile, myDistKm, competitor, onBidSuccess, onCancelSuccess }) {
  const [loading,      setLoading]      = useState(false)
  const [cancelLoading,setCancelLoading]= useState(false)
  const [result,       setResult]       = useState(null)

  const resalePrice      = profile?.resale_price    || null
  const cancelBlocked    = profile?.bid_cancel_blocked_until &&
                           new Date(profile.bid_cancel_blocked_until) > new Date()
  const cancelBlockedUntil = profile?.bid_cancel_blocked_until

  const currentPrice = listing.current_bid || listing.price
  const isLeader     = listing.bid_winner_id === profile?.id

  const handleBid = async (step) => {
    setLoading(true)
    setResult(null)

    const { data, error } = await supabase.rpc('place_bid', {
      p_listing_id: listing.id,
      p_bidder_id:  profile.id,
      p_step:       step,
      p_dist_km:    myDistKm || null,
    })

    setLoading(false)

    if (error || !data?.success) {
      setResult({ type: 'error', message: data?.error || 'Erreur inconnue' })
      return
    }

    setResult({ type: 'success', step, newPrice: data.new_price })
    onBidSuccess?.(data)
  }

  const handleCancel = async () => {
    setCancelLoading(true)
    setResult(null)

    const { data, error } = await supabase.rpc('cancel_bid', {
      p_listing_id: listing.id,
      p_driver_id:  profile.id,
    })

    setCancelLoading(false)

    if (error || !data?.success) {
      setResult({ type: 'error', message: 'Impossible d\'annuler' })
      return
    }

    setResult({
      type:    data.blocked ? 'blocked' : 'cancelled',
      count:   data.cancel_count,
      message: data.warning,
    })
    onCancelSuccess?.(data)
  }

  const errorMessages = {
    BID_CANCEL_BLOCKED: `Bouton +50¢ bloqué — 3 annulations ce mois. Disponible le ${cancelBlockedUntil ? new Date(cancelBlockedUntil).toLocaleDateString('fr-FR') : '…'}`,
    DRIVER_SUSPENDED:   'Votre compte est suspendu suite à des no-shows.',
    BID_EXPIRED:        'Cette enchère est terminée.',
    BID_LOCKED:         'Seul +20¢ ou +50¢ disponible pendant le gel.',
    NOT_LEADER:         'Vous ne pouvez annuler que si vous êtes en tête.',
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Prix actuel */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-wider">Prix actuel</p>
          <p className="font-bebas text-4xl text-gold leading-none">{fmt(currentPrice)}</p>
          <p className="text-xs text-sub mt-0.5">/ palette · {listing.qty} palettes</p>
        </div>
        {isLeader && (
          <div className="bg-green/10 border border-green/40 rounded-xl px-3 py-2 text-center">
            <p className="text-green font-bold text-sm">EN TÊTE ✓</p>
            <p className="text-green text-xs opacity-70">Votre enchère</p>
          </div>
        )}
      </div>

      {/* Timers */}
      <BidTimer
        bidExpiresAt={listing.bid_expires_at}
        lockStep={listing.bid_lock_step}
        lockExpiresAt={listing.bid_locked_until}
      />

      {/* Distance concurrent */}
      <CompetitorDistance
        myDistKm={myDistKm}
        competitorDistKm={competitor?.dist_km}
        competitorName={competitor?.name}
      />

      {/* Jauge rentabilité */}
      <ProfitabilityGauge buyPrice={currentPrice} resalePrice={resalePrice} />

      {/* Boutons enchère */}
      <BidButtons
        currentPrice={currentPrice}
        lockStep={listing.bid_lock_step}
        lockTimeLeft={listing.bid_locked_until ? Math.max(0, Math.floor((new Date(listing.bid_locked_until) - Date.now()) / 1000)) : 0}
        cancelBlocked={cancelBlocked}
        cancelBlockedUntil={cancelBlockedUntil}
        isLeader={isLeader}
        onBid={handleBid}
        onCancel={handleCancel}
        loading={loading || cancelLoading}
      />

      {/* Résultat */}
      {result && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
          result.type === 'success'   ? 'bg-green/10 border border-green/30 text-green'   :
          result.type === 'cancelled' ? 'bg-amber/10 border border-amber/30 text-amber'   :
          result.type === 'blocked'   ? 'bg-red/10 border border-red/30 text-red'         :
                                        'bg-red/10 border border-red/30 text-red'
        }`}>
          {result.type === 'success'   && `✅ Enchère placée à ${fmt(result.newPrice)}`}
          {result.type === 'cancelled' && `⚠️ Surenchère annulée (${result.count}/3 ce mois)`}
          {result.type === 'blocked'   && `🔒 Bouton +50¢ bloqué — 3 annulations atteintes`}
          {result.type === 'error'     && `❌ ${errorMessages[result.message] || result.message}`}
        </div>
      )}

      {/* Info annulations restantes */}
      {!cancelBlocked && profile?.bid_cancel_count > 0 && (
        <p className="text-center text-xs text-muted">
          Annulations +50¢ : {profile.bid_cancel_count}/3 ce mois
        </p>
      )}
    </div>
  )
}
