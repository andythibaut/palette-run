import { useState, useEffect } from 'react'
import { useAuthStore }   from '@/store/useAuthStore'
import { useCompanyStore } from '@/store/useCompanyStore'
import CompanyDashboard from '@/components/company/CompanyDashboard'
import BottomNav        from '@/components/shared/BottomNav'

const TABS = [
  { id:'dashboard', icon:'📊', label:'Tableau'  },
  { id:'map',       icon:'🗺',  label:'Carte'    },
  { id:'alerts',    icon:'🔔',  label:'Alertes'  },
  { id:'profile',   icon:'👤',  label:'Profil'   },
]

export default function CompanyApp() {
  const [tab, setTab] = useState('dashboard')
  const { user } = useAuthStore()
  const { fetchCompany, loading } = useCompanyStore()

  useEffect(() => {
    if (user?.id) fetchCompany(user.id)
  }, [user?.id])

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {tab === 'dashboard' && <CompanyDashboard />}
        {tab !== 'dashboard' && (
          <div className="flex items-center justify-center h-full flex-col gap-4 text-muted">
            <span className="text-5xl opacity-30">{TABS.find(t=>t.id===tab)?.icon}</span>
            <p className="font-bebas text-2xl">{TABS.find(t=>t.id===tab)?.label}</p>
            <p className="text-sm">Bientôt disponible</p>
          </div>
        )}
      </div>
      <BottomNav tabs={TABS} active={tab} onTab={setTab} />
    </div>
  )
}
