import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { getMyProfile, requireProfile, resolvePlayer, indexForCourse } from './helpers'
import { recalcProfile } from './whs'
import { courseHandicap } from '../src/lib/golf'

const today = () => new Date().toISOString().split('T')[0]

/** Full detail of a round: course, holes, players (resolved), scores, modes. */
export const get = query({
  args: { roundId: v.id('rounds') },
  handler: async (ctx, { roundId }) => {
    const round = await ctx.db.get(roundId)
    if (!round) return null
    const course = await ctx.db.get(round.courseId)
    const holes = course
      ? (
          await ctx.db
            .query('holes')
            .withIndex('by_course', q => q.eq('courseId', round.courseId))
            .collect()
        ).sort((a, b) => a.hole_number - b.hole_number)
      : []
    const rps = await ctx.db
      .query('round_players')
      .withIndex('by_round', q => q.eq('roundId', roundId))
      .collect()
    const [players, scores, rawModes] = await Promise.all([
      Promise.all(
        rps.map(async rp => ({
          _id: rp._id,
          profileId: rp.profileId ?? null,
          guestId: rp.guestId ?? null,
          is_guest: rp.is_guest,
          course_handicap: rp.course_handicap,
          ...(await resolvePlayer(ctx, rp)),
        })),
      ),
      ctx.db
        .query('scores')
        .withIndex('by_round', q => q.eq('roundId', roundId))
        .collect(),
      ctx.db
        .query('round_modes')
        .withIndex('by_round', q => q.eq('roundId', roundId))
        .collect(),
    ])
    const modes = rawModes.map(m => m.mode)

    return { round, course, holes, players, scores, modes }
  },
})

/** The id of the current user's active round, if any (tab bar / home). */
export const activeIdForUser = query({
  args: {},
  handler: async ctx => {
    const me = await getMyProfile(ctx)
    if (!me) return null
    const rps = await ctx.db
      .query('round_players')
      .withIndex('by_profile', q => q.eq('profileId', me._id))
      .collect()
    const rounds = await Promise.all(rps.map(rp => ctx.db.get(rp.roundId)))
    return rounds.find(round => round && round.status === 'active')?._id ?? null
  },
})

export const create = mutation({
  args: {
    course_id: v.id('courses'),
    player_ids: v.optional(v.array(v.id('profiles'))),
    guests: v.optional(v.array(v.string())),
    modes: v.optional(v.array(v.string())),
    league_id: v.optional(v.id('leagues')),
    hole_mode: v.optional(v.string()),
    scramble_teams: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const [me, course] = await Promise.all([requireProfile(ctx), ctx.db.get(args.course_id)])

    const roundId = await ctx.db.insert('rounds', {
      courseId: args.course_id,
      createdBy: me._id,
      status: 'active',
      is_practice: false,
      date: today(),
      notes: args.hole_mode ?? 'all',
    })

    const playerIds = args.player_ids ?? []
    const profiles = (await Promise.all(playerIds.map(id => ctx.db.get(id)))).filter(
      (p): p is NonNullable<typeof p> => p !== null,
    )

    // Scramble: store team number (1/2) in course_handicap instead of a handicap.
    const isScramble = (args.modes ?? []).includes('scramble')
    const teamMap: Record<string, number> = {}
    if (isScramble) {
      if (args.scramble_teams) {
        args.scramble_teams.split(',').forEach(entry => {
          const [id, team] = entry.split(':')
          if (id && team) teamMap[id] = parseInt(team)
        })
      } else {
        const idxOf = (p: (typeof profiles)[number]) => (course ? indexForCourse(p, course.name) : p.handicap_index)
        const sorted = profiles.toSorted((a, b) => idxOf(a) - idxOf(b))
        if (sorted.length === 2) sorted.forEach(p => (teamMap[p._id] = 1))
        else sorted.forEach((p, i) => (teamMap[p._id] = i % 2 === 0 ? 1 : 2))
      }
    }

    await Promise.all(
      profiles.map(p =>
        ctx.db.insert('round_players', {
          roundId,
          profileId: p._id,
          guestId: null,
          is_guest: false,
          course_handicap:
            isScramble && teamMap[p._id]
              ? teamMap[p._id]
              : course
                ? courseHandicap(indexForCourse(p, course.name), course.slope, course.course_rating, course.par)
                : Math.round(p.handicap_index),
        }),
      ),
    )

    await Promise.all(
      (args.guests ?? []).map(async g => {
        const [name, hcpStr] = String(g).split(':')
        const hcp = parseFloat(hcpStr) || 18
        const guestId = await ctx.db.insert('guest_players', {
          name: name.trim(),
          handicap_index: hcp,
          createdBy: me._id,
        })
        await ctx.db.insert('round_players', {
          roundId,
          profileId: null,
          guestId,
          is_guest: true,
          course_handicap: course
            ? courseHandicap(hcp, course.slope, course.course_rating, course.par)
            : Math.round(hcp),
        })
      }),
    )

    const modes = args.modes ?? ['stroke']
    await Promise.all(modes.map((mode, i) => ctx.db.insert('round_modes', { roundId, mode, is_primary: i === 0 })))

    if (args.league_id) {
      const last = await ctx.db
        .query('league_rounds')
        .withIndex('by_league', q => q.eq('leagueId', args.league_id!))
        .collect()
      const nextNum = last.reduce((m, lr) => Math.max(m, lr.round_number), 0) + 1
      await ctx.db.insert('league_rounds', {
        leagueId: args.league_id,
        roundId,
        round_number: nextNum,
        played_at: today(),
      })
    }

    return { round_id: roundId }
  },
})

export const finalize = mutation({
  args: { round_id: v.id('rounds') },
  handler: async (ctx, { round_id }) => {
    await requireProfile(ctx)
    const round = await ctx.db.get(round_id)
    if (!round) return { ok: true }
    await ctx.db.patch(round_id, { status: 'completed' })
    if (round.is_practice) return { ok: true }

    const course = await ctx.db.get(round.courseId)
    if (!course) return { ok: true }

    const [rps, scores] = await Promise.all([
      ctx.db
        .query('round_players')
        .withIndex('by_round', q => q.eq('roundId', round_id))
        .collect(),
      ctx.db
        .query('scores')
        .withIndex('by_round', q => q.eq('roundId', round_id))
        .collect(),
    ])

    for (const rp of rps) {
      if (rp.is_guest || !rp.profileId) continue
      const total = scores.filter(s => s.profileId === rp.profileId).reduce((a, s) => a + (s.strokes ?? 0), 0)
      if (total === 0) continue

      // WHS recalculation for this player.
      await recalcProfile(ctx, rp.profileId)

      // Course record.
      const fresh = await ctx.db.get(round.courseId)
      if (fresh && (!fresh.record_score || total < fresh.record_score)) {
        await ctx.db.patch(round.courseId, {
          record_score: total,
          record_holder_id: rp.profileId,
          record_date: round.date,
        })
      }
    }

    return { ok: true }
  },
})

export const setBet = mutation({
  args: { round_id: v.id('rounds'), bet: v.union(v.string(), v.null()) },
  handler: async (ctx, { round_id, bet }) => {
    await requireProfile(ctx)
    await ctx.db.patch(round_id, { notes: bet || null })
    return { ok: true }
  },
})

export const remove = mutation({
  args: { round_id: v.id('rounds') },
  handler: async (ctx, { round_id }) => {
    await requireProfile(ctx)
    const byRound = async (table: 'scores' | 'round_modes' | 'round_players') =>
      ctx.db
        .query(table)
        .withIndex('by_round', q => q.eq('roundId', round_id))
        .collect()

    await Promise.all((await byRound('scores')).map(s => ctx.db.delete(s._id)))
    await Promise.all((await byRound('round_modes')).map(m => ctx.db.delete(m._id)))
    await Promise.all((await byRound('round_players')).map(rp => ctx.db.delete(rp._id)))

    const diffs = await ctx.db
      .query('whs_differentials')
      .filter(q => q.eq(q.field('roundId'), round_id))
      .collect()
    await Promise.all(diffs.map(d => ctx.db.delete(d._id)))

    const tgs = await ctx.db
      .query('tournament_groups')
      .withIndex('by_round', q => q.eq('roundId', round_id))
      .collect()
    await Promise.all(tgs.map(tg => ctx.db.delete(tg._id)))

    const lrs = await ctx.db
      .query('league_rounds')
      .withIndex('by_round', q => q.eq('roundId', round_id))
      .collect()
    await Promise.all(lrs.map(lr => ctx.db.delete(lr._id)))

    await ctx.db.delete(round_id)
    return { ok: true }
  },
})

/** Admin/CLI cleanup: delete a round (even signed competitive ones) with full
 *  fallout — same cascade as `remove`, plus WHS recalc for its players and
 *  clearing the course record when this round produced it. */
export const internalRemove = internalMutation({
  args: { round_id: v.id('rounds') },
  handler: async (ctx, { round_id }) => {
    const round = await ctx.db.get(round_id)
    if (!round) throw new Error('Round not found')
    const rps = await ctx.db
      .query('round_players')
      .withIndex('by_round', q => q.eq('roundId', round_id))
      .collect()
    const profileIds = rps.flatMap(rp => (!rp.is_guest && rp.profileId ? [rp.profileId] : []))

    const byRound = async (table: 'scores' | 'round_modes' | 'round_players') =>
      ctx.db
        .query(table)
        .withIndex('by_round', q => q.eq('roundId', round_id))
        .collect()
    await Promise.all((await byRound('scores')).map(s => ctx.db.delete(s._id)))
    await Promise.all((await byRound('round_modes')).map(m => ctx.db.delete(m._id)))
    await Promise.all((await byRound('round_players')).map(rp => ctx.db.delete(rp._id)))
    const diffs = await ctx.db
      .query('whs_differentials')
      .filter(q => q.eq(q.field('roundId'), round_id))
      .collect()
    await Promise.all(diffs.map(d => ctx.db.delete(d._id)))
    const tgs = await ctx.db
      .query('tournament_groups')
      .withIndex('by_round', q => q.eq('roundId', round_id))
      .collect()
    await Promise.all(tgs.map(tg => ctx.db.delete(tg._id)))
    const lrs = await ctx.db
      .query('league_rounds')
      .withIndex('by_round', q => q.eq('roundId', round_id))
      .collect()
    await Promise.all(lrs.map(lr => ctx.db.delete(lr._id)))
    await ctx.db.delete(round_id)

    // WHS indices rebuild from the players' remaining rounds.
    for (const pid of profileIds) await recalcProfile(ctx, pid)

    // Course record: clear it if this round produced it (same date + a holder who played here).
    const course = await ctx.db.get(round.courseId)
    if (
      course?.record_date === round.date &&
      course.record_holder_id &&
      profileIds.some(p => p === course.record_holder_id)
    ) {
      await ctx.db.patch(round.courseId, { record_score: null, record_holder_id: null, record_date: null })
    }
    return { ok: true, players_recalced: profileIds.length }
  },
})
