import { query } from './_generated/server'
import { getMyProfile } from './helpers'

/**
 * All building blocks the stats page needs, in one query:
 * the user's handicap + WHS history, other players, the user's last 30 completed
 * rounds (with course), every score/other-player/hole/course referenced by them.
 */
export const forUser = query({
  args: {},
  handler: async (ctx) => {
    const me = await getMyProfile(ctx)
    if (!me) return null

    const whsHistory = (
      await ctx.db
        .query('whs_differentials')
        .withIndex('by_profile', (q) => q.eq('profileId', me._id))
        .collect()
    )
      .sort((a, b) => (a.played_at < b.played_at ? -1 : 1))
      .slice(0, 20)
      .map((d) => ({ differential: d.differential, played_at: d.played_at, is_pp: d.is_pp ?? false }))

    const otherPlayers = (await ctx.db.query('profiles').collect()).flatMap((p) =>
      p._id !== me._id
        ? [{ id: p._id, name: p.name, avatar_color: p.avatar_color }]
        : [],
    )

    const myRps = await ctx.db
      .query('round_players')
      .withIndex('by_profile', (q) => q.eq('profileId', me._id))
      .collect()
    const myRoundIds = myRps.map((rp) => rp.roundId)

    const rounds = (
      await Promise.all(myRoundIds.map((id) => ctx.db.get(id)))
    )
      .filter((r): r is NonNullable<typeof r> => r !== null && r.status === 'completed')
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 30)

    const roundIds = new Set(rounds.map((r) => r._id))
    const courseIds = Array.from(new Set(rounds.map((r) => r.courseId)))

    const courses = (await Promise.all(courseIds.map((id) => ctx.db.get(id)))).filter(
      (c): c is NonNullable<typeof c> => c !== null,
    )
    const courseById = new Map(courses.map((c) => [c._id, c]))

    const perRound = await Promise.all(
      rounds.map(async (r) => {
        const [rScores, rPlayers] = await Promise.all([
          ctx.db
            .query('scores')
            .withIndex('by_round', (q) => q.eq('roundId', r._id))
            .collect(),
          ctx.db
            .query('round_players')
            .withIndex('by_round', (q) => q.eq('roundId', r._id))
            .collect(),
        ])
        return { r, rScores, rPlayers }
      }),
    )

    const scores: Array<Record<string, unknown>> = []
    const roundPlayers: Array<{ round_id: string; profile_id: string }> = []
    for (const { r, rScores, rPlayers } of perRound) {
      for (const s of rScores) {
        scores.push({
          round_id: s.roundId,
          profile_id: s.profileId,
          hole_number: s.hole_number,
          strokes: s.strokes,
          putts: s.putts,
          gir: s.gir,
          fairway: s.fairway,
          penalties: s.penalties,
          in_bunker: s.in_bunker,
        })
      }
      for (const rp of rPlayers) {
        if (rp.profileId && rp.profileId !== me._id) {
          roundPlayers.push({ round_id: r._id, profile_id: rp.profileId })
        }
      }
    }

    const perCourse = await Promise.all(
      courseIds.map((cid) =>
        ctx.db
          .query('holes')
          .withIndex('by_course', (q) => q.eq('courseId', cid))
          .collect(),
      ),
    )

    const holes: Array<{ course_id: string; hole_number: number; par: number; stroke_index: number }> = []
    for (const cHoles of perCourse) {
      for (const h of cHoles) {
        holes.push({
          course_id: h.courseId,
          hole_number: h.hole_number,
          par: h.par,
          stroke_index: h.stroke_index,
        })
      }
    }

    return {
      myHandicap: me.handicap_index,
      whsHistory,
      otherPlayers,
      rounds: rounds.map((r) => ({
        id: r._id,
        date: r.date,
        course_id: r.courseId,
        status: r.status,
        course: courseById.get(r.courseId)
          ? { name: courseById.get(r.courseId)!.name, par: courseById.get(r.courseId)!.par }
          : null,
      })),
      scores,
      roundPlayers,
      holes,
      courses: courses.map((c) => ({ id: c._id, par: c.par, record_score: c.record_score ?? null })),
    }
  },
})
