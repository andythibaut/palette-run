import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/shared/LoadingScreen'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset', { replace: true })
        return
      }
      if (event === 'SIGNED_IN' && session) {
        // Vérifie si le profil existe déjà
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          navigate('/onboarding', { replace: true })
        } else if (profile.role === 'driver') {
          navigate('/app', { replace: true })
        } else {
          navigate('/company', { replace: true })
        }
      }
    })
  }, [navigate])

  return <LoadingScreen message="Connexion en cours…" />
}
