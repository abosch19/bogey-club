import { useEffect } from 'react'
import { useConvex, useConvexAuth } from 'convex/react'
import { useSelector } from '@legendapp/state/react'
import { pendingHoles$, flushPendingHoles } from '@/lib/offline-scores'

/** Flushes holes saved offline whenever connectivity may be back: on app
 *  start, on the `online` event, when the PWA returns to the foreground, and
 *  on a slow interval as a safety net for flaky course connections. */
export function OfflineSync() {
  const convex = useConvex()
  const { isAuthenticated } = useConvexAuth()
  const hasPending = useSelector(() => Object.keys(pendingHoles$.get() ?? {}).length > 0)

  useEffect(() => {
    if (!hasPending || !isAuthenticated) return
    const flush = () => { if (navigator.onLine) flushPendingHoles(convex) }
    flush()
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', flush)
    const interval = setInterval(flush, 20_000)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', flush)
      clearInterval(interval)
    }
  }, [hasPending, isAuthenticated, convex])

  return null
}
