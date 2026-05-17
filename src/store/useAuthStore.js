import { create } from 'zustand'
import { supabase }                    from '@/lib/supabase'
import { subscribeToPush }             from '@/lib/notifications'

export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,
  error:   null,

  // Initialise la session au démarrage
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      // On attend que le profil soit chargé avant de débloquer l'UI
      // pour éviter le flash vers /onboarding pendant le chargement
      set({ user: session.user })
      await get().fetchProfile(session.user.id)
      set({ loading: false })
    } else {
      set({ loading: false })
    }

    // Écoute les changements d'auth
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        get().fetchProfile(session.user.id)
      } else {
        set({ user: null, profile: null })
      }
    })
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      set({ error: error.message })
      return
    }
    set({ user: { id: userId }, profile: data })
    // Re-subscribe aux push à chaque connexion pour s'assurer que la subscription est en base
    console.log('Notification.permission:', Notification.permission)
    if (data && Notification.permission === 'granted') {
      subscribeToPush(userId)
    }
  },

  // Connexion Google
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) set({ error: error.message })
  },

  // Connexion Apple
  signInWithApple: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) set({ error: error.message })
  },

  // Connexion Facebook
  signInWithFacebook: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) set({ error: error.message })
  },

  // Connexion Email
  signInWithEmail: async (email, password) => {
    set({ error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message })
    return !error
  },

  // Inscription Email
  signUpWithEmail: async (email, password) => {
    set({ error: null })
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) set({ error: error.message })
    return !error
  },

  // Connexion téléphone — envoi OTP
  signInWithPhone: async (phone) => {
    set({ error: null })
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) set({ error: error.message })
    return !error
  },

  // Vérification OTP SMS
  verifyOTP: async (phone, token) => {
    set({ error: null })
    const { error } = await supabase.auth.verifyOtp({
      phone, token, type: 'sms',
    })
    if (error) set({ error: error.message })
    return !error
  },

  // Création du profil après inscription
  createProfile: async ({ role, fullName }) => {
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id:        user.id,
        role,
        full_name: fullName,
        tier:      'free',
      })
      .select()
      .single()

    if (error) { set({ error: error.message }); return false }
    set({ profile: data })
    return true
  },

  // Mise à jour du profil
  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) { set({ error: error.message }); return false }
    set({ profile: data })
    return true
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  clearError: () => set({ error: null }),
}))
