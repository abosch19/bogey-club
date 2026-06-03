import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, handicap_index')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-[14px]">
      <div className="text-center">
        <div className="text-[32px] font-black text-[#0e1a16] tracking-tight mb-2">
          Buenas, {profile.name?.split(' ')[0]} 👋
        </div>
        <p className="text-[#6b7a72] text-[14px]">
          Hándicap: {profile.handicap_index?.toFixed(1)}
        </p>
        <p className="text-[#1f8a5b] text-[13px] mt-4 font-medium">
          Construyendo la home… volvemos enseguida.
        </p>
      </div>
    </div>
  )
}
