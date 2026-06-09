import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { getMyProfile, requireProfile } from './helpers'

/** All active courses, ordered by name. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db.query('courses').collect()
    return courses
      .filter((c) => c.active)
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

/** Active courses + the current user's last 3 totals on each (course selection). */
export const listForNewRound = query({
  args: {},
  handler: async (ctx) => {
    const courses = (await ctx.db.query('courses').collect())
      .filter((c) => c.active)
      .sort((a, b) => a.name.localeCompare(b.name))

    const me = await getMyProfile(ctx)
    const scoresByCourse: Record<string, number[]> = {}
    if (me) {
      const myRps = await ctx.db
        .query('round_players')
        .withIndex('by_profile', (q) => q.eq('profileId', me._id))
        .collect()
      for (const rp of myRps) {
        const round = await ctx.db.get(rp.roundId)
        if (!round || round.status !== 'completed') continue
        const rScores = await ctx.db
          .query('scores')
          .withIndex('by_round', (q) => q.eq('roundId', round._id))
          .collect()
        const total = rScores
          .filter((s) => s.profileId === me._id && s.strokes != null)
          .reduce((a, s) => a + (s.strokes ?? 0), 0)
        if (total === 0) continue
        const key = round.courseId
        if (!scoresByCourse[key]) scoresByCourse[key] = []
        if (scoresByCourse[key].length < 3) scoresByCourse[key].push(total)
      }
    }

    return courses.map((c) => ({ ...c, myScores: scoresByCourse[c._id] ?? [] }))
  },
})

/** A single course with its holes (ordered by hole number). */
export const get = query({
  args: { courseId: v.id('courses') },
  handler: async (ctx, { courseId }) => {
    const course = await ctx.db.get(courseId)
    if (!course) return null
    const holes = await ctx.db
      .query('holes')
      .withIndex('by_course', (q) => q.eq('courseId', courseId))
      .collect()
    holes.sort((a, b) => a.hole_number - b.hole_number)
    return { ...course, holes }
  },
})

/** Edit course name + holes; par is recomputed from the holes. */
export const edit = mutation({
  args: {
    courseId: v.id('courses'),
    name: v.string(),
    holes: v.array(
      v.object({
        holeId: v.id('holes'),
        par: v.number(),
        stroke_index: v.number(),
        distance_m: v.union(v.number(), v.null()),
      }),
    ),
  },
  handler: async (ctx, { courseId, name, holes }) => {
    await requireProfile(ctx)
    const totalPar = holes.reduce((a, h) => a + (h.par ?? 0), 0)
    await ctx.db.patch(courseId, { name, par: totalPar })
    for (const h of holes) {
      await ctx.db.patch(h.holeId, {
        par: h.par,
        stroke_index: h.stroke_index,
        distance_m: h.distance_m,
      })
    }
    return { ok: true }
  },
})
