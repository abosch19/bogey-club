'use node'

import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import webpush from 'web-push'

/** Deliver a Web Push notification to every device of the given profiles.
 *  Silently no-ops until the VAPID env vars are configured on the deployment
 *  (npx convex env set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). */
export const send = internalAction({
  args: {
    profileIds: v.array(v.id('profiles')),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { profileIds, title, body, url }) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) return { sent: 0 }
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:alex@dopelist.com', publicKey, privateKey)

    const subs = await ctx.runQuery(internal.push.forProfiles, { profileIds })
    let sent = 0
    await Promise.all(
      subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title, body, url }),
          )
          sent++
        } catch (err) {
          // 404/410 = the push service says this subscription no longer exists.
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) await ctx.runMutation(internal.push.remove, { endpoint: sub.endpoint })
        }
      }),
    )
    return { sent }
  },
})
