import { v } from 'convex/values'
import { query, mutation, internalQuery, internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { requireProfile } from './helpers'

/** Public VAPID key the browser needs to subscribe; null until configured. */
export const vapidPublicKey = query({
  args: {},
  handler: async () => process.env.VAPID_PUBLIC_KEY ?? null,
})

/** Register (or re-own) this device's push subscription for the current user. */
export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, args) => {
    const me = await requireProfile(ctx)
    const existing = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_endpoint', q => q.eq('endpoint', args.endpoint))
      .unique()
    if (existing) await ctx.db.patch(existing._id, { profileId: me._id, p256dh: args.p256dh, auth: args.auth })
    else await ctx.db.insert('push_subscriptions', { profileId: me._id, ...args })
    return { ok: true }
  },
})

export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    await requireProfile(ctx)
    const existing = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_endpoint', q => q.eq('endpoint', endpoint))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
    return { ok: true }
  },
})

export const forProfiles = internalQuery({
  args: { profileIds: v.array(v.id('profiles')) },
  handler: async (ctx, { profileIds }) => {
    const lists = await Promise.all(
      profileIds.map(id =>
        ctx.db
          .query('push_subscriptions')
          .withIndex('by_profile', q => q.eq('profileId', id))
          .collect(),
      ),
    )
    return lists.flat().map(s => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }))
  },
})

/** Used by the send action to drop subscriptions the push service reports dead. */
export const remove = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db
      .query('push_subscriptions')
      .withIndex('by_endpoint', q => q.eq('endpoint', endpoint))
      .unique()
    if (existing) await ctx.db.delete(existing._id)
  },
})

/** Fire-and-forget a notification to some profiles from inside a mutation.
 *  Scheduled as a separate action, so a push failure never fails the caller. */
export async function notifyProfiles(
  ctx: MutationCtx,
  profileIds: Id<'profiles'>[],
  payload: { title: string; body: string; url?: string },
) {
  if (profileIds.length === 0) return
  await ctx.scheduler.runAfter(0, internal.pushNode.send, { profileIds, ...payload })
}
