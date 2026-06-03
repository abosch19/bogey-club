import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { round_id, hole_number, scores } = await request.json()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const upserts = Object.entries(scores as Record<string, {
    strokes: number; putts: number; fairway: boolean | null
    gir: boolean; in_bunker: boolean; penalties: number
  }>).map(([profile_id, sc]) => ({
    round_id,
    profile_id,
    hole_number,
    strokes: sc.strokes,
    putts: sc.putts,
    fairway: sc.fairway,
    gir: sc.gir,
    in_bunker: sc.in_bunker,
    penalties: sc.penalties,
  }))

  if (upserts.length === 0) return NextResponse.json({ ok: true })

  const { error } = await admin
    .from('scores')
    .upsert(upserts, { onConflict: 'round_id,profile_id,hole_number' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
