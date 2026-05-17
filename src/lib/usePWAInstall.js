import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled,   setIsInstalled]   = useState(false)

  const isIOS        = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
  const isAndroid    = /Android/.test(navigator.userAgent)
  const isMobile     = isIOS || isAndroid
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true

  useEffect(() => {
    if (isStandalone) { setIsInstalled(true); return }

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
    // Visible uniquement sur mobile tant que pas installé
    canInstall:    !isInstalled && isMobile,
    isInstalled,
    isIOS,
    isAndroid,
    hasNativePrompt: !!installPrompt,
    promptInstall,
  }
}
