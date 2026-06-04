import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const ADMIN_EMAIL = 's.vallve93@gmail.com'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { course_id, holes } = await request.json()

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  for (const h of holes) {
    await admin.from('holes').update({
      par: h.par,
      stroke_index: h.stroke_index,
      distance_m: h.distance_m || null,
    }).eq('id', h.id)
  }

  return NextResponse.json({ ok: true })
}
