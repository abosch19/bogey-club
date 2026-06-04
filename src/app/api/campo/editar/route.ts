import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { course_id, name, holes } = await request.json()

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Update course name and recalculate par
  const totalPar = (holes as any[]).reduce((a: number, h: any) => a + (h.par ?? 0), 0)
  await admin.from('courses').update({ name, par: totalPar }).eq('id', course_id)

  // Update each hole
  for (const h of holes as any[]) {
    await admin.from('holes').update({
      par: h.par,
      stroke_index: h.stroke_index,
      distance_m: h.distance_m || null,
    }).eq('id', h.id)
  }

  return NextResponse.json({ ok: true })
}
