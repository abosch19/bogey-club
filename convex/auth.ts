import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import type { MutationCtx } from './_generated/server'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email + password. Extra `name`/`last_name` fields (sign-up) are captured into the user profile.
    Password({
      profile(params) {
        const profile: { email: string; name?: string; last_name?: string } = {
          email: params.email as string,
        }
        if (typeof params.name === 'string' && params.name) profile.name = params.name
        if (typeof params.last_name === 'string' && params.last_name) profile.last_name = params.last_name
        return profile
      },
    }),
  ],
  callbacks: {
    // Keep a 1:1 `profiles` row per auth user. On first sign-up, re-link a migrated
    // profile (same email, no userId yet) instead of creating a duplicate.
    async afterUserCreatedOrUpdated(rawCtx, { userId, profile }) {
      const ctx = rawCtx as unknown as MutationCtx
      const email = (profile as { email?: string }).email
      const name = (profile as { name?: string }).name
      const last_name = (profile as { last_name?: string }).last_name

      const linked = await ctx.db
        .query('profiles')
        .withIndex('by_userId', q => q.eq('userId', userId))
        .unique()
      if (linked) return

      if (email) {
        const migrated = await ctx.db
          .query('profiles')
          .withIndex('by_email', q => q.eq('email', email))
          .first()
        if (migrated && !migrated.userId) {
          await ctx.db.patch(migrated._id, { userId, ...(last_name && !migrated.last_name ? { last_name } : {}) })
          return
        }
      }

      await ctx.db.insert('profiles', {
        userId,
        email,
        name: name ?? email?.split('@')[0] ?? 'Jugador',
        last_name,
        handicap_index: 54.0,
        handicap_index_pp: 54.0,
      })
    },
  },
})
