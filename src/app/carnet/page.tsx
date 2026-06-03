'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Flag, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatHandicap(index: number) {
  if (index == null) return '–'
  return index < 0 ? `+${Math.abs(index).toFixed(1)}` : index.toFixed(1)
}

export default function CarnetPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; handicap_index: number; avatar_color: string } | null>(null)
  const [email, setEmail] = useState('')
  const [completedRounds, setCompletedRounds] = useState<{ id: string; date: string; courses: { name: string; par: number } }[]>([])
  const [scoreTotals, setScoreTotals] = useState<Record<string, number>>({})
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { router.push('/onboarding'); return }
      setProfile(prof)

      const { data: rps } = await supabase
        .from('round_players')
        .select('round_id, rounds(id, date, status, courses(name, par))')
        .eq('profile_id', user.id)
        .eq('rounds.status', 'completed')
        .order('round_id', { ascending: false })
        .limit(20)

      type RoundInfo = { id: string; date: string; status: string; courses: { name: string; par: number } }
      const rounds = ((rps ?? []).map((rp) => {
        const r = rp.rounds
        if (!r) return null
        return (Array.isArray(r) ? r[0] : r) as RoundInfo
      }).filter(Boolean) as RoundInfo[])
      setCompletedRounds(rounds)

      if (rounds.length > 0) {
        const ids = rounds.map((r) => r.id)
        const { data: scores } = await supabase.from('scores').select('round_id, strokes').eq('profile_id', user.id).in('round_id', ids)
        const totals: Record<string, number> = {}
        for (const s of scores ?? []) totals[s.round_id] = (totals[s.round_id] ?? 0) + (s.strokes ?? 0)
        setScoreTotals(totals)
        const vals = Object.values(totals).filter((t) => t > 0)
        if (vals.length > 0) setBestScore(Math.min(...vals))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (profile?.name ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const last5 = completedRounds.slice(0, 5)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        <div className="px-[14px] mb-4">
          <h1 className="text-[#0e1a16] text-[22px] font-black tracking-tight">Carnet</h1>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Member card */}
          <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
            <div className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full opacity-10" style={{ backgroundColor: '#1f8a5b' }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
                    <Flag size={14} color="#fff" />
                  </div>
                  <span className="text-white text-[14px] font-bold">bogeyclub</span>
                </div>
                <span className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wider">Socio</span>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[20px] font-bold flex-shrink-0" style={{ backgroundColor: profile?.avatar_color ?? '#1f8a5b' }}>
                  {initials}
                </div>
                <div>
                  <p className="text-white text-[20px] font-bold leading-tight">{profile?.name}</p>
                  <p className="text-[#6b7a72] text-[12px] mt-0.5">{email}</p>
                </div>
              </div>

              <div className="flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-[#6b7a72] text-[11px] font-mono uppercase tracking-wider">Índice WHS</p>
                  <p className="text-white text-[40px] font-black leading-none">{formatHandicap(profile?.handicap_index ?? 54)}</p>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-[#6b7a72] text-[10px] uppercase">Rondas</p>
                    <p className="text-white text-[18px] font-bold leading-none">{completedRounds.length}</p>
                  </div>
                  {bestScore != null && (
                    <div>
                      <p className="text-[#6b7a72] text-[10px] uppercase">Mejor</p>
                      <p className="text-white text-[18px] font-bold leading-none">{bestScore}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* WHS link */}
          <Link href="/carnet/whs" className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] flex items-center gap-3 block active:opacity-80">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dde7fb' }}>
              <span className="text-[#2a6fdb] text-[13px] font-black">WHS</span>
            </div>
            <div className="flex-1">
              <p className="text-[#0e1a16] text-[14px] font-bold">Índice WHS</p>
              <p className="text-[#6b7a72] text-[12px]">Histórico de diferenciales</p>
            </div>
            <ChevronRight size={16} color="#6b7a72" />
          </Link>

          {/* Last 5 rounds */}
          {last5.length > 0 && (
            <div>
              <h3 className="text-[#0e1a16] text-[14px] font-bold px-1 mb-2">Últimas rondas</h3>
              <div className="space-y-2">
                {last5.map((round) => {
                  const total = scoreTotals[round.id]
                  const par = round.courses?.par ?? 72
                  const delta = total != null ? total - par : null
                  return (
                    <Link key={round.id} href={`/resumen?round=${round.id}`} className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4] flex items-center gap-3 block active:opacity-80">
                      <div className="flex-1">
                        <p className="text-[#0e1a16] text-[13px] font-semibold">{round.courses?.name ?? 'Campo'}</p>
                        <p className="text-[#6b7a72] text-[12px]">{formatDate(round.date)}</p>
                      </div>
                      {total != null && (
                        <div className="text-right">
                          <p className="text-[#0e1a16] text-[16px] font-bold leading-none">{total}</p>
                          {delta != null && (
                            <p className="text-[11px] font-medium" style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                              {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                            </p>
                          )}
                        </div>
                      )}
                      <ChevronRight size={14} color="#6b7a72" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] border-2 border-[#c6432d] text-[#c6432d] bg-white transition-opacity active:opacity-80"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <TabBar />
    </div>
  )
}
