import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/useCompanyStore'
import { useAuthStore }    from '@/store/useAuthStore'
import NotificationPrompt  from '@/components/shared/NotificationPrompt'

const VEHICLE_OPTIONS = [
  { id: 'vl',      label: 'VL uniquement',  icon: '🚗', sub: 'Petite cour, accès restreint' },
  { id: 'porteur', label: 'Porteur et plus', icon: '🚚', sub: 'Accès standard' },
  { id: 'semi',    label: 'Semi-remorque',   icon: '🚛', sub: 'Grand quai de chargement' },
]

const TABS = ['annonce', 'acheteurs', 'blacklist', 'profil']

// ─── Formulaire annonce ───────────────────────────────────────────────────────
const ListingForm = ({ listing, onSave }) => {
  const { company } = useCompanyStore()
  const { publishListing, updateListing, deleteListing } = useCompanyStore()
  const [qty,             setQty]             = useState(listing?.qty    || 1)
  const [price,           setPrice]           = useState(listing?.price  || '')
  const [pickupBefore,    setPickupBefore]    = useState(listing?.pickup_before || '')
  const [isActive,        setIsActive]        = useState(listing?.is_active ?? true)
  const [auctionMode,     setAuctionMode]     = useState(listing?.auction_mode  || false)
  const [requiresCall,    setRequiresCall]    = useState(listing?.requires_call || false)
  const [contactPhone,    setContactPhone]    = useState(listing?.contact_phone || '')
  const [saved,           setSaved]           = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)

  const isSaved = saved || !!listing

  const doSave = async () => {
    if (!price || qty < 1) { setError('Renseignez le prix et la quantité'); return }
    if (!listing && !company?.id) { setError('Profil vendeur non chargé — réessayez'); return }
    setError('')
    setLoading(true)
    try {
      const auctionEndsAt = auctionMode
        ? addWorkingDays(new Date(), AUCTION_DURATION_DAYS).toISOString()
        : null
      const data = {
        qty,
        price:           parseFloat(price),
        pickup_before:   pickupBefore || null,
        is_active:       isActive,
        auction_mode:    auctionMode,
        auction_ends_at: auctionEndsAt,
        requires_call:   requiresCall,
        contact_phone:   requiresCall ? contactPhone : null,
      }
      if (listing) {
        const { error } = await supabase.from('listings').update(data).eq('id', listing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('listings').insert({ ...data, company_id: company.id })
        if (error) throw error
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSave?.()
    } catch (e) {
      setError(e.message || 'Erreur lors de la sauvegarde')
    }
    setLoading(false)
  }

  const handleSave = () => {
    // Première publication → on demande la permission de notif
    if (!listing) {
      const status = 'Notification' in window ? Notification.permission : 'unsupported'
      if (status === 'default') { setShowNotifPrompt(true); return }
    }
    doSave()
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette annonce ?')) return
    setLoading(true)

    // Récupère les chauffeurs à notifier avant annulation
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('driver_id')
      .eq('listing_id', listing.id)
      .in('status', ['pending', 'authorized'])

    // Annule les transactions
    await supabase.from('transactions')
      .update({ status: 'cancelled' })
      .eq('listing_id', listing.id)
      .in('status', ['pending', 'authorized'])

    // Notifie les chauffeurs concernés
    if (pendingTx?.length) {
      await supabase.from('notifications').insert(
        pendingTx.map(tx => ({
          user_id: tx.driver_id,
          type:    'listing_cancelled',
          title:   "❌ Annonce annulée",
          body:    `${company.name} a retiré son annonce. Votre réservation a été annulée.`,
          data:    { listing_id: listing.id },
        }))
      )
    }

    // Met à jour en base
    const { error } = await supabase.from('listings').update({ is_active: false }).eq('id', listing.id)
    if (error) { setError(error.message); setLoading(false); return }
    await deleteListing()
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {showNotifPrompt && (
        <NotificationPrompt
          context="listing"
          onGranted={() => { setShowNotifPrompt(false); doSave() }}
          onSkip={() => { setShowNotifPrompt(false); doSave() }}
        />
      )}
      {/* Toggle actif */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3">
        <div>
          <p className="font-semibold text-sm text-gray-800">Annonce</p>
          <p className="text-xs text-sub mt-0.5">{isActive ? 'Visible sur la carte' : 'Masquée'}</p>
        </div>
        <button onClick={() => setIsActive(a => !a)}
          className="relative cursor-pointer border-none bg-transparent p-0"
          style={{ width: 52, height: 28 }}>
          <div className="w-full h-full rounded-full transition-colors duration-200"
            style={{ background: isActive ? '#2ECC71' : '#1C2330', border: `2px solid ${isActive ? '#2ECC71' : '#2D3748'}` }}>
            <div className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200"
              style={{ transform: isActive ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
        </button>
      </div>

      {/* Mode enchère */}
      <div className="bg-surface border rounded-2xl overflow-hidden"
        style={{ borderColor: auctionMode ? '#A855F744' : '#D1D9E6' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-semibold text-sm text-gray-800">⚡ Mettre aux enchères</p>
            <p className="text-xs text-sub mt-0.5">
              {auctionMode ? 'Les acheteurs surenchérissent pendant la durée choisie' : 'Réservation directe — premier arrivé premier servi'}
            </p>
          </div>
          <button onClick={() => setAuctionMode(a => !a)}
            className="relative cursor-pointer border-none bg-transparent p-0"
            style={{ width: 52, height: 28 }}>
            <div className="w-full h-full rounded-full transition-colors duration-200"
              style={{ background: auctionMode ? '#A855F7' : '#D1D9E6', border: `2px solid ${auctionMode ? '#A855F7' : '#D1D9E6'}` }}>
              <div className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200"
                style={{ transform: auctionMode ? 'translateX(26px)' : 'translateX(2px)' }} />
            </div>
          </button>
        </div>

        {/* Info durée fixe */}
        {auctionMode && (
          <div className="px-4 pb-4 border-t border-border/50 pt-3 text-xs text-muted leading-relaxed">
            ⏱ L'enchère dure <strong className="text-gray-800">5 jours ouvrés</strong>. Le gagnant aura ensuite <strong className="text-gray-800">5 jours ouvrés</strong> pour venir récupérer les palettes.
          </div>
        )}
      </div>

      {/* Quantité */}
      <div>
        <label className="text-xs text-muted uppercase tracking-widest block mb-2">
          Nombre de palettes
        </label>
        <div className="flex items-center bg-hi border border-border rounded-2xl overflow-hidden">
          <input type="number" inputMode="numeric" value={qty || ''}
            onChange={e => { const n = parseInt(e.target.value); setQty(isNaN(n) ? 0 : Math.min(1000, n)) }}
            placeholder="0" min="1" max="1000"
            className="flex-1 px-5 py-4 bg-transparent text-amber font-bebas text-5xl outline-none text-center"
          />
        </div>
        <p className="text-xs text-muted mt-1 text-center">Maximum 1 000 palettes</p>
      </div>

      {/* Prix */}
      <div>
        <label className="text-xs text-muted uppercase tracking-widest block mb-2">
          Prix par palette (€)
        </label>
        <div className="flex items-center bg-hi border border-border rounded-2xl overflow-hidden">
          <span className="px-4 text-green text-lg font-semibold">€</span>
          <input type="number" inputMode="decimal" value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00" step="0.10" min="0.10"
            className="flex-1 py-4 bg-transparent text-gray-800 font-bebas text-3xl outline-none"
          />
          <span className="px-4 text-muted text-xs">/ pal.</span>
        </div>
      </div>

      {/* Heure limite */}
      <div>
        <label className="text-xs text-muted uppercase tracking-widest block mb-2">
          Heure limite de récupération
        </label>
        <input type="time" value={pickupBefore} onChange={e => setPickupBefore(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-border rounded-2xl text-gray-800 text-sm outline-none font-mono"
        />
        <p className="text-xs text-muted mt-1">Fixez l'heure avant laquelle les palettes doivent être récupérées</p>
      </div>

      {/* Total */}
      {qty > 0 && price && (
        <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-2.5 flex justify-between">
          <span className="text-sub text-sm">Valeur totale</span>
          <span className="font-bebas text-xl text-amber">{(qty * parseFloat(price || 0)).toFixed(2)} €</span>
        </div>
      )}

      {error && <p className="text-xs text-red text-center">{error}</p>}

      {/* Actions */}
      <button onClick={handleSave} disabled={loading || !price || qty < 1}
        className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer disabled:opacity-40"
        style={{ background: isSaved ? '#2ECC71' : 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: isSaved ? '0 6px 20px rgba(46,204,113,0.3)' : '0 6px 20px rgba(245,166,35,0.3)', transition: 'background 0.3s' }}
      >
        {loading ? 'Sauvegarde…' : isSaved ? '✅ Publié sur la carte !' : listing ? 'Mettre à jour' : '📦 Publier sur la carte →'}
      </button>

      {listing && (
        <button onClick={handleDelete}
          className="w-full py-3 rounded-2xl border border-red/30 bg-red/10 text-red text-sm font-semibold cursor-pointer">
          Supprimer l'annonce
        </button>
      )}
    </div>
  )
}

// ─── Paramètres du site ───────────────────────────────────────────────────────
const SiteSettings = ({ company }) => {
  const [vehicleRequired, setVehicleRequired] = useState(company?.vehicle_required || 'semi')
  const [hasLoader,       setHasLoader]       = useState(company?.has_loader       || false)
  const [saved,           setSaved]           = useState(false)
  const [loading,         setLoading]         = useState(false)

  const handleSave = async () => {
    setLoading(true)
    await supabase.from('companies').update({
      vehicle_required: vehicleRequired,
      has_loader:       hasLoader,
    }).eq('id', company.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div>
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Véhicule maximum accepté</p>
        <div className="flex flex-col gap-2">
          {VEHICLE_OPTIONS.map(v => (
            <button key={v.id} onClick={() => setVehicleRequired(v.id)}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left"
              style={{ borderColor: vehicleRequired === v.id ? '#F5A623' : '#1C2330', background: vehicleRequired === v.id ? '#F5A62314' : '#13181F' }}>
              <span className="text-3xl">{v.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: vehicleRequired === v.id ? '#E8EDF5' : '#718096' }}>{v.label}</p>
                <p className="text-xs text-muted mt-0.5">{v.sub}</p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: vehicleRequired === v.id ? '#F5A623' : '#1C2330', background: vehicleRequired === v.id ? '#F5A623' : 'transparent' }}>
                {vehicleRequired === v.id && <span className="text-bg text-xs">✓</span>}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted mt-2 leading-relaxed">Les acheteurs avec un véhicule plus grand ne verront pas votre annonce.</p>
      </div>

      <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-4">
        <div>
          <p className="font-semibold text-sm text-gray-800">Engin de chargement disponible</p>
          <p className="text-xs text-sub mt-1">Fenwick, Gerbeur ou autre</p>
        </div>
        <button onClick={() => setHasLoader(h => !h)}
          className="relative cursor-pointer border-none bg-transparent p-0"
          style={{ width: 52, height: 28 }}>
          <div className="w-full h-full rounded-full transition-colors duration-200"
            style={{ background: hasLoader ? '#2ECC71' : '#1C2330', border: `2px solid ${hasLoader ? '#2ECC71' : '#2D3748'}` }}>
            <div className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200"
              style={{ transform: hasLoader ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
        </button>
      </div>

      <button onClick={handleSave} disabled={loading}
        className="w-full py-4 rounded-2xl font-bold text-bg cursor-pointer disabled:opacity-40"
        style={{ background: saved ? '#2ECC71' : 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: saved ? '0 6px 20px rgba(46,204,113,0.3)' : '0 6px 20px rgba(245,166,35,0.3)', transition: 'background 0.3s' }}>
        {loading ? 'Sauvegarde…' : saved ? '✅ Profil sauvegardé !' : 'Sauvegarder'}
      </button>
    </div>
  )
}

// ─── Liste acheteurs ─────────────────────────────────────────────────────────
const DriversList = ({ drivers, blacklist, listing, onBlacklist, onValidate, onConfirm }) => {
  const blacklistedIds = new Set(blacklist.map(b => b.driver_id))

  // Une seule annonce → un seul chauffeur actif (réservant ou meilleur enchérisseur)
  const driver = drivers[0]

  if (!driver) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
      <span className="text-4xl opacity-30">🚛</span>
      <p className="font-bebas text-xl">Aucun acheteur</p>
    </div>
  )

  const driverName    = driver.profiles?.full_name || 'Un chauffeur'
  const isReserver    = driver.isReservation === true
  const isBlacklisted = blacklistedIds.has(driver.bidder_id)
  const isAuction     = listing?.auction_mode === true
  const currentPrice  = listing?.current_bid || listing?.price || 0
  const totalRevenue  = currentPrice * (listing?.qty || 0)

  return (
    <div className="flex flex-col gap-4 p-5">

      {/* Carte chauffeur */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">

        {/* Header chauffeur */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: isAuction ? '#EC489918' : '#FFD16622', border: `1px solid ${isAuction ? '#EC489944' : '#FFD16644'}` }}>
            🚛
          </div>
          <div className="flex-1">
            <p className="font-bebas text-xl text-gray-800 leading-tight">{driverName}</p>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{ background: isAuction ? '#EC489920' : '#FFD16620', color: isAuction ? '#EC4899' : '#E8920A', border: `1px solid ${isAuction ? '#EC489940' : '#E8920A40'}` }}>
              {isAuction ? '⚡ ENCHÈRE' : '🔒 RÉSERVÉ'}
            </span>
          </div>
          {!isBlacklisted && (
            <button onClick={() => onBlacklist(driver.bidder_id)}
              className="w-9 h-9 rounded-xl bg-hi border border-border flex items-center justify-center text-base cursor-pointer">
              🚫
            </button>
          )}
        </div>

        {/* Fin d'enchère */}
        {isAuction && listing?.auction_ends_at && (
          <div className="mx-4 mb-3 bg-pink/5 border border-pink/20 rounded-xl px-3 py-2 text-xs text-center"
            style={{ color: '#EC4899' }}>
            ⏱ Enchère se termine le <strong>{new Date(listing.auction_ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        )}

        {/* Détails financiers */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          <div className="bg-hi rounded-xl p-3 text-center">
            <p className="text-xs text-muted mb-1">{isAuction ? 'Enchère actuelle' : 'Prix / palette'}</p>
            <p className="font-bebas text-2xl text-gray-800">{currentPrice.toFixed(2)} €</p>
          </div>
          <div className="bg-hi rounded-xl p-3 text-center">
            <p className="text-xs text-muted mb-1">Recette totale</p>
            <p className="font-bebas text-2xl text-green">{totalRevenue.toFixed(2)} €</p>
          </div>
        </div>

        {/* Boutons */}
        {isAuction && driver && (
          <button onClick={() => onValidate(driver.bidder_id, driverName)}
            className="w-full py-4 font-bold text-sm cursor-pointer border-t border-pink/20"
            style={{ background: 'linear-gradient(135deg,#EC4899,#db2777)', color: '#fff' }}>
            ⚡ Clôturer l'enchère — {driverName} remporte les palettes
          </button>
        )}
        {isReserver && !driver.isAuthorized && !isAuction && (
          <button onClick={() => onValidate(driver.bidder_id, driverName)}
            className="w-full py-4 font-bold text-white text-sm cursor-pointer border-t border-border"
            style={{ background: 'linear-gradient(135deg,#FFD166,#E8B800)', color: '#1E293B' }}>
            ✅ Autoriser {driverName} à venir chercher les palettes
          </button>
        )}
        {isReserver && driver.isAuthorized && (
          <div className="border-t border-green/30">
            <div className="px-4 py-2 bg-green/5 text-xs text-green text-center">
              🟢 {driverName} est en route
            </div>
            <button onClick={() => onConfirm(driver.bidder_id, driverName)}
              className="w-full py-4 font-bold text-white text-sm cursor-pointer"
              style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)' }}>
              ✅ Confirmer — palettes récupérées
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Liste noire ──────────────────────────────────────────────────────────────
const BlacklistPanel = ({ blacklist, onUnblacklist }) => (
  <div className="flex flex-col gap-3 p-5">
    <div className="bg-red/10 border border-red/20 rounded-xl px-4 py-3 text-xs text-red">
      🚫 Les acheteurs blacklistés ne voient plus vos annonces sur la carte.
    </div>
    {blacklist.length === 0 ? (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted">
        <span className="text-4xl opacity-30">🚫</span>
        <p className="font-bebas text-xl">Liste noire vide</p>
      </div>
    ) : blacklist.map(b => (
      <div key={b.id} className="bg-surface border border-red/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red/10 border border-red/20 flex items-center justify-center text-xl shrink-0 opacity-50 grayscale">🚛</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-muted line-through">{b.profiles?.full_name || 'Acheteur'}</p>
          <p className="text-xs text-red/70 mt-0.5">Annonce masquée</p>
        </div>
        <button onClick={() => onUnblacklist(b.driver_id)}
          className="px-3 py-1.5 rounded-xl bg-white border border-border text-sub text-xs cursor-pointer hover:text-gray-800 transition-colors">
          Retirer
        </button>
      </div>
    ))}
  </div>
)

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function CompanyDashboard({ tab = 'annonce' }) {
  const [confirmDriver, setConfirmDriver] = useState(null)
  const { company, listing, drivers, blacklist, loading, blacklistDriver, unblacklistDriver, fetchDrivers } = useCompanyStore()
  const { profile } = useAuthStore()

  // Charge les acheteurs dès que l'annonce est disponible
  useEffect(() => {
    if (listing?.id) fetchDrivers(listing.id, listing.reserved_by)
  }, [listing?.id, listing?.reserved_by])

  const totalViews = drivers.length

  const handleBlacklist = async (driverId) => {
    if (!window.confirm('Blacklister ce acheteur ?')) return
    await blacklistDriver(driverId)
  }

  // Étape 1 : autorise le chauffeur à venir — status → 'authorized' en base
  const handleValidate = async (driverId, driverName) => {
    if (!window.confirm(`Autoriser ${driverName} à venir chercher les palettes ?`)) return
    if (!listing) return

    const isAuction = listing.auction_mode === true

    if (isAuction) {
      // En mode enchère : créer la transaction directement en 'authorized'
      const { error } = await supabase.from('transactions').insert({
        listing_id:  listing.id,
        company_id:  listing.company_id,
        driver_id:   driverId,
        qty:         listing.qty,
        buy_price:   listing.current_bid || listing.price,
        status:      'authorized',
        company_validated_at: new Date().toISOString(),
      })
      if (error) { alert('Erreur : ' + JSON.stringify(error)); return }
    } else {
      // En mode réservation : mettre à jour la transaction pending
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'authorized' })
        .eq('listing_id', listing.id)
        .eq('driver_id',  driverId)
        .eq('status',     'pending')
      if (error) { alert('Erreur : ' + JSON.stringify(error)); return }
    }

    // Notification au chauffeur avec les détails défloutés
    const pickupDeadline = listing.auction_mode
      ? "Vous avez 5 jours ouvrés pour venir récupérer les palettes."
      : `Rendez-vous au ${company.address}, ${company.city}.`

    await supabase.from('notifications').insert({
      user_id: driverId,
      type:    'transaction_authorized',
      title:   isAuction ? "🏆 Vous avez remporté l'enchère !" : "🎉 Votre demande a été acceptée !",
      body:    `${company.name} vous autorise à venir chercher les palettes. ${pickupDeadline}`,
      data:    { listing_id: listing.id, company_name: company.name, company_address: company.address },
    })

    // Rafraîchit la liste pour refléter le nouveau statut
    fetchDrivers(listing.id, driverId)
  }

  // Étape 2 : confirme que les palettes ont été récupérées
  const handleConfirm = async (driverId, driverName) => {
    if (!window.confirm(`Confirmer que ${driverName} a bien récupéré les palettes ?`)) return
    if (!listing) return

    const { error } = await supabase
      .from('transactions')
      .update({
        status:               'confirmed',
        company_validated_at: new Date().toISOString(),
      })
      .eq('listing_id', listing.id)
      .eq('driver_id',  driverId)
      .in('status',     ['pending', 'authorized'])

    if (error) { alert('Erreur lors de la confirmation : ' + error.message); return }

    // Désactive l'annonce via le store (évite le problème de RLS SELECT)
    useCompanyStore.getState().deleteListing()
    useCompanyStore.setState({ drivers: [] })
    alert(`✅ Transaction confirmée avec ${driverName}.`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-mono text-muted text-xs animate-pulse">Chargement…</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Header compact */}
      <div className="px-4 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono text-[10px] text-muted uppercase tracking-widest">Mon espace vendeur</p>
            <h1 className="font-bebas text-xl text-gray-800 leading-tight">{company?.name || 'Mon vendeur'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl px-3 py-1.5">
              <span className="font-bebas text-lg text-blue leading-none">{totalViews}</span>
              <span className="text-[10px] text-muted">vues</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface border rounded-xl px-3 py-1.5"
              style={{ borderColor: blacklist.length > 0 ? '#EF444440' : '#1C2330' }}>
              <span className="font-bebas text-lg leading-none" style={{ color: blacklist.length > 0 ? '#EF4444' : '#4A5568' }}>{blacklist.length}</span>
              <span className="text-[10px] text-muted">🚫</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-2">
        {tab === 'annonce'   && (
          company?.vehicle_required
            ? <ListingForm listing={listing} onSave={() => window.location.reload()} />
            : <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center">
                <span className="text-5xl">⚙️</span>
                <p className="font-bebas text-2xl text-gray-800">Profil incomplet</p>
                <p className="text-sm text-sub leading-relaxed">Configurez d'abord votre profil (onglet Profil) pour pouvoir publier une annonce.</p>
              </div>
        )}
        {tab === 'acheteurs' && <DriversList drivers={drivers} blacklist={blacklist} listing={listing} onBlacklist={handleBlacklist} onValidate={handleValidate} onConfirm={handleConfirm} />}
        {tab === 'blacklist' && <BlacklistPanel blacklist={blacklist} onUnblacklist={unblacklistDriver} />}
        {tab === 'profil'    && (
          <>
            {!company?.vehicle_required && (
              <div className="mx-5 mt-5 bg-amber/10 border border-amber/40 rounded-2xl px-4 py-4 flex items-start gap-3">
                <span className="text-2xl shrink-0">👋</span>
                <div>
                  <p className="text-amber font-bold text-sm">Bienvenue sur Palette Run !</p>
                  <p className="text-amber/80 text-xs mt-1 leading-relaxed">
                    Configurez votre profil pour pouvoir publier votre première annonce sur la carte.
                  </p>
                </div>
              </div>
            )}
            <SiteSettings company={company} />
            {/* Supprimer le compte */}
            <div className="px-5 pb-10 mt-2">
              <div className="border-t border-border pt-6">
                {/* Déconnexion */}
                <button onClick={() => useAuthStore.getState().signOut()}
                  className="w-full py-3 rounded-2xl border border-border bg-white text-gray-800 text-sm font-semibold cursor-pointer mb-4">
                  🚪 Se déconnecter
                </button>

                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Zone dangereuse</p>
                <button onClick={async () => {
                  if (!window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
                  if (!window.confirm('Êtes-vous vraiment sûr ? Toutes vos données seront perdues.')) return
                  const state  = useAuthStore.getState()
                  const userId = state.user?.id
                  try {
                    const { error } = await supabase.rpc('delete_company_account', { input_id: userId })
                    if (error) throw error
                    useCompanyStore.getState().reset()
                    await state.signOut()
                  } catch (e) {
                    alert('Erreur lors de la suppression : ' + e.message)
                  }
                }}
                  className="w-full py-3 rounded-2xl border border-red/30 bg-red/5 text-red text-sm font-semibold cursor-pointer">
                  🗑 Supprimer mon compte
                </button>
                <p className="text-muted text-xs text-center mt-2 leading-relaxed">
                  Cette action est irréversible. Toutes vos données seront supprimées.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
