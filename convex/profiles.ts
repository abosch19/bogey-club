import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { query, mutation } from './_generated/server'
import { getMyProfile, requireProfile, isAdmin, ADMIN_EMAIL } from './helpers'

/** Current user's profile (with email + admin flag), or null. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const profile = await getMyProfile(ctx)
    if (!profile) return null
    let email = profile.email
    if (!email) {
      const userId = await getAuthUserId(ctx)
      if (userId) {
        const user = await ctx.db.get(userId)
        email = user?.email ?? undefined
      }
    }
    return { ...profile, email: email ?? '', is_admin: email === ADMIN_EMAIL }
  },
})

/** WHS differentials for the current user, most recent first (max 20). */
export const myDifferentials = query({
  args: {},
  handler: async (ctx) => {
    const me = await getMyProfile(ctx)
    if (!me) return []
    const diffs = await ctx.db
      .query('whs_differentials')
      .withIndex('by_profile', (q) => q.eq('profileId', me._id))
      .collect()
    return diffs
      .sort((a, b) => (a.played_at < b.played_at ? 1 : -1))
      .slice(0, 20)
      .map((d) => ({ differential: d.differential, played_at: d.played_at, is_counting: d.is_counting }))
  },
})

/** Set a handicap index (golf and/or P&P) — for self, or another player if admin. */
export const setHandicap = mutation({
  args: {
    handicap_index: v.optional(v.number()),
    handicap_index_pp: v.optional(v.number()),
    profileId: v.optional(v.id('profiles')),
  },
  handler: async (ctx, { handicap_index, handicap_index_pp, profileId }) => {
    const me = await requireProfile(ctx)
    let target = me._id
    if (profileId && profileId !== me._id) {
      if (!(await isAdmin(ctx))) throw new Error('Sin permisos')
      target = profileId
    }
    const patch: { handicap_index?: number; handicap_index_pp?: number } = {}
    if (handicap_index !== undefined) patch.handicap_index = handicap_index
    if (handicap_index_pp !== undefined) patch.handicap_index_pp = handicap_index_pp
    if (Object.keys(patch).length > 0) await ctx.db.patch(target, patch)
    return { ok: true }
  },
})

/** Permanently delete the current user's profile and all of their own data. */
export const deleteMe = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx)
    const id = me._id

    // Owned rows reachable by a by_profile index.
    for (const table of ['scores', 'round_players', 'whs_differentials', 'league_players'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_profile', (q) => q.eq('profileId', id))
        .collect()
      for (const r of rows) await ctx.db.delete(r._id)
    }

    // Tables without a by_profile index — scan + filter.
    for (const table of ['league_standings', 'tournament_players'] as const) {
      const rows = await ctx.db
        .query(table)
        .filter((q) => q.eq(q.field('profileId'), id))
        .collect()
      for (const r of rows) await ctx.db.delete(r._id)
    }

    await ctx.db.delete(id)
    return { ok: true }
  },
})
