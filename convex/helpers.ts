import { getAuthUserId } from '@convex-dev/auth/server'
import type { QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { courseKind, type CourseKind } from '../src/lib/golf'

export const ADMIN_EMAIL = 's.vallve93@gmail.com'

/** The handicap index that applies on a given course (golf vs Pitch & Putt). */
export function indexForCourse(
  profile: { handicap_index: number; handicap_index_pp?: number },
  course: { name: string; type?: CourseKind | null },
): number {
  return courseKind(course) === 'pp' ? (profile.handicap_index_pp ?? profile.handicap_index) : profile.handicap_index
}

/** The profile row linked to the currently authenticated user (or null). */
export async function getMyProfile(ctx: QueryCtx): Promise<Doc<'profiles'> | null> {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  return await ctx.db
    .query('profiles')
    .withIndex('by_userId', q => q.eq('userId', userId))
    .unique()
}

export async function requireProfile(ctx: QueryCtx): Promise<Doc<'profiles'>> {
  const profile = await getMyProfile(ctx)
  if (!profile) throw new Error('No autenticado')
  return profile
}

/** Round access guard: the caller must be its creator or one of its players.
 *  Returns the round plus the registered players' profile ids, so callers can
 *  also validate per-player payloads (e.g. saveHole). */
export async function requireRoundAccess(
  ctx: QueryCtx,
  roundId: Id<'rounds'>,
): Promise<{ me: Doc<'profiles'>; round: Doc<'rounds'>; memberIds: Set<Id<'profiles'>> }> {
  const me = await requireProfile(ctx)
  const round = await ctx.db.get(roundId)
  if (!round) throw new Error('La ronda no existe')
  const rps = await ctx.db
    .query('round_players')
    .withIndex('by_round', q => q.eq('roundId', roundId))
    .collect()
  const memberIds = new Set(rps.flatMap(rp => (rp.profileId ? [rp.profileId] : [])))
  if (round.createdBy !== me._id && !memberIds.has(me._id)) throw new Error('No participas en esta ronda')
  return { me, round, memberIds }
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
/** Serve URL for a profile's avatar photo, or null when none is set. */
export async function avatarUrl(ctx: QueryCtx, p: Doc<'profiles'> | null): Promise<string | null> {
  return p?.avatar_image ? await ctx.storage.getUrl(p.avatar_image) : null
}

export async function resolvePlayer(
  ctx: QueryCtx,
  rp: Doc<'round_players'>,
): Promise<{
  name: string
  handicap_index: number
  avatar_url: string | null
}> {
  if (!rp.is_guest && rp.profileId) {
    const p = await ctx.db.get(rp.profileId as Id<'profiles'>)
    if (p)
      return {
        name: [p.name, p.last_name].filter(Boolean).join(' '),
        handicap_index: p.handicap_index,
        avatar_url: await avatarUrl(ctx, p),
      }
  }
  if (rp.guestId) {
    const g = await ctx.db.get(rp.guestId as Id<'guest_players'>)
    if (g) return { name: g.name, handicap_index: g.handicap_index, avatar_url: null }
  }
  return { name: 'Jugador', handicap_index: 36, avatar_url: null }
}
