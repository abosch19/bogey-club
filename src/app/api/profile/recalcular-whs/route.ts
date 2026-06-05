import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scoreDifferential, countingRounds, calcHandicapIndex } from '@/lib/golf'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Get all completed, non-practice rounds the user played
  const { data: rps } = await admin
    .from('round_players')
    .select('round_id')
    .eq('profile_id', user.id)
    .eq('is_guest', false)

  if (!rps?.length) return NextResponse.json({ ok: true, message: 'Sin rondas' })

  const roundIds = rps.map((r: any) => r.round_id)

  const { data: rounds } = await admin
    .from('rounds')
    .select('id, course_id, date, is_practice')
    .in('id', roundIds)
    .eq('status', 'completed')
    .eq('is_practice', false)

  if (!rounds?.length) return NextResponse.json({ ok: true, message: 'Sin rondas completadas' })

  // Process each round
  for (const round of rounds) {
    const { data: course } = await admin
      .from('courses')
      .select('slope, course_rating, par')
      .eq('id', round.course_id)
      .single()

    if (!course || !course.slope || !course.course_rating) continue

    const { data: scores } = await admin
      .from('scores')
      .select('strokes')
      .eq('round_id', round.id)
      .eq('profile_id', user.id)

    const total = (scores ?? []).reduce((a: number, s: any) => a + (s.strokes ?? 0), 0)
    if (total === 0) continue

    const diff = scoreDifferential(total, course.course_rating, course.slope)

    // Upsert differential
    await admin.from('whs_differentials').upsert({
      profile_id: user.id,
      round_id: round.id,
      adjusted_gross_score: total,
      course_rating: course.course_rating,
      slope: course.slope,
      differential: diff,
      played_at: round.date,
      is_counting: false,
    }, { onConflict: 'profile_id,round_id' })
  }

  // Now recalculate which diffs count
  const { data: allDiffs } = await admin
    .from('whs_differentials')
    .select('id, differential')
    .eq('profile_id', user.id)
    .order('played_at', { ascending: false })
    .limit(20)

  if (allDiffs && allDiffs.length > 0) {
    const nCount = countingRounds(allDiffs.length)
    const sorted = [...allDiffs].sort((a: any, b: any) => a.differential - b.differential)
    const countingIds = new Set(sorted.slice(0, nCount).map((d: any) => d.id))

    for (const d of allDiffs) {
      await admin
        .from('whs_differentials')
        .update({ is_counting: countingIds.has(d.id) })
        .eq('id', d.id)
    }

    // Recalculate handicap index
    const newIndex = calcHandicapIndex(allDiffs.map((d: any) => d.differential))
    if (newIndex !== null) {
      await admin
        .from('profiles')
        .update({ handicap_index: newIndex })
        .eq('id', user.id)
    }
  }

  return NextResponse.json({ ok: true, rounds_processed: rounds.length })
}
