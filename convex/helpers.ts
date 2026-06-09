import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

export const ADMIN_EMAIL = 's.vallve93@gmail.com'

/** The profile row linked to the currently authenticated user (or null). */
export async function getMyProfile(ctx: QueryCtx): Promise<Doc<'profiles'> | null> {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique()
}

export async function requireProfile(ctx: QueryCtx): Promise<Doc<'profiles'>> {
  const profile = await getMyProfile(ctx)
  if (!profile) throw new Error('No autenticado')
  return profile
}

export async function isAdmin(ctx: QueryCtx): Promise<boolean> {
  const profile = await getMyProfile(ctx)
  return profile?.email === ADMIN_EMAIL
}

/** Minimal public shape for a player (registered or guest). */
export function publicProfile(p: Doc<'profiles'> | null) {
  if (!p) return null
  return {
    id: p._id,
    name: p.name,
    avatar_color: p.avatar_color,
    handicap_index: p.handicap_index,
  }
}

/** Resolve the display name + color for a round_player (registered or guest). */
export async function resolvePlayer(
  ctx: QueryCtx,
  rp: Doc<'round_players'>,
): Promise<{
  name: string
  avatar_color: string
  handicap_index: number
}> {
  if (!rp.is_guest && rp.profileId) {
    const p = await ctx.db.get(rp.profileId as Id<'profiles'>)
    if (p) return { name: p.name, avatar_color: p.avatar_color, handicap_index: p.handicap_index }
  }
  if (rp.guestId) {
    const g = await ctx.db.get(rp.guestId as Id<'guest_players'>)
    if (g) return { name: g.name, avatar_color: '#6b7a72', handicap_index: g.handicap_index }
  }
  return { name: 'Jugador', avatar_color: '#6b7a72', handicap_index: 36 }
}
