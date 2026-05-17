import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = 'BKiZli2yqbvsBj6AW2E-qrcXtpH5Q2bj0wz3Ri5KDRUbplfRzEHGyugVRkVrhiIt5BB0LaFH0EYEuSWfmRTuw7A'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const reg = await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    // Sauvegarde la subscription en base
    const { endpoint, keys } = sub.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id:  userId,
      endpoint,
      p256dh:   keys.p256dh,
      auth:     keys.auth,
    }, { onConflict: 'user_id' })

    return true
  } catch (err) {
    console.error('Push subscription error:', err)
    return false
  }
}

export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default', 'granted', 'denied'
}

export async function requestNotificationPermission(userId) {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    return subscribeToPush(userId)
  }
  if (Notification.permission === 'denied') return false
  return subscribeToPush(userId)
}
