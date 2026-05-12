import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Map, { Marker, NavigationControl } from 'react-map-gl'
import { supabase } from '@/lib/supabase'
import { MAPBOX_TOKEN, MAP_STYLE, profitColor } from '@/lib/mapbox'
import PalletLogo from '@/components/shared/PalletLogo'

const DEFAULT_CENTER = { longitude: 1.4442, latitude: 43.6047, zoom: 11 }

// ─── Parse EWKB hex ───────────────────────────────────────────────────────────
const parseEWKB = (hex) => {
  try {
    const buf      = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
    const view     = new DataView(buf.buffer)
    const byteOrder = buf[0]
    const hasSRID  = (view.getUint32(1, byteOrder === 1) & 0x20000000) !== 0
    const offset   = hasSRID ? 9 : 5
    return {
      lng: view.getFloat64(offset,     byteOrder === 1),
      lat: view.getFloat64(offset + 8, byteOrder === 1),
    }
  } catch { return null }
}

// ─── Marqueur démo ────────────────────────────────────────────────────────────
const DemoMarker = ({ listing, onClick, selected }) => {
  const color = profitColor(listing.price, null, 20, listing.qty)
  const seed  = listing.id ? listing.id.charCodeAt(0) + listing.id.charCodeAt(4) : 0
  const lat   = listing._lat + ((seed % 100) - 50) / 100000 * 5
  const lng   = listing._lng + ((seed % 137) - 68) / 100000 * 5
  const size  = selected ? 44 : 36

  if (!listing._lat || !listing._lng) return null

  return (
    <Marker longitude={lng} latitude={lat} anchor="center" onClick={onClick}>
      <div className="relative cursor-pointer" style={{ width: size, height: size }}>
        {selected && (
          <div className="absolute inset-0 rounded-full border-2 animate-ping opacity-50"
            style={{ borderColor: '#4A5568' }} />
        )}
        <div className="w-full h-full rounded-xl flex flex-col items-center justify-center shadow-lg"
          style={{ background: '#4A556822', border: '2px solid #4A5568' }}>
          <span className="font-bebas text-sm leading-none text-muted">{listing.qty}</span>
          <span className="text-[7px] leading-none text-muted">pal.</span>
        </div>
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-surface border rounded px-1 py-0.5 text-[9px] whitespace-nowrap font-mono text-muted border-muted/30">
          {listing.price?.toFixed(2)}€
        </div>
      </div>
    </Marker>
  )
}

// ─── Bottom sheet démo ────────────────────────────────────────────────────────
const DemoBottomSheet = ({ listing, onClose, onSignup }) => (
  <>
    <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={onClose} />
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-surface rounded-t-3xl border border-border border-b-0 shadow-2xl"
      style={{ animation: 'slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)' }}>
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-9 h-1 rounded-full bg-border" />
      </div>
      <div className="px-5 pb-8">
        {/* Nom flouté */}
        <div className="flex items-start gap-2 mb-4">
          <div className="flex-1">
            <h2 className="font-bebas text-2xl text-white/30" style={{ filter: 'blur(8px)', userSelect: 'none' }}>
              Vendeur Toulouse
            </h2>
            <p className="text-sub text-sm mt-0.5">{listing.companies?.city}</p>
            <p className="text-xs text-muted/50 mt-0.5 italic">Adresse visible après inscription</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-hi border border-border flex items-center justify-center text-xl text-sub">×</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Palettes', value: listing.qty,                       color: '#4A5568' },
            { label: 'Prix',     value: `${listing.price?.toFixed(2)}€`,   color: '#2ECC71' },
            { label: 'Total',    value: `${(listing.qty * listing.price)?.toFixed(2)}€`, color: '#F5A623' },
          ].map(s => (
            <div key={s.label} className="bg-hi rounded-2xl p-3 text-center border border-border">
              <p className="font-bebas text-2xl leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Heure limite */}
        {listing.pickup_before && (
          <div className="flex items-center gap-2 mb-4 bg-blue/10 border border-blue/30 rounded-xl px-3 py-2">
            <span>🕐</span>
            <p className="text-blue text-sm">Récupérer avant <strong>{listing.pickup_before.slice(0,5)}</strong></p>
          </div>
        )}

        {/* CTA inscription */}
        <div className="bg-amber/10 border border-amber/30 rounded-2xl px-4 py-4 mb-3">
          <p className="text-amber text-sm font-semibold mb-1">🔒 Créez un compte pour réserver</p>
          <p className="text-sub text-xs leading-relaxed">
            Gratuit et sans engagement. Réservez en priorité avant les autres acheteurs.
          </p>
        </div>

        <button onClick={onSignup}
          className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}>
          Créer un compte gratuit →
        </button>
      </div>
    </div>
    <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
  </>
)

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PublicMapPage() {
  const navigate  = useNavigate()
  const mapRef    = useRef(null)
  const [viewport,     setViewport]     = useState(DEFAULT_CENTER)
  const [listings,     setListings]     = useState([])
  const [selected,     setSelected]     = useState(null)
  const [totalQty,     setTotalQty]     = useState(0)
  const [installPrompt,setInstallPrompt]= useState(null)
  const [showInstall,  setShowInstall]  = useState(false)
  const [countdown,    setCountdown]    = useState({ d:'--', h:'--', m:'--' })

  // Compte à rebours lancement 1er septembre 2026
  useEffect(() => {
    const launch = new Date('2026-09-01T09:00:00')
    const tick = () => {
      const diff = Math.max(0, launch - Date.now())
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const pad = n => String(n).padStart(2, '0')
      setCountdown({ d: pad(d), h: pad(h), m: pad(m) })
    }
    tick()
    const i = setInterval(tick, 60000)
    return () => clearInterval(i)
  }, [])
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    if (!installPrompt) return
    setInstalling(true)
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      // Garde le message pendant 25 secondes puis ferme
      setTimeout(() => {
        setShowInstall(false)
        setInstalling(false)
      }, 25000)
    } else {
      setInstalling(false)
    }
  }

  // Charge les annonces sans auth
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, companies(id, name, city, location)')
        .eq('is_active', true)

      if (!data) return

      const parsed = data.map(l => {
        if (l.companies?.location) {
          const coords = parseEWKB(l.companies.location)
          if (coords) { l._lat = coords.lat; l._lng = coords.lng }
        }
        return l
      }).filter(l => l._lat && l._lng)

      setListings(parsed)
      setTotalQty(parsed.reduce((s, l) => s + l.qty, 0))

      // Centre sur les annonces
      if (parsed.length > 0) {
        const avgLat = parsed.reduce((s, l) => s + l._lat, 0) / parsed.length
        const avgLng = parsed.reduce((s, l) => s + l._lng, 0) / parsed.length
        setViewport(v => ({ ...v, latitude: avgLat, longitude: avgLng, zoom: 11 }))
      }
    }
    load()
  }, [])

  // Géolocalisation
  const handleGeolocate = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12, duration: 1200 })
    })
  }, [])

  const handleSignup = () => navigate('/auth')

  return (
    <div className="relative w-full h-screen overflow-hidden">
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
        {listings.map(l => (
          <DemoMarker
            key={l.id}
            listing={l}
            selected={selected?.id === l.id}
            onClick={e => { e.originalEvent.stopPropagation(); setSelected(l) }}
          />
        ))}
      </Map>

      {/* Header */}
      <div className="absolute top-14 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-bg/90 backdrop-blur-md border border-border rounded-2xl px-4 py-2.5">
          <PalletLogo size={20} color="#F5A623" />
          <span className="font-bebas text-lg tracking-widest text-amber">PALETTE RUN</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGeolocate}
            className="w-10 h-10 rounded-xl bg-bg/90 backdrop-blur-md border border-border flex items-center justify-center text-lg">
            🎯
          </button>
          <button onClick={handleSignup}
            className="px-4 py-2 rounded-xl font-bold text-bg text-sm cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)' }}>
            Connexion
          </button>
        </div>
      </div>

      {/* Bandeau lancement */}
      {!selected && (
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 gap-3"
          style={{ background: 'linear-gradient(135deg, #1a0a2e, #2d1b5e)', borderBottom: '2px solid #7C3AED' }}>
          <div className="flex-1">
            <p className="text-white font-bold text-sm leading-tight">🚀 Soyez parmi les premiers vendeurs visibles !</p>
            <p className="text-xs mt-0.5" style={{ color: '#A78BFA' }}>Lancement le 1er septembre 2026 · 100% gratuit pour les commerçants</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {[{ v: countdown.d, l: 'j' }, { v: countdown.h, l: 'h' }, { v: countdown.m, l: 'm' }].map(({ v, l }) => (
              <div key={l} className="flex items-center gap-0.5">
                <span className="font-bebas text-lg w-8 h-7 flex items-center justify-center rounded" style={{ background: '#7C3AED', color: '#FFFFFF' }}>{v}</span>
                <span className="text-xs" style={{ color: '#A78BFA' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compteur palettes */}
      {!selected && (
        <div className="absolute bottom-20 left-3 z-20 bg-bg/80 backdrop-blur-md border border-border/50 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="font-bebas text-2xl text-amber leading-none">{totalQty}</span>
          <div>
            <p className="text-xs text-white font-semibold leading-none">palettes dispo</p>
            <p className="text-[10px] text-muted">cliquez pour voir</p>
          </div>
        </div>
      )}

      {/* Bandeau installation PWA */}
      {showInstall && !selected && (
        <div className="fixed bottom-24 left-3 right-3 z-20 bg-surface border border-amber/40 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
          {installing ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0 animate-pulse">
                ⏳
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Installation en cours…</p>
                <p className="text-muted text-xs mt-0.5">L'app apparaîtra sur votre écran d'accueil dans quelques secondes</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-amber/10 flex items-center justify-center shrink-0">
                📲
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Installez pour réserver</p>
                <p className="text-muted text-xs mt-0.5">Installez l'app et créez un compte pour réserver des palettes</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowInstall(false)}
                  className="px-3 py-2 rounded-xl text-muted text-xs cursor-pointer bg-transparent border-none">
                  Plus tard
                </button>
                <button onClick={handleInstall}
                  className="px-3 py-2 rounded-xl font-bold text-bg text-xs cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)' }}>
                  Installer
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bandeau inscription */}
      {!selected && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur-md border-t border-border px-5 pt-4 flex items-center gap-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">Rejoignez Palette Run</p>
            <p className="text-muted text-xs mt-0.5">Gratuit — réservez en priorité</p>
            <a href="/privacy" className="text-muted text-[10px] underline mt-0.5 block">Politique de confidentialité</a>
          </div>
          <button onClick={handleSignup}
            className="px-5 py-3 rounded-2xl font-bold text-bg text-sm cursor-pointer shrink-0"
            style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 4px 15px rgba(245,166,35,0.4)' }}>
            S'inscrire →
          </button>
        </div>
      )}

      {/* Bottom sheet */}
      {selected && (
        <DemoBottomSheet
          listing={selected}
          onClose={() => setSelected(null)}
          onSignup={handleSignup}
        />
      )}
    </div>
  )
}
