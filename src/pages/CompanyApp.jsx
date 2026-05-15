import { useState, useEffect } from 'react'
import { useAuthStore }   from '@/store/useAuthStore'
import { useCompanyStore } from '@/store/useCompanyStore'
import CompanyDashboard from '@/components/company/CompanyDashboard'

const TABS = [
  { id: 'annonce',   icon: '📦', label: 'Annonce'   },
  { id: 'acheteurs', icon: '🚛', label: 'Acheteurs' },
  { id: 'blacklist', icon: '🚫', label: 'Blacklist' },
  { id: 'profil',    icon: '👤', label: 'Profil'    },
]

export default function CompanyApp() {
  const { user } = useAuthStore()
  const { fetchCompany, company } = useCompanyStore()

  useEffect(() => {
    if (user?.id) fetchCompany(user.id)
  }, [user?.id])

  // Première connexion = pas de véhicule configuré → atterrir sur profil
  const isFirstLogin = !company?.vehicle_required
  const [tab, setTab] = useState('annonce') // sera mis à jour dès que company charge

  // Redirige vers profil si première connexion
  useEffect(() => {
    if (company && !company.vehicle_required) setTab('profil')
  }, [company])

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      {/* Contenu */}
      <div className="flex-1 overflow-hidden relative">
        <CompanyDashboard tab={tab} />
      </div>

      {/* Bottom nav fixe */}
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
