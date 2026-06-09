import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'

export type LastRound = {
  course_id: string
  course_name: string
  player_ids: string[]
  guests: string[]
  modes: string[]
  hole_mode: string
  league_id?: string
  scramble_teams?: unknown
}

/** Last round config, persisted to localStorage for the home quick-start. */
export const lastRound$ = observable<LastRound | null>(null)

syncObservable(lastRound$, {
  persist: { name: 'lastRound', plugin: ObservablePersistLocalStorage },
})
