'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function TabBar({ active }: { active: string }) {
  const tabs = [
    { key: 'inicio', href: '/', label: 'Inicio', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth={active==='inicio'?2.2:1.7}/></svg> },
    { key: 'tarjeta', href: '/tarjeta', label: 'Tarjeta', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={active==='tarjeta'?2.2:1.7}/><path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth={active==='tarjeta'?2.2:1.7}/></svg> },
    { key: 'stats', href: '/stats', label: 'Stats', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth={active==='stats'?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'liga', href: '/liga', label: 'Liga', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke="currentColor" strokeWidth={active==='liga'?2.2:1.7} strokeLinecap="round"/><path d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth={active==='liga'?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'perfil', href: '/perfil', label: 'Perfil', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={active==='perfil'?2.2:1.7}/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth={active==='perfil'?2.2:1.7} strokeLinecap="round"/></svg> },
  ]
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e5e0d4] z-50 safe-bottom">
      <div className="flex items-stretch">
        {tabs.map(t => (
          <Link key={t.key} href={t.href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${t.key===active?'text-[#1f8a5b]':'text-[#6b7a72]'}`}>
            {t.icon}
            <span className="text-[10px] font-semibold">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function LigaPage() {
  const [leagues, setLeagues] = useState<any[]>([])
  const [standings, setStandings] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: lps } = await supabase.from('league_players').select('league_id').eq('profile_id', user.id)
      if (!lps?.length) { setLoading(false); return }

      const ids = lps.map(l => l.league_id)
      const { data: ls } = await supabase.from('leagues').select('*').in('id', ids).eq('active', true)
      setLeagues(ls ?? [])

      // Fetch standings for each league
      const stMap: Record<string, any[]> = {}
      for (const l of ls ?? []) {
        const { data: st } = await supabase
          .from('league_standings')
          .select('profile_id, total_points, rounds_played, wins, profiles(name, avatar_color)')
          .eq('league_id', l.id)
          .order('total_points', { ascending: false })
        stMap[l.id] = (st ?? []).map((s: any) => ({ ...s, name: s.profiles?.name ?? 'Jugador', avatar_color: s.profiles?.avatar_color ?? '#6b7a72' }))
      }
      setStandings(stMap)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16]">Liga</h1>
          <Link href="/liga/nueva"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full font-semibold text-[13px] text-white"
            style={{ backgroundColor: '#1f8a5b' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Nueva
          </Link>
        </div>

        {leagues.length === 0 ? (
          <div className="bg-white rounded-[22px] p-8 border border-[#e5e0d4] text-center">
            <div className="w-14 h-14 rounded-full bg-[#f6e6c4] flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke="#9b6e1a" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <p className="text-[15px] font-bold text-[#0e1a16] mb-1">Sin ligas activas</p>
            <p className="text-[13px] text-[#6b7a72] mb-4">Crea una liga con tus amigos y compite por la clasificación.</p>
            <Link href="/liga/nueva"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-[14px] text-[#0e1a16]"
              style={{ backgroundColor: '#1f8a5b', color: '#fff' }}>
              Crear primera liga →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map(league => {
              const st = standings[league.id] ?? []
              return (
                <div key={league.id} className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden">
                  {/* League header */}
                  <div className="p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
                    <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: '#e8b75a', opacity: 0.9 }}/>
                    <div className="relative">
                      <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">
                        {league.mode?.toUpperCase()} · {league.total_rounds} JORNADAS
                      </p>
                      <p className="text-white text-[20px] font-black tracking-tight mt-1">{league.name}</p>
                    </div>
                  </div>

                  {/* Standings */}
                  {st.length > 0 ? (
                    <div className="p-3 space-y-1.5">
                      {st.slice(0, 5).map((s: any, i: number) => (
                        <div key={s.profile_id} className="flex items-center gap-3 py-1.5 px-2 rounded-[12px]"
                          style={{ backgroundColor: i === 0 ? '#f6e6c4' : 'transparent' }}>
                          <span className="font-mono text-[12px] font-bold w-5 text-center" style={{ color: i === 0 ? '#9b6e1a' : '#6b7a72' }}>{i+1}</span>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ backgroundColor: s.avatar_color }}>{s.name[0]}</div>
                          <span className="flex-1 text-[13px] font-semibold text-[#0e1a16]">{s.name}</span>
                          <span className="font-mono text-[14px] font-black text-[#0e1a16]">{s.total_points}</span>
                          <span className="font-mono text-[9px] text-[#6b7a72]">PTS</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[13px] text-[#6b7a72] py-4">Aún no hay clasificación</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <TabBar active="liga" />
    </div>
  )
}
