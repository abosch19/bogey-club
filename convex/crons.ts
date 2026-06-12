import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval('close stale rounds', { hours: 1 }, internal.rounds.closeStale, {})

export default crons
