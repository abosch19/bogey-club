import { query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { getMyProfile, resolvePlayer } from './helpers'

type HoleScore = { hole_number: number; strokes: number; par: number }

async function buildActiveRound(ctx: QueryCtx, me: Doc<'profiles'>) {
  const myRps = await ctx.db
    .query('round_players')
    .withIndex('by_profile', (q) => q.eq('profileId', me._id))
    .collect()
  const myRounds = await Promise.all(myRps.map((rp) => ctx.db.get(rp.roundId)))
  const active = myRounds.find((r) => r && r.status === 'active') ?? null
  if (!active) return null

  const course = await ctx.db.get(active.courseId)
  const totalHoles = course?.holes_count ?? 18
  const holes = course
    ? await ctx.db
        .query('holes')
        .withIndex('by_course', (q) => q.eq('courseId', active!.courseId))
        .collect()
    : []
  const scores = (
    await ctx.db
      .query('scores')
      .withIndex('by_round', (q) => q.eq('roundId', active!._id))
      .collect()
  ).filter((s) => s.profileId === me._id)

  const holeScores: HoleScore[] = scores
    .filter((s) => s.strokes != null)
    .map((s) => ({
      hole_number: s.hole_number,
      strokes: s.strokes as number,
      par: holes.find((h) => h.hole_number === s.hole_number)?.par ?? 4,
    }))

  const totalStrokes = holeScores.reduce((a, s) => a + s.strokes, 0)
  const totalPar = holeScores.reduce((a, s) => a + s.par, 0)
  const played = holeScores.map((s) => s.hole_number)
  const nextHole =
    Array.from({ length: totalHoles }, (_, i) => i + 1).find((h) => !played.includes(h)) ?? 1
  const nextPar = holes.find((h) => h.hole_number === nextHole)?.par ?? 4

  return {
    id: active._id,
    course_name: course?.name ?? 'Campo',
    total_holes: totalHoles,
    score_delta: totalStrokes - totalPar,
    holes_played: holeScores.length,
    hole_scores: holeScores,
    next_hole: nextHole,
    next_par: nextPar,
  }
}

async function buildActiveLeague(ctx: QueryCtx, me: Doc<'profiles'>) {
  const memberships = await ctx.db
    .query('league_players')
    .withIndex('by_profile', (q) => q.eq('profileId', me._id))
    .collect()
  const myLeagues = await Promise.all(memberships.map((m) => ctx.db.get(m.leagueId)))
  const league = myLeagues.find((l) => l && l.active) ?? null
  if (!league) return null

  const standings = (
    await ctx.db
      .query('league_standings')
      .withIndex('by_league', (q) => q.eq('leagueId', league!._id))
      .collect()
  ).sort((a, b) => b.total_points - a.total_points)
  const st = await Promise.all(
    standings.slice(0, 5).map(async (s) => {
      const p = await ctx.db.get(s.profileId)
      return {
        profile_id: s.profileId,
        name: p ? [p.name, p.last_name].filter(Boolean).join(' ') : 'J',
        avatar_color: p?.avatar_color ?? '#6b7a72',
        total_points: s.total_points,
      }
    }),
  )
  const jornadas = (
    await ctx.db
      .query('league_rounds')
      .withIndex('by_league', (q) => q.eq('leagueId', league!._id))
      .collect()
  ).length
  const myPos = st.findIndex((s) => s.profile_id === me._id) + 1

  return {
    id: league._id,
    name: league.name,
    round_played: jornadas,
    total_rounds: league.total_rounds,
    my_position: myPos || 1,
    my_points: st.find((s) => s.profile_id === me._id)?.total_points ?? 0,
    top3: st.slice(0, 3),
  }
}

async function buildFeed(ctx: QueryCtx, recent: Doc<'rounds'>[]) {
  const allHoles = await ctx.db.query('holes').collect()
  const holeByCourseAndNumber = new Map(
    allHoles.map((h) => [`${h.courseId}:${h.hole_number}`, h]),
  )
  type FeedItem = {
    id: string
    round_id: Id<'rounds'>
    name: string
    avatar_color: string
    action: string
    detail: string
    time: string
    badge: string | null
  }

  // Each round's feed entry is built independently; Promise.all preserves the
  // original recent[] order. Rounds with no scoring player resolve to null.
  const feedResults = await Promise.all(
    recent.map(async (r): Promise<FeedItem | null> => {
      const [course, rps] = await Promise.all([
        ctx.db.get(r.courseId),
        ctx.db
          .query('round_players')
          .withIndex('by_round', (q) => q.eq('roundId', r._id))
          .collect(),
      ])
      const rp = rps.find((x) => x.profileId)
      if (!rp || !rp.profileId) return null
      const p = await ctx.db.get(rp.profileId)
      const pid = rp.profileId

      const days = Math.floor((Date.now() - new Date(r.date).getTime()) / 86400000)
      const timeStr = days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`

      const playerScores = (
        await ctx.db
          .query('scores')
          .withIndex('by_round', (q) => q.eq('roundId', r._id))
          .collect()
      ).filter((s) => s.profileId === pid)
      const total = playerScores.reduce((a, s) => a + (s.strokes ?? 0), 0)

      let birdieHole: number | null = null
      let eagleHole: number | null = null
      for (const s of playerScores) {
        const holeInfo = holeByCourseAndNumber.get(`${r.courseId}:${s.hole_number}`)
        if (!holeInfo || s.strokes == null) continue
        const delta = s.strokes - holeInfo.par
        if (delta <= -2 && eagleHole === null) eagleHole = s.hole_number
        else if (delta === -1 && birdieHole === null) birdieHole = s.hole_number
      }

      let action = 'completó una ronda'
      let badge: string | null = null
      if (eagleHole !== null) {
        action = `hizo eagle en el hoyo ${eagleHole}`
        badge = '🦅'
      } else if (birdieHole !== null) {
        action = `hizo birdie en el hoyo ${birdieHole}`
        badge = '🐦'
      } else if (total > 0) {
        const allScores = await ctx.db
          .query('scores')
          .withIndex('by_profile', (q) => q.eq('profileId', pid))
          .collect()
        const roundTotals: Record<string, number> = {}
        for (const s of allScores) {
          if (s.strokes == null) continue
          roundTotals[s.roundId] = (roundTotals[s.roundId] ?? 0) + s.strokes
        }
        const pastBests: number[] = []
        for (const [rid, v] of Object.entries(roundTotals)) {
          if (rid !== r._id && v > 0) pastBests.push(v)
        }
        if (pastBests.length > 0 && total <= Math.min(...pastBests)) {
          action = 'batió su récord personal!'
          badge = 'PB'
        }
      }

      return {
        id: r._id + pid,
        round_id: r._id,
        name: p ? [p.name, p.last_name].filter(Boolean).join(' ') : 'Jugador',
        avatar_color: p?.avatar_color ?? '#6b7a72',
        action,
        detail: `${course?.name ?? 'Campo'} · ${timeStr}`,
        time: timeStr,
        badge,
      }
    }),
  )
  const feed = feedResults.filter((item): item is FeedItem => item !== null)
  return feed.slice(0, 4)
}

/** Everything the home screen renders, in one reactive query. */
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const me = await getMyProfile(ctx)
    if (!me) return null

    const completedRounds = (
      await ctx.db
        .query('rounds')
        .withIndex('by_status', (q) => q.eq('status', 'completed'))
        .collect()
    ).sort((a, b) => b._creationTime - a._creationTime)

    const recent = completedRounds.slice(0, 6)

    const myRps = await ctx.db
      .query('round_players')
      .withIndex('by_profile', (q) => q.eq('profileId', me._id))
      .collect()
    const myRoundIds = new Set(myRps.map((rp) => rp.roundId))
    const completedRoundsCount = completedRounds.filter((r) => myRoundIds.has(r._id)).length

    const [activeRound, activeLeague, feed] = [
      await buildActiveRound(ctx, me),
      await buildActiveLeague(ctx, me),
      await buildFeed(ctx, recent),
    ]

    return {
      profile: {
        id: me._id,
        name: [me.name, me.last_name].filter(Boolean).join(' '),
        handicap_index: me.handicap_index,
        avatar_color: me.avatar_color,
      },
      activeRound,
      activeLeague,
      feed,
      completedRoundsCount,
    }
  },
})

/** The 10 most recent completed rounds across all players, newest first. */
export const recentRounds = query({
  args: {},
  handler: async (ctx) => {
    const me = await getMyProfile(ctx)
    if (!me) return []

    const completed = (
      await ctx.db
        .query('rounds')
        .withIndex('by_status', (q) => q.eq('status', 'completed'))
        .collect()
    )
      .sort((a, b) =>
        a.date === b.date ? b._creationTime - a._creationTime : b.date.localeCompare(a.date),
      )
      .slice(0, 10)

    return await Promise.all(
      completed.map(async (r) => {
        const [course, courseHoles] = await Promise.all([
          ctx.db.get(r.courseId),
          ctx.db
            .query('holes')
            .withIndex('by_course', (q) => q.eq('courseId', r.courseId))
            .collect(),
        ])
        const parOf = (hole: number) => courseHoles.find((h) => h.hole_number === hole)?.par ?? 4

        const rps = await ctx.db
          .query('round_players')
          .withIndex('by_round', (q) => q.eq('roundId', r._id))
          .collect()

        const allScores = (
          await ctx.db
            .query('scores')
            .withIndex('by_round', (q) => q.eq('roundId', r._id))
            .collect()
        ).filter((s) => s.strokes != null)

        // Holes that actually have scores, in order — the columns of the card.
        const holeNumbers = [...new Set(allScores.map((s) => s.hole_number))].sort((a, b) => a - b)
        const holes = holeNumbers.map((hn) => ({ hole_number: hn, par: parOf(hn) }))

        const players = await Promise.all(
          rps.map(async (rp) => {
            const info = await resolvePlayer(ctx, rp)
            const ps =
              !rp.is_guest && rp.profileId
                ? allScores.filter((s) => s.profileId === rp.profileId)
                : []
            const holeScores = ps.map((s) => ({
              hole_number: s.hole_number,
              strokes: s.strokes as number,
            }))
            const total = holeScores.length
              ? holeScores.reduce((a, s) => a + s.strokes, 0)
              : null
            const delta = holeScores.length
              ? holeScores.reduce((a, s) => a + (s.strokes - parOf(s.hole_number)), 0)
              : null
            return {
              name: info.name,
              avatar_color: info.avatar_color,
              is_guest: rp.is_guest,
              total,
              delta,
              holes_played: holeScores.length,
              hole_scores: holeScores,
            }
          }),
        )

        // Best score first; players without a score (guests) go last.
        players.sort((a, b) => {
          if (a.total === null) return 1
          if (b.total === null) return -1
          return a.total - b.total
        })

        return {
          id: r._id as Id<'rounds'>,
          course_name: course?.name ?? 'Campo',
          date: r.date,
          is_practice: r.is_practice,
          holes,
          players,
        }
      }),
    )
  },
})
