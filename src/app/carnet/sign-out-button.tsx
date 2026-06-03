'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full py-3 rounded-[16px] font-semibold text-[15px] border-2 border-[#c6432d] text-[#c6432d] bg-white transition-opacity active:opacity-80"
    >
      Cerrar sesion
    </button>
  )
}
