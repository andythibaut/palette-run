import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl'
import { useCompanyStore } from '@/store/useCompanyStore'
import { useListingStore }  from '@/store/useListingStore'
import { MAPBOX_TOKEN, MAP_STYLE, DEFAULT_CENTER, profitColor } from '@/lib/mapbox'

const GOLD = '#FFD166'

// Décode un WKB hex (PostGIS) en { lat, lng }
function wkbToLatLng(wkb) {
  if (!wkb || typeof wkb !== 'string') return null
  try {
    const buf = new Uint8Array(wkb.match(/.{2}/g).map(b => parseInt(b, 16)))
    const view = new DataView(buf.buffer)
    const lng = view.getFloat64(9,  true)
    const lat = view.getFloat64(17, true)
    if (!isFinite(lat) || !isFinite(lng)) return null
    return { lat, lng }
  } catch { return null }
}

// ─── Marqueur de l'annonce du commerçant ──────────────────────────────────────
const CompanyListingMarker = ({ listing }) => {
  const coords = wkbToLatLng(listing?.companies?.location)
  if (!coords) return null
  const { lat, lng } = coords

  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div className="relative" style={{ width: 52, height: 52 }}>
        {/* Anneau animé */}
        <div className="absolute inset-0 rounded-full border-2 animate-ping opacity-40"
          style={{ borderColor: GOLD }} />
        {/* Corps du marqueur */}
        <div className="w-full h-full rounded-xl flex flex-col items-center justify-center shadow-lg"
          style={{
            background:  GOLD,
            border:      `2px solid ${GOLD}`,
            boxShadow:   `0 0 20px ${GOLD}66`,
          }}
        >
          <span className="font-bebas text-base leading-none text-black">
            {listing?.qty ?? '—'}
          </span>
          <span className="text-[8px] leading-none text-black/70">pal.</span>
          <span className="font-bebas text-[11px] leading-none text-black/90">
            {(listing?.current_bid || listing?.price || 0).toFixed(0)}€
          </span>
        </div>
        {/* Tag "Mon annonce" */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold"
          style={{ background: `${GOLD}22`, border: `1px solid ${GOLD}44`, color: GOLD }}>
          Mon annonce
        </div>
      </div>
    </Marker>
  )
}

// ─── Marqueur des autres annonces (grisées) ──────────────────────────────────
const OtherListingMarker = ({ listing }) => {
  // useListingStore décode déjà les coords dans _lat/_lng
  const lat = listing.companies?._lat
  const lng = listing.companies?._lng
  if (!lat || !lng) return null
  const GREY = '#4A5568'

  // Décale de ~500m (même logique que DriverMapView)
  const seed = listing.id ? listing.id.charCodeAt(0) + listing.id.charCodeAt(4) : 0
  const offsetLat = ((seed % 100) - 50) / 100000 * 5
  const offsetLng = ((seed % 137) - 68) / 100000 * 5

  return (
    <Marker longitude={lng + offsetLng} latitude={lat + offsetLat} anchor="center">
      <div style={{ width: 34, height: 34 }}>
        <div className="w-full h-full rounded-xl flex flex-col items-center justify-center shadow"
          style={{ background: `${GREY}22`, border: `2px solid ${GREY}`, opacity: 0.6 }}>
          <span className="font-bebas text-xs leading-none" style={{ color: GREY }}>{listing.qty}</span>
          <span className="text-[7px] leading-none" style={{ color: `${GREY}99` }}>pal.</span>
        </div>
      </div>
    </Marker>
  )
}

// ─── Point position utilisateur ───────────────────────────────────────────────
const UserMarker = ({ lng, lat }) => (
  <Marker longitude={lng} latitude={lat} anchor="center">
    <div className="relative">
      <div className="w-4 h-4 rounded-full bg-blue border-2 border-white shadow-lg" />
      <div className="absolute inset-0 w-4 h-4 rounded-full bg-blue opacity-30 animate-ping" />
    </div>
  </Marker>
)

// ─── Vue carte commerçant ─────────────────────────────────────────────────────
const CompanyMapView = forwardRef(function CompanyMapView({ savedViewport, onViewportChange }, ref) {
  const { company, listing } = useCompanyStore()
  const { listings } = useListingStore()
  const [viewport,    setViewport]    = useState(null)
  const [userPos,     setUserPos]     = useState(null)
  const [dismissed,   setDismissed]   = useState(false)
  const mapRef = useRef(null)

  useImperativeHandle(ref, () => ({
    resize: () => mapRef.current?.resize()
  }))

  // Centre la carte sur la position de la company dès qu'on a les coords
  useEffect(() => {
    if (savedViewport) { setViewport(savedViewport); return }
    const coords = wkbToLatLng(listing?.companies?.location)
    if (coords) {
      setViewport({ longitude: coords.lng, latitude: coords.lat, zoom: 15 })
    } else {
      setViewport(DEFAULT_CENTER)
    }
  }, [listing?.companies?.location])

  const handleGeolocate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      const { longitude, latitude } = pos.coords
      setUserPos({ longitude, latitude })
      mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 14, duration: 1200 })
    })
  }, [])

  if (!viewport) return null

  const hasListing = listing?.is_active

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewport}
        onMove={e => { setViewport(e.viewState); onViewportChange?.(e.viewState) }}
        mapStyle={MAP_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Autres annonces — grisées */}
        {listings
          .filter(l => l.is_active && l.id !== listing?.id)
          .map(l => <OtherListingMarker key={l.id} listing={l} />)
        }

        {/* Mon annonce — position exacte, couleur or */}
        {hasListing && <CompanyListingMarker listing={listing} />}

        {/* Position GPS utilisateur */}
        {userPos && <UserMarker lng={userPos.longitude} lat={userPos.latitude} />}
      </Map>

      {/* Bouton géolocalisation */}
      <div className="absolute top-0 right-0 z-20 p-3">
        <button onClick={handleGeolocate}
          className="w-10 h-10 rounded-xl bg-bg/90 backdrop-blur-md border border-border flex items-center justify-center text-lg">
          🎯
        </button>
      </div>

      {/* Info si pas d'annonce active */}
      {!hasListing && !dismissed && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
          <div className="bg-white border border-border rounded-2xl px-6 py-5 text-center mx-6 shadow-xl max-w-sm w-full">
            <p className="text-3xl mb-3">📦</p>
            <p className="font-bebas text-xl text-gray-800 leading-tight mb-2">
              Créez votre annonce pour être visible sur la carte
            </p>
            <p className="text-sub text-xs mb-4">
              Publiez votre stock de palettes depuis l'onglet Annonce.
            </p>
            <button onClick={() => setDismissed(true)}
              className="w-full py-3 rounded-xl font-bold text-white text-sm cursor-pointer"
              style={{ background: "linear-gradient(135deg,#E8920A,#d4830a)" }}>
              OK, j'y vais →
            </button>
          </div>
          {/* Flèche SVG pointant vers l'onglet Annonce en bas à gauche */}
          <svg
            viewBox="0 0 80 120"
            className="absolute"
            style={{
              bottom: 72,
              left: "10%",
              width: 60,
              height: 100,
              animation: "bounceDown 1s ease-in-out infinite",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
            }}>
            <path d="M40 0 C40 0 40 80 40 90 L25 70 M40 90 L55 70"
              stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      )}
      <style>{`
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0) }
          50%       { transform: translateY(10px) }
        }
      `}</style>
    </div>
  )
})

export default CompanyMapView
