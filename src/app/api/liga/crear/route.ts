import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { name, total_rounds, mode } = await request.json()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: league, error } = await admin
    .from('leagues')
    .insert({ name, total_rounds, mode, created_by: user.id, active: true })
    .select('id')
    .single()

  if (error || !league) return NextResponse.json({ error: error?.message }, { status: 500 })

  // Add creator as admin
  await admin.from('league_players').insert({ league_id: league.id, profile_id: user.id, is_admin: true })
  await admin.from('league_standings').insert({ league_id: league.id, profile_id: user.id, total_points: 0, rounds_played: 0, wins: 0 })

  return NextResponse.json({ league_id: league.id })
}
