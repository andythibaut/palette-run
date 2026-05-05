import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const statusStyles = {
  pending:   { color: '#F97316', bg: '#F9731618', label: 'À confirmer' },
  confirmed: { color: '#2ECC71', bg: '#2ECC7118', label: 'Confirmée'   },
  cancelled: { color: '#4A5568', bg: '#4A556818', label: 'Annulée'     },
}

export default function PickupList({ profile }) {
  const [pickups,  setPickups]  = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchPickups = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        listings ( qty, price, pickup_before ),
        companies ( name, city, address )
      `)
      .eq('driver_id', profile.id)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false })

    setLoading(false)
    if (!error) setPickups(data || [])
  }

  useEffect(() => {
    if (profile?.id) fetchPickups()
  }, [profile?.id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-mono text-xs text-muted animate-pulse">Chargement…</p>
    </div>
  )

  if (pickups.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted px-6 text-center">
      <span className="text-6xl opacity-30">📦</span>
      <p className="font-bebas text-2xl">Aucune palette à charger</p>
      <p className="text-sm text-sub">Vos réservations confirmées apparaîtront ici.</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Mes réservations</p>
        <h1 className="font-bebas text-2xl text-white">Mes achats</h1>
        <p className="text-sub text-xs mt-1">{pickups.length} réservation{pickups.length > 1 ? 's' : ''} en cours</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 pb-24">
        {pickups.map(p => {
          const style   = statusStyles[p.status] || statusStyles.pending
          const total   = p.buy_price * p.listings?.qty
          const profit  = profile?.resale_price
            ? (profile.resale_price - p.buy_price) * p.listings?.qty
            : null

          return (
            <div key={p.id} className="bg-surface rounded-2xl border overflow-hidden"
              style={{ borderColor: `${style.color}44` }}>

              {/* Status bar */}
              <div className="px-4 py-2 flex items-center justify-between"
                style={{ background: style.bg }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: style.color }}/>
                  <span className="text-xs font-semibold font-mono" style={{ color: style.color }}>
                    {style.label}
                  </span>
                </div>
                <span className="text-xs text-muted font-mono">
                  {new Date(p.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>

              {/* Company info */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber/10 border border-amber/30 flex items-center justify-center text-xl shrink-0">🏭</div>
                  <div className="flex-1">
                    <p className="font-bebas text-xl text-white leading-tight">{p.companies?.name}</p>
                    <p className="text-sub text-xs mt-0.5">{p.companies?.city}</p>
                    {p.companies?.address && (
                      <p className="text-muted text-xs mt-0.5">📍 {p.companies?.address}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-hi rounded-xl p-2.5 text-center border border-border">
                    <p className="font-bebas text-2xl text-amber leading-none">{p.listings?.qty}</p>
                    <p className="text-[10px] text-muted mt-0.5">palettes</p>
                  </div>
                  <div className="bg-hi rounded-xl p-2.5 text-center border border-border">
                    <p className="font-bebas text-2xl text-green leading-none">{p.buy_price?.toFixed(2)}€</p>
                    <p className="text-[10px] text-muted mt-0.5">/ palette</p>
                  </div>
                  <div className="bg-hi rounded-xl p-2.5 text-center border border-border">
                    <p className="font-bebas text-2xl text-amber leading-none">{total?.toFixed(2)}€</p>
                    <p className="text-[10px] text-muted mt-0.5">total</p>
                  </div>
                </div>

                {/* Profit potentiel */}
                {profit !== null && (
                  <div className="flex items-center gap-2 mb-3 rounded-xl px-3 py-2"
                    style={{ background: profit >= 0 ? '#2ECC7118' : '#EF444418', border: `1px solid ${profit >= 0 ? '#2ECC7133' : '#EF444433'}` }}>
                    <span className="text-sm">{profit >= 0 ? '📈' : '📉'}</span>
                    <span className="font-bebas text-lg leading-none" style={{ color: profit >= 0 ? '#2ECC71' : '#EF4444' }}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(2)} €
                    </span>
                    <span className="text-xs text-sub">bénéfice potentiel</span>
                  </div>
                )}

                {/* Heure limite */}
                {p.listings?.pickup_before && (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-blue/10 border border-blue/30">
                    <span className="text-sm">🕐</span>
                    <p className="text-blue text-sm">
                      Récupérer avant <strong>{p.listings.pickup_before}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
