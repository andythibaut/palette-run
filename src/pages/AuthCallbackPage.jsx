import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/shared/LoadingScreen'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleSession = async (session) => {
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!profile) {
        navigate('/onboarding', { replace: true })
      } else if (profile.role === 'driver') {
        navigate('/app', { replace: true })
      } else {
        navigate('/company', { replace: true })
      }
    }

    // Vérification immédiate de la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session)
        return
      }
      // Sinon on écoute le changement d'état
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/auth/reset', { replace: true })
          return
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          handleSession(session)
        }
      })
      return () => subscription.unsubscribe()
    })
  }, [navigate])

  return <LoadingScreen message="Connexion en cours…" />
}
