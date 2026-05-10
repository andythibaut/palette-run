import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import PalletLogo from '@/components/shared/PalletLogo'

// ─── Icônes SSO ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 814 1000" fill="white">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 69 0 126.6 42.8 170.5 42.8 43.8 0 112.5-45.5 190.5-45.5 30.8 0 108.2 2.6 168.1 73.9zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

// ─── Composants ───────────────────────────────────────────────────────────────
const SSOBtn = ({ icon, label, onClick, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.98] ${className}`}
  >
    <span className="w-6 flex items-center justify-center shrink-0">{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    <span className="text-lg opacity-50">→</span>
  </button>
)

const Divider = () => (
  <div className="flex items-center gap-3 my-1">
    <div className="flex-1 h-px bg-border" />
    <span className="text-xs text-muted font-mono">ou</span>
    <div className="flex-1 h-px bg-border" />
  </div>
)

// ─── Écran email ──────────────────────────────────────────────────────────────
const EmailForm = ({ mode, onBack }) => {
  const { signInWithEmail, signUpWithEmail, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [formErr,  setFormErr]  = useState({})

  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)

  const validate = () => {
    const e = {}
    if (!email.includes('@'))                        e.email    = 'Email invalide'
    if (password.length < 6)                         e.password = 'Minimum 6 caractères'
    if (mode === 'signup' && password !== confirm)   e.confirm  = 'Les mots de passe ne correspondent pas'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    clearError()
    if (mode === 'login') {
      const ok = await signInWithEmail(email, password)
      setLoading(false)
      if (ok) navigate('/onboarding')
    } else {
      const ok = await signUpWithEmail(email, password)
      setLoading(false)
      if (ok) setEmailSent(true)
    }
  }

  const handleResend = async () => {
    setResending(true)
    await signUpWithEmail(email, password)
    setResending(false)
  }

  // Écran de confirmation email
  if (emailSent) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-6 text-center gap-6">
      <div className="text-7xl">📬</div>
      <div>
        <h1 className="font-bebas text-4xl text-white leading-tight">Vérifiez</h1>
        <h1 className="font-bebas text-4xl text-amber leading-tight">votre boîte mail</h1>
      </div>
      <p className="text-sub text-sm leading-relaxed">
        Un lien de confirmation a été envoyé à <strong className="text-white">{email}</strong>.
        Cliquez sur le lien pour activer votre compte.
      </p>
      <div className="bg-amber/10 border border-amber/30 rounded-2xl px-5 py-4 w-full text-left">
        <p className="text-amber text-sm font-semibold mb-1">💡 Astuce</p>
        <p className="text-sub text-xs leading-relaxed">Vérifiez vos spams si vous ne voyez pas l'email dans votre boîte principale.</p>
      </div>
      <button onClick={handleResend} disabled={resending}
        className="w-full py-3 rounded-2xl border border-border bg-hi text-white text-sm font-semibold cursor-pointer disabled:opacity-40">
        {resending ? 'Envoi…' : '🔄 Renvoyer l\'email'}
      </button>
      <button onClick={onBack} className="text-muted text-sm cursor-pointer bg-transparent border-none">
        ← Retour à la connexion
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 p-7 min-h-screen bg-bg">
      <button onClick={onBack} className="text-sub text-2xl self-start leading-none bg-transparent border-none cursor-pointer">←</button>
      <div>
        <h1 className="font-bebas text-4xl text-white leading-tight">
          {mode === 'login' ? 'Se connecter' : 'Créer un'}
        </h1>
        <h1 className="font-bebas text-4xl text-amber leading-tight">
          {mode === 'login' ? 'par email' : 'compte'}
        </h1>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted uppercase tracking-widest">Email</label>
        <input
          type="email" value={email}
          onChange={e => { setEmail(e.target.value); setFormErr({}) }}
          placeholder="votre@email.com"
          className={`w-full px-4 py-3 bg-hi rounded-2xl text-white text-sm outline-none border-2 ${formErr.email ? 'border-red' : 'border-border'}`}
        />
        {formErr.email && <p className="text-xs text-red">{formErr.email}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted uppercase tracking-widest">Mot de passe</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'} value={password}
            onChange={e => { setPassword(e.target.value); setFormErr({}) }}
            placeholder={mode === 'login' ? 'Votre mot de passe' : 'Minimum 6 caractères'}
            className={`w-full px-4 py-3 pr-12 bg-hi rounded-2xl text-white text-sm outline-none border-2 ${formErr.password ? 'border-red' : 'border-border'}`}
          />
          <button onClick={() => setShowPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sub bg-transparent border-none cursor-pointer text-lg">
            {showPass ? '🙈' : '👁'}
          </button>
        </div>
        {formErr.password && <p className="text-xs text-red">{formErr.password}</p>}
      </div>
      {mode === 'signup' && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted uppercase tracking-widest">Confirmer le mot de passe</label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'} value={confirm}
              onChange={e => { setConfirm(e.target.value); setFormErr({}) }}
              placeholder="Répétez votre mot de passe"
              className={`w-full px-4 py-3 pr-12 bg-hi rounded-2xl text-white text-sm outline-none border-2 ${formErr.confirm ? 'border-red' : confirm && confirm === password ? 'border-green' : 'border-border'}`}
            />
            <button onClick={() => setShowConf(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sub bg-transparent border-none cursor-pointer text-lg">
              {showConf ? '🙈' : '👁'}
            </button>
          </div>
          {formErr.confirm && <p className="text-xs text-red">{formErr.confirm}</p>}
          {!formErr.confirm && confirm && confirm === password && <p className="text-xs text-green">✓ Mots de passe identiques</p>}
        </div>
      )}
      {error && <p className="text-xs text-red bg-red/10 rounded-xl px-4 py-3">{error}</p>}
      {mode === 'login' && (
        <button className="text-amber text-sm self-end bg-transparent border-none cursor-pointer">Mot de passe oublié ?</button>
      )}
      <button
        onClick={handleSubmit} disabled={loading}
        className="w-full py-4 rounded-2xl bg-amber text-bg font-bold text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
      >
        {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
      </button>
    </div>
  )
}

// ─── Écran téléphone ──────────────────────────────────────────────────────────
const PhoneForm = ({ onBack }) => {
  const { signInWithPhone, verifyOTP, error } = useAuthStore()
  const navigate = useNavigate()
  const [step,    setStep]    = useState('phone') // phone | otp
  const [phone,   setPhone]   = useState('')
  const [otp,     setOtp]     = useState(['','','','','',''])
  const [loading, setLoading] = useState(false)
  const [phoneErr,setPhoneErr]= useState('')

  const handleSendOTP = async () => {
    const clean = phone.replace(/\s/g, '')
    if (clean.length < 10) { setPhoneErr('Numéro invalide'); return }
    setLoading(true)
    const ok = await signInWithPhone('+33' + clean.slice(1))
    setLoading(false)
    if (ok) setStep('otp')
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length < 6) return
    setLoading(true)
    const ok = await verifyOTP('+33' + phone.replace(/\s/g,'').slice(1), code)
    setLoading(false)
    if (ok) navigate('/onboarding')
  }

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus()
  }

  if (step === 'otp') return (
    <div className="flex flex-col gap-6 p-7 min-h-screen bg-bg">
      <button onClick={() => setStep('phone')} className="text-sub text-2xl self-start bg-transparent border-none cursor-pointer">←</button>
      <div>
        <h1 className="font-bebas text-4xl text-white">Vérification</h1>
        <h1 className="font-bebas text-4xl text-amber">du numéro</h1>
        <p className="text-sub text-sm mt-3 leading-relaxed">Code envoyé au <strong className="text-white">{phone}</strong></p>
      </div>
      <div className="flex gap-2 justify-center">
        {otp.map((d, i) => (
          <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`otp-${i-1}`)?.focus() }}
            className={`w-11 h-14 rounded-2xl text-center text-2xl font-bebas bg-hi text-white outline-none border-2 ${d ? 'border-amber' : 'border-border'}`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red text-center">{error}</p>}
      <button onClick={handleVerify} disabled={loading || otp.join('').length < 6}
        className="w-full py-4 rounded-2xl bg-amber text-bg font-bold cursor-pointer disabled:opacity-40"
        style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
      >
        {loading ? 'Vérification…' : 'Vérifier →'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6 p-7 min-h-screen bg-bg">
      <button onClick={onBack} className="text-sub text-2xl self-start bg-transparent border-none cursor-pointer">←</button>
      <div>
        <h1 className="font-bebas text-4xl text-white">Votre numéro</h1>
        <h1 className="font-bebas text-4xl text-amber">de téléphone</h1>
        <p className="text-sub text-sm mt-3">Vous recevrez un code SMS pour vérifier votre numéro.</p>
      </div>
      <div className={`flex items-center bg-hi rounded-2xl overflow-hidden border-2 ${phoneErr ? 'border-red' : 'border-border'}`}>
        <div className="px-4 border-r border-border text-sub text-base h-full flex items-center py-4">🇫🇷 +33</div>
        <input type="tel" inputMode="tel" value={phone} onChange={e => { setPhone(e.target.value); setPhoneErr('') }}
          placeholder="06 12 34 56 78"
          className="flex-1 px-4 py-4 bg-transparent text-white text-base outline-none font-mono"
        />
      </div>
      {phoneErr && <p className="text-xs text-red">{phoneErr}</p>}
      {error && <p className="text-xs text-red">{error}</p>}
      <button onClick={handleSendOTP} disabled={loading}
        className="w-full py-4 rounded-2xl bg-amber text-bg font-bold cursor-pointer disabled:opacity-40"
        style={{ boxShadow: '0 6px 20px rgba(245,166,35,0.4)' }}
      >
        {loading ? 'Envoi…' : 'Envoyer le code →'}
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const { signInWithGoogle, error } = useAuthStore()
  const [mode,   setMode]   = useState('login')
  const [screen, setScreen] = useState('main')

  if (screen === 'email') return <EmailForm mode={mode} onBack={() => setScreen('main')} />

  return (
    <div className="flex flex-col min-h-screen bg-bg px-6 pb-10">
      {/* Logo */}
      <div className="flex flex-col items-center pt-16 pb-8 gap-3">
        <PalletLogo size={56} color="#F5A623" />
        <h1 className="font-bebas text-4xl tracking-widest text-amber">PALETTE RUN</h1>
        <p className="font-mono text-xs tracking-widest text-muted">BOURSE AUX PALETTES</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-hi rounded-2xl p-1 mb-7 border border-border">
        {['login', 'signup'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none ${mode === m ? 'bg-surface text-white' : 'bg-transparent text-muted'}`}
          >
            {m === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      {/* Google */}
      <div className="flex flex-col gap-3 mb-4">
        <SSOBtn icon={<GoogleIcon />} label="Continuer avec Google" onClick={signInWithGoogle} className="bg-white text-gray-900" />
      </div>

      <Divider />

      {/* Email */}
      <div className="flex flex-col gap-3 mb-6">
        <button onClick={() => setScreen('email')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-hi border border-border text-white font-semibold text-sm cursor-pointer hover:opacity-90"
        >
          <span className="text-xl w-6 text-center">✉️</span>
          <span className="flex-1 text-left">Email et mot de passe</span>
          <span className="text-lg text-muted">→</span>
        </button>
      </div>

      {error && <p className="text-xs text-red text-center mb-4">{error}</p>}

      {/* CGU */}
      <p className="text-center text-xs text-muted leading-relaxed mt-auto">
        En continuant, vous acceptez nos{' '}
        <span className="text-amber underline cursor-pointer">CGU</span>
        {' '}et notre{' '}
        <span className="text-amber underline cursor-pointer">Politique de confidentialité</span>
      </p>
    </div>
  )
}
