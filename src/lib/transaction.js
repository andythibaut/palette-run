import { supabase } from './supabase'

// ─── Device ID ────────────────────────────────────────────────────────────────
// Génère ou récupère un ID unique pour cet appareil
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('pr_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('pr_device_id', deviceId)
  }
  return deviceId
}

// Fingerprint basique : navigateur + OS + langue + résolution
export const getDeviceFingerprint = () => {
  const nav = window.navigator
  const screen = window.screen
  const fp = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    nav.hardwareConcurrency,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|')
  // Hash simple
  let hash = 0
  for (let i = 0; i < fp.length; i++) {
    hash = ((hash << 5) - hash) + fp.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// ─── GPS ──────────────────────────────────────────────────────────────────────
export const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('GPS_DRIVER_UNAVAILABLE'))
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    err => reject(new Error('GPS_DRIVER_UNAVAILABLE')),
    { enableHighAccuracy: true, timeout: 10000 }
  )
})

// ─── Messages d'erreur ───────────────────────────────────────────────────────
export const getErrorMessages = async (codes, audience = 'both') => {
  const { data } = await supabase.rpc('get_error_messages', {
    p_codes:    codes,
    p_audience: audience,
  })
  return data || []
}

// Couleurs et icônes selon la sévérité
export const severityStyles = {
  fraud:   { bg: 'bg-red/10',    border: 'border-red/40',    text: 'text-red',    icon: '🚨' },
  error:   { bg: 'bg-red/10',    border: 'border-red/30',    text: 'text-red',    icon: '❌' },
  warning: { bg: 'bg-amber/10',  border: 'border-amber/30',  text: 'text-amber',  icon: '⚠️' },
}

// ─── Validation complète ──────────────────────────────────────────────────────
export const validateTransaction = async ({
  listingId,
  driverId,
  companyId,
  photoUrl = null,
}) => {
  try {
    // 1. Récupère position GPS du chauffeur
    let driverLat = null
    let driverLng = null
    try {
      const pos = await getCurrentPosition()
      driverLat  = pos.lat
      driverLng  = pos.lng
    } catch {
      // GPS indisponible — sera géré côté serveur
    }

    // 2. Récupère device ID + fingerprint
    const driverDeviceId = getDeviceId()
    const driverDeviceFp = getDeviceFingerprint()

    // 3. Appelle la fonction Supabase
    const { data, error } = await supabase.rpc('validate_transaction', {
      p_listing_id:       listingId,
      p_driver_id:        driverId,
      p_company_id:       companyId,
      p_driver_lat:       driverLat,
      p_driver_lng:       driverLng,
      p_driver_device_id: driverDeviceId,
      p_driver_device_fp: driverDeviceFp,
      p_driver_ip:        null,        // récupérée côté serveur
      p_company_device_id: null,       // fournie par le commerçant
      p_company_device_fp: null,
      p_company_ip:        null,
      p_photo_url:         photoUrl,
    })

    if (error) throw error

    // 4. Si des erreurs → récupère les messages formatés
    if (!data.success && data.errors?.length > 0) {
      const messages = await getErrorMessages(data.errors, 'driver')
      return { success: false, messages, isFraud: data.is_fraud }
    }

    return { success: true, transactionId: data.transaction_id, eligibleGuarantee: data.eligible_guarantee }

  } catch (err) {
    return {
      success:  false,
      messages: [{ code: 'TRANSACTION_FAILED', title: 'Transaction impossible', message: err.message, severity: 'error', action: 'Réessayez dans quelques instants.' }],
      isFraud:  false,
    }
  }
}

// ─── Validation côté commerçant ───────────────────────────────────────────────
// Appelée depuis l'app commerçant pour compléter la transaction
export const validateTransactionCompany = async ({
  listingId,
  driverId,
  companyId,
  driverName,  // nom saisi par le commerçant pour identifier le chauffeur
}) => {
  const companyDeviceId = getDeviceId()
  const companyDeviceFp = getDeviceFingerprint()

  const { data, error } = await supabase.rpc('validate_transaction', {
    p_listing_id:        listingId,
    p_driver_id:         driverId,
    p_company_id:        companyId,
    p_driver_lat:        null,    // GPS déjà vérifié à l'étape chauffeur
    p_driver_lng:        null,
    p_driver_device_id:  null,    // déjà stocké
    p_driver_device_fp:  null,
    p_driver_ip:         null,
    p_company_device_id: companyDeviceId,
    p_company_device_fp: companyDeviceFp,
    p_company_ip:        null,
    p_photo_url:         null,
  })

  if (error || !data.success) {
    const codes    = data?.errors || ['TRANSACTION_FAILED']
    const messages = await getErrorMessages(codes, 'company')
    return { success: false, messages, isFraud: data?.is_fraud }
  }

  return { success: true, transactionId: data.transaction_id }
}
