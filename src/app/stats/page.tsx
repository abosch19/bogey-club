'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatHandicap } from '@/lib/golf'

type RoundStat = {
  id: string
  date: string
  course_name: string
  total: number
  par: number
  putts: number
  gir: number
  gir_total: number
  fairways: number
  fairways_total: number
  penalties: number
}

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

export default function StatsPage() {
  const [rounds, setRounds]   = useState<RoundStat[]>([])
  const [hcpIndex, setHcp]    = useState<number | null>(null)
  const [diffs, setDiffs]     = useState<{ diff: number; counting: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('handicap_index').eq('id', user.id).single()
      setHcp(prof?.handicap_index ?? null)

      // Last 20 differentials
      const { data: diffsData } = await supabase.from('whs_differentials').select('differential, is_counting').eq('profile_id', user.id).order('played_at', { ascending: false }).limit(20)
      setDiffs((diffsData ?? []).map(d => ({ diff: d.differential, counting: d.is_counting })))

      // Completed rounds with stats
      const { data: rps } = await supabase
        .from('round_players')
        .select('round_id')
        .eq('profile_id', user.id)

      if (!rps?.length) { setLoading(false); return }

      const roundIds = rps.map(r => r.round_id)
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('id, date, status, course_id, courses(name, par)')
        .in('id', roundIds)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(20)

      if (!roundsData?.length) { setLoading(false); return }

      const { data: allScores } = await supabase
        .from('scores')
        .select('round_id, strokes, putts, gir, fairway, penalties')
        .eq('profile_id', user.id)
        .in('round_id', roundIds)

      const stats: RoundStat[] = roundsData.map((r: any) => {
        const course = Array.isArray(r.courses) ? r.courses[0] : r.courses
        const rs = (allScores ?? []).filter(s => s.round_id === r.id)
        const total = rs.reduce((a, s) => a + (s.strokes ?? 0), 0)
        const putts = rs.reduce((a, s) => a + (s.putts ?? 0), 0)
        const girHoles = rs.filter(s => s.gir).length
        const fwHoles = rs.filter(s => s.fairway === true).length
        const fwTotal = rs.filter(s => s.fairway !== null).length
        const pens = rs.reduce((a, s) => a + (s.penalties ?? 0), 0)
        return {
          id: r.id, date: r.date,
          course_name: course?.name ?? 'Campo',
          total, par: course?.par ?? 72,
          putts, gir: girHoles, gir_total: rs.length,
          fairways: fwHoles, fairways_total: fwTotal,
          penalties: pens,
        }
      }).filter(r => r.total > 0)

      setRounds(stats)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const avgScore   = rounds.length ? Math.round(rounds.reduce((a, r) => a + r.total, 0) / rounds.length) : null
  const avgDelta   = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.total - r.par), 0) / rounds.length) : null
  const bestScore  = rounds.length ? Math.min(...rounds.map(r => r.total)) : null
  const avgPutts   = rounds.length ? (rounds.reduce((a, r) => a + r.putts, 0) / rounds.length).toFixed(1) : null
  const girPct     = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.gir_total > 0 ? r.gir / r.gir_total * 100 : 0), 0) / rounds.length) : null
  const fwPct      = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.fairways_total > 0 ? r.fairways / r.fairways_total * 100 : 0), 0) / rounds.length) : null

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16] mb-4">Stats</h1>

        {/* Handicap card */}
        <div className="rounded-[22px] p-4 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
          <div className="relative flex items-end justify-between">
            <div>
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em] mb-1">ÍNDICE WHS</p>
              <p className="text-[52px] font-black text-white leading-none tracking-tight">
                {hcpIndex != null ? formatHandicap(hcpIndex) : '–'}
              </p>
            </div>
            <div className="text-right pb-1 space-y-1">
              {bestScore && <div><p className="font-mono text-[9px] text-white/50 uppercase">MEJOR</p><p className="text-white font-black text-[18px]">{bestScore}</p></div>}
              {rounds.length > 0 && <div><p className="font-mono text-[9px] text-white/50 uppercase">RONDAS</p><p className="text-white font-black text-[18px]">{rounds.length}</p></div>}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        {rounds.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: 'Media golpes', value: avgScore ? `${avgScore} (${avgDelta && avgDelta > 0 ? '+' : ''}${avgDelta})` : '–' },
              { label: 'Putts/ronda', value: avgPutts ?? '–' },
              { label: 'GIR %', value: girPct != null ? `${girPct}%` : '–' },
              { label: 'Calles %', value: fwPct != null ? `${fwPct}%` : '–' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[16px] p-3 border border-[#e5e0d4]">
                <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide">{s.label}</p>
                <p className="text-[20px] font-black text-[#0e1a16] mt-1 leading-none">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Round history */}
        <h2 className="text-[15px] font-bold text-[#0e1a16] mb-2">Historial</h2>
        {rounds.length === 0 ? (
          <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
            <p className="text-[#6b7a72] text-[14px]">Aún no tienes rondas completadas.</p>
            <Link href="/ronda/campo" className="mt-3 inline-block text-[#1f8a5b] font-semibold text-[13px]">Empezar una ronda →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {rounds.map(r => {
              const delta = r.total - r.par
              const isBest = r.total === bestScore
              return (
                <Link key={r.id} href={`/resumen?round=${r.id}`}
                  className="bg-white rounded-[16px] p-3.5 border flex items-center gap-3 block active:opacity-80"
                  style={{ borderColor: isBest ? '#e8b75a' : '#e5e0d4', borderWidth: isBest ? '1.5px' : '1px' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[13px] text-[#0e1a16] truncate">{r.course_name}</p>
                      {isBest && <span className="font-mono text-[8px] bg-[#f6e6c4] text-[#9b6e1a] px-1.5 py-0.5 rounded-full uppercase">PB</span>}
                    </div>
                    <p className="text-[11px] text-[#6b7a72]">{formatDate(r.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[18px] font-black text-[#0e1a16]">{r.total}</p>
                    <p className="font-mono text-[10px] font-bold" style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <TabBar active="stats" />
    </div>
  )
}
