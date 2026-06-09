import { query } from './_generated/server'

/** All registered players ordered by name (for player selection). */
export const all = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query('profiles').collect()
    return profiles.sort((a, b) => a.name.localeCompare(b.name))
  },
})

/** Player directory with completed-round counts, ordered by handicap. */
export const directory = query({
  args: {},
  handler: async (ctx) => {
    // Pre-compute which rounds are completed.
    const [profiles, rounds] = await Promise.all([
      ctx.db.query('profiles').collect(),
      ctx.db.query('rounds').collect(),
    ])
    const completed = new Set(
      rounds.flatMap((r) => (r.status === 'completed' ? [r._id] : [])),
    )

    const out = await Promise.all(
      profiles.map(async (p) => {
        const rps = await ctx.db
          .query('round_players')
          .withIndex('by_profile', (q) => q.eq('profileId', p._id))
          .collect()
        const rounds_played = rps.filter((rp) => completed.has(rp.roundId)).length
        return {
          id: p._id,
          name: p.name,
          handicap_index: p.handicap_index,
          avatar_color: p.avatar_color,
          rounds_played,
        }
      }),
    )
    return out.sort((a, b) => a.handicap_index - b.handicap_index)
  },
})
