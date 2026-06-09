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
    const course = await ctx.db.get(tournament.courseId)
    const players = await ctx.db
      .query('tournament_players')
      .withIndex('by_tournament', (q) => q.eq('tournamentId', tournamentId))
      .collect()
    const groups = await ctx.db
      .query('tournament_groups')
      .withIndex('by_tournament', (q) => q.eq('tournamentId', tournamentId))
      .collect()
    const groupsDetail = await Promise.all(
      groups.map(async (g) => {
        const rps = await ctx.db
          .query('round_players')
          .withIndex('by_round', (q) => q.eq('roundId', g.roundId))
          .collect()
        const groupPlayers = await Promise.all(
          rps.map(async (rp) => ({
            _id: rp._id,
            profileId: rp.profileId ?? null,
            course_handicap: rp.course_handicap,
            ...(await resolvePlayer(ctx, rp)),
          })),
        )
        return { group_number: g.group_number, roundId: g.roundId, players: groupPlayers }
      }),
    )
    return { tournament, course, players, groups: groupsDetail }
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

    for (const p of players) {
      await ctx.db.insert('tournament_players', {
        tournamentId,
        profileId: p.id,
        group_number: p.group,
      })
    }

    const course = await ctx.db.get(course_id)
    const nGroups = Math.max(...players.map((p) => p.group))
    for (let g = 1; g <= nGroups; g++) {
      const groupPlayers = players.filter((p) => p.group === g)
      if (!groupPlayers.length) continue
      const roundId = await ctx.db.insert('rounds', {
        courseId: course_id,
        createdBy: me._id,
        status: 'active',
        date: today(),
        is_practice: false,
        notes: 'all',
      })
      for (const p of groupPlayers) {
        const prof = await ctx.db.get(p.id)
        const idx = prof ? indexForCourse(prof, course?.name ?? '') : p.handicap_index ?? 0
        await ctx.db.insert('round_players', {
          roundId,
          profileId: p.id,
          guestId: null,
          is_guest: false,
          course_handicap: course
            ? courseHandicap(idx, course.slope, course.course_rating, course.par)
            : Math.round(idx),
        })
      }
      await ctx.db.insert('round_modes', { roundId, mode, is_primary: true })
      await ctx.db.insert('round_modes', { roundId, mode: 'stroke', is_primary: false })
      await ctx.db.insert('tournament_groups', {
        tournamentId,
        group_number: g,
        roundId,
      })
    }

    return { tournament_id: tournamentId }
  },
})
