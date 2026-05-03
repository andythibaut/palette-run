import { useState } from 'react'
import { useCompanyStore } from '@/store/useCompanyStore'
import { useAuthStore }    from '@/store/useAuthStore'

const TABS = ['annonce', 'chauffeurs', 'blacklist']

// ─── Formulaire annonce ───────────────────────────────────────────────────────
const ListingForm = ({ listing, onSave }) => {
  const { publishListing, updateListing, deleteListing } = useCompanyStore()
  const [qty,          setQty]          = useState(listing?.qty    || 1)
  const [price,        setPrice]        = useState(listing?.price  || '')
  const [pickupBefore, setPickupBefore] = useState(listing?.pickup_before || '')
  const [isActive,     setIsActive]     = useState(listing?.is_active ?? true)
  const [saved,        setSaved]        = useState(false)
  const [loading,      setLoading]      = useState(false)

  const handleSave = async () => {
    if (!price || qty < 1) return
    setLoading(true)
    const data = { qty, price: parseFloat(price), pickup_before: pickupBefore || null, is_active: isActive }
    const ok = listing ? await updateListing(data) : await publishListing(data)
    setLoading(false)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette annonce ?')) return
    await deleteListing()
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
          className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border-none ${isActive ? 'bg-green' : 'bg-border'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
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

      {/* Actions */}
      <button onClick={handleSave} disabled={loading || !price || qty < 1}
        className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer disabled:opacity-40"
        style={{ background: saved ? '#2ECC71' : 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.3)', transition: 'background 0.3s' }}
      >
        {loading ? 'Sauvegarde…' : saved ? '✅ Sauvegardé !' : listing ? 'Mettre à jour' : '📦 Publier sur la carte →'}
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

// ─── Liste chauffeurs ─────────────────────────────────────────────────────────
const DriversList = ({ drivers, blacklist, onBlacklist }) => {
  const blacklistedIds = new Set(blacklist.map(b => b.driver_id))

  if (drivers.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted">
      <span className="text-4xl opacity-30">🚛</span>
      <p className="font-bebas text-xl">Aucun chauffeur</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 p-5">
      <p className="text-xs text-muted">{drivers.length} chauffeur{drivers.length > 1 ? 's' : ''} ont consulté votre annonce</p>
      {drivers.map(d => (
        <div key={d.bidder_id} className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hi border border-border flex items-center justify-center text-xl shrink-0">🚛</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white">{d.profiles?.full_name || 'Chauffeur'}</p>
            <p className="text-xs text-muted mt-0.5">
              {d.price ? `Enchère : ${d.price.toFixed(2)}€` : 'Consulté'}
              {d.dist_km ? ` · 📍 ${d.dist_km.toFixed(1)} km` : ''}
            </p>
          </div>
          {!blacklistedIds.has(d.bidder_id) && (
            <button onClick={() => onBlacklist(d.bidder_id)}
              className="w-9 h-9 rounded-xl bg-hi border border-border flex items-center justify-center text-base cursor-pointer hover:bg-red/10 hover:border-red/40 transition-colors">
              🚫
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Liste noire ──────────────────────────────────────────────────────────────
const BlacklistPanel = ({ blacklist, onUnblacklist }) => (
  <div className="flex flex-col gap-3 p-5">
    <div className="bg-red/10 border border-red/20 rounded-xl px-4 py-3 text-xs text-red">
      🚫 Les chauffeurs blacklistés ne voient plus vos annonces sur la carte.
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
          <p className="font-semibold text-sm text-muted line-through">{b.profiles?.full_name || 'Chauffeur'}</p>
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
    if (!window.confirm('Blacklister ce chauffeur ?')) return
    await blacklistDriver(driverId)
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
            <p className="font-mono text-xs text-muted uppercase tracking-widest">Tableau de bord</p>
            <h1 className="font-bebas text-2xl text-white leading-tight">{company?.name || 'Mon entreprise'}</h1>
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

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[['annonce','Mon annonce'],['chauffeurs','Chauffeurs'],['blacklist','🚫 Liste noire']].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-3 text-xs font-mono cursor-pointer border-none bg-transparent transition-colors ${tab === id ? 'text-amber border-b-2 border-amber' : 'text-muted'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'annonce'    && <ListingForm listing={listing} />}
        {tab === 'chauffeurs' && <DriversList drivers={drivers} blacklist={blacklist} onBlacklist={handleBlacklist} />}
        {tab === 'blacklist'  && <BlacklistPanel blacklist={blacklist} onUnblacklist={unblacklistDriver} />}
      </div>
    </div>
  )
}
