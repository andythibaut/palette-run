import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import Map, { Marker, NavigationControl } from 'react-map-gl'
import { useCompanyStore } from '@/store/useCompanyStore'
import { MAPBOX_TOKEN, MAP_STYLE, DEFAULT_CENTER } from '@/lib/mapbox'

const GOLD = '#FFD166'

// Décode un WKB hex (PostGIS) en { lat, lng }
function wkbToLatLng(wkb) {
  if (!wkb || typeof wkb !== 'string') return null
  try {
    const buf = new Uint8Array(wkb.match(/.{2}/g).map(b => parseInt(b, 16)))
    const view = new DataView(buf.buffer)
    const lng = view.getFloat64(5,  true)
    const lat = view.getFloat64(13, true)
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
          <span className="font-bebas text-sm leading-none text-black">
            {listing?.qty ?? '—'}
          </span>
          <span className="text-[7px] leading-none text-black/70">pal.</span>
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
  const [viewport, setViewport] = useState(null)
  const [userPos,  setUserPos]  = useState(null)
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

        {/* Marqueur de l'annonce — position exacte, couleur or */}
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
      {!hasListing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-bg/80 backdrop-blur-md border border-border rounded-2xl px-5 py-4 text-center mx-6">
            <p className="text-2xl mb-2">📦</p>
            <p className="font-bebas text-lg text-white">Aucune annonce active</p>
            <p className="text-sub text-xs mt-1">Publiez une annonce pour la voir ici</p>
          </div>
        </div>
      )}
    </div>
  )
})

export default CompanyMapView
