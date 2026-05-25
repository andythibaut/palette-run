import { useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import PalletLogo from '@/components/shared/PalletLogo'
import { supabase } from '@/lib/supabase'

// ─── Magic Link ───────────────────────────────────────────────────────────────
const MagicLinkForm = ({ onBack }) => {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSend = async () => {
    if (!email.includes('@')) { setError('Email invalide'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://palette-run-psi.vercel.app/auth/callback' },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-6 text-center gap-6">
      <div className="text-7xl">📬</div>
      <div>
        <h1 className="font-bebas text-4xl text-gray-800 leading-tight">Vérifiez</h1>
        <h1 className="font-bebas text-4xl text-amber leading-tight">votre boîte mail</h1>
      </div>
      <p className="text-sub text-sm leading-relaxed">
        Un lien de connexion a été envoyé à <strong className="text-gray-800">{email}</strong>. Cliquez dessus pour accéder à Palette Run.
      </p>
      <div className="bg-amber/10 border border-amber/30 rounded-2xl px-5 py-4 w-full text-left">
        <p className="text-amber text-sm font-semibold mb-1">💡 Astuce</p>
        <p className="text-sub text-xs leading-relaxed">Vérifiez vos spams si vous ne voyez pas l'email dans votre boîte principale.</p>
      </div>
      <button onClick={onBack} className="text-muted text-sm cursor-pointer bg-transparent border-none">
        ← Retour à la connexion
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 p-7 min-h-screen bg-bg">
      <button onClick={onBack} className="text-sub text-2xl self-start leading-none bg-transparent border-none cursor-pointer">←</button>
      <div>
        <h1 className="font-bebas text-4xl text-gray-800 leading-tight">Connexion</h1>
        <h1 className="font-bebas text-4xl text-amber leading-tight">sans mot de passe</h1>
        <p className="text-sub text-sm mt-3 leading-relaxed">Entrez votre email — on vous envoie un lien magique pour vous connecter instantanément.</p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted uppercase tracking-widest">Email</label>
        <input
          type="email" value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="votre@email.com"
          className={`w-full px-4 py-3 bg-white rounded-2xl text-gray-800 text-sm outline-none border-2 ${error ? 'border-red' : 'border-border'}`}
        />
        {error && <p className="text-xs text-red">{error}</p>}
      </div>
      <button
        onClick={handleSend} disabled={loading}
        className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-50"
        style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
      >
        {loading ? 'Envoi…' : 'Envoyer le lien →'}
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const [screen, setScreen] = useState('main')

  if (screen === 'magic') return <MagicLinkForm onBack={() => setScreen('main')} />

  return (
    <div className="flex flex-col min-h-screen bg-bg px-6 pb-10">
      <div className="flex flex-col items-center pt-16 pb-8 gap-3">
        <PalletLogo size={56} color="#F5A623" />
        <h1 className="font-bebas text-4xl tracking-widest text-amber">PALETTE RUN</h1>
        <p className="font-mono text-xs tracking-widest text-muted">BOURSE AUX PALETTES</p>
      </div>

      <div className="flex flex-col gap-3">
        <button onClick={() => setScreen('magic')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-amber text-bg font-bold text-sm cursor-pointer hover:opacity-90"
          style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
        >
          <span className="text-xl w-6 text-center">✨</span>
          <span className="flex-1 text-left">Se connecter</span>
          <span className="text-lg opacity-70">→</span>
        </button>
      </div>

      <p className="text-center text-xs text-muted leading-relaxed mt-auto">
        En continuant, vous acceptez nos{' '}
        <span className="text-amber underline cursor-pointer">CGU</span>
        {' '}et notre{' '}
        <span className="text-amber underline cursor-pointer">Politique de confidentialité</span>
      </p>
    </div>
  )
}
