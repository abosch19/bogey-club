import { v } from 'convex/values'
import { query } from './_generated/server'
import { avatarUrl } from './helpers'

/** All registered players ordered by name (for player selection). Names come composed (first + last). */
export const all = query({
  args: {},
  handler: async ctx => {
    const profiles = await ctx.db.query('profiles').collect()
    return (
      await Promise.all(
        profiles.map(async p => ({
          ...p,
          name: [p.name, p.last_name].filter(Boolean).join(' '),
          avatar_url: await avatarUrl(ctx, p),
        })),
      )
    ).sort((a, b) => a.name.localeCompare(b.name))
  },
})

/** Player directory with completed-round counts, ordered by handicap. */
export const directory = query({
  args: {},
  handler: async ctx => {
    // Pre-compute which rounds are completed.
    const [profiles, rounds] = await Promise.all([ctx.db.query('profiles').collect(), ctx.db.query('rounds').collect()])
    const completed = new Set(rounds.flatMap(r => (r.status === 'completed' ? [r._id] : [])))

    const out = await Promise.all(
      profiles.map(async p => {
        const rps = await ctx.db
          .query('round_players')
          .withIndex('by_profile', q => q.eq('profileId', p._id))
          .collect()
        const rounds_played = rps.filter(rp => completed.has(rp.roundId)).length
        return {
          id: p._id,
          name: [p.name, p.last_name].filter(Boolean).join(' '),
          handicap_index: p.handicap_index,
          rounds_played,
          avatar_url: await avatarUrl(ctx, p),
        }
      }),
    )
    return out.sort((a, b) => a.handicap_index - b.handicap_index)
  },
})

/** Public player view: member-card info plus their last 20 completed rounds. */
export const publicProfile = query({
  args: { profileId: v.id('profiles') },
  handler: async (ctx, { profileId }) => {
    const p = await ctx.db.get(profileId)
    if (!p) return null

    const rps = await ctx.db
      .query('round_players')
      .withIndex('by_profile', q => q.eq('profileId', profileId))
      .collect()

    const holesCache = new Map<string, { hole_number: number; par: number }[]>()
    const allRounds = (
      await Promise.all(
        rps.map(async rp => {
          const r = await ctx.db.get(rp.roundId)
          if (!r || r.status !== 'completed') return null
          const course = await ctx.db.get(r.courseId)
          let courseHoles = holesCache.get(String(r.courseId))
          if (!courseHoles) {
            courseHoles = await ctx.db
              .query('holes')
              .withIndex('by_course', q => q.eq('courseId', r.courseId))
              .collect()
            holesCache.set(String(r.courseId), courseHoles)
          }
          // 9_twice rounds store holes 10-18 against a 9-hole course — wrap around.
          const parOf = (hole: number) =>
            courseHoles!.find(h => h.hole_number === hole)?.par ??
            courseHoles!.find(h => h.hole_number === ((hole - 1) % 9) + 1)?.par ??
            4
          const allScores = (
            await ctx.db
              .query('scores')
              .withIndex('by_round', q => q.eq('roundId', rp.roundId))
              .collect()
          ).filter(s => s.strokes != null)
          const mine = allScores.filter(s => s.profileId === profileId)
          if (mine.length === 0) return null
          const total = mine.reduce((a, s) => a + (s.strokes ?? 0), 0)
          const delta = mine.reduce((a, s) => a + ((s.strokes ?? 0) - parOf(s.hole_number)), 0)
          const totals = [...new Set(allScores.map(s => String(s.profileId)))].flatMap(pid => {
            const t = allScores.filter(s => String(s.profileId) === pid).reduce((a, s) => a + (s.strokes ?? 0), 0)
            return t > 0 ? [t] : []
          })
          const won = totals.length > 1 && total === Math.min(...totals)
          return {
            id: r._id,
            date: r.date,
            creation: r._creationTime,
            course_name: course?.name ?? 'Campo',
            is_practice: r.is_practice,
            total,
            delta,
            won,
          }
        }),
      )
    ).flatMap(r => (r ? [r] : []))

    const rounds = allRounds
      .sort((a, b) => (a.date === b.date ? b.creation - a.creation : b.date.localeCompare(a.date)))
      .slice(0, 20)
      .map(({ creation: _creation, ...r }) => r)

    return {
      id: p._id,
      name: [p.name, p.last_name].filter(Boolean).join(' '),
      avatar_url: await avatarUrl(ctx, p),
      clubs_sponsor_url: p.clubs_sponsor_image ? await ctx.storage.getUrl(p.clubs_sponsor_image) : null,
      handicap_index: p.handicap_index,
      handicap_index_pp: p.handicap_index_pp ?? null,
      member_since: p._creationTime,
      rounds_count: allRounds.length,
      rounds,
    }
  },
})
