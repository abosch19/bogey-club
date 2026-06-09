import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { isAdmin } from './helpers'

async function requireAdmin(ctx: Parameters<typeof isAdmin>[0]) {
  if (!(await isAdmin(ctx))) throw new Error('Sin permisos')
}

/** Admin dashboard: all users, leagues (with creator name), courses. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return null
    const users = (await ctx.db.query('profiles').collect()).sort(
      (a, b) => a._creationTime - b._creationTime,
    )
    const leaguesRaw = (await ctx.db.query('leagues').collect()).sort(
      (a, b) => b._creationTime - a._creationTime,
    )
    const leagues = await Promise.all(
      leaguesRaw.map(async (l) => {
        const creator = l.createdBy ? await ctx.db.get(l.createdBy) : null
        return { ...l, creator_name: creator?.name ?? '—' }
      }),
    )
    const courses = (await ctx.db.query('courses').collect()).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    return { users, leagues, courses }
  },
})

/** Admin-only: edit a course's holes (no name/par change). */
export const editCourseHoles = mutation({
  args: {
    holes: v.array(
      v.object({
        holeId: v.id('holes'),
        par: v.number(),
        stroke_index: v.number(),
        distance_m: v.union(v.number(), v.null()),
      }),
    ),
  },
  handler: async (ctx, { holes }) => {
    await requireAdmin(ctx)
    await Promise.all(
      holes.map((h) =>
        ctx.db.patch(h.holeId, {
          par: h.par,
          stroke_index: h.stroke_index,
          distance_m: h.distance_m,
        }),
      ),
    )
    return { ok: true }
  },
})
