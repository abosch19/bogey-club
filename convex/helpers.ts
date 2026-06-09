import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { isPitchAndPutt } from '../src/lib/golf'

export const ADMIN_EMAIL = 's.vallve93@gmail.com'

/** The handicap index that applies on a given course (golf vs Pitch & Putt). */
export function indexForCourse(
  profile: { handicap_index: number; handicap_index_pp?: number },
  courseName: string,
): number {
  return isPitchAndPutt(courseName)
    ? profile.handicap_index_pp ?? profile.handicap_index
    : profile.handicap_index
}

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
    handicap_index: p.handicap_index,
  }
}

/** Resolve the display name for a round_player (registered or guest). */
export async function resolvePlayer(
  ctx: QueryCtx,
  rp: Doc<'round_players'>,
): Promise<{
  name: string
  handicap_index: number
}> {
  if (!rp.is_guest && rp.profileId) {
    const p = await ctx.db.get(rp.profileId as Id<'profiles'>)
    if (p) return { name: [p.name, p.last_name].filter(Boolean).join(' '), handicap_index: p.handicap_index }
  }
  if (rp.guestId) {
    const g = await ctx.db.get(rp.guestId as Id<'guest_players'>)
    if (g) return { name: g.name, handicap_index: g.handicap_index }
  }
  return { name: 'Jugador', handicap_index: 36 }
}
