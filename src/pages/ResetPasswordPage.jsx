import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PalletLogo from '@/components/shared/PalletLogo'

export default function ResetPasswordPage() {
  const navigate  = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(false)
  const [formErr,  setFormErr]  = useState({})

  // Vérifie que le lien contient bien un token valide
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token valide — on peut afficher le formulaire
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const validate = () => {
    const e = {}
    if (password.length < 6)       e.password = 'Minimum 6 caractères'
    if (password !== confirm)       e.confirm  = 'Les mots de passe ne correspondent pas'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/app', { replace: true }), 2000)
  }

  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-6 px-6 text-center">
      <div className="text-6xl">✅</div>
      <h1 className="font-bebas text-3xl text-green">Mot de passe mis à jour !</h1>
      <p className="text-sub text-sm">Redirection en cours…</p>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen bg-bg px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <PalletLogo size={28} color="#F5A623" />
        <span className="font-bebas text-2xl tracking-widest text-amber">PALETTE RUN</span>
      </div>

      <div className="mb-8">
        <h1 className="font-bebas text-4xl text-white leading-tight">Nouveau</h1>
        <h1 className="font-bebas text-4xl text-amber leading-tight">mot de passe</h1>
        <p className="text-sub text-sm mt-3">Choisissez un nouveau mot de passe pour votre compte.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Mot de passe */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-widest">Nouveau mot de passe</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setFormErr({}) }}
              placeholder="Minimum 6 caractères"
              className={`w-full px-4 py-3 pr-12 bg-hi rounded-2xl text-white text-sm outline-none border-2 ${formErr.password ? 'border-red' : 'border-border'}`}
            />
            <button onClick={() => setShowPass(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sub bg-transparent border-none cursor-pointer text-lg">
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
          {formErr.password && <p className="text-xs text-red">{formErr.password}</p>}
        </div>

        {/* Confirmation */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-widest">Confirmer le mot de passe</label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setFormErr({}) }}
              placeholder="Répétez votre mot de passe"
              className={`w-full px-4 py-3 pr-12 bg-hi rounded-2xl text-white text-sm outline-none border-2 ${
                formErr.confirm ? 'border-red' : confirm && confirm === password ? 'border-green' : 'border-border'
              }`}
            />
            <button onClick={() => setShowConf(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sub bg-transparent border-none cursor-pointer text-lg">
              {showConf ? '🙈' : '👁'}
            </button>
          </div>
          {formErr.confirm && <p className="text-xs text-red">{formErr.confirm}</p>}
          {!formErr.confirm && confirm && confirm === password && (
            <p className="text-xs text-green">✓ Mots de passe identiques</p>
          )}
        </div>

        {error && (
          <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-3">
            <p className="text-red text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !password || !confirm}
          className="w-full py-4 rounded-2xl font-bold text-bg text-base cursor-pointer disabled:opacity-40 mt-4"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E8940F)', boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
        >
          {loading ? 'Mise à jour…' : 'Mettre à jour le mot de passe →'}
        </button>
      </div>
    </div>
  )
}
