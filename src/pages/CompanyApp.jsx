import { useState, useEffect } from 'react'
import { useAuthStore }   from '@/store/useAuthStore'
import { useCompanyStore } from '@/store/useCompanyStore'
import CompanyDashboard from '@/components/company/CompanyDashboard'

export default function CompanyApp() {
  const { user } = useAuthStore()
  const { fetchCompany } = useCompanyStore()

  useEffect(() => {
    if (user?.id) fetchCompany(user.id)
  }, [user?.id])

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <CompanyDashboard />
      </div>
    </div>
  )
}
