import { useState, useEffect } from 'react'
import { useAuthStore }   from '@/store/useAuthStore'
import { useListingStore } from '@/store/useListingStore'
import DriverMapView   from '@/components/map/DriverMapView'
import DriverListView  from '@/components/listing/DriverListView'
import DriverProfile   from '@/components/auth/DriverProfile'
import BottomNav       from '@/components/shared/BottomNav'

const TABS = [
  { id:'map',     icon:'🗺',  label:'Carte'   },
  { id:'list',    icon:'📋',  label:'Liste'   },
  { id:'alerts',  icon:'🔔',  label:'Alertes' },
  { id:'profile', icon:'👤',  label:'Profil'  },
]

export default function DriverApp() {
  const [tab, setTab] = useState('map')
  const { fetchListings, subscribeRealtime, unsubscribeRealtime } = useListingStore()
  const { profile } = useAuthStore()

  useEffect(() => {
    fetchListings()
    subscribeRealtime()
    return () => unsubscribeRealtime()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden relative">
        {tab === 'map'     && <DriverMapView  profile={profile} />}
        {tab === 'list'    && <DriverListView profile={profile} />}
        {tab === 'alerts'  && (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-muted">
            <span className="text-5xl opacity-30">🔔</span>
            <p className="font-bebas text-2xl">Alertes</p>
            <p className="text-sm">Bientôt disponible</p>
          </div>
        )}
        {tab === 'profile' && <DriverProfile profile={profile} />}
      </div>

      {/* Bottom nav */}
      <BottomNav tabs={TABS} active={tab} onTab={setTab} />
    </div>
  )
}
