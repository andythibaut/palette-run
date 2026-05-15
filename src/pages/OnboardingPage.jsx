import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useCompanyStore } from '@/store/useCompanyStore'
import PalletLogo from '@/components/shared/PalletLogo'

// ─── Autocomplétion API Adresse (data.gouv.fr) ───────────────────────────────
const useAddressSearch = () => {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected,    setSelected]    = useState(null) // { label, city, postcode, lat, lng }
  const [loading,     setLoading]     = useState(false)
  const debounceRef = useRef(null)

  const search = useCallback((q) => {
    setQuery(q)
    setSelected(null)
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) return
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&type=housenumber,street,municipality`)
        const data = await res.json()
        setSuggestions(
          (data.features || []).map(f => ({
            label:    f.properties.label,
            city:     f.properties.city,
            postcode: f.properties.postcode,
            lat:      f.geometry.coordinates[1],
            lng:      f.geometry.coordinates[0],
          }))
        )
      } catch {
        setSuggestions([])
      }
      setLoading(false)
    }, 300)
  }, [])

  const pick = (suggestion) => {
    setSelected(suggestion)
    setQuery(suggestion.label)
    setSuggestions([])
  }

  return { query, search, suggestions, selected, pick, loading }
}

// ─── Composant champ adresse ─────────────────────────────────────────────────
const AddressField = ({ onSelect }) => {
  const { query, search, suggestions, selected, pick, loading } = useAddressSearch()
  const [focused, setFocused] = useState(false)

  const handlePick = (s) => {
    pick(s)
    onSelect(s)
  }

  return (
    <div className="relative">
      <label className="text-xs text-muted uppercase tracking-widest block mb-2">
        Adresse du site <span className="text-amber">*</span>
      </label>
      <div className={`flex items-center bg-hi rounded-2xl border-2 overflow-hidden transition-colors ${
        selected ? 'border-green' : focused ? 'border-amber' : 'border-border'
      }`}>
        <span className="pl-4 text-lg shrink-0">{selected ? '✅' : '📍'}</span>
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="22 avenue d'Italie, Paris…"
          className="flex-1 px-3 py-3 bg-transparent text-white text-sm outline-none"
          autoComplete="off"
        />
        {loading && <span className="pr-4 text-muted text-xs animate-pulse">…</span>}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && focused && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => handlePick(s)}
              className="w-full px-4 py-3 text-left hover:bg-hi transition-colors border-none bg-transparent cursor-pointer border-b border-border/50 last:border-0"
            >
              <p className="text-white text-sm font-semibold leading-tight">{s.label}</p>
              <p className="text-muted text-xs mt-0.5">{s.postcode} {s.city}</p>
            </button>
          ))}
        </div>
      )}

      {/* Aucun résultat */}
      {query.length >= 3 && !loading && suggestions.length === 0 && focused && !selected && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-2xl px-4 py-3 shadow-2xl">
          <p className="text-muted text-sm">Aucune adresse trouvée — vérifiez l'orthographe</p>
        </div>
      )}

      {selected && (
        <p className="text-xs text-green mt-1.5 ml-1">
          📌 {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)} — coordonnées confirmées
        </p>
      )}
    </div>
  )
}

const ROLES = [
  {
    id:    'company',
    emoji: '🏭',
    title: 'Vous êtes commerçant',
    sub:   'Vous vendez des palettes',
    color: '#2ECC71',
  },
  {
    id:    'driver',
    emoji: '🚛',
    title: 'Vous êtes chauffeur',
    sub:   'Vous achetez des palettes',
    color: '#3B82F6',
  },
]

export default function OnboardingPage() {
  const { profile, createProfile, user, error: authError, clearError } = useAuthStore()
  const { createCompany } = useCompanyStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile) {
      navigate(profile.role === 'driver' ? '/app' : '/company', { replace: true })
    }
  }, [profile])

  const [step,        setStep]        = useState('role')      // 'role' | 'driver-info' | 'company-info'
  const [selectedRole,setSelectedRole]= useState(null)
  const [fullName,    setFullName]    = useState('')
  const [companyName, setCompanyName] = useState('')
  const [geoAddress,  setGeoAddress]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  // ─── Étape 1 : Choix du rôle uniquement ──────────────────────────────────
  if (step === 'role') return (
    <div className="flex flex-col bg-bg px-5"
      style={{
        minHeight: '100dvh',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'calc(80px + max(1rem, env(safe-area-inset-bottom)))'
      }}>

      <div className="flex items-center gap-2 mb-3">
        <PalletLogo size={20} color="#F5A623" />
        <span className="font-bebas text-lg tracking-widest text-amber">PALETTE RUN</span>
      </div>

      <div className="mb-4">
        <h1 className="font-bebas text-3xl text-white leading-tight">Vous êtes…</h1>
        <p className="text-sub text-xs mt-0.5">Choisissez votre profil pour commencer.</p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {ROLES.map(r => (
          <button key={r.id} onClick={() => { setSelectedRole(r.id); setError('') }}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl border-2 cursor-pointer transition-all text-left w-full"
            style={{
              borderColor: selectedRole === r.id ? r.color : '#1C2330',
              background:  selectedRole === r.id ? `${r.color}14` : '#111827',
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: selectedRole === r.id ? `${r.color}22` : '#1A2030' }}
            >{r.emoji}</div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: selectedRole === r.id ? '#E8EDF5' : '#718096' }}>{r.title}</p>
              <p className="text-xs text-muted mt-0.5">{r.sub}</p>
            </div>
            <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{ borderColor: selectedRole === r.id ? r.color : '#1C2330', background: selectedRole === r.id ? r.color : 'transparent' }}
            >
              {selectedRole === r.id && <span className="text-white text-[10px]">✓</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-red/10 border border-red/30 rounded-xl px-3 py-2 flex items-start gap-2">
        <span className="text-xs shrink-0">⚠️</span>
        <p className="text-xs text-red leading-relaxed">
          <strong>Ce choix est définitif.</strong> Si vous vous trompez, vous devrez supprimer votre compte et vous réinscrire.
        </p>
      </div>

      {error && <p className="text-xs text-red mt-2 bg-red/10 rounded-xl px-3 py-2">{error}</p>}

      {/* Bouton fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 px-5 bg-bg border-t border-border/30"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', paddingTop: '0.75rem' }}>
        <button
          onClick={() => {
            if (!selectedRole) { setError('Choisissez un profil pour continuer'); return }
            setError('')
            setStep(selectedRole === 'driver' ? 'driver-info' : 'company-info')
          }}
          disabled={!selectedRole}
          className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-40"
          style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
        >
          Continuer →
        </button>
      </div>
    </div>
  )

  // ─── Étape 2a : Infos chauffeur ──────────────────────────────────────────
  if (step === 'driver-info') {
    const handleDriverCreate = async () => {
      if (!fullName.trim()) { setError('Votre nom est obligatoire'); return }
      setLoading(true)
      setError('')
      clearError()
      const timeout = setTimeout(() => {
        setLoading(false)
        setError('Délai dépassé — vérifiez votre connexion et réessayez')
      }, 10000)
      const ok = await createProfile({ role: 'driver', fullName: fullName.trim() })
      clearTimeout(timeout)
      setLoading(false)
      if (!ok) { setError(authError || 'Erreur lors de la création — réessayez'); return }
      navigate('/app', { replace: true })
    }

    return (
      <div className="flex flex-col h-screen bg-bg px-5 overflow-hidden"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

        <button onClick={() => setStep('role')} className="flex items-center gap-2 text-muted text-sm mb-6 bg-transparent border-none cursor-pointer shrink-0">
          ← Retour
        </button>

        <div className="mb-8 shrink-0">
          <span className="text-4xl">🚛</span>
          <h1 className="font-bebas text-4xl text-white leading-tight mt-2">Votre nom</h1>
          <p className="text-sub text-sm mt-1">Ce nom sera visible par les vendeurs.</p>
        </div>

        <div className="mb-6 shrink-0">
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">
            Nom du chauffeur <span className="text-amber">*</span>
          </label>
          <input
            type="text" value={fullName}
            onChange={e => { setFullName(e.target.value); setError('') }}
            placeholder=""
            autoFocus
            className="w-full px-4 py-4 bg-hi border-2 border-border rounded-2xl text-white text-lg outline-none focus:border-blue transition-colors"
          />
        </div>

        {error && <p className="text-xs text-red mb-4 bg-red/10 rounded-xl px-3 py-2">{error}</p>}

        <button onClick={handleDriverCreate} disabled={loading || !fullName.trim()}
          className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-40 mt-auto shrink-0"
          style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
        >
          {loading ? 'Création…' : '🚛 Accéder à la carte →'}
        </button>
      </div>
    )
  }

  // ─── Étape 2b : Infos vendeur ─────────────────────────────────────────────
  const handleCompanyCreate = async () => {
    if (!companyName.trim()) { setError("Le nom de l'enseigne est obligatoire"); return }
    if (!geoAddress)         { setError('Veuillez sélectionner une adresse dans la liste'); return }
    setLoading(true)
    setError('')
    clearError()
    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Délai dépassé — vérifiez votre connexion et réessayez')
    }, 10000)
    const profileOk = await createProfile({ role: 'company', fullName: companyName.trim() })
    if (!profileOk) {
      clearTimeout(timeout)
      setLoading(false)
      setError(authError || 'Erreur lors de la création — réessayez')
      return
    }
    const companyOk = await createCompany({
      name:    companyName.trim(),
      city:    geoAddress.city,
      address: geoAddress.label,
      lat:     geoAddress.lat,
      lng:     geoAddress.lng,
      ownerId: user.id,
    })
    clearTimeout(timeout)
    setLoading(false)
    if (!companyOk) { setError('Erreur lors de la création du site — réessayez'); return }
    navigate('/company', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg px-5"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

      <button onClick={() => setStep('role')} className="flex items-center gap-2 text-muted text-sm mb-6 bg-transparent border-none cursor-pointer shrink-0">
        ← Retour
      </button>

      <div className="mb-6">
        <span className="text-4xl">🏭</span>
        <h1 className="font-bebas text-4xl text-white leading-tight mt-2">Votre enseigne</h1>
        <p className="text-sub text-sm mt-1">Ces informations seront visibles sur la carte.</p>
      </div>

      <div className="flex flex-col gap-5 mb-6">
        <div>
          <label className="text-xs text-muted uppercase tracking-widest block mb-2">
            Nom de l'enseigne <span className="text-amber">*</span>
          </label>
          <input
            type="text" value={companyName}
            onChange={e => { setCompanyName(e.target.value); setError('') }}
            placeholder=""
            autoFocus
            className="w-full px-4 py-4 bg-hi border-2 border-border rounded-2xl text-white text-lg outline-none focus:border-green transition-colors"
          />
        </div>

        <AddressField onSelect={(s) => { setGeoAddress(s); setError('') }} />

        <div className="bg-blue/10 border border-blue/20 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-base shrink-0">ℹ️</span>
          <p className="text-xs text-blue/80 leading-relaxed">
            Tapez votre adresse et <strong className="text-blue">sélectionnez-la dans la liste</strong>. Les coordonnées GPS sont récupérées automatiquement.
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-red mb-4 bg-red/10 rounded-xl px-4 py-3">{error}</p>}

      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={handleCompanyCreate}
          disabled={loading || !companyName.trim() || !geoAddress}
          className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-40"
          style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
        >
          {loading ? 'Création…' : '📦 Créer mon enseigne →'}
        </button>
        <p className="text-center text-xs text-muted">100% gratuit — toujours</p>
      </div>
    </div>
  )
}
