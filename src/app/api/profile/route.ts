import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { handicap_index } = await request.json()

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      name: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Jugador',
      handicap_index,
      avatar_color: '#2a6fdb',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
