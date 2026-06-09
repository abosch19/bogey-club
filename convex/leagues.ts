import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireProfile } from './helpers'

async function standingsFor(ctx: QueryCtx, leagueId: Id<'leagues'>) {
  const rows = await ctx.db
    .query('league_standings')
    .withIndex('by_league', (q) => q.eq('leagueId', leagueId))
    .collect()
  const withProfiles = await Promise.all(
    rows.map(async (s) => {
      const p = await ctx.db.get(s.profileId)
      return {
        profile_id: s.profileId,
        name: p ? [p.name, p.last_name].filter(Boolean).join(' ') : 'Jugador',
        avatar_color: p?.avatar_color ?? '#6b7a72',
        total_points: s.total_points,
        rounds_played: s.rounds_played,
        wins: s.wins,
      }
    }),
  )
  return withProfiles.sort((a, b) => b.total_points - a.total_points)
}

/** Active leagues the current user belongs to, with standings + jornada count. */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx)
    const memberships = await ctx.db
      .query('league_players')
      .withIndex('by_profile', (q) => q.eq('profileId', me._id))
      .collect()
    const out = await Promise.all(
      memberships.map(async (m) => {
        const league = await ctx.db.get(m.leagueId)
        if (!league || !league.active) return null
        const [standings, jornadaRows] = await Promise.all([
          standingsFor(ctx, league._id),
          ctx.db
            .query('league_rounds')
            .withIndex('by_league', (q) => q.eq('leagueId', league._id))
            .collect(),
        ])
        return { league, standings, jornadas: jornadaRows.length, is_admin: m.is_admin }
      }),
    )
    return out.filter((x) => x !== null)
  },
})

export const standings = query({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, { leagueId }) => standingsFor(ctx, leagueId),
})

export const create = mutation({
  args: { name: v.string(), total_rounds: v.number(), mode: v.string() },
  handler: async (ctx, { name, total_rounds, mode }) => {
    const me = await requireProfile(ctx)
    const leagueId = await ctx.db.insert('leagues', {
      name,
      total_rounds,
      mode,
      createdBy: me._id,
      active: true,
    })
    await ctx.db.insert('league_players', { leagueId, profileId: me._id, is_admin: true })
    await ctx.db.insert('league_standings', {
      leagueId,
      profileId: me._id,
      total_points: 0,
      rounds_played: 0,
      wins: 0,
    })
    return { league_id: leagueId }
  },
})

export const remove = mutation({
  args: { league_id: v.id('leagues') },
  handler: async (ctx, { league_id }) => {
    const [me, league] = await Promise.all([requireProfile(ctx), ctx.db.get(league_id)])
    if (!league || league.createdBy !== me._id) throw new Error('Sin permisos')

    await Promise.all(
      (['league_standings', 'league_players', 'league_rounds'] as const).map(async (table) => {
        const rows = await ctx.db
          .query(table)
          .withIndex('by_league', (q) => q.eq('leagueId', league_id))
          .collect()
        await Promise.all(rows.map((r) => ctx.db.delete(r._id)))
      }),
    )
    await ctx.db.delete(league_id)
    return { ok: true }
  },
})
