import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { courseHandicap } from '@/lib/golf'

type PlayerInsert = {
  round_id: string
  profile_id: string | null
  guest_id: string | null
  is_guest: boolean
  course_handicap: number
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { course_id, is_practice, player_ids, guests, modes } = await request.json()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // 1. Create round
  const { data: round, error: roundErr } = await admin
    .from('rounds')
    .insert({
      course_id,
      created_by: user.id,
      status: 'active',
      is_practice: is_practice ?? false,
      date: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (roundErr || !round) {
    return NextResponse.json({ error: roundErr?.message ?? 'Error creando ronda' }, { status: 500 })
  }

  // 2. Get course info for handicap calculation
  const { data: course } = await admin
    .from('courses')
    .select('slope, course_rating, par')
    .eq('id', course_id)
    .single()

  // 3. Get player profiles
  const { data: profiles } = player_ids?.length
    ? await admin.from('profiles').select('id, handicap_index').in('id', player_ids)
    : { data: [] }

  // 4. Build player inserts
  const playerInserts: PlayerInsert[] = (profiles ?? []).map(p => ({
    round_id: round.id,
    profile_id: p.id,
    guest_id: null,
    is_guest: false,
    course_handicap: course
      ? courseHandicap(p.handicap_index, course.slope, course.course_rating, course.par)
      : Math.round(p.handicap_index),
  }))

  // 5. Add guests
  for (const g of (guests ?? [])) {
    const [name, hcpStr] = String(g).split(':')
    const hcp = parseFloat(hcpStr) || 18

    const { data: guest } = await admin
      .from('guest_players')
      .insert({ name: name.trim(), handicap_index: hcp, created_by: user.id })
      .select('id')
      .single()

    if (guest) {
      playerInserts.push({
        round_id: round.id,
        profile_id: null,
        guest_id: guest.id,
        is_guest: true,
        course_handicap: course
          ? courseHandicap(hcp, course.slope, course.course_rating, course.par)
          : Math.round(hcp),
      })
    }
  }

  if (playerInserts.length > 0) {
    const { error: playersErr } = await admin.from('round_players').insert(playerInserts)
    if (playersErr) {
      return NextResponse.json({ error: playersErr.message }, { status: 500 })
    }
  }

  // 6. Add modes
  const modeInserts = (modes ?? ['stroke']).map((mode: string, i: number) => ({
    round_id: round.id,
    mode,
    is_primary: i === 0,
  }))
  await admin.from('round_modes').insert(modeInserts)

  return NextResponse.json({ round_id: round.id })
}
