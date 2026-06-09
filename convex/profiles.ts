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

/** Set a handicap index — for self, or for another player if the caller is admin. */
export const setHandicap = mutation({
  args: { handicap_index: v.number(), profileId: v.optional(v.id('profiles')) },
  handler: async (ctx, { handicap_index, profileId }) => {
    const me = await requireProfile(ctx)
    let target = me._id
    if (profileId && profileId !== me._id) {
      if (!(await isAdmin(ctx))) throw new Error('Sin permisos')
      target = profileId
    }
    await ctx.db.patch(target, { handicap_index })
    return { ok: true }
  },
})
