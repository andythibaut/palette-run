import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPickupDeadline } from '@/lib/transaction'

const statusStyles = {
  pending:    { color: '#F97316', bg: '#F9731618', label: "En attente vendeur" },
  authorized: { color: '#3B82F6', bg: '#3B82F618', label: "Autorisé — en route" },
  confirmed:  { color: '#2ECC71', bg: '#2ECC7118', label: "Confirmée"          },
  cancelled:  { color: '#4A5568', bg: '#4A556818', label: "Annulée"            },
  bidding:    { color: '#FFD166', bg: '#FFD16618', label: "Enchère en cours"   },
}

// ─── Mini bid panel — +50¢ uniquement ────────────────────────────────────────
const BidButtons = ({ listing, profile, onBidPlaced }) => {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [lockLeft, setLockLeft] = useState(0)

  const isLeader = listing.bid_winner_id === profile?.id

  // Timers
  useEffect(() => {
    const tick = () => {
      if (listing.bid_expires_at)   setTimeLeft(Math.max(0, Math.floor((new Date(listing.bid_expires_at)   - Date.now()) / 1000)))
      if (listing.bid_locked_until) setLockLeft(Math.max(0, Math.floor((new Date(listing.bid_locked_until) - Date.now()) / 1000)))
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [listing.bid_expires_at, listing.bid_locked_until])

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  const handleBid = async (step) => {
    setLoading(true)
    const { data, error } = await supabase.rpc('place_bid', {
      p_listing_id: listing.id,
      p_bidder_id:  profile.id,
      p_step:       step,
      p_dist_km:    null,
    })
    setLoading(false)
    if (error || !data?.success) {
      setResult({ type: 'error', msg: data?.error || 'Erreur' })
    } else {
      setResult({ type: 'success', price: data.new_price, step })
      onBidPlaced?.()
    }
    setTimeout(() => setResult(null), 3000)
  }

  const currentPrice = listing.current_bid || listing.price

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
      {/* Prix actuel */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">Prix actuel</span>
        <span className="font-bebas text-2xl text-gold">{currentPrice.toFixed(2)} €</span>
        {isLeader && <span className="text-xs bg-green/20 text-green border border-green/30 rounded-full px-2 py-0.5">EN TÊTE ✓</span>}
      </div>

      {/* Timers */}
      {timeLeft > 0 && (
        <div className={`flex justify-between items-center rounded-lg px-3 py-1.5 text-xs font-mono ${timeLeft < 300 ? 'bg-red/10 text-red' : 'bg-indigo-500/10 text-indigo-300'}`}>
          <span>⏱ Confirmation auto dans</span>
          <span className="font-bold">{fmt(timeLeft)}</span>
        </div>
      )}
      {lockLeft > 0 && (
        <div className="flex justify-between items-center rounded-lg px-3 py-1.5 text-xs font-mono bg-red/10 text-red">
          <span>🔒 Réservation gelée 2h</span>
          <span className="font-bold">{fmt(lockLeft)}</span>
        </div>
      )}

      {/* Boutons enchère */}
      {!isLeader && (
        <div className="flex gap-2">
          {[{ step: 0.50, label: '+50¢', color: '#F97316' }, { step: 1.00, label: '+1€', color: '#EF4444' }].map(({ step, label, color }) => (
            <button key={step} onClick={() => handleBid(step)} disabled={loading}
              className="flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer disabled:opacity-40 transition-all gap-0.5"
              style={{ borderColor: `${color}66`, background: `${color}18` }}>
              <span className="font-bebas text-xl leading-none" style={{ color }}>{label}</span>
              <span className="text-xs font-mono" style={{ color }}>{(currentPrice + step).toFixed(2)} €</span>
            </button>
          ))}
        </div>
      )}

      {/* Annuler si leader avec gel */}
      {isLeader && lockLeft > 0 && (
        <button onClick={handleCancel} disabled={loading}
          className="w-full py-2 rounded-xl border border-red/40 bg-red/10 text-red text-xs font-semibold cursor-pointer">
          Annuler ma surenchère (pénalité)
        </button>
      )}

      {isLeader && !loading && lockLeft === 0 && (
        <p className="text-center text-xs text-muted">Vous êtes en tête — attendez qu'un autre acheteur surenchérisse</p>
      )}

      {result && (
        <div className={`rounded-lg px-3 py-2 text-xs font-semibold text-center ${result.type === 'success' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}>
          {result.type === 'success' ? `✅ Surenchère à ${result.price?.toFixed(2)}€ — réservation gelée 2h` : `❌ ${result.msg}`}
        </div>
      )}
    </div>
  )
}


// ─── Composant principal ───────────────────────────────────────────────────────
export default function PickupList({ profile }) {
  const [pickups,    setPickups]    = useState([])
  const [listings,   setListings]   = useState({})
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [calledListings, setCalledListings] = useState({})

  const fetchPickups = async () => {
    setLoading(true)

    // 1. Transactions pending/authorized
    const { data: txData } = await supabase
      .from('transactions')
      .select('*, listings ( requires_call, contact_phone, qty, price, current_bid, auction_mode, companies ( name, city, address ) )')
      .eq('driver_id', profile.id)
      .in('status', ['pending', 'authorized'])
      .order('created_at', { ascending: false })

    // 2. Enchères en cours (bids sans transaction confirmée)
    const { data: bidData } = await supabase
      .from('bids')
      .select('*, listings ( *, companies ( name, city, address ) )')
      .eq('bidder_id', profile.id)
      .order('created_at', { ascending: false })

    // Sépare les bids actifs et les bids perdus (annonce inactive et quelqu'un d'autre a gagné)
    const activeBids = (bidData || []).filter(b => b.listings?.is_active)
    const lostBids   = (bidData || []).filter(b => 
      b.listings && !b.listings.is_active && b.listings.reserved_by && b.listings.reserved_by !== profile.id
    )

    // Convertit les bids en format compatible avec les transactions
    const bidPickups = activeBids.map(b => ({
      id:         `bid-${b.id}`,
      type:       'bid',
      status:     'bidding',
      bid_price:  b.price,
      listing_id: b.listing_id,
      listings:   b.listings,
      companies:  b.listings?.companies,
      created_at: b.created_at,
    }))

    // Déduplique : si une transaction existe pour ce listing, on ne montre pas le bid
    const txListingIds = new Set((txData || []).map(t => t.listing_id))
    const uniqueBids   = bidPickups.filter(b => !txListingIds.has(b.listing_id))

    // Bids perdus
    const lostPickups = lostBids.map(b => ({
      id:         `lost-${b.id}`,
      type:       'lost',
      status:     'lost',
      listing_id: b.listing_id,
      listings:   b.listings,
      companies:  b.listings?.companies,
      created_at: b.created_at,
      bid_price:  b.price,
    })).filter(b => !txListingIds.has(b.listing_id))

    setLoading(false)
    setPickups([...(txData || []), ...uniqueBids, ...lostPickups])
  }

  // Souscription realtime sur les listings réservés
  useEffect(() => {
    if (!profile?.id) return
    fetchPickups()

    const sub = supabase
      .channel('pickup-listings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, () => {
        fetchPickups()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' },
        (payload) => {
          if (payload.new?.driver_id === profile.id || payload.old?.driver_id === profile.id) fetchPickups()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' },
        (payload) => {
          if (payload.new?.bidder_id === profile.id || payload.old?.bidder_id === profile.id) fetchPickups()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [profile?.id])

  const handleDismissLost = async (p) => {
    // Supprime le bid en base et retire la carte
    await supabase.from("bids")
      .delete()
      .eq("listing_id", p.listing_id)
      .eq("bidder_id", profile.id)
    setPickups(prev => prev.filter(x => x.id !== p.id))
  }

  const handleCancelBid = async (p) => {
    if (!window.confirm("Se retirer de cette enchère ?")) return
    setCancelling(p.id)

    // Supprime le bid du chauffeur
    await supabase.from("bids")
      .delete()
      .eq("listing_id", p.listing_id)
      .eq("bidder_id", profile.id)

    // Vérifie si ce chauffeur était le meilleur enchérisseur
    const listing = p.listings
    if (listing?.reserved_by === profile.id) {
      // Cherche le second meilleur enchérisseur
      const { data: nextBid } = await supabase
        .from("bids")
        .select("bidder_id, price")
        .eq("listing_id", p.listing_id)
        .order("price", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (nextBid) {
        // Passe la main au second
        await supabase.from("listings").update({
          reserved_by: nextBid.bidder_id,
          current_bid: nextBid.price,
        }).eq("id", p.listing_id)

        // Notifie le second enchérisseur qu'il est maintenant en tête
        await supabase.from("notifications").insert({
          user_id: nextBid.bidder_id,
          type:    "auction_leader",
          title:   "⚡ Vous êtes en tête de l'enchère !",
          body:    `Le meilleur enchérisseur s'est retiré. Votre offre de ${nextBid.price.toFixed(2)} € est maintenant la meilleure.`,
          data:    { listing_id: p.listing_id },
        })
      } else {
        // Personne d'autre — remet l'annonce à zéro
        await supabase.from("listings").update({
          reserved_by: null,
          current_bid: null,
          bid_lock_step: null,
          bid_locked_until: null,
        }).eq("id", p.listing_id)
      }
    }

    setCancelling(null)
    fetchPickups()
  }

  const handleCancel = async (p) => {
    const isAuthorized = p.status === 'authorized'
    const isConfirmed  = p.status === 'confirmed'
    const msg = isConfirmed
      ? 'Signaler un problème et annuler ? L\'annonce sera remise en ligne et le commerçant sera notifié.'
      : isAuthorized
        ? 'Annuler ? Le commerçant vous avait autorisé à venir — il sera notifié.'
        : 'Annuler cette réservation ?'
    if (!window.confirm(msg)) return
    setCancelling(p.id)

    // Annule la transaction
    await supabase.from('transactions').update({ status: 'cancelled' }).eq('id', p.id)

    // Remet l'annonce en ligne
    await supabase.from('listings').update({
      is_active:        true,
      reserved_by:      null, reserved_at: null, reservation_expires_at: null,
      current_bid:      null, bid_lock_step: null, bid_locked_until: null,
      bid_auto_confirm: false, bid_started_at: null, bid_expires_at: null, bid_winner_id: null,
    }).eq('id', p.listing_id)

    // Notifie le commerçant si authorized ou confirmed
    if (isAuthorized || isConfirmed) {
      const { data: listing } = await supabase
        .from('listings')
        .select('company_id')
        .eq('id', p.listing_id)
        .single()
      if (listing?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('owner_id')
          .eq('id', listing.company_id)
          .single()
        if (company?.owner_id) {
          await supabase.from('notifications').insert({
            user_id: company.owner_id,
            type:    'driver_cancelled',
            title:   "⚠️ Un chauffeur a annulé",
            body:    isConfirmed
              ? 'Un chauffeur a signalé un problème et annulé après confirmation. Votre annonce a été remise en ligne.'
              : 'Un chauffeur autorisé a annulé sa venue. Votre annonce a été remise en ligne.',
            data:    { listing_id: p.listing_id },
          })
        }
      }
    }

    setCancelling(null)
    fetchPickups()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-mono text-xs text-muted animate-pulse">Chargement…</p>
    </div>
  )

  if (pickups.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted px-6 text-center">
      <span className="text-6xl opacity-30">📦</span>
      <p className="font-bebas text-2xl">Aucune réservation</p>
      <p className="text-sm text-sub">Réservez une annonce sur la carte pour commencer.</p>
    </div>
  )

  return (
    <div className="flex flex-col bg-bg">
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Mes réservations</p>
        <h1 className="font-bebas text-2xl text-white">Palettes à charger</h1>
        <p className="text-sub text-xs mt-1">{pickups.length} réservation{pickups.length > 1 ? 's' : ''}</p>
      </div>

      <div style={{ padding: '1rem 1.25rem', paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {pickups.map(p => {
          const listing      = p.listings
          const isBid        = p.type === 'bid' || p.type === 'lost'
          const style        = statusStyles[p.status] || statusStyles.pending
          // Utilise buy_price/qty de la transaction si le listing n'est plus dispo (is_active false)
          const price        = parseFloat(p.buy_price || p.bid_price || listing?.price || 0)
          const qty          = p.qty || listing?.qty || 0
          const total        = price * qty
          const profit       = profile?.resale_price
            ? (parseFloat(profile.resale_price) - price) * qty
            : null
          const isPending    = p.status === 'pending'
          const isAuthorized = p.status === 'authorized'
          const isConfirmed  = p.status === 'confirmed'
          const hasBid       = listing?.current_bid !== null && listing?.current_bid !== undefined

          return (
            <div key={p.id} className="bg-surface rounded-2xl border overflow-hidden"
              style={{ borderColor: `${style.color}44` }}>

              {/* Status */}
              <div className="px-4 py-2 flex items-center justify-between" style={{ background: style.bg }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: style.color }}/>
                  <span className="text-xs font-semibold font-mono" style={{ color: style.color }}>{style.label}</span>
                </div>
                <span className="text-xs text-muted font-mono">
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>

              <div className="px-4 pt-4 pb-4">
                {/* Vendeur — nom et adresse floutés tant que pending */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber/10 border border-amber/30 flex items-center justify-center text-xl shrink-0">🏭</div>
                  <div className="flex-1">
                    {(p.status === 'confirmed' || p.status === 'authorized') ? (
                      <>
                        <p className="font-bebas text-xl text-white leading-tight">{p.listings?.companies?.name}</p>
                        <p className="text-sub text-xs">{p.listings?.companies?.city}</p>
                        {p.listings?.companies?.address && <p className="text-muted text-xs mt-0.5">📍 {p.listings?.companies?.address}</p>}
                      </>
                    ) : (
                      <>
                        <p className="font-bebas text-xl text-white leading-tight" style={{ filter: 'blur(6px)', userSelect: 'none' }}>Vendeur</p>
                        <p className="text-sub text-xs" style={{ filter: 'blur(4px)', userSelect: 'none' }}>Ville</p>
                        <p className="text-muted text-xs mt-0.5 italic">⏳ Adresse visible après validation du commerçant</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-hi rounded-xl p-2.5 text-center border border-border">
                    <p className="font-bebas text-2xl text-amber leading-none">{qty}</p>
                    <p className="text-[10px] text-muted mt-0.5">palettes</p>
                  </div>
                  <div className="bg-hi rounded-xl p-2.5 text-center border border-border">
                    <p className="font-bebas text-2xl text-green leading-none">{price.toFixed(2)}€</p>
                    <p className="text-[10px] text-muted mt-0.5">/ palette</p>
                  </div>
                  <div className="bg-hi rounded-xl p-2.5 text-center border border-border">
                    <p className="font-bebas text-2xl text-amber leading-none">{total?.toFixed(2)}€</p>
                    <p className="text-[10px] text-muted mt-0.5">total</p>
                  </div>
                </div>

                {/* Profit */}
                {profit !== null && (
                  <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2"
                    style={{ background: profit >= 0 ? '#2ECC7118' : '#EF444418', border: `1px solid ${profit >= 0 ? '#2ECC7133' : '#EF444433'}` }}>
                    <span>{profit >= 0 ? '📈' : '📉'}</span>
                    <span className="font-bebas text-lg" style={{ color: profit >= 0 ? '#2ECC71' : '#EF4444' }}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(2)} €
                    </span>
                    <span className="text-xs text-sub">bénéfice potentiel</span>
                  </div>
                )}

                {/* Heure limite */}
                {listing?.pickup_before && (
                  <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2 bg-blue/10 border border-blue/30">
                    <span>🕐</span>
                    <p className="text-blue text-sm">Récupérer avant <strong>{listing.pickup_before.slice(0,5)}</strong></p>
                  </div>
                )}

                {/* Délai d'enlèvement */}
                {qty > 0 && (
                  <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2 bg-surface border border-border">
                    <span>📅</span>
                    <div>
                      <p className="text-white text-sm font-semibold">
                        Au plus tard : <span className="text-amber">{formatPickupDeadline(listing.qty)}</span>
                      </p>
                      <p className="text-muted text-xs mt-0.5">
                        {listing.qty < 15 ? 'Aujourd\'hui' : `${Math.min(Math.floor(listing.qty / 15), 4)} jour(s) ouvrés accordés`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Appel requis + bouton GPS */}
                {(p.status === 'confirmed' || p.status === 'authorized') && (() => {
                  const requiresCall = p.listings?.requires_call
                  const contactPhone = p.listings?.contact_phone
                  const hasCalled    = calledListings[p.listing_id]
                  const canGo        = !requiresCall || hasCalled

                  const openGPSHandler = () => {
                    const addr  = p.listings?.companies?.address
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                    const query = addr ? encodeURIComponent(addr) : ""
                    if (isIOS) {
                      window.open("maps://maps.apple.com/?q=" + query, "_blank")
                    } else {
                      window.open("https://www.google.com/maps/search/?api=1&query=" + query, "_blank")
                    }
                  }

                  return (
                    <>
                      {requiresCall && contactPhone && (
                        <div className="bg-blue/5 border border-blue/20 rounded-xl px-4 py-3 mb-2">
                          <p className="text-xs text-blue font-semibold mb-2">📞 Appel requis avant passage</p>
                          <a href={"tel:" + contactPhone}
                            onClick={() => setCalledListings(c => ({ ...c, [p.listing_id]: true }))}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-white text-sm"
                            style={{ background: "linear-gradient(135deg,#2563EB,#1d4ed8)" }}>
                            📞 Appeler le {contactPhone}
                          </a>
                          {!hasCalled && (
                            <p className="text-xs text-muted text-center mt-2">
                              Appelez pour convenir d'un RDV avant de vous déplacer
                            </p>
                          )}
                          {hasCalled && (
                            <p className="text-xs text-blue font-semibold text-center mt-2">✓ RDV convenu — vous pouvez y aller</p>
                          )}
                        </div>
                      )}
                      <button onClick={openGPSHandler} disabled={!canGo}
                        className="w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 mb-3"
                        style={{
                          borderColor: canGo ? "#D1D9E6" : "#E2E8F0",
                          background:  canGo ? "#1E293B" : "#F1F5F9",
                          color:       canGo ? "#ffffff" : "#94A3B8",
                          cursor:      canGo ? "pointer" : "not-allowed",
                        }}>
                        🗺 {canGo ? "Y aller" : "Appelez d'abord pour débloquer"}
                      </button>
                    </>
                  )
                })()}

                {/* Enchères si actives */}
                {hasBid && listing && isPending && (
                  <BidButtons listing={listing} profile={profile} onBidPlaced={fetchPickups} />
                )}

                {/* Annuler réservation */}
                {!isBid && (isPending || isAuthorized || isConfirmed) && (
                  <button onClick={() => handleCancel(p)} disabled={cancelling === p.id}
                    className="w-full py-2.5 rounded-xl border border-red/30 bg-red/10 text-red text-sm font-semibold cursor-pointer disabled:opacity-40 mt-3">
                    {cancelling === p.id ? 'Annulation…' : isConfirmed ? '✕ Signaler un problème — annuler' : isAuthorized ? '✕ Annuler — je ne peux plus venir' : '✕ Annuler la réservation'}
                  </button>
                )}
                {/* Se retirer d'une enchère */}
                {isBid && (
                  <button onClick={() => handleCancelBid(p)} disabled={cancelling === p.id}
                    className="w-full py-2.5 rounded-xl border border-red/30 bg-red/10 text-red text-sm font-semibold cursor-pointer disabled:opacity-40 mt-3">
                    {cancelling === p.id ? 'Annulation…' : "✕ Se retirer de l'enchère"}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
