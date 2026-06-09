import { mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { requireProfile } from './helpers'
import { scoreDifferential, countingRounds, calcHandicapIndex, isPitchAndPutt } from '../src/lib/golf'

/**
 * Rebuild every WHS differential for a profile from its completed, non-practice
 * rounds, recompute which ones count, and update the profile's handicap_index.
 * Idempotent — safe to call after finalizing a round or on demand.
 */
export async function recalcProfile(ctx: MutationCtx, profileId: Id<'profiles'>): Promise<number> {
  const rps = await ctx.db
    .query('round_players')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .collect()

  let processed = 0
  for (const rp of rps) {
    if (rp.is_guest) continue
    const round = await ctx.db.get(rp.roundId)
    if (!round || round.status !== 'completed' || round.is_practice) continue
    const course = await ctx.db.get(round.courseId)
    if (!course || !course.slope || !course.course_rating) continue

    const scores = await ctx.db
      .query('scores')
      .withIndex('by_round', (q) => q.eq('roundId', round._id))
      .collect()
    const total = scores
      .filter((s) => s.profileId === profileId)
      .reduce((a, s) => a + (s.strokes ?? 0), 0)
    if (total === 0) continue

    const diff = scoreDifferential(total, course.course_rating, course.slope)
    const existing = await ctx.db
      .query('whs_differentials')
      .withIndex('by_profile_and_round', (q) =>
        q.eq('profileId', profileId).eq('roundId', round._id),
      )
      .unique()
    const data = {
      profileId,
      roundId: round._id,
      adjusted_gross_score: total,
      course_rating: course.course_rating,
      slope: course.slope,
      differential: diff,
      played_at: round.date,
      is_counting: false,
      is_pp: isPitchAndPutt(course.name),
    }
    if (existing) await ctx.db.patch(existing._id, data)
    else await ctx.db.insert('whs_differentials', data)
    processed++
  }

  // Recompute counting differentials + handicap index, separately per type
  // (golf vs Pitch & Putt → independent indices).
  const everyDiff = await ctx.db
    .query('whs_differentials')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .collect()

  // Process one pool (best N of its last 20) and patch the given index field.
  const processPool = async (
    pool: typeof everyDiff,
    field: 'handicap_index' | 'handicap_index_pp',
  ) => {
    const last20 = pool.toSorted((a, b) => (a.played_at < b.played_at ? 1 : -1)).slice(0, 20)
    if (last20.length === 0) return
    const nCount = countingRounds(last20.length)
    const sorted = last20.toSorted((a, b) => a.differential - b.differential)
    const countingIds = new Set(sorted.slice(0, nCount).map((d) => d._id))
    await Promise.all(
      last20.map(async (d) => {
        const counting = countingIds.has(d._id)
        if (d.is_counting !== counting) await ctx.db.patch(d._id, { is_counting: counting })
      }),
    )
    const newIndex = calcHandicapIndex(last20.map((d) => d.differential))
    if (newIndex !== null) await ctx.db.patch(profileId, { [field]: newIndex })
  }

  await processPool(everyDiff.filter((d) => !d.is_pp), 'handicap_index')
  await processPool(everyDiff.filter((d) => d.is_pp), 'handicap_index_pp')

  return processed
}

/** Recalculate WHS for the current user (perfil → "Recalcular WHS"). */
export const recalc = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireProfile(ctx)
    const processed = await recalcProfile(ctx, me._id)
    return { ok: true, rounds_processed: processed }
  },
})
