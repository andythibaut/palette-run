import { useState, useEffect } from 'react'
import { useListingStore } from '@/store/useListingStore'
import { useAuthStore }    from '@/store/useAuthStore'
import { supabase }        from '@/lib/supabase'
import { profitColor }     from '@/lib/mapbox'
import { formatPickupDeadline } from '@/lib/transaction'

const TIER_LIMIT = { free: 2, gold: Infinity }

// Ouvre l'adresse dans Google Maps ou Apple Maps
const openGPS = (address, lat, lng) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const query = address ? encodeURIComponent(address) : `${lat},${lng}`
  if (isIOS) {
    window.open(`maps://maps.apple.com/?q=${query}&ll=${lat},${lng}`, '_blank')
  } else {
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }
}

// ─── Champ d'enchère libre ────────────────────────────────────────────────────
function AuctionBidInput({ currentPrice, hasExistingBid, bidding, bidResult, onBid }) {
  const minPrice = hasExistingBid
    ? Math.round((currentPrice + 0.50) * 10) / 10
    : currentPrice
  const [value, setValue] = useState(minPrice.toFixed(2))
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setValue(e.target.value)
    setError('')
  }

  const handleSubmit = () => {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) { setError("Montant invalide"); return }
    // Arrondi au dixième
    const rounded = Math.round(parsed * 10) / 10
    if (rounded < minPrice) { setError(`Minimum ${minPrice.toFixed(2)} €`); return }
    if (Math.round(parsed * 100) % 10 !== 0) { setError("Montant au dixième près (ex: 2.50, 2.60)"); return }
    onBid(rounded - currentPrice)
  }

  return (
    <>
      <div className="bg-pink/10 border border-pink/30 rounded-xl px-4 py-3">
        <p className="text-pink text-xs font-semibold">
          ⚡ Enchères ouvertes — enchère actuelle : <strong>{currentPrice.toFixed(2)} €</strong>
        </p>
        <p className="text-pink/70 text-xs mt-0.5">Minimum {minPrice.toFixed(2)} € · pas de 0.10€</p>
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center bg-white border-2 border-border rounded-xl overflow-hidden focus-within:border-pink">
          <span className="pl-3 text-gray-400 text-sm">€</span>
          <input
            type="number"
            value={value}
            onChange={handleChange}
            step="0.10"
            min={minPrice}
            className="flex-1 px-2 py-3 bg-transparent text-gray-800 text-sm outline-none font-mono"
            placeholder={minPrice.toFixed(2)}
          />
        </div>
        <button onClick={handleSubmit} disabled={bidding}
          className="px-5 py-3 rounded-xl font-bold text-white text-sm cursor-pointer disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#EC4899,#db2777)" }}>
          {bidding ? "…" : "Enchérir"}
        </button>
      </div>
      {error && (
        <p className="text-red text-xs text-center">{error}</p>
      )}
      {bidResult && (
        <div className={`w-full rounded-xl px-3 py-2 text-xs text-center font-semibold ${bidResult.success ? "bg-green/10 border border-green/30 text-green" : "bg-red/10 border border-red/30 text-red"}`}>
          {bidResult.success ? `✅ Enchère placée à ${bidResult.price.toFixed(2)} €` : "❌ Erreur — réessayez"}
        </div>
      )}
    </>
  )
}

export default function ListingBottomSheet({ listing, profile, onClose }) {
  console.log('listing:', JSON.stringify(listing, null, 2))
  const { reserveListing, placeBid, error: listingError } = useListingStore()
  const { user } = useAuthStore()
  const [booked,       setBooked]       = useState(false)
  const [bidding,      setBidding]      = useState(false)
  const [bidResult,    setBidResult]    = useState(null) // { success, price }
  const [isConfirmed,  setIsConfirmed]  = useState(false)
  const [companyDetails, setCompanyDetails] = useState(null) // { name, address, lat, lng }

  // Vérifie si transaction confirmée et charge les détails défloutés via fonction SQL sécurisée
  useEffect(() => {
    if (!user?.id || !listing?.id) return
    supabase
      .from('transactions')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('driver_id', user.id)
      .eq('status', 'confirmed')
      .single()
      .then(async ({ data }) => {
        const confirmed = !!data
        setIsConfirmed(confirmed)
        if (confirmed) {
          // Récupère name + address uniquement si transaction confirmée
          const { data: details } = await supabase
            .rpc('get_confirmed_company_details', { p_listing_id: listing.id })
          if (details?.[0]) setCompanyDetails(details[0])
        }
      })
  }, [listing?.id, user?.id])

  const userTier       = profile?.tier          || 'free'
  const resalePrice    = profile?.resale_price  || null
  const goldThreshold  = profile?.gold_threshold || 20
  const canBook        = userTier === 'gold'
  const isHidden       = listing.qty > (TIER_LIMIT[userTier] || 2)
  const isReserved     = listing.reserved_by !== null
  const isReservedByMe = listing.reserved_by === user?.id
  const color          = isHidden ? '#4A5568' : profitColor(listing.price, resalePrice, goldThreshold, listing.qty)

  // Nom et adresse visibles uniquement si le commerçant a validé la transaction
  // En mode enchère : le chauffeur voit les détails s'il est le meilleur enchérisseur
  // En mode normal : seulement si la transaction est confirmée
  const isAuctionMode = listing?.auction_mode === true
  const isTopBidder   = isAuctionMode && listing?.reserved_by === user?.id
  const canSeeDetails = isConfirmed || isTopBidder

  const profit = resalePrice && resalePrice > listing.price && !isHidden
    ? (resalePrice - listing.price) * listing.qty
    : null

  const currentPrice = listing.current_bid || listing.price

  const handleReserve = async () => {
    setBooked(true)
    const ok = await reserveListing(listing.id)
    if (!ok) {
      setBooked(false)
      // L'erreur est dans le store, on ferme après 2s pour que l'utilisateur la voie
      setTimeout(onClose, 2500)
    } else {
      setTimeout(onClose, 1000)
    }
  }

  const handleBid = async (step) => {
    setBidding(true)
    setBidResult(null)
    const ok = await placeBid(listing.id, step, currentPrice, null)
    setBidding(false)
    if (ok) {
      setBidResult({ success: true, price: parseFloat((currentPrice + step).toFixed(2)) })
      setTimeout(() => setBidResult(null), 3000)
    } else {
      setBidResult({ success: false })
      setTimeout(() => setBidResult(null), 3000)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-surface rounded-t-3xl border border-border border-b-0 shadow-2xl"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-start gap-2 mb-4">
            <div className="flex-1">
              {/* Nom flou avant réservation */}
              <h2 className="font-bebas text-2xl leading-tight"
                style={{ color: isHidden ? '#4A5568' : '#E8EDF5' }}>
                {isHidden
                  ? 'Nom masqué'
                  : canSeeDetails
                    ? (companyDetails?.name || 'Vendeur')
                    : <span style={{ filter: 'blur(6px)', userSelect: 'none' }}>Vendeur</span>
                }
              </h2>
              <p className="text-sub text-sm mt-0.5">
                {isHidden
                  ? '—'
                  : canSeeDetails
                    ? listing.companies?.city
                    : <span style={{ filter: 'blur(5px)', userSelect: 'none' }}>Ville</span>
                }
                {canSeeDetails && companyDetails?.address && (
                  <span className="block text-xs text-muted mt-0.5">📍 {companyDetails.address}</span>
                )}
                {!canSeeDetails && !isHidden && (
                  <span className="block text-xs text-muted/50 mt-0.5 italic">
                    {isReservedByMe ? 'En attente de validation du commerçant…' : 'Adresse visible après validation'}
                  </span>
                )}
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-hi border border-border flex items-center justify-center text-xl text-sub">×</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Palettes',   value: (isReserved && !isAuctionMode) ? '—' : listing.qty,                                                   color },
              { label: 'Prix',       value: (isReserved && !isAuctionMode) ? '—' : `${currentPrice.toFixed(2)}€`,                      color: '#2ECC71' },
              { label: 'Total',      value: (isReserved && !isAuctionMode) ? '—' : `${(listing.qty * currentPrice).toFixed(2)}€`,      color: '#F5A623' },
            ].map(s => (
              <div key={s.label} className="bg-hi rounded-2xl p-3 text-center border border-border">
                <p className="font-bebas text-2xl leading-none" style={{ color: isReserved ? '#4A5568' : s.color }}>
                  {s.value}
                </p>
                <p className="text-[10px] text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Profit badge */}
          {profit !== null && (
            <div className="flex items-center gap-2 mb-4 rounded-xl px-3 py-2.5"
              style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
              <span className="text-lg">📈</span>
              <div>
                <span className="font-bebas text-xl" style={{ color }}>
                  {profit >= 0 ? '+' : ''}{profit.toFixed(2)} €
                </span>
                <span className="text-sub text-xs ml-2">bénéfice potentiel</span>
              </div>
            </div>
          )}

          {/* Heure limite */}
          {listing.pickup_before && !isReserved && (
            <div className="flex items-center gap-2 mb-4 bg-blue/10 border border-blue/30 rounded-xl px-3 py-2">
              <span>🕐</span>
              <p className="text-blue text-sm">
                Récupérer avant <strong>{listing.pickup_before.slice(0, 5)}</strong>
              </p>
            </div>
          )}

          {/* Enchère programmée */}
          {listing.auction_mode && listing.auction_ends_at && (
            <div className="mb-4 rounded-xl px-4 py-3 border"
              style={{ background: '#A855F711', borderColor: '#A855F744' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">⚡</span>
                <p className="font-semibold text-sm" style={{ color: '#A855F7' }}>Enchère en cours</p>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Se termine le <strong className="text-white">
                  {new Date(listing.auction_ends_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </strong>
              </p>
              <p className="text-xs text-muted mt-1">
                Le gagnant aura autant de temps que la durée de l'enchère pour venir récupérer.
              </p>
            </div>
          )}

          {/* Délai d'enlèvement selon quantité */}
          {!isReserved && !isHidden && (
            <div className="flex items-center gap-2 mb-4 bg-surface border border-border rounded-xl px-3 py-2">
              <span>📅</span>
              <div>
                <p className="text-white text-sm font-semibold">
                  Enlèvement au plus tard : <strong className="text-amber">{formatPickupDeadline(listing.qty)}</strong>
                </p>
                <p className="text-muted text-xs mt-0.5">
                  {listing.qty < 15
                    ? 'Moins de 15 palettes — enlèvement aujourd\'hui'
                    : `${listing.qty} palettes — ${Math.min(Math.floor(listing.qty / 15), 4)} jour(s) ouvrés accordés`}
                </p>
              </div>
            </div>
          )}

          {/* Tier nudge */}
          {isHidden && (
            <div className="mb-4 rounded-xl px-4 py-3"
              style={{ background: userTier === 'free' ? '#F5A62318' : '#FFD16618', border: `1px solid ${userTier === 'free' ? '#F5A62333' : '#FFD16633'}` }}>
              <p className="text-sm font-semibold" style={{ color: userTier === 'free' ? '#F5A623' : '#FFD166' }}>
                🔒 {userTier === 'free' ? 'Annonce > 2 palettes — passez Gold' : 'Annonce > 10 palettes — réservé Gold'}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col gap-2">
            {isHidden ? (
              <>
                {userTier === 'free' && (
                  <button className="w-full py-4 rounded-2xl font-bold text-bg"
                    style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}>
                    ⭐ Gold — 24,90€/mois
                  </button>
                )}
                <button className="w-full py-3 rounded-2xl font-bold border text-gold"
                  style={{ borderColor: '#FFD16666', background: '#FFD16618' }}>
                  🥇 Gold — 24,90€/mois
                </button>
              </>
            ) : isReserved ? (
              <div className="w-full py-4 rounded-2xl bg-hi border border-border text-center text-muted text-sm">
                Disponible dès qu'elle est libérée
              </div>
            ) : canBook ? (
              <>
                {!booked ? (
                  <>
                    {listing.auction_mode ? (
                      /* Mode enchère — champ libre avec minimum +0.50€ et pas de 0.10€ */
                      <AuctionBidInput
                        currentPrice={currentPrice}
                        hasExistingBid={listing?.current_bid !== null && listing?.current_bid !== undefined}
                        bidding={bidding}
                        bidResult={bidResult}
                        onBid={handleBid}
                      />
                    ) : (
                      /* Mode réservation directe */
                      <>
                        <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-1">
                          <p className="text-amber text-xs leading-relaxed">
                            ⚠️ En réservant, vous vous engagez à venir récupérer ces palettes <strong>aujourd'hui</strong>. Les no-shows répétés entraînent une suspension de votre compte.
                          </p>
                        </div>
                        {listingError && (
                          <div className="w-full rounded-xl bg-red/10 border border-red/30 px-3 py-2 text-red text-xs text-center mb-2">
                            ⚠️ {listingError}
                          </div>
                        )}
                        <button onClick={handleReserve}
                          className="w-full py-4 rounded-2xl font-bold text-bg cursor-pointer"
                          style={{ background: 'linear-gradient(135deg,#FFD166,#E8B800)', boxShadow: '0 6px 20px rgba(255,209,102,0.4)' }}>
                          🥇 Réserver ces palettes
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full py-4 rounded-2xl font-bold text-center text-green bg-green/10 border border-green/30">
                    ✅ Réservée !
                  </div>
                )}
              </>
            ) : (
              <>
                {canSeeDetails ? (
                  <>
                    <div className="w-full py-4 rounded-2xl bg-green/10 border border-green/30 text-center text-green text-sm font-semibold">
                      ✅ Rendez-vous directement en vendeur
                    </div>
                    <button onClick={() => openGPS(
                      companyDetails?.address,
                      companyDetails?.lat,
                      companyDetails?.lng
                    )}
                      className="w-full py-3 rounded-2xl border border-border bg-hi text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2">
                      🗺 Y aller
                    </button>
                  </>
                ) : (
                  <div className="w-full py-4 rounded-2xl bg-hi border border-border text-center text-muted text-sm">
                    {isReservedByMe
                      ? '⏳ En attente de validation du commerçant…'
                      : '🔒 Adresse visible après validation'}
                  </div>
                )}
                <button className="w-full py-3 rounded-2xl border font-bold text-gold text-sm"
                  style={{ borderColor: '#FFD16666', background: '#FFD16618' }}>
                  🥇 Gold — réserver en priorité
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
