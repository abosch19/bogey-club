import { ConvexReactClient } from 'convex/react'
import { api } from '@convex/_generated/api'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Where this device stands today, without prompting the user for anything. */
export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

/** VAPID public keys are base64url; PushManager wants the raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** Ask permission, subscribe this device and register it in Convex.
 *  'unavailable' covers dev (no service worker) and a missing VAPID key. */
export async function enablePush(convex: ConvexReactClient): Promise<PushState | 'unavailable'> {
  if (!pushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return 'unavailable'
  const key = await convex.query(api.push.vapidPublicKey)
  if (!key) return 'unavailable'
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
  })
  const { keys } = sub.toJSON()
  if (!keys?.p256dh || !keys?.auth) return 'unavailable'
  await convex.mutation(api.push.subscribe, { endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth })
  return 'on'
}

export async function disablePush(convex: ConvexReactClient): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await convex.mutation(api.push.unsubscribe, { endpoint: sub.endpoint })
    await sub.unsubscribe()
  }
  return 'off'
}
