import { useState, useMemo } from 'react'
import { useListingStore } from '@/store/useListingStore'
import { profitColor }     from '@/lib/mapbox'
import ListingBottomSheet  from './ListingBottomSheet'

const TIER_LIMIT = { free: 2, premium: 10, gold: Infinity }

const SORTS = (resalePrice) => [
  { id: 'dist',   label: '📍 Dist.',   fn: (a,b) => (a.distance_km||99) - (b.distance_km||99) },
  { id: 'qty',    label: '📦 Qté',     fn: (a,b) => b.qty - a.qty },
  { id: 'price',  label: '💰 Prix',    fn: (a,b) => a.price - b.price },
  { id: 'profit', label: '📈 Bénéf.', fn: (a,b) => {
    const pa = resalePrice ? (resalePrice - a.price) * a.qty : 0
    const pb = resalePrice ? (resalePrice - b.price) * b.qty : 0
    return pb - pa
  }},
]

export default function DriverListView({ profile }) {
  const { listings, selected, setSelected } = useListingStore()
  const [search,  setSearch]  = useState('')
  const [sortId,  setSortId]  = useState('dist')
  const [showSort,setShowSort]= useState(false)

  const userTier      = profile?.tier           || 'free'
  const resalePrice   = profile?.resale_price   || null
  const goldThreshold = profile?.gold_threshold || 20
  const limit         = TIER_LIMIT[userTier]
  const sorts         = SORTS(resalePrice)
  const sortFn        = sorts.find(s => s.id === sortId).fn

  const filtered = useMemo(() => listings
    .filter(l => l.is_active)
    .filter(l => search === '' || l.companies?.name?.toLowerCase().includes(search.toLowerCase()) || l.companies?.city?.toLowerCase().includes(search.toLowerCase()))
    .sort(sortFn),
  [listings, search, sortId, resalePrice])

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Search + sort */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 bg-hi border border-border rounded-2xl px-4 py-2.5">
            <span className="text-muted text-sm">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 bg-transparent border-none text-white text-sm outline-none"
            />
            {search && <button onClick={() => setSearch('')} className="text-muted text-base bg-transparent border-none cursor-pointer">×</button>}
          </div>
          <button onClick={() => setShowSort(s => !s)}
            className={`px-3 rounded-2xl border text-xs font-mono cursor-pointer transition-colors ${showSort ? 'bg-amber/10 border-amber/60 text-amber' : 'bg-hi border-border text-muted'}`}>
            ↕ {sorts.find(s => s.id === sortId).label.split(' ')[1]}
          </button>
        </div>
        {showSort && (
          <div className="flex gap-2">
            {sorts.map(s => (
              <button key={s.id} onClick={() => { setSortId(s.id); setShowSort(false) }}
                className={`flex-1 py-2 px-1 rounded-xl border text-[10px] font-mono cursor-pointer transition-colors ${sortId === s.id
                  ? s.id === 'profit' ? 'bg-green/10 border-green/60 text-green' : 'bg-amber/10 border-amber/60 text-amber'
                  : 'bg-hi border-border text-muted'}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-20">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
            <span className="text-5xl opacity-30">📭</span>
            <p className="font-bebas text-2xl">Aucune annonce</p>
          </div>
        ) : filtered.map(l => {
          const isHidden = l.qty > limit
          const color    = isHidden ? '#4A5568' : profitColor(l.price, resalePrice, goldThreshold)
          const profit   = resalePrice && resalePrice > l.price && !isHidden
            ? (resalePrice - l.price) * l.qty : null

          return (
            <div key={l.id} onClick={() => setSelected(l)}
              className="bg-surface rounded-2xl border p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{ borderColor: l.reserved_by ? '#6366F133' : `${color}33` }}
            >
              {/* Qty */}
              <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                style={{ background: `${color}18`, border: `1.5px solid ${color}44` }}>
                {l.reserved_by ? (
                  <span className="text-xl">🔒</span>
                ) : (
                  <>
                    <span className="font-bebas text-xl leading-none" style={{ color }}>{l.qty}</span>
                    <span className="text-[8px] leading-none" style={{ color: `${color}99` }}>pal.</span>
                  </>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5"
                  style={{ color: isHidden ? '#4A5568' : '#E8EDF5', fontStyle: isHidden ? 'italic' : 'normal' }}>
                  {isHidden ? 'Nom masqué' : l.companies?.name}
                </p>
                <p className="text-sub text-xs">{l.companies?.city}</p>
                {profit !== null && (
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg"
                    style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
                    <span className="text-[9px]">📈</span>
                    <span className="font-bebas text-sm leading-none" style={{ color }}>
                      +{profit.toFixed(2)} €
                    </span>
                    <span className="text-[9px] text-sub">bénéf. pot.</span>
                  </div>
                )}
              </div>

              {/* Prix */}
              <div className="text-right shrink-0">
                <p className="font-bebas text-xl text-green leading-none">{l.price.toFixed(2)}€</p>
                <p className="text-[10px] text-muted">/ palette</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom sheet */}
      {selected && (
        <ListingBottomSheet listing={selected} profile={profile} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
