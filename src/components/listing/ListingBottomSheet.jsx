import { useState } from 'react'
import { useListingStore } from '@/store/useListingStore'
import { useAuthStore }    from '@/store/useAuthStore'
import { profitColor }     from '@/lib/mapbox'

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

export default function ListingBottomSheet({ listing, profile, onClose }) {
  const { reserveListing, placeBid } = useListingStore()
  const { user } = useAuthStore()
  const [booked,  setBooked]  = useState(false)
  const [bidding, setBidding] = useState(false)

  const userTier       = profile?.tier          || 'free'
  const resalePrice    = profile?.resale_price  || null
  const goldThreshold  = profile?.gold_threshold || 20
  const canBook        = userTier === 'gold'
  const isHidden       = listing.qty > (TIER_LIMIT[userTier] || 2)
  const isReserved     = listing.reserved_by !== null
  const isReservedByMe = listing.reserved_by === user?.id
  const color          = isHidden ? '#4A5568' : profitColor(listing.price, resalePrice, goldThreshold, listing.qty)

  const profit = resalePrice && resalePrice > listing.price && !isHidden
    ? (resalePrice - listing.price) * listing.qty
    : null

  const currentPrice = listing.current_bid || listing.price

  const handleReserve = async () => {
    setBooked(true)
    await reserveListing(listing.id)
    setTimeout(onClose, 1000)
  }

  const handleBid = async (step) => {
    setBidding(true)
    await placeBid(listing.id, step, currentPrice, null)
    setBidding(false)
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
                  : isReservedByMe
                    ? listing.companies?.name
                    : <span style={{ filter: 'blur(6px)', userSelect: 'none' }}>{listing.companies?.name || 'Vendeur'}</span>
                }
              </h2>
              <p className="text-sub text-sm mt-0.5">
                {listing.companies?.city}
                {/* Adresse masquée avant réservation */}
                {isReservedByMe && listing.companies?.address && (
                  <span className="block text-xs text-muted mt-0.5">📍 {listing.companies.address}</span>
                )}
                {!isReservedByMe && (
                  <span className="block text-xs text-muted/50 mt-0.5 italic">Adresse visible après réservation</span>
                )}
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl bg-hi border border-border flex items-center justify-center text-xl text-sub">×</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Palettes',   value: isReserved ? '—' : listing.qty,                                  color },
              { label: 'Prix',       value: isReserved ? '—' : `${listing.price.toFixed(2)}€`,              color: '#2ECC71' },
              { label: 'Total',      value: isReserved ? '—' : `${(listing.qty * listing.price).toFixed(2)}€`, color: '#F5A623' },
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
                    <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-1">
                      <p className="text-amber text-xs leading-relaxed">
                        ⚠️ En réservant, vous vous engagez à venir récupérer ces palettes <strong>aujourd'hui</strong>. Les no-shows répétés entraînent une suspension de votre compte.
                      </p>
                    </div>
                    <button onClick={handleReserve}
                      className="w-full py-4 rounded-2xl font-bold text-bg"
                      style={{ background: 'linear-gradient(135deg,#FFD166,#E8B800)', boxShadow: '0 6px 20px rgba(255,209,102,0.4)' }}>
                      🥇 Réserver ces palettes
                    </button>
                    {/* Enchère si déjà réservée par quelqu'un d'autre */}
                    {listing.reserved_by && (
                      <div className="flex gap-2">
                        {[0.10, 0.20, 0.50].map(step => (
                          <button key={step} onClick={() => handleBid(step)} disabled={bidding}
                            className="flex-1 py-3 rounded-xl border font-bold text-sm disabled:opacity-40"
                            style={{ borderColor: step===0.50?'#EF444466':step===0.20?'#F9731666':'#2ECC7166', background: step===0.50?'#EF444418':step===0.20?'#F9731618':'#2ECC7118', color: step===0.50?'#EF4444':step===0.20?'#F97316':'#2ECC71' }}>
                            +{Math.round(step*100)}¢
                          </button>
                        ))}
                      </div>
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
                <div className="w-full py-4 rounded-2xl bg-green/10 border border-green/30 text-center text-green text-sm font-semibold">
                  ✅ Rendez-vous directement en vendeur
                </div>
                <button onClick={() => openGPS(
                  listing.companies?.address,
                  listing.companies?._lat,
                  listing.companies?._lng
                )}
                  className="w-full py-3 rounded-2xl border border-border bg-hi text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2">
                  🗺 Y aller
                </button>
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
