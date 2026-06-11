import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { getMyProfile, requireProfile } from './helpers'

/** All scores for a round. */
export const forRound = query({
  args: { roundId: v.id('rounds') },
  handler: async (ctx, { roundId }) => {
    return await ctx.db
      .query('scores')
      .withIndex('by_round', q => q.eq('roundId', roundId))
      .collect()
  },
})

/** The current user's recent strokes on a given hole number (for "Tu media"). */
export const myHoleHistory = query({
  args: { hole_number: v.number() },
  handler: async (ctx, { hole_number }) => {
    const me = await getMyProfile(ctx)
    if (!me) return []
    const rows = await ctx.db
      .query('scores')
      .withIndex('by_profile', q => q.eq('profileId', me._id))
      .collect()
    return rows
      .filter(s => s.hole_number === hole_number && s.strokes != null)
      .slice(0, 10)
      .map(s => s.strokes as number)
  },
})

const scoreEntry = v.object({
  profileId: v.id('profiles'),
  strokes: v.union(v.number(), v.null()),
  putts: v.optional(v.union(v.number(), v.null())),
  fairway: v.optional(v.union(v.boolean(), v.null())),
  gir: v.optional(v.union(v.boolean(), v.null())),
  in_bunker: v.optional(v.union(v.boolean(), v.null())),
  penalties: v.optional(v.union(v.number(), v.null())),
})

/** Upsert the scores of one hole for one or more players. */
export const saveHole = mutation({
  args: {
    roundId: v.id('rounds'),
    hole_number: v.number(),
    scores: v.array(scoreEntry),
  },
  handler: async (ctx, { roundId, hole_number, scores }) => {
    await requireProfile(ctx)
    for (const sc of scores) {
      const existing = await ctx.db
        .query('scores')
        .withIndex('by_round_profile_hole', q =>
          q.eq('roundId', roundId).eq('profileId', sc.profileId).eq('hole_number', hole_number),
        )
        .unique()
      const data = {
        roundId,
        profileId: sc.profileId,
        hole_number,
        strokes: sc.strokes,
        putts: sc.putts ?? 0,
        fairway: sc.fairway ?? null,
        gir: sc.gir ?? false,
        in_bunker: sc.in_bunker ?? false,
        penalties: sc.penalties ?? 0,
      }
      if (existing) await ctx.db.patch(existing._id, data)
      else await ctx.db.insert('scores', data)
    }
    return { ok: true }
  },
})
