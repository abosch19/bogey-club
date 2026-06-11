import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'
import { ConvexReactClient } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'

export type PendingScore = {
  profileId: Id<'profiles'>
  strokes: number | null
  putts: number | null
  fairway: boolean | null
  gir: boolean
  in_bunker: boolean
  penalties: number
}

export type PendingHole = {
  roundId: string
  hole_number: number
  scores: PendingScore[]
  queuedAt: number
  /** Times the server rejected this entry (not network failures). */
  failures?: number
}

/** Holes saved without connection, keyed by `${roundId}:${hole}`. Persisted to
 *  localStorage so they survive iOS killing the PWA, then flushed by OfflineSync.
 *  Re-saving the same hole replaces its entry (last write wins). */
export const pendingHoles$ = observable<Record<string, PendingHole>>({})

syncObservable(pendingHoles$, {
  persist: { name: 'pendingHoles', plugin: ObservablePersistLocalStorage },
})

const keyOf = (roundId: string, hole_number: number) => `${roundId}:${hole_number}`

export function enqueuePendingHole(roundId: string, hole_number: number, scores: PendingScore[]) {
  pendingHoles$[keyOf(roundId, hole_number)].set({ roundId, hole_number, scores, queuedAt: Date.now() })
}

export function clearPendingHole(roundId: string, hole_number: number) {
  pendingHoles$[keyOf(roundId, hole_number)].delete()
}

export function pendingForRound(pending: Record<string, PendingHole>, roundId: string): PendingHole[] {
  return Object.values(pending ?? {}).filter(p => p && p.roundId === roundId)
}

/** Rejects after `ms` with Error('timeout'). A Convex mutation issued while
 *  offline never rejects — it waits in memory for the reconnect — so without
 *  this the save button would hang forever. The underlying mutation keeps
 *  running; if it eventually lands, saveHole is an upsert so the replay from
 *  the pending queue writes the same data again harmlessly. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      v => {
        clearTimeout(t)
        resolve(v)
      },
      e => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

let flushing = false

/** How many server rejections before an entry is given up as unsendable. */
const MAX_FAILURES = 5

/** Push queued holes to Convex, oldest first. A timeout means we are still
 *  offline, so the whole flush stops and OfflineSync retries later. A server
 *  rejection is deterministic (bad payload, deleted round) — retrying cannot
 *  succeed, so the entry gets a strike and is dropped after MAX_FAILURES
 *  instead of blocking the queue and retrying forever. */
export async function flushPendingHoles(client: ConvexReactClient) {
  if (flushing) return
  flushing = true
  try {
    const entries = Object.values(pendingHoles$.get() ?? {})
      .filter((p): p is PendingHole => !!p)
      .toSorted((a, b) => a.queuedAt - b.queuedAt)
    for (const p of entries) {
      try {
        await withTimeout(
          client.mutation(api.scores.saveHole, {
            roundId: p.roundId as Id<'rounds'>,
            hole_number: p.hole_number,
            scores: p.scores,
          }),
          8000,
        )
        clearPendingHole(p.roundId, p.hole_number)
      } catch (err) {
        if (err instanceof Error && err.message === 'timeout') break
        const failures = (p.failures ?? 0) + 1
        if (failures >= MAX_FAILURES) clearPendingHole(p.roundId, p.hole_number)
        else pendingHoles$[keyOf(p.roundId, p.hole_number)].failures.set(failures)
      }
    }
  } finally {
    flushing = false
  }
}
