import { useState, useEffect, useRef } from 'react'
import { useAuthStore }   from '@/store/useAuthStore'
import { useCompanyStore } from '@/store/useCompanyStore'
import { useListingStore } from '@/store/useListingStore'
import { supabase }        from '@/lib/supabase'
import CompanyDashboard from '@/components/company/CompanyDashboard'
import CompanyMapView   from '@/components/map/CompanyMapView'

const TABS = [
  { id: 'annonce',   icon: '📦', label: 'Annonce'   },
  { id: 'acheteurs', icon: '🚛', label: 'Acheteurs' },
  { id: 'carte',     icon: '🗺',  label: 'Carte'     },
  { id: 'blacklist', icon: '🚫', label: 'Blacklist' },
  { id: 'profil',    icon: '👤', label: 'Profil'    },
]

export default function CompanyApp() {
  const { user } = useAuthStore()
  const { fetchCompany, company } = useCompanyStore()
  const { fetchListings, subscribeRealtime, unsubscribeRealtime } = useListingStore()
  const [tab, setTab] = useState('annonce')
  const [mapViewport, setMapViewport] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (tab === 'carte') setTimeout(() => mapRef.current?.resize(), 50)
  }, [tab])

  useEffect(() => {
    if (user?.id) fetchCompany(user.id)
  }, [user?.id])

  useEffect(() => {
    fetchListings()
    subscribeRealtime()
    return () => unsubscribeRealtime()
  }, [])

  // Realtime sur bids et listings → rafraîchit la liste des acheteurs
  useEffect(() => {
    if (!company?.id) return
    const { listing } = useCompanyStore.getState()
    if (!listing?.id) return

    const sub = supabase
      .channel('company-bids-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' },
        (payload) => {
          const { listing: l } = useCompanyStore.getState()
          if (l?.id && payload.new?.listing_id === l.id) {
            useCompanyStore.getState().fetchDrivers(l.id, l.reserved_by)
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' },
        (payload) => {
          const { listing: l, company } = useCompanyStore.getState()
          if (!l?.id || payload.new?.id !== l.id) return
          useCompanyStore.getState().fetchDrivers(l.id, l.reserved_by)
          if (company?.id) useCompanyStore.getState().fetchActiveListing(company.id)
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const { listing: l } = useCompanyStore.getState()
          if (l?.id && payload.new?.listing_id === l.id) {
            useCompanyStore.getState().fetchDrivers(l.id, l.reserved_by)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [company?.id])

  // Première connexion → onglet profil
  useEffect(() => {
    if (company && !company.vehicle_required) setTab('profil')
  }, [company])

  return (
    <div className="flex flex-col bg-bg overflow-hidden" style={{ height: '100dvh' }}>
      {/* Contenu */}
      <div className="flex-1 overflow-hidden relative">
        {/* Carte — toujours montée, cachée via CSS */}
        <div style={{ display: tab === 'carte' ? 'block' : 'none', height: '100%' }}>
          <CompanyMapView
            ref={mapRef}
            savedViewport={mapViewport}
            onViewportChange={setMapViewport}
          />
        </div>
        {tab !== 'carte' && <CompanyDashboard tab={tab} />}
      </div>

      {/* Bottom nav */}
      <div className="shrink-0 border-t border-border bg-bg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 cursor-pointer border-none bg-transparent transition-colors relative"
              style={{ color: tab === t.id ? '#F5A623' : '#4A5568' }}>
              {tab === t.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber rounded-full" />
              )}
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[10px] font-mono">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
