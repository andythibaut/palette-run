import { useState, useEffect } from 'react'
import { useAuthStore }   from '@/store/useAuthStore'
import { useListingStore } from '@/store/useListingStore'
import DriverMapView   from '@/components/map/DriverMapView'
import PickupList      from '@/components/listing/PickupList'
import DriverProfile   from '@/components/auth/DriverProfile'
import BottomNav       from '@/components/shared/BottomNav'

const TABS = [
  { id:'map',      icon:'🗺',  label:'Carte'    },
  { id:'pickups',  icon:'📦',  label:'Achats'},
  { id:'alerts',   icon:'🔔',  label:'Alertes'  },
  { id:'profile',  icon:'👤',  label:'Profil'   },
]

export default function DriverApp() {
  const { profile } = useAuthStore()
  const { fetchListings, subscribeRealtime, unsubscribeRealtime } = useListingStore()

  // Première connexion = profil créé il y a moins de 2 minutes OU pas de véhicule
  const isFirstLogin = !profile?.vehicle_type ||
    (profile?.created_at && (Date.now() - new Date(profile.created_at).getTime()) < 120000)
  const [tab, setTab] = useState(isFirstLogin ? 'profile' : 'map')
  const [mapViewport, setMapViewport] = useState(null)

  useEffect(() => {
    fetchListings(profile?.vehicle_type)
    subscribeRealtime()
    return () => unsubscribeRealtime()
  }, [profile?.vehicle_type])

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Contenu principal */}
      <div className={`flex-1 relative ${tab === 'pickups' || tab === 'profile' ? 'overflow-auto' : 'overflow-hidden'}`}>
        {/* Carte — toujours montée, cachée via CSS */}
        <div style={{ display: tab === 'map' ? 'block' : 'none', height: '100%' }}>
          <DriverMapView
            profile={profile}
            savedViewport={mapViewport}
            onViewportChange={setMapViewport}
          />
        </div>
        {tab === 'pickups' && <PickupList     profile={profile} />}
        {tab === 'alerts'  && (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-muted">
            <span className="text-5xl opacity-30">🔔</span>
            <p className="font-bebas text-2xl">Alertes</p>
            <p className="text-sm">Bientôt disponible</p>
          </div>
        )}
        {tab === 'profile' && <DriverProfile />}
      </div>

      {/* Bottom nav */}
      <BottomNav tabs={TABS} active={tab} onTab={setTab} />
    </div>
  )
}
