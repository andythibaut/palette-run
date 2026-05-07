import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useCompanyStore } from '@/store/useCompanyStore'
import PalletLogo from '@/components/shared/PalletLogo'

const ROLES = [
  {
    id:    'driver',
    emoji: '🚛',
    title: "J'achète des palettes",
    sub:   'Je recherche des palettes à acheter',
    color: '#3B82F6',
  },
  {
    id:    'company',
    emoji: '🏭',
    title: 'Je vends des palettes',
    sub:   'Je mets mes palettes en vente',
    color: '#2ECC71',
  },
]

export default function OnboardingPage() {
  const { profile, createProfile, user } = useAuthStore()
  const { createCompany } = useCompanyStore()
  const navigate = useNavigate()

  // Si le profil existe déjà → rediriger immédiatement
  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'driver' ? '/app' : '/company', { replace: true })
    }
  }, [profile])

  const [step,        setStep]        = useState('role')
  const [selectedRole,setSelectedRole]= useState(null)
  const [fullName,    setFullName]    = useState('')
  const [companyName, setCompanyName] = useState('')
  const [city,        setCity]        = useState('')
  const [address,     setAddress]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const handleRoleSelect = async () => {
    if (!selectedRole || !fullName.trim()) {
      setError('Veuillez renseigner votre nom et choisir un profil')
      return
    }
    setLoading(true)

    const ok = await createProfile({ role: selectedRole, fullName: fullName.trim() })
    setLoading(false)
    if (!ok) return

    if (selectedRole === 'company') {
      setStep('company-info')
    } else {
      navigate('/app', { replace: true })
    }
  }

  const handleCompanyCreate = async () => {
    if (!companyName.trim() || !city.trim()) {
      setError('Nom et ville sont obligatoires')
      return
    }
    setLoading(true)
    // Coordonnées par défaut Paris — à remplacer par géocodage en production
    const ok = await createCompany({
      name:    companyName.trim(),
      city:    city.trim(),
      address: address.trim(),
      lat:     48.8566,
      lng:     2.3522,
      ownerId: user.id,
    })
    setLoading(false)
    if (!ok) return
    navigate('/company', { replace: true })
  }

  // ─── Étape 1 : Choix du rôle ──────────────────────────────────────────────
  if (step === 'role') return (
    <div className="flex flex-col min-h-screen bg-bg px-6 py-10">
      <div className="flex items-center gap-3 mb-10">
        <PalletLogo size={28} color="#F5A623" />
        <span className="font-bebas text-2xl tracking-widest text-amber">PALETTE RUN</span>
      </div>

      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-white leading-tight">Vous êtes…</h1>
        <p className="text-sub text-sm mt-2">Choisissez votre profil pour commencer.</p>
      </div>

      {/* Nom */}
      <div className="mb-6">
        <label className="text-xs text-muted uppercase tracking-widest block mb-2">Votre nom</label>
        <input
          type="text" value={fullName}
          onChange={e => { setFullName(e.target.value); setError('') }}
          placeholder="Jean-Pierre Martin"
          className="w-full px-4 py-3 bg-hi border-2 border-border rounded-2xl text-white text-sm outline-none"
        />
      </div>

      {/* Rôles */}
      <div className="flex flex-col gap-4 mb-8">
        {ROLES.map(r => (
          <button key={r.id} onClick={() => { setSelectedRole(r.id); setError('') }}
            className={`flex items-center gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all text-left ${
              selectedRole === r.id
                ? 'border-current bg-opacity-10'
                : 'border-border bg-hi'
            }`}
            style={{
              borderColor: selectedRole === r.id ? r.color : undefined,
              background:  selectedRole === r.id ? `${r.color}14` : undefined,
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: selectedRole === r.id ? `${r.color}22` : '#1A2030' }}
            >{r.emoji}</div>
            <div className="flex-1">
              <p className="font-semibold text-base" style={{ color: selectedRole === r.id ? '#E8EDF5' : '#718096' }}>{r.title}</p>
              <p className="text-xs text-muted mt-1">{r.sub}</p>
            </div>
            <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{ borderColor: selectedRole === r.id ? r.color : '#1C2330', background: selectedRole === r.id ? r.color : 'transparent' }}
            >
              {selectedRole === r.id && <span className="text-white text-xs">✓</span>}
            </div>
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red mb-4">{error}</p>}

      <button onClick={handleRoleSelect} disabled={loading || !selectedRole || !fullName.trim()}
        className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-40 mt-auto"
        style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
      >
        {loading ? 'Création…' : 'Continuer →'}
      </button>
    </div>
  )

  // ─── Étape 2 : Infos vendeur ───────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-bg px-6 py-10">
      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-white leading-tight">Votre vendeur</h1>
        <p className="text-sub text-sm mt-2">Ces informations seront visibles sur la carte.</p>
      </div>

      <div className="flex flex-col gap-5 mb-8">
        {[
          { label:'Nom de l\'vendeur', value:companyName, set:setCompanyName, placeholder:'SAS Logipro', required:true },
          { label:'Ville',                value:city,        set:setCity,        placeholder:'Paris 13e',   required:true },
          { label:'Adresse (optionnel)',  value:address,     set:setAddress,     placeholder:'22 av. d\'Italie' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">
              {f.label}{f.required && <span className="text-amber ml-1">*</span>}
            </label>
            <input type="text" value={f.value} onChange={e => { f.set(e.target.value); setError('') }}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 bg-hi border-2 border-border rounded-2xl text-white text-sm outline-none"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red mb-4">{error}</p>}

      <div className="flex flex-col gap-3 mt-auto">
        <button onClick={handleCompanyCreate} disabled={loading}
          className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-40"
          style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
        >
          {loading ? 'Création…' : '📦 Publier mon premier stock →'}
        </button>
        <p className="text-center text-xs text-muted">100% gratuit — toujours</p>
      </div>
    </div>
  )
}
