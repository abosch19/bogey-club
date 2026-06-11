import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireProfile, indexForCourse } from './helpers'
import { courseHandicap } from '../src/lib/golf'

/**
 * Add (or update the handicap of) a registered player in a round.
 * If course_handicap is omitted it is computed from the player's index and the
 * round's course.
 */
export const add = mutation({
  args: {
    roundId: v.id('rounds'),
    profileId: v.id('profiles'),
    course_handicap: v.optional(v.number()),
  },
  handler: async (ctx, { roundId, profileId, course_handicap }) => {
    await requireProfile(ctx)

    let hcp = course_handicap
    if (hcp == null) {
      const profile = await ctx.db.get(profileId)
      const round = await ctx.db.get(roundId)
      const course = round ? await ctx.db.get(round.courseId) : null
      if (profile && course) {
        hcp = courseHandicap(indexForCourse(profile, course.name), course.slope, course.course_rating, course.par)
      } else if (profile) {
        hcp = Math.round(profile.handicap_index)
      }
    }

    const existing = await ctx.db
      .query('round_players')
      .withIndex('by_round_and_profile', q => q.eq('roundId', roundId).eq('profileId', profileId))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { course_handicap: hcp ?? 0 })
    } else {
      await ctx.db.insert('round_players', {
        roundId,
        profileId,
        guestId: null,
        is_guest: false,
        course_handicap: hcp ?? 0,
      })
    }
    return { ok: true }
  },
})

/** Remove a registered player (and their scores) from a round. */
export const remove = mutation({
  args: { roundId: v.id('rounds'), profileId: v.id('profiles') },
  handler: async (ctx, { roundId, profileId }) => {
    await requireProfile(ctx)
    const scores = await ctx.db
      .query('scores')
      .withIndex('by_round', q => q.eq('roundId', roundId))
      .collect()
    await Promise.all(scores.flatMap(s => (s.profileId === profileId ? [ctx.db.delete(s._id)] : [])))
    const rps = await ctx.db
      .query('round_players')
      .withIndex('by_round_and_profile', q => q.eq('roundId', roundId).eq('profileId', profileId))
      .collect()
    await Promise.all(rps.map(rp => ctx.db.delete(rp._id)))
    return { ok: true }
  },
})
