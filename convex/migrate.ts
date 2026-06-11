import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

// One-off maintenance mutations, run by hand with `npx convex run migrate:<name>`.

/** One-off: set name/last_name on a profile, looked up by email. */
export const setProfileName = internalMutation({
  args: { email: v.string(), name: v.string(), last_name: v.string() },
  handler: async (ctx, { email, name, last_name }) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_email', q => q.eq('email', email))
      .first()
    if (!profile) throw new Error(`No existe perfil con email ${email}`)
    await ctx.db.patch(profile._id, { name, last_name })
    return { ok: true, id: profile._id }
  },
})

/** One-off: flip a round's status (e.g. reopen a signed round for testing/fixes). */
export const setRoundStatus = internalMutation({
  args: { roundId: v.id('rounds'), status: v.union(v.literal('active'), v.literal('completed')) },
  handler: async (ctx, { roundId, status }) => {
    await ctx.db.patch(roundId, { status })
    return { ok: true }
  },
})
