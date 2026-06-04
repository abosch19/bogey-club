import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { round_id } = await request.json()

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Delete in order (foreign keys)
  await admin.from('whs_differentials').delete().eq('round_id', round_id)
  await admin.from('scores').delete().eq('round_id', round_id)
  await admin.from('round_modes').delete().eq('round_id', round_id)
  await admin.from('round_players').delete().eq('round_id', round_id)
  await admin.from('tournament_groups').delete().eq('round_id', round_id)
  await admin.from('league_rounds').delete().eq('round_id', round_id)
  await admin.from('rounds').delete().eq('id', round_id)

  return NextResponse.json({ ok: true })
}
