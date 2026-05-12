import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/useCompanyStore'
import { useAuthStore }    from '@/store/useAuthStore'

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
  const [qty,          setQty]          = useState(listing?.qty    || 1)
  const [price,        setPrice]        = useState(listing?.price  || '')
  const [pickupBefore, setPickupBefore] = useState(listing?.pickup_before || '')
  const [isActive,     setIsActive]     = useState(listing?.is_active ?? true)
  const [saved,        setSaved]        = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const handleSave = async () => {
    if (!price || qty < 1) { setError('Renseignez le prix et la quantité'); return }
    setError('')
    setLoading(true)
    try {
      const data = { qty, price: parseFloat(price), pickup_before: pickupBefore || null, is_active: isActive }
      if (listing) {
        const { error } = await supabase.from('listings').update(data).eq('id', listing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('listings').insert({
          ...data,
          company_id: company.id,
        })
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

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette annonce ?')) return
    await supabase.from('listings').update({ is_active: false }).eq('id', listing.id)
    onSave?.()
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Toggle actif */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3">
        <div>
          <p className="font-semibold text-sm text-white">Annonce</p>
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
            className="flex-1 py-4 bg-transparent text-white font-bebas text-3xl outline-none"
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
          className="w-full px-4 py-3 bg-hi border border-border rounded-2xl text-white text-sm outline-none font-mono"
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
        style={{ background: saved ? '#2ECC71' : 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.3)', transition: 'background 0.3s' }}
      >
        {loading ? 'Sauvegarde…' : saved ? '✅ Publié sur la carte !' : listing ? 'Mettre à jour' : '📦 Publier sur la carte →'}
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
          <p className="font-semibold text-sm text-white">Engin de chargement disponible</p>
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
        style={{ background: saved ? '#2ECC71' : 'linear-gradient(135deg,#F5A623,#E8940F)' }}>
        {loading ? 'Sauvegarde…' : saved ? '✅ Sauvegardé !' : 'Sauvegarder'}
      </button>
    </div>
  )
}

// ─── Liste acheteurs ─────────────────────────────────────────────────────────
const DriversList = ({ drivers, blacklist, listing, onBlacklist, onValidate }) => {
  const blacklistedIds  = new Set(blacklist.map(b => b.driver_id))
  const reservedDriver  = listing?.reserved_by

  if (drivers.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
      <span className="text-4xl opacity-30">🚛</span>
      <p className="font-bebas text-xl">Aucun acheteur</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 p-5">
      {reservedDriver && (
        <div className="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 text-xs text-amber">
          ⚡ Un acheteur a réservé — cliquez sur son nom quand il arrive pour valider la transaction.
        </div>
      )}
      <p className="text-xs text-muted">{drivers.length} acheteur{drivers.length > 1 ? 's' : ''} ont consulté votre annonce</p>
      {drivers.map(d => {
        const isReserver  = d.bidder_id === reservedDriver
        const isBlacklisted = blacklistedIds.has(d.bidder_id)
        return (
          <div key={d.bidder_id}
            className="bg-surface border rounded-2xl overflow-hidden"
            style={{ borderColor: isReserver ? '#FFD16666' : '#1C2330' }}>
            <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: isReserver ? '#FFD16622' : '#1A2030', border: `1px solid ${isReserver ? '#FFD16644' : '#1C2330'}` }}>
                🚛
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-white">{d.profiles?.full_name || 'Acheteur'}</p>
                  {isReserver && <span className="text-[10px] bg-amber/20 text-amber border border-amber/30 rounded-full px-2 py-0.5 font-mono">RÉSERVÉ</span>}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {d.price ? `Enchère : ${d.price.toFixed(2)}€` : 'Consulté'}
                  {d.dist_km ? ` · 📍 ${d.dist_km.toFixed(1)} km` : ''}
                </p>
              </div>
              {!isBlacklisted && (
                <button onClick={() => onBlacklist(d.bidder_id)}
                  className="w-9 h-9 rounded-xl bg-hi border border-border flex items-center justify-center text-base cursor-pointer hover:bg-red/10 hover:border-red/40 transition-colors">
                  🚫
                </button>
              )}
            </div>
            {/* Bouton validation — visible uniquement pour le acheteur réservant */}
            {isReserver && (
              <button onClick={() => onValidate(d.bidder_id, d.profiles?.full_name)}
                className="w-full py-3 font-bold text-bg text-sm cursor-pointer border-t border-amber/30"
                style={{ background: 'linear-gradient(135deg,#FFD166,#E8B800)' }}>
                ✅ Valider — {d.profiles?.full_name || 'Ce acheteur'} est arrivé
              </button>
            )}
          </div>
        )
      })}
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
          className="px-3 py-1.5 rounded-xl bg-hi border border-border text-sub text-xs cursor-pointer hover:text-white transition-colors">
          Retirer
        </button>
      </div>
    ))}
  </div>
)

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function CompanyDashboard() {
  const [tab, setTab] = useState('annonce')
  const [confirmDriver, setConfirmDriver] = useState(null)
  const { company, listing, drivers, blacklist, loading, blacklistDriver, unblacklistDriver } = useCompanyStore()
  const { profile } = useAuthStore()

  const totalViews = drivers.length

  const handleBlacklist = async (driverId) => {
    if (!window.confirm('Blacklister ce acheteur ?')) return
    await blacklistDriver(driverId)
  }

  const handleValidate = async (driverId, driverName) => {
    if (!window.confirm(`Valider la transaction avec ${driverName} ?`)) return
    if (!listing) return

    const { error } = await supabase
      .from('transactions')
      .insert({
        listing_id:           listing.id,
        company_id:           company.id,
        driver_id:            driverId,
        qty:                  listing.qty,
        buy_price:            listing.current_bid || listing.price,
        status:               'confirmed',
        company_validated_at: new Date().toISOString(),
        driver_confirmed_at:  new Date().toISOString(),
        had_active_bid:       listing.current_bid !== null,
      })

    if (error) { alert('Erreur lors de la validation'); return }

    // Désactive l'annonce
    await supabase.from('listings').update({ is_active: false }).eq('id', listing.id)

    // Notification au acheteur
    await supabase.from('notifications').insert({
      user_id: driverId,
      type:    'transaction_confirmed',
      title:   '✅ Transaction confirmée !',
      body:    `Votre transaction chez ${company.name} a été validée.`,
      data:    { listing_id: listing.id },
    })

    alert(`✅ Transaction validée avec ${driverName} !`)
    window.location.reload()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-mono text-muted text-xs animate-pulse">Chargement…</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-mono text-xs text-muted uppercase tracking-widest">Mon espace vendeur</p>
            <h1 className="font-bebas text-2xl text-white leading-tight">{company?.name || 'Mon vendeur'}</h1>
          </div>
          <div className="w-10 h-10 rounded-xl bg-hi border border-border flex items-center justify-center text-xl">🏭</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface border border-border rounded-2xl px-4 py-3">
            <p className="font-bebas text-3xl text-blue">{totalViews}</p>
            <p className="text-xs text-sub">Vues aujourd'hui</p>
          </div>
          <div className="bg-surface border border-red/30 rounded-2xl px-4 py-3">
            <p className="font-bebas text-3xl" style={{ color: blacklist.length > 0 ? '#EF4444' : '#4A5568' }}>
              {blacklist.length}
            </p>
            <p className="text-xs text-sub">Blacklistés</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'annonce'   && <ListingForm listing={listing} onSave={() => window.location.reload()} />}
        {tab === 'acheteurs' && <DriversList drivers={drivers} blacklist={blacklist} listing={listing} onBlacklist={handleBlacklist} onValidate={handleValidate} />}
        {tab === 'blacklist' && <BlacklistPanel blacklist={blacklist} onUnblacklist={unblacklistDriver} />}
        {tab === 'profil'    && (
          <>
            <SiteSettings company={company} />
            {/* Supprimer le compte */}
            <div className="px-5 pb-10 mt-2">
              <div className="border-t border-border pt-6">
                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Zone dangereuse</p>
                <button onClick={async () => {
                  if (!window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
                  if (!window.confirm('Êtes-vous vraiment sûr ? Toutes vos données seront perdues.')) return
                  const state = useAuthStore.getState()
                  await supabase.from('profiles').delete().eq('id', state.user.id)
                  await state.signOut()
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

      {/* Bottom nav */}
      <div className="shrink-0 border-t border-border bg-bg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {[
            { id: 'annonce',   icon: '📦', label: 'Annonce'   },
            { id: 'acheteurs', icon: '🚛', label: 'Acheteurs' },
            { id: 'blacklist', icon: '🚫', label: 'Blacklist' },
            { id: 'profil',    icon: '👤', label: 'Profil'    },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 cursor-pointer border-none bg-transparent transition-colors"
              style={{ color: tab === t.id ? '#F5A623' : '#4A5568' }}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-mono">{t.label}</span>
              {tab === t.id && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-amber rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
