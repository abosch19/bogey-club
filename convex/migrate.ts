import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { recalcProfile } from './whs'

// One-off data migration from Supabase. The `data` payload is produced by
// scripts/migrate-from-supabase.mjs and contains one array per Postgres table
// (rows keep their original UUIDs in `id` / `*_id`).

const num = (x: unknown, d = 0) => (x == null ? d : Number(x))
const str = (x: unknown, d = '') => (x == null ? d : String(x))
const bool = (x: unknown, d = false) => (x == null ? d : Boolean(x))
const nOrNull = (x: unknown) => (x == null ? null : Number(x))
const sOrNull = (x: unknown) => (x == null ? null : String(x))

type Rows = Record<string, any>[]
type Payload = Record<string, Rows>

/** Delete every domain document (keeps auth users). Use before a clean re-import. */
export const wipeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      'whs_differentials', 'scores', 'round_modes', 'round_players', 'league_rounds',
      'league_standings', 'league_players', 'leagues', 'tournament_groups',
      'tournament_players', 'tournaments', 'guest_players', 'rounds', 'holes', 'courses',
    ] as const
    for (const t of tables) {
      for (const row of await ctx.db.query(t).collect()) await ctx.db.delete(row._id)
    }
    // Detach migrated profiles that were never linked to an auth account.
    for (const p of await ctx.db.query('profiles').collect()) {
      if (p.supabaseId && !p.userId) await ctx.db.delete(p._id)
    }
    return { ok: true }
  },
})

async function findBySupabaseId(
  ctx: MutationCtx,
  table: 'courses' | 'profiles' | 'holes' | 'rounds' | 'round_players' | 'guest_players' | 'leagues' | 'tournaments',
  supabaseId: string,
): Promise<{ _id: any } | null> {
  return await (ctx.db.query(table) as any)
    .withIndex('by_supabaseId', (q: any) => q.eq('supabaseId', supabaseId))
    .first()
}

export const importAll = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const p = data as Payload
    const counts: Record<string, number> = {}
    const bump = (k: string) => (counts[k] = (counts[k] ?? 0) + 1)

    const courseMap = new Map<string, Id<'courses'>>()
    const profileMap = new Map<string, Id<'profiles'>>()
    const guestMap = new Map<string, Id<'guest_players'>>()
    const roundMap = new Map<string, Id<'rounds'>>()
    const leagueMap = new Map<string, Id<'leagues'>>()
    const tournamentMap = new Map<string, Id<'tournaments'>>()

    // 1. Courses (record_holder_id patched at the end, once profiles exist).
    for (const c of p.courses ?? []) {
      const existing = await findBySupabaseId(ctx, 'courses', c.id)
      if (existing) { courseMap.set(c.id, existing._id); continue }
      const id = await ctx.db.insert('courses', {
        name: str(c.name), location: sOrNull(c.location),
        holes_count: num(c.holes_count, 18), slope: num(c.slope, 113),
        course_rating: num(c.course_rating, 72), par: num(c.par, 72),
        active: bool(c.active, true), record_score: nOrNull(c.record_score),
        record_holder_id: null, record_date: sOrNull(c.record_date),
        supabaseId: c.id,
      })
      courseMap.set(c.id, id); bump('courses')
    }

    // 2. Profiles (email merged in by the export script; no auth link yet).
    for (const pr of p.profiles ?? []) {
      const existing = await findBySupabaseId(ctx, 'profiles', pr.id)
      if (existing) { profileMap.set(pr.id, existing._id); continue }
      const id = await ctx.db.insert('profiles', {
        name: str(pr.name, 'Jugador'), email: pr.email ? str(pr.email) : undefined,
        handicap_index: num(pr.handicap_index, 54), avatar_color: str(pr.avatar_color, '#2a6fdb'),
        supabaseId: pr.id,
      })
      profileMap.set(pr.id, id); bump('profiles')
    }

    // 3. Guest players.
    for (const g of p.guest_players ?? []) {
      const existing = await findBySupabaseId(ctx, 'guest_players', g.id)
      if (existing) { guestMap.set(g.id, existing._id); continue }
      const id = await ctx.db.insert('guest_players', {
        name: str(g.name), handicap_index: num(g.handicap_index, 18),
        createdBy: g.created_by ? profileMap.get(g.created_by) ?? null : null,
        supabaseId: g.id,
      })
      guestMap.set(g.id, id); bump('guest_players')
    }

    // 4. Holes.
    for (const h of p.holes ?? []) {
      const courseId = courseMap.get(h.course_id)
      if (!courseId) continue
      const existing = await findBySupabaseId(ctx, 'holes', h.id)
      if (existing) continue
      await ctx.db.insert('holes', {
        courseId, hole_number: num(h.hole_number), par: num(h.par, 4),
        stroke_index: num(h.stroke_index), distance_m: nOrNull(h.distance_m), supabaseId: h.id,
      })
      bump('holes')
    }

    // 5. Rounds.
    for (const r of p.rounds ?? []) {
      const courseId = courseMap.get(r.course_id)
      if (!courseId) continue
      const existing = await findBySupabaseId(ctx, 'rounds', r.id)
      if (existing) { roundMap.set(r.id, existing._id); continue }
      const id = await ctx.db.insert('rounds', {
        courseId, date: str(r.date, new Date().toISOString().split('T')[0]),
        status: r.status === 'completed' ? 'completed' : 'active',
        createdBy: r.created_by ? profileMap.get(r.created_by) ?? null : null,
        is_practice: bool(r.is_practice), notes: sOrNull(r.notes), supabaseId: r.id,
      })
      roundMap.set(r.id, id); bump('rounds')
    }

    // 6. Round players.
    for (const rp of p.round_players ?? []) {
      const roundId = roundMap.get(rp.round_id)
      if (!roundId) continue
      const existing = await findBySupabaseId(ctx, 'round_players', rp.id)
      if (existing) continue
      await ctx.db.insert('round_players', {
        roundId,
        profileId: rp.profile_id ? profileMap.get(rp.profile_id) ?? null : null,
        guestId: rp.guest_id ? guestMap.get(rp.guest_id) ?? null : null,
        is_guest: bool(rp.is_guest), course_handicap: num(rp.course_handicap), supabaseId: rp.id,
      })
      bump('round_players')
    }

    // 7. Scores (idempotent by round+profile+hole; no supabaseId field).
    for (const s of p.scores ?? []) {
      const roundId = roundMap.get(s.round_id)
      const profileId = s.profile_id ? profileMap.get(s.profile_id) : undefined
      if (!roundId || !profileId) continue
      const existing = await ctx.db
        .query('scores')
        .withIndex('by_round_profile_hole', (q) =>
          q.eq('roundId', roundId).eq('profileId', profileId).eq('hole_number', num(s.hole_number)),
        )
        .unique()
      if (existing) continue
      await ctx.db.insert('scores', {
        roundId, profileId, hole_number: num(s.hole_number),
        strokes: nOrNull(s.strokes), putts: nOrNull(s.putts),
        fairway: s.fairway == null ? null : Boolean(s.fairway),
        gir: s.gir == null ? null : Boolean(s.gir),
        penalties: nOrNull(s.penalties), in_bunker: s.in_bunker == null ? null : Boolean(s.in_bunker),
      })
      bump('scores')
    }

    // 8. Round modes.
    for (const m of p.round_modes ?? []) {
      const roundId = roundMap.get(m.round_id)
      if (!roundId) continue
      await ctx.db.insert('round_modes', {
        roundId, mode: str(m.mode, 'stroke'), is_primary: bool(m.is_primary), supabaseId: m.id,
      })
      bump('round_modes')
    }

    // 9. Leagues.
    for (const l of p.leagues ?? []) {
      const existing = await findBySupabaseId(ctx, 'leagues', l.id)
      if (existing) { leagueMap.set(l.id, existing._id); continue }
      const id = await ctx.db.insert('leagues', {
        name: str(l.name), createdBy: l.created_by ? profileMap.get(l.created_by) ?? null : null,
        total_rounds: num(l.total_rounds, 10), mode: str(l.mode, 'stableford'),
        active: bool(l.active, true), supabaseId: l.id,
      })
      leagueMap.set(l.id, id); bump('leagues')
    }

    // 10. League players / standings / rounds.
    for (const lp of p.league_players ?? []) {
      const leagueId = leagueMap.get(lp.league_id)
      const profileId = lp.profile_id ? profileMap.get(lp.profile_id) : undefined
      if (!leagueId || !profileId) continue
      await ctx.db.insert('league_players', {
        leagueId, profileId, is_admin: bool(lp.is_admin),
      })
      bump('league_players')
    }
    for (const ls of p.league_standings ?? []) {
      const leagueId = leagueMap.get(ls.league_id)
      const profileId = ls.profile_id ? profileMap.get(ls.profile_id) : undefined
      if (!leagueId || !profileId) continue
      await ctx.db.insert('league_standings', {
        leagueId, profileId, total_points: num(ls.total_points), rounds_played: num(ls.rounds_played),
        wins: num(ls.wins),
      })
      bump('league_standings')
    }
    for (const lr of p.league_rounds ?? []) {
      const leagueId = leagueMap.get(lr.league_id)
      const roundId = roundMap.get(lr.round_id)
      if (!leagueId || !roundId) continue
      await ctx.db.insert('league_rounds', {
        leagueId, roundId, round_number: num(lr.round_number, 1),
        played_at: str(lr.played_at, new Date().toISOString().split('T')[0]),
      })
      bump('league_rounds')
    }

    // 11. Tournaments.
    for (const t of p.tournaments ?? []) {
      const courseId = courseMap.get(t.course_id)
      if (!courseId) continue
      const existing = await findBySupabaseId(ctx, 'tournaments', t.id)
      if (existing) { tournamentMap.set(t.id, existing._id); continue }
      const id = await ctx.db.insert('tournaments', {
        name: str(t.name), courseId, mode: str(t.mode, 'stroke'),
        createdBy: t.created_by ? profileMap.get(t.created_by) ?? null : null,
        status: str(t.status, 'active'), date: str(t.date, new Date().toISOString().split('T')[0]),
        supabaseId: t.id,
      })
      tournamentMap.set(t.id, id); bump('tournaments')
    }
    for (const tp of p.tournament_players ?? []) {
      const tournamentId = tournamentMap.get(tp.tournament_id)
      if (!tournamentId) continue
      await ctx.db.insert('tournament_players', {
        tournamentId, profileId: tp.profile_id ? profileMap.get(tp.profile_id) ?? null : null,
        group_number: num(tp.group_number, 1),
      })
      bump('tournament_players')
    }
    for (const tg of p.tournament_groups ?? []) {
      const tournamentId = tournamentMap.get(tg.tournament_id)
      const roundId = roundMap.get(tg.round_id)
      if (!tournamentId || !roundId) continue
      await ctx.db.insert('tournament_groups', {
        tournamentId, group_number: num(tg.group_number, 1), roundId,
      })
      bump('tournament_groups')
    }

    // 12. Patch course records now that profiles exist.
    for (const c of p.courses ?? []) {
      if (!c.record_holder_id) continue
      const courseId = courseMap.get(c.id)
      const holderId = profileMap.get(c.record_holder_id)
      if (courseId && holderId) await ctx.db.patch(courseId, { record_holder_id: holderId })
    }

    // 13. Rebuild WHS differentials from migrated scores for every profile.
    for (const profileId of Array.from(profileMap.values())) {
      await recalcProfile(ctx, profileId)
    }

    return { ok: true, counts }
  },
})
