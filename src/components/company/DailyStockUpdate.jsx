import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCompanyStore } from '@/store/useCompanyStore'

export default function DailyStockUpdate({ listing, companyId, onComplete }) {
  const { fetchActiveListing } = useCompanyStore()
  const [qty,          setQty]          = useState(listing.qty)
  const [price,        setPrice]        = useState(listing.price.toFixed(2))
  const [pickupBefore, setPickupBefore] = useState(listing.pickup_before || '')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  const canChangePrice  = !listing.price_updated_at ||
    new Date(listing.price_updated_at) < new Date(Date.now() - 86400000)
  const canChangePickup = !listing.pickup_updated_at ||
    new Date(listing.pickup_updated_at) < new Date(Date.now() - 86400000)

  const handleSubmit = async () => {
    if (qty < 1 || qty > 1000) { setError('Quantité invalide (1 à 1000)'); return }
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('update_daily_stock', {
      p_company_id:    companyId,
      p_qty:           qty,
      p_price:         canChangePrice  ? parseFloat(price)   : null,
      p_pickup_before: canChangePickup ? pickupBefore || null : null,
    })

    setLoading(false)
    if (rpcError || !data?.success) {
      setError(data?.error === 'STOCK_ALREADY_UPDATED'
        ? 'Prix ou heure déjà modifiés aujourd\'hui. Seule la quantité peut être changée.'
        : 'Une erreur est survenue. Réessayez.')
      return
    }

    await fetchActiveListing(companyId)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col"
      style={{ animation: 'fadeIn 0.3s ease' }}>

      {/* Header */}
      <div className="px-6 pt-14 pb-6 border-b border-border">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Mise à jour quotidienne</p>
        <h1 className="font-bebas text-3xl text-white leading-tight">Votre stock aujourd'hui</h1>
        <p className="text-sub text-sm mt-2">Confirmez ou modifiez votre annonce pour accéder à l'app.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

        {/* Quantité — modifiable librement */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted uppercase tracking-widest">Palettes disponibles</label>
            <span className="text-xs text-green font-mono">Modifiable</span>
          </div>
          <div className="flex items-center bg-hi border-2 border-border rounded-2xl overflow-hidden">
            <button onClick={() => setQty(q => Math.max(1, q-1))}
              className="w-14 h-14 text-2xl text-white bg-transparent border-none cursor-pointer">−</button>
            <input
              type="number" inputMode="numeric"
              value={qty}
              onChange={e => { const n = parseInt(e.target.value); setQty(isNaN(n) ? 1 : Math.min(1000, Math.max(1, n))) }}
              className="flex-1 bg-transparent text-amber font-bebas text-5xl text-center outline-none border-none py-3"
            />
            <button onClick={() => setQty(q => Math.min(1000, q+1))}
              className="w-14 h-14 text-2xl text-white bg-transparent border-none cursor-pointer">+</button>
          </div>
        </div>

        {/* Prix — 1x par 24h */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted uppercase tracking-widest">Prix unitaire</label>
            {canChangePrice
              ? <span className="text-xs text-green font-mono">Modifiable aujourd'hui</span>
              : <span className="text-xs text-muted font-mono">🔒 Modifiable demain</span>}
          </div>
          <div className={`flex items-center bg-hi rounded-2xl overflow-hidden border-2 ${canChangePrice ? 'border-border' : 'border-border opacity-50'}`}>
            <span className="px-4 text-green text-lg font-semibold">€</span>
            <input
              type="number" inputMode="decimal"
              value={price}
              onChange={e => canChangePrice && setPrice(e.target.value)}
              readOnly={!canChangePrice}
              className="flex-1 py-4 bg-transparent text-white font-bebas text-3xl outline-none border-none"
            />
            <span className="px-4 text-muted text-xs">/ pal.</span>
          </div>
          {!canChangePrice && (
            <p className="text-xs text-muted mt-1">Prix actuel : {listing.price.toFixed(2)}€ — modifiable demain</p>
          )}
        </div>

        {/* Heure limite — 1x par 24h */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted uppercase tracking-widest">Heure limite</label>
            {canChangePickup
              ? <span className="text-xs text-green font-mono">Modifiable aujourd'hui</span>
              : <span className="text-xs text-muted font-mono">🔒 Modifiable demain</span>}
          </div>
          <input
            type="time"
            value={pickupBefore}
            onChange={e => canChangePickup && setPickupBefore(e.target.value)}
            readOnly={!canChangePickup}
            className={`w-full px-4 py-3 bg-hi border-2 border-border rounded-2xl text-white text-sm outline-none font-mono ${!canChangePickup ? 'opacity-50' : ''}`}
          />
          {!canChangePickup && listing.pickup_before && (
            <p className="text-xs text-muted mt-1">Heure actuelle : {listing.pickup_before} — modifiable demain</p>
          )}
        </div>

        {/* Total */}
        <div className="bg-amber/10 border border-amber/30 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span className="text-sub text-sm">Valeur totale annonce</span>
          <span className="font-bebas text-2xl text-amber">
            {(qty * parseFloat(price || 0)).toFixed(2)} €
          </span>
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-2xl px-4 py-3">
            <p className="text-red text-sm">⚠️ {error}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 pt-4 border-t border-border flex flex-col gap-3">
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.3)' }}>
          {loading ? 'Mise à jour…' : '✅ Confirmer et accéder à l\'app'}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  )
}
