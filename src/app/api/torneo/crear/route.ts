import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { name, course_id, mode, players } = await request.json()
  // players: [{ id, group, handicap_index, course_handicap, ... }]

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // 1. Create tournament
  const { data: tournament, error } = await admin
    .from('tournaments')
    .insert({ name, course_id, mode, created_by: user.id, status: 'active', date: new Date().toISOString().split('T')[0] })
    .select('id')
    .single()

  if (error || !tournament) return NextResponse.json({ error: error?.message }, { status: 500 })

  // 2. Add tournament players
  await admin.from('tournament_players').insert(
    players.map((p: any) => ({ tournament_id: tournament.id, profile_id: p.id, group_number: p.group }))
  )

  // 3. Create a round for each group
  const nGroups = Math.max(...players.map((p: any) => p.group))
  for (let g = 1; g <= nGroups; g++) {
    const groupPlayers = players.filter((p: any) => p.group === g)
    if (!groupPlayers.length) continue

    const { data: round } = await admin.from('rounds').insert({
      course_id, created_by: user.id, status: 'active',
      date: new Date().toISOString().split('T')[0], is_practice: false,
    }).select('id').single()

    if (!round) continue

    // Add players to round
    const { data: course } = await admin.from('courses').select('slope, course_rating, par').eq('id', course_id).single()
    await admin.from('round_players').insert(
      groupPlayers.map((p: any) => ({
        round_id: round.id, profile_id: p.id, is_guest: false,
        course_handicap: Math.round((p.handicap_index ?? 0) * ((course?.slope ?? 113) / 113) + ((course?.course_rating ?? 72) - (course?.par ?? 72))),
      }))
    )

    // Add modes
    await admin.from('round_modes').insert([{ round_id: round.id, mode, is_primary: true }, { round_id: round.id, mode: 'stroke', is_primary: false }])

    // Link round to tournament group
    await admin.from('tournament_groups').insert({ tournament_id: tournament.id, group_number: g, round_id: round.id })
  }

  return NextResponse.json({ tournament_id: tournament.id })
}
