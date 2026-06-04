import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { league_id } = await request.json()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Only creator can delete
  const { data: league } = await admin.from('leagues').select('created_by').eq('id', league_id).single()
  if (!league || league.created_by !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  await admin.from('league_standings').delete().eq('league_id', league_id)
  await admin.from('league_players').delete().eq('league_id', league_id)
  await admin.from('league_rounds').delete().eq('league_id', league_id)
  await admin.from('leagues').delete().eq('id', league_id)

  return NextResponse.json({ ok: true })
}
