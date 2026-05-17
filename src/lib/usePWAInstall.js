import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled,   setIsInstalled]   = useState(false)

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    // Déjà installée en standalone → rien à faire
    if (isStandalone) { setIsInstalled(true); return }

    // Android : capture le prompt natif
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const promptInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      setInstallPrompt(null)
      return outcome === 'accepted'
    }
    return false
  }

  return {
    // Banner visible tant que pas installé (iOS toujours, Android si prompt dispo)
    canInstall: !isInstalled && (isIOS || !!installPrompt),
    isInstalled,
    isIOS,
    promptInstall,
  }
}
