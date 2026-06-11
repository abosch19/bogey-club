import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireProfile, resolvePlayer, indexForCourse } from './helpers'
import { courseHandicap } from '../src/lib/golf'

const today = () => new Date().toISOString().split('T')[0]

/** Tournament detail: meta, players, and each group's round (with players). */
export const get = query({
  args: { tournamentId: v.id('tournaments') },
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId)
    if (!tournament) return null
    const [course, players, groups] = await Promise.all([
      ctx.db.get(tournament.courseId),
      ctx.db
        .query('tournament_players')
        .withIndex('by_tournament', q => q.eq('tournamentId', tournamentId))
        .collect(),
      ctx.db
        .query('tournament_groups')
        .withIndex('by_tournament', q => q.eq('tournamentId', tournamentId))
        .collect(),
    ])
    const groupsDetail = await Promise.all(
      groups.map(async g => {
        const rps = await ctx.db
          .query('round_players')
          .withIndex('by_round', q => q.eq('roundId', g.roundId))
          .collect()
        const groupPlayers = await Promise.all(
          rps.map(async rp => ({
            _id: rp._id,
            profileId: rp.profileId ?? null,
            course_handicap: rp.course_handicap,
            ...(await resolvePlayer(ctx, rp)),
          })),
        )
        return { group_number: g.group_number, roundId: g.roundId, players: groupPlayers }
      }),
    )

    // Live scores for every group's round + the shared course layout, aggregated
    // server-side so the client owns the data through this single subscription
    // (no per-group score loaders syncing data up via effects).
    const roundIds = groups.map(g => g.roundId)
    const [scoresByRoundEntries, holeRows] = await Promise.all([
      Promise.all(
        roundIds.map(async roundId => {
          const rows = await ctx.db
            .query('scores')
            .withIndex('by_round', q => q.eq('roundId', roundId))
            .collect()
          const scores = rows.flatMap(s =>
            s.strokes != null && s.profileId != null
              ? [{ profile_id: s.profileId, hole_number: s.hole_number, strokes: s.strokes }]
              : [],
          )
          return [roundId, scores] as const
        }),
      ),
      ctx.db
        .query('holes')
        .withIndex('by_course', q => q.eq('courseId', tournament.courseId))
        .collect(),
    ])
    const scoresByRound = Object.fromEntries(scoresByRoundEntries)
    const holes = holeRows.map(h => ({
      hole_number: h.hole_number,
      par: h.par,
      stroke_index: h.stroke_index,
    }))

    return { tournament, course, players, groups: groupsDetail, scoresByRound, holes }
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    course_id: v.id('courses'),
    mode: v.string(),
    players: v.array(
      v.object({
        id: v.id('profiles'),
        group: v.number(),
        handicap_index: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, { name, course_id, mode, players }) => {
    const me = await requireProfile(ctx)
    const tournamentId = await ctx.db.insert('tournaments', {
      name,
      courseId: course_id,
      mode,
      createdBy: me._id,
      status: 'active',
      date: today(),
    })

    await Promise.all(
      players.map(p =>
        ctx.db.insert('tournament_players', {
          tournamentId,
          profileId: p.id,
          group_number: p.group,
        }),
      ),
    )

    const course = await ctx.db.get(course_id)
    const nGroups = Math.max(...players.map(p => p.group))
    const groupNumbers = Array.from({ length: nGroups }, (_, i) => i + 1)
    await Promise.all(
      groupNumbers.map(async g => {
        const groupPlayers = players.filter(p => p.group === g)
        if (!groupPlayers.length) return
        const roundId = await ctx.db.insert('rounds', {
          courseId: course_id,
          createdBy: me._id,
          status: 'active',
          date: today(),
          is_practice: false,
          notes: 'all',
        })
        await Promise.all([
          ...groupPlayers.map(async p => {
            const prof = await ctx.db.get(p.id)
            const idx = prof ? indexForCourse(prof, course?.name ?? '') : (p.handicap_index ?? 0)
            await ctx.db.insert('round_players', {
              roundId,
              profileId: p.id,
              guestId: null,
              is_guest: false,
              course_handicap: course
                ? courseHandicap(idx, course.slope, course.course_rating, course.par)
                : Math.round(idx),
            })
          }),
          ctx.db.insert('round_modes', { roundId, mode, is_primary: true }),
          ctx.db.insert('round_modes', { roundId, mode: 'stroke', is_primary: false }),
          ctx.db.insert('tournament_groups', {
            tournamentId,
            group_number: g,
            roundId,
          }),
        ])
      }),
    )

    return { tournament_id: tournamentId }
  },
})
