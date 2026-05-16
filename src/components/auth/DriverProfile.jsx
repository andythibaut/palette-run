import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase }     from '@/lib/supabase'

const VEHICLES = [
  { id: 'vl',      label: 'VL',      icon: '🚗', sub: 'Véhicule léger — accès partout' },
  { id: 'porteur', label: 'Porteur', icon: '🚚', sub: 'Porteur — accès sites Porteur et Semi' },
  { id: 'semi',    label: 'Semi',    icon: '🚛', sub: 'Semi-remorque — grands accès uniquement' },
]

export default function DriverProfile() {
  const { updateProfile, profile } = useAuthStore()
  const [resalePrice,   setResalePrice]   = useState(profile?.resale_price   || '')
  const [goldThreshold, setGoldThreshold] = useState(profile?.gold_threshold || 20)
  const [vehicleType,   setVehicleType]   = useState(profile?.vehicle_type   || null)
  const [editResale,    setEditResale]    = useState(false)
  const [editGold,      setEditGold]      = useState(false)
  const [saved,         setSaved]         = useState(null)
  const [loading,       setLoading]       = useState(false)

  useEffect(() => {
    if (profile?.resale_price !== undefined)   setResalePrice(profile.resale_price || '')
    if (profile?.gold_threshold !== undefined) setGoldThreshold(profile.gold_threshold || 20)
    if (profile?.vehicle_type !== undefined)   setVehicleType(profile.vehicle_type || null)
  }, [profile?.resale_price, profile?.gold_threshold, profile?.vehicle_type])

  const tierColor = { free: '#3B82F6', gold: '#FFD166' }
  const tierLabel = { free: 'Gratuit', gold: 'Gold 🥇' }

  const save = async (field) => {
    setLoading(true)
    const updates = field === 'resale'
      ? { resale_price: parseFloat(resalePrice) || null }
      : field === 'gold'
      ? { gold_threshold: parseFloat(goldThreshold) || 20 }
      : { vehicle_type: vehicleType }
    await updateProfile(updates)
    setLoading(false)
    if (field === 'resale') setEditResale(false)
    else if (field === 'gold') setEditGold(false)
    setSaved(field)
    setTimeout(() => setSaved(null), 2000)
  }

  const handleVehicleSelect = async (v) => {
    setVehicleType(v)
    await updateProfile({ vehicle_type: v })
    setSaved('vehicle')
    setTimeout(() => setSaved(null), 2000)
  }

  const previewColor = (buyPrice) => {
    if (!resalePrice) return '#4A5568'
    const p = parseFloat(resalePrice) - buyPrice
    if (p < 0) return '#EF4444'
    if (p < 2) return '#F97316'
    if (p < parseFloat(goldThreshold)) return '#2ECC71'
    return '#FFD166'
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20 bg-bg">

      {/* Bannière première connexion */}
      {!profile?.vehicle_type && (
        <div className="mx-5 mt-5 bg-amber/10 border border-amber/40 rounded-2xl px-4 py-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">👋</span>
          <div>
            <p className="text-amber font-bold text-sm">Bienvenue sur Palette Run !</p>
            <p className="text-amber/80 text-xs mt-1 leading-relaxed">
              Configurez votre profil pour accéder à la carte et voir les annonces adaptées à votre véhicule.
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-6 pb-5 border-b border-border">
        <div className="w-16 h-16 rounded-2xl bg-amber/10 border-2 border-amber/30 flex items-center justify-center text-4xl">🚛</div>
        <div className="flex-1">
          <h1 className="font-bebas text-2xl text-white">{profile?.full_name || 'Mon profil'}</h1>
          <p className="text-sub text-xs mt-1">Acheteur de palettes</p>
          <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-mono"
            style={{ background: `${tierColor[profile?.tier || 'free']}18`, color: tierColor[profile?.tier || 'free'], border: `1px solid ${tierColor[profile?.tier || 'free']}44` }}>
            {tierLabel[profile?.tier || 'free']}
          </span>
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-6">

        {/* Mon véhicule */}
        <div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Mon véhicule</p>
          <div className="flex flex-col gap-2">
            {VEHICLES.map(v => (
              <button key={v.id} onClick={() => handleVehicleSelect(v.id)}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all text-left"
                style={{
                  borderColor: vehicleType === v.id ? '#F5A623' : '#1C2330',
                  background:  vehicleType === v.id ? '#F5A62314' : '#13181F',
                }}>
                <span className="text-3xl">{v.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: vehicleType === v.id ? '#E8EDF5' : '#718096' }}>{v.label}</p>
                  <p className="text-xs text-muted mt-0.5">{v.sub}</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: vehicleType === v.id ? '#F5A623' : '#1C2330', background: vehicleType === v.id ? '#F5A623' : 'transparent' }}>
                  {vehicleType === v.id && <span className="text-bg text-xs">✓</span>}
                </div>
              </button>
            ))}
          </div>
          {saved === 'vehicle' && <p className="text-xs text-green mt-2">✅ Véhicule sauvegardé</p>}
        </div>
        <div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Prix de revente</p>
          <div className="bg-surface border border-green/40 rounded-2xl overflow-hidden">
            <div className="p-4">
              <p className="text-sub text-xs mb-3 leading-relaxed">
                Configurez votre prix de revente habituel. Le bénéfice potentiel s'affichera sur toutes les annonces.
              </p>
              {!editResale ? (
                <div className="flex items-center justify-between">
                  <div>
                    {resalePrice ? (
                      <>
                        <p className="font-bebas text-5xl text-green leading-none">{parseFloat(resalePrice).toFixed(2)} €</p>
                        <p className="text-sub text-xs mt-1">/ palette revendue</p>
                      </>
                    ) : <p className="text-muted text-sm italic">Non configuré</p>}
                  </div>
                  <button onClick={() => setEditResale(true)}
                    className="px-4 py-2 rounded-xl bg-green/10 border border-green/40 text-green text-sm font-semibold cursor-pointer">
                    {saved === 'resale' ? '✅' : resalePrice ? 'Modifier' : 'Configurer'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center bg-hi border border-green/40 rounded-xl overflow-hidden">
                    <span className="px-4 text-green text-lg font-semibold">€</span>
                    <input type="number" inputMode="decimal" value={resalePrice}
                      onChange={e => setResalePrice(e.target.value)}
                      placeholder="0.00" autoFocus
                      className="flex-1 py-3 bg-transparent text-white font-bebas text-3xl outline-none"
                    />
                    <span className="px-4 text-muted text-xs">/ pal.</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditResale(false)} className="flex-1 py-2.5 rounded-xl border border-border bg-transparent text-sub text-sm cursor-pointer">Annuler</button>
                    <button onClick={() => save('resale')} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-green text-white font-bold text-sm cursor-pointer disabled:opacity-40">
                      {loading ? '…' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Aperçu couleurs */}
            {resalePrice && (
              <>
                <div className="h-px bg-border" />
                <div className="px-4 py-3 flex flex-col gap-2">
                  <p className="text-xs text-muted uppercase tracking-widest">Aperçu des couleurs</p>
                  {[
                    { buy: 1.0,  label: `Achat 1€ → +${(parseFloat(resalePrice)-1).toFixed(2)}€` },
                    { buy: 3.0,  label: `Achat 3€ → +${(parseFloat(resalePrice)-3).toFixed(2)}€` },
                    { buy: parseFloat(resalePrice)+1, label: `Achat ${(parseFloat(resalePrice)+1).toFixed(2)}€ → perte` },
                  ].map(ex => (
                    <div key={ex.buy} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: previewColor(ex.buy) }} />
                      <span className="text-xs text-sub">{ex.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Seuil doré */}
        <div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Seuil couleur dorée 🥇</p>
          <div className="bg-surface border border-amber/40 rounded-2xl p-4">
            <p className="text-sub text-xs mb-3 leading-relaxed">
              Annonces affichées en or quand le bénéfice total (prix × quantité) dépasse ce seuil.
            </p>
            {!editGold ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bebas text-5xl text-amber leading-none">{goldThreshold} €</p>
                  <p className="text-sub text-xs mt-1">bénéfice total</p>
                </div>
                <button onClick={() => setEditGold(true)}
                  className="px-4 py-2 rounded-xl bg-amber/10 border border-amber/40 text-amber text-sm font-semibold cursor-pointer">
                  {saved === 'gold' ? '✅' : 'Modifier'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center bg-hi border border-amber/40 rounded-xl overflow-hidden">
                  <span className="px-4 text-amber text-lg font-semibold">€</span>
                  <input type="number" inputMode="decimal" value={goldThreshold}
                    onChange={e => setGoldThreshold(e.target.value)}
                    autoFocus
                    className="flex-1 py-3 bg-transparent text-white font-bebas text-3xl outline-none"
                  />
                  <span className="px-4 text-muted text-xs">total</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditGold(false)} className="flex-1 py-2.5 rounded-xl border border-border bg-transparent text-sub text-sm cursor-pointer">Annuler</button>
                  <button onClick={() => save('gold')} disabled={loading} className="flex-1 py-2.5 rounded-xl font-bold text-bg text-sm cursor-pointer disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#FFD166,#E8B800)' }}>
                    {loading ? '…' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Supprimer le compte */}
      <div className="px-5 pb-10 mt-6">
        {/* Déconnexion */}
        <button onClick={() => useAuthStore.getState().signOut()}
          className="w-full py-3 rounded-2xl border border-border bg-hi text-white text-sm font-semibold cursor-pointer mb-4">
          🚪 Se déconnecter
        </button>

        <div className="border-t border-border pt-6">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Zone dangereuse</p>
          <button onClick={async () => {
            if (!window.confirm('Supprimer définitivement votre compte ? Cette action est irréversible.')) return
            if (!window.confirm('Êtes-vous vraiment sûr ? Toutes vos données seront supprimées.')) return
            const { user } = useAuthStore.getState()
            try {
              const { error } = await supabase.rpc('delete_driver_account', { input_id: user.id })
              if (error) throw error
              await useAuthStore.getState().signOut()
            } catch (e) {
              alert('Erreur lors de la suppression : ' + e.message)
            }
          }}
            className="w-full py-3 rounded-2xl border border-red/30 bg-red/5 text-red text-sm font-semibold cursor-pointer">
            🗑 Supprimer mon compte
          </button>
          <p className="text-muted text-xs text-center mt-2 leading-relaxed">
            Cette action est irréversible. Toutes vos données seront supprimées.
          </p>
        </div>
      </div>

    </div>
  )
}
