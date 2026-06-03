import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { scoreDifferential } from '@/lib/golf'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { round_id } = await request.json()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Mark round as completed
  await admin.from('rounds').update({ status: 'completed' }).eq('id', round_id)

  // Get round data for WHS calculation
  const { data: round } = await admin.from('rounds').select('course_id, is_practice, date').eq('id', round_id).single()
  if (!round || round.is_practice) return NextResponse.json({ ok: true })

  const { data: course } = await admin.from('courses').select('slope, course_rating, par').eq('id', round.course_id).single()
  if (!course) return NextResponse.json({ ok: true })

  // Get players and their scores
  const { data: rps } = await admin.from('round_players').select('profile_id').eq('round_id', round_id).eq('is_guest', false)
  for (const rp of rps ?? []) {
    const { data: scores } = await admin.from('scores').select('strokes').eq('round_id', round_id).eq('profile_id', rp.profile_id)
    const total = (scores ?? []).reduce((a, s) => a + (s.strokes ?? 0), 0)
    if (total === 0) continue

    const diff = scoreDifferential(total, course.course_rating, course.slope)

    await admin.from('whs_differentials').insert({
      profile_id: rp.profile_id,
      round_id,
      adjusted_gross_score: total,
      course_rating: course.course_rating,
      slope: course.slope,
      differential: diff,
      played_at: round.date,
    })
  }

  // Update course record if applicable
  const { data: players2 } = await admin.from('round_players').select('profile_id').eq('round_id', round_id).eq('is_guest', false)
  for (const rp of players2 ?? []) {
    const { data: scores } = await admin.from('scores').select('strokes').eq('round_id', round_id).eq('profile_id', rp.profile_id)
    const total = (scores ?? []).reduce((a, s) => a + (s.strokes ?? 0), 0)
    if (total === 0) continue
    const { data: courseData } = await admin.from('courses').select('record_score').eq('id', round.course_id).single()
    if (!courseData?.record_score || total < courseData.record_score) {
      await admin.from('courses').update({ record_score: total, record_holder_id: rp.profile_id, record_date: round.date }).eq('id', round.course_id)
    }
  }

  return NextResponse.json({ ok: true })
}
