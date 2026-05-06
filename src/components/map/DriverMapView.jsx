import { useState, useCallback, useRef, useEffect } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl'
import { useListingStore } from '@/store/useListingStore'
import { useAuthStore }   from '@/store/useAuthStore'
import { MAPBOX_TOKEN, MAP_STYLE, DEFAULT_CENTER, profitColor } from '@/lib/mapbox'
import ListingBottomSheet from '@/components/listing/ListingBottomSheet'

// ─── Marqueur ─────────────────────────────────────────────────────────────────
const ListingMarker = ({ listing, selected, onClick, resalePrice, goldThreshold, userTier }) => {
  const TIER_LIMIT = { free: 2, gold: Infinity }
  const isHidden   = listing.qty > (TIER_LIMIT[userTier] || 2)
  const color      = isHidden ? '#4A5568' : profitColor(listing.price, resalePrice, goldThreshold, listing.qty)
  const isReserved = listing.reserved_by !== null
  const size       = selected ? 48 : 38

  return (
    <Marker
      longitude={listing.companies?._lng || listing.companies?.location?.coordinates?.[0] || 2.3522}
      latitude={listing.companies?._lat  || listing.companies?.location?.coordinates?.[1] || 48.8566}
      anchor="center"
      onClick={onClick}
    >
      <div className="relative cursor-pointer" style={{ width: size, height: size }}>
        {selected && (
          <div className="absolute inset-0 rounded-full border-2 animate-ping opacity-50"
            style={{ borderColor: color }} />
        )}
        <div
          className="w-full h-full rounded-xl flex flex-col items-center justify-center shadow-lg transition-all"
          style={{
            background:  selected ? color : `${color}22`,
            border:      `2px solid ${color}`,
            boxShadow:   selected ? `0 0 20px ${color}66` : `0 2px 8px rgba(0,0,0,0.5)`,
          }}
        >
          {isReserved ? (
            <span className="text-sm">🔒</span>
          ) : (
            <>
              <span className="font-bebas text-sm leading-none"
                style={{ color: selected ? '#0B0E13' : color }}>
                {listing.qty}
              </span>
              <span className="text-[7px] leading-none"
                style={{ color: selected ? '#0B0E13AA' : `${color}99` }}>
                pal.
              </span>
            </>
          )}
        </div>
        {/* Tag bénéfice total */}
        {!isHidden && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-surface border rounded px-1 py-0.5 text-[9px] whitespace-nowrap font-mono"
            style={{ borderColor: `${color}44`, color }}
          >
            {resalePrice && resalePrice > listing.price
              ? `+${((resalePrice - listing.price) * listing.qty).toFixed(0)}€`
              : `${listing.price.toFixed(2)}€`}
          </div>
        )}
      </div>
    </Marker>
  )
}

// ─── Point utilisateur ────────────────────────────────────────────────────────
const UserMarker = ({ lng, lat }) => (
  <Marker longitude={lng} latitude={lat} anchor="center">
    <div className="relative">
      <div className="w-4 h-4 rounded-full bg-blue border-2 border-white shadow-lg" />
      <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue opacity-30 animate-ping" />
    </div>
  </Marker>
)

// ─── Vue principale ───────────────────────────────────────────────────────────
export default function DriverMapView({ profile }) {
  const { listings, selected, setSelected } = useListingStore()
  const [viewport, setViewport] = useState(DEFAULT_CENTER)
  const [userPos,  setUserPos]  = useState(null)
  const mapRef = useRef(null)

  const resalePrice   = profile?.resale_price   || null
  const goldThreshold = profile?.gold_threshold || 20
  const userTier      = profile?.tier           || 'free'

  // Géolocalisation automatique au chargement
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { longitude, latitude } = pos.coords
      setUserPos({ longitude, latitude })
      setViewport(v => ({ ...v, longitude, latitude, zoom: 13 }))
      mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 13, duration: 1200 })
    }, () => {
      // Si refus géoloc → reste sur DEFAULT_CENTER
    })
  }, [])

  // Géolocalisation manuelle (bouton 🎯)
  const handleGeolocate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { longitude, latitude } = pos.coords
      setUserPos({ longitude, latitude })
      mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 13, duration: 1200 })
    })
  }, [])

  // Filtre les annonces actives non blacklistées
  const visibleListings = listings.filter(l => l.is_active)

  // Totaux
  const totalQty   = visibleListings.filter(l => !l.reserved_by).reduce((s, l) => s + l.qty, 0)
  const visibleQty = visibleListings.filter(l => !l.reserved_by && l.qty <= (
    userTier === 'free' ? 2 : userTier === 'gold' ? 10 : Infinity
  )).reduce((s, l) => s + l.qty, 0)

  return (
    <div className="relative w-full h-full">
      {/* Map */}
      <Map
        ref={mapRef}
        {...viewport}
        onMove={e => setViewport(e.viewState)}
        mapStyle={MAP_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Marqueurs annonces */}
        {visibleListings.map(l => (
          <ListingMarker
            key={l.id}
            listing={l}
            selected={selected?.id === l.id}
            onClick={e => { e.originalEvent.stopPropagation(); setSelected(l) }}
            resalePrice={resalePrice}
            goldThreshold={goldThreshold}
            userTier={userTier}
          />
        ))}

        {/* Position utilisateur */}
        {userPos && <UserMarker lng={userPos.longitude} lat={userPos.latitude} />}
      </Map>

      {/* Top bar — seulement le bouton géolocalisation */}
      <div className="absolute top-0 right-0 z-20 p-3">
        <button onClick={handleGeolocate}
          className="w-10 h-10 rounded-xl bg-bg/90 backdrop-blur-md border border-border flex items-center justify-center text-lg">
          🎯
        </button>
      </div>

      {/* Compteur stock — discret en bas à gauche */}
      {!selected && (
        <div className="absolute bottom-20 left-3 z-20 bg-bg/70 backdrop-blur-md border border-border/50 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <span className="font-bebas text-lg text-amber leading-none">{totalQty}</span>
          <span className="text-xs text-sub">palettes</span>
        </div>
      )}

      {/* Bottom sheet */}
      {selected && (
        <ListingBottomSheet
          listing={selected}
          profile={profile}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
