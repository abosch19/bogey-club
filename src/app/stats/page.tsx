'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatHandicap } from '@/lib/golf'

function TabBar({ active }: { active: string }) {
  const tabs = [
    { key: 'inicio',  href: '/',        label: 'Inicio',  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth={active==='inicio'?2.2:1.7}/></svg> },
    { key: 'tarjeta', href: '/tarjeta', label: 'Tarjeta', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={active==='tarjeta'?2.2:1.7}/><path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth={active==='tarjeta'?2.2:1.7}/></svg> },
    { key: 'stats',   href: '/stats',   label: 'Stats',   icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth={active==='stats'?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'liga',    href: '/liga',    label: 'Liga',    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke="currentColor" strokeWidth={active==='liga'?2.2:1.7} strokeLinecap="round"/><path d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth={active==='liga'?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'perfil',  href: '/perfil',  label: 'Perfil',  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={active==='perfil'?2.2:1.7}/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth={active==='perfil'?2.2:1.7} strokeLinecap="round"/></svg> },
  ]
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e5e0d4] z-50 safe-bottom">
      <div className="flex items-stretch">
        {tabs.map(t => (
          <Link key={t.key} href={t.href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 ${t.key===active?'text-[#1f8a5b]':'text-[#6b7a72]'}`}>
            {t.icon}
            <span className="text-[10px] font-semibold">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

// Simple SVG sparkline
function Sparkline({ values, color = '#1f8a5b' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const w = 200, h = 40, pad = 4
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = pad + ((max - v) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

type RoundStat = {
  id: string; date: string; course_id: string; course_name: string
  total: number; par: number; real_par: number
  putts: number; gir: number; gir_total: number
  fairways: number; fairways_total: number
  penalties: number; bunkers: number
  players: string[] // profile_ids of co-players
  won: boolean // did current user have lowest score
}
type HoleStat = { hole_number: number; birdies: number; pars: number; bogeys: number; doubles: number; avg: number; rounds: number }

export default function StatsPage() {
  const [rounds, setRounds]     = useState<RoundStat[]>([])
  const [hcpIndex, setHcp]      = useState<number | null>(null)
  const [hcpHistory, setHcpHist] = useState<number[]>([])
  const [holestats, setHolestats] = useState<HoleStat[]>([])
  const [companions, setCompanions] = useState<{ id: string; name: string; avatar_color: string; rounds: number; wins: number }[]>([])
  const [courseStats, setCourseStats] = useState<{ name: string; best: number; avg: number; par: number; rounds: number; record: number | null }[]>([])
  const [loading, setLoading]   = useState(true)
  const [section, setSection]   = useState<'general'|'hoyos'|'social'|'campos'>('general')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('handicap_index').eq('id', user.id).single()
      setHcp(prof?.handicap_index ?? null)

      // Handicap history from differentials
      const { data: diffsData } = await supabase.from('whs_differentials').select('differential, played_at').eq('profile_id', user.id).order('played_at', { ascending: true }).limit(20)
      if (diffsData?.length) {
        // Running index simulation (simplified)
        setHcpHist(diffsData.map(d => parseFloat(d.differential.toFixed(1))))
      }

      // My rounds
      const { data: rps } = await supabase.from('round_players').select('round_id').eq('profile_id', user.id)
      if (!rps?.length) { setLoading(false); return }
      const roundIds = rps.map(r => r.round_id)

      // Rounds data
      const { data: roundsData } = await supabase
        .from('rounds').select('id, date, course_id, status, courses(name, par)')
        .in('id', roundIds).eq('status', 'completed').order('date', { ascending: false }).limit(30)
      if (!roundsData?.length) { setLoading(false); return }

      // All scores for my rounds
      const { data: allScores } = await supabase.from('scores')
        .select('round_id, profile_id, hole_number, strokes, putts, gir, fairway, penalties, in_bunker')
        .in('round_id', roundIds)

      // All co-players
      const { data: allRPs } = await supabase.from('round_players')
        .select('round_id, profile_id, profiles(name, avatar_color)')
        .in('round_id', roundIds).neq('profile_id', user.id)

      // All holes for courses
      const courseIds = [...new Set(roundsData.map((r: any) => r.course_id))]
      const { data: allHoles } = await supabase.from('holes').select('course_id, hole_number, par, stroke_index').in('course_id', courseIds)

      // Courses for record
      const { data: coursesData } = await supabase.from('courses').select('id, name, par, record_score').in('id', courseIds)

      // Build round stats
      const statsArr: RoundStat[] = roundsData.map((r: any) => {
        const course = Array.isArray(r.courses) ? r.courses[0] : r.courses
        const myS = (allScores ?? []).filter(s => s.round_id === r.id && s.profile_id === user.id)
        const allS = (allScores ?? []).filter(s => s.round_id === r.id)
        const courseHoles = (allHoles ?? []).filter(h => h.course_id === r.course_id)
        const realPar = courseHoles.reduce((a, h) => a + h.par, 0) || course?.par || 72

        // Who played
        const coPlayers = (allRPs ?? []).filter(rp => rp.round_id === r.id).map((rp: any) => rp.profile_id)

        // Did I win? (lowest total among players who completed all holes)
        const myTotal = myS.reduce((a, s) => a + (s.strokes ?? 0), 0)
        const allTotals = [...new Set(allS.map(s => s.profile_id))].map(pid => ({
          pid, total: allS.filter(s => s.profile_id === pid).reduce((a, s) => a + (s.strokes ?? 0), 0)
        })).filter(p => p.total > 0)
        const won = allTotals.length > 0 && myTotal === Math.min(...allTotals.map(p => p.total)) && myTotal > 0

        return {
          id: r.id, date: r.date, course_id: r.course_id,
          course_name: course?.name ?? 'Campo',
          total: myTotal, par: course?.par ?? 72, real_par: realPar,
          putts: myS.reduce((a, s) => a + (s.putts ?? 0), 0),
          gir: myS.filter(s => s.gir).length, gir_total: myS.length,
          fairways: myS.filter(s => s.fairway === true).length,
          fairways_total: myS.filter(s => s.fairway !== null).length,
          penalties: myS.reduce((a, s) => a + (s.penalties ?? 0), 0),
          bunkers: myS.filter(s => s.in_bunker).length,
          players: coPlayers, won,
        }
      }).filter(r => r.total > 0)
      setRounds(statsArr)

      // Hole stats
      const myAllScores = (allScores ?? []).filter(s => s.profile_id === user.id)
      const holeNums = [...new Set(myAllScores.map(s => s.hole_number))].sort((a, b) => a - b)
      const hStats: HoleStat[] = holeNums.map(hn => {
        const hScores = myAllScores.filter(s => s.hole_number === hn && s.strokes)
        // Get par for this hole (use most common)
        const parForHole = (allHoles ?? []).find(h => h.hole_number === hn)?.par ?? 4
        const deltas = hScores.map(s => (s.strokes ?? 0) - parForHole)
        return {
          hole_number: hn,
          birdies: deltas.filter(d => d <= -1).length,
          pars: deltas.filter(d => d === 0).length,
          bogeys: deltas.filter(d => d === 1).length,
          doubles: deltas.filter(d => d >= 2).length,
          avg: hScores.length ? parseFloat((hScores.reduce((a, s) => a + (s.strokes ?? 0), 0) / hScores.length).toFixed(1)) : 0,
          rounds: hScores.length,
        }
      })
      setHolestats(hStats)

      // Companions stats
      const compMap: Record<string, { name: string; avatar_color: string; rounds: number; wins: number }> = {}
      for (const rp of (allRPs ?? [])) {
        const pid = (rp as any).profile_id
        if (!pid) continue
        if (!compMap[pid]) compMap[pid] = { name: (rp as any).profiles?.name ?? 'Jugador', avatar_color: (rp as any).profiles?.avatar_color ?? '#6b7a72', rounds: 0, wins: 0 }
        compMap[pid].rounds++
        // Check if this companion won this round
        const rStat = statsArr.find(r => r.players.includes(pid) && r.id === (rp as any).round_id)
        if (rStat && !rStat.won) compMap[pid].wins++ // they won (I didn't)
      }
      setCompanions(Object.entries(compMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.rounds - a.rounds))

      // Course stats
      const cMap: Record<string, { name: string; scores: number[]; par: number; record: number | null }> = {}
      for (const r of statsArr) {
        if (!cMap[r.course_id]) {
          const cd = (coursesData ?? []).find((c: any) => c.id === r.course_id)
          cMap[r.course_id] = { name: r.course_name, scores: [], par: r.real_par, record: cd?.record_score ?? null }
        }
        if (r.total > 0) cMap[r.course_id].scores.push(r.total)
      }
      setCourseStats(Object.values(cMap).map(c => ({
        name: c.name, par: c.par, record: c.record,
        best: c.scores.length ? Math.min(...c.scores) : 0,
        avg: c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) : 0,
        rounds: c.scores.length,
      })).sort((a, b) => b.rounds - a.rounds))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const n          = rounds.length
  const avgScore   = n ? Math.round(rounds.reduce((a, r) => a + r.total, 0) / n) : null
  const avgDelta   = n ? Math.round(rounds.reduce((a, r) => a + (r.total - r.real_par), 0) / n) : null
  const bestScore  = n ? Math.min(...rounds.map(r => r.total)) : null
  const avgPutts   = n ? (rounds.reduce((a, r) => a + r.putts, 0) / n).toFixed(1) : null
  const girPct     = n ? Math.round(rounds.reduce((a, r) => a + (r.gir_total > 0 ? r.gir / r.gir_total * 100 : 0), 0) / n) : null
  const fwPct      = n ? Math.round(rounds.reduce((a, r) => a + (r.fairways_total > 0 ? r.fairways / r.fairways_total * 100 : 0), 0) / n) : null
  const avgPen     = n ? (rounds.reduce((a, r) => a + r.penalties, 0) / n).toFixed(1) : null
  const avgBunkers = n ? (rounds.reduce((a, r) => a + r.bunkers, 0) / n).toFixed(1) : null
  const totalWins  = rounds.filter(r => r.won).length
  const bestHole   = holestats.length ? [...holestats].sort((a, b) => (b.birdies + b.pars) / (b.rounds || 1) - (a.birdies + a.pars) / (a.rounds || 1))[0] : null
  const worstHole  = holestats.length ? [...holestats].sort((a, b) => (b.bogeys + b.doubles) / (b.rounds || 1) - (a.bogeys + a.doubles) / (a.rounds || 1))[0] : null

  const SECTIONS = [
    { key: 'general', label: 'General' },
    { key: 'hoyos',   label: 'Hoyos' },
    { key: 'social',  label: 'Social' },
    { key: 'campos',  label: 'Campos' },
  ] as const

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16] mb-3">Stats</h1>

        {/* Section tabs */}
        <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4] mb-4">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className="flex-1 py-1.5 rounded-full text-[11px] font-bold transition"
              style={{ backgroundColor: section === s.key ? '#0e1a16' : 'transparent', color: section === s.key ? '#fff' : '#6b7a72' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* GENERAL */}
        {section === 'general' && (
          <div className="space-y-3">
            {/* HCP card */}
            <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
              <div className="relative">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">ÍNDICE WHS</p>
                    <p className="text-[52px] font-black text-white leading-none">{hcpIndex != null ? formatHandicap(hcpIndex) : '–'}</p>
                  </div>
                  <div className="text-right pb-1 space-y-1">
                    {bestScore && <div><p className="font-mono text-[9px] text-white/50 uppercase">MEJOR</p><p className="text-white font-black text-[18px]">{bestScore}</p></div>}
                    <div><p className="font-mono text-[9px] text-white/50 uppercase">RONDAS</p><p className="text-white font-black text-[18px]">{n}</p></div>
                    <div><p className="font-mono text-[9px] text-white/50 uppercase">VICTORIAS</p><p className="text-[#1f8a5b] font-black text-[18px]">{totalWins}</p></div>
                  </div>
                </div>
                {/* Sparkline */}
                {hcpHistory.length >= 3 && (
                  <div className="opacity-60">
                    <Sparkline values={hcpHistory} color="#1f8a5b" />
                  </div>
                )}
              </div>
            </div>

            {/* Stats grid */}
            {n > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Media golpes', value: avgScore ? `${avgScore}` : '–', sub: avgDelta != null ? (avgDelta > 0 ? `+${avgDelta}` : avgDelta === 0 ? 'E' : `${avgDelta}`) + ' vs par' : '' },
                  { label: 'Putts / ronda', value: avgPutts ?? '–', sub: '' },
                  { label: 'GIR %', value: girPct != null ? `${girPct}%` : '–', sub: 'greens en reg.' },
                  { label: 'Calles %', value: fwPct != null ? `${fwPct}%` : '–', sub: 'fairways' },
                  { label: 'Penalizaciones', value: avgPen ?? '–', sub: 'media/ronda' },
                  { label: 'Búnkers', value: avgBunkers ?? '–', sub: 'media/ronda' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                    <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide">{s.label}</p>
                    <p className="text-[22px] font-black text-[#0e1a16] mt-1 leading-none">{s.value}</p>
                    {s.sub && <p className="text-[10px] text-[#6b7a72] mt-0.5">{s.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Recent rounds */}
            {n > 0 && (
              <div>
                <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Historial</h2>
                <div className="space-y-2">
                  {rounds.slice(0, 8).map(r => {
                    const delta = r.total - r.real_par
                    const isBest = r.total === bestScore
                    return (
                      <Link key={r.id} href={`/resumen?round=${r.id}`}
                        className="bg-white rounded-[16px] p-3.5 border flex items-center gap-3 block"
                        style={{ borderColor: isBest ? '#e8b75a' : '#e5e0d4', borderWidth: isBest ? '1.5px' : '1px' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[13px] text-[#0e1a16] truncate">{r.course_name}</p>
                            {isBest && <span className="font-mono text-[8px] bg-[#f6e6c4] text-[#9b6e1a] px-1.5 py-0.5 rounded-full">PB</span>}
                            {r.won && <span className="font-mono text-[8px] bg-[#d9eedd] text-[#1f8a5b] px-1.5 py-0.5 rounded-full">WIN</span>}
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
              </div>
            )}

            {n === 0 && (
              <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
                <p className="text-[#6b7a72] text-[14px]">Completa tu primera ronda para ver estadísticas.</p>
                <Link href="/ronda/campo" className="mt-3 inline-block text-[#1f8a5b] font-semibold text-[13px]">Empezar ronda →</Link>
              </div>
            )}
          </div>
        )}

        {/* HOYOS */}
        {section === 'hoyos' && (
          <div className="space-y-3">
            {/* Best / worst hole */}
            {bestHole && worstHole && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                  <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-1">Mejor hoyo</p>
                  <p className="text-[32px] font-black text-[#1f8a5b] leading-none">#{bestHole.hole_number}</p>
                  <p className="text-[11px] text-[#6b7a72] mt-1">{bestHole.birdies} birdies · {bestHole.pars} pares</p>
                  <p className="font-mono text-[10px] text-[#6b7a72]">Media {bestHole.avg}</p>
                </div>
                <div className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                  <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-1">Peor hoyo</p>
                  <p className="text-[32px] font-black text-[#a83a25] leading-none">#{worstHole.hole_number}</p>
                  <p className="text-[11px] text-[#6b7a72] mt-1">{worstHole.bogeys} bogeys · {worstHole.doubles} dobles+</p>
                  <p className="font-mono text-[10px] text-[#6b7a72]">Media {worstHole.avg}</p>
                </div>
              </div>
            )}

            {/* Hole by hole breakdown */}
            {holestats.length > 0 && (
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#efebe1]">
                  <p className="font-bold text-[14px] text-[#0e1a16]">Desglose por hoyo</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center" style={{ minWidth: '380px' }}>
                    <thead>
                      <tr className="border-b border-[#efebe1]">
                        <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-3 text-left">H</td>
                        <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">Media</td>
                        <td className="font-mono text-[9px] text-[#2a6fdb] py-2 px-2">Birdie-</td>
                        <td className="font-mono text-[9px] text-[#1f8a5b] py-2 px-2">Par</td>
                        <td className="font-mono text-[9px] text-[#9b6e1a] py-2 px-2">Bogey</td>
                        <td className="font-mono text-[9px] text-[#a83a25] py-2 px-2">Dbl+</td>
                      </tr>
                    </thead>
                    <tbody>
                      {holestats.map(h => (
                        <tr key={h.hole_number} className="border-t border-[#efebe1]">
                          <td className="font-mono text-[12px] font-bold text-[#0e1a16] py-2 px-3 text-left">{h.hole_number}</td>
                          <td className="font-mono text-[12px] font-bold text-[#0e1a16] py-2 px-2">{h.avg}</td>
                          <td className="font-mono text-[11px] text-[#2a6fdb] py-2 px-2">{h.birdies || '–'}</td>
                          <td className="font-mono text-[11px] text-[#1f8a5b] py-2 px-2">{h.pars || '–'}</td>
                          <td className="font-mono text-[11px] text-[#9b6e1a] py-2 px-2">{h.bogeys || '–'}</td>
                          <td className="font-mono text-[11px] text-[#a83a25] py-2 px-2">{h.doubles || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {holestats.length === 0 && <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center"><p className="text-[#6b7a72] text-[14px]">Sin datos de hoyos todavía.</p></div>}
          </div>
        )}

        {/* SOCIAL */}
        {section === 'social' && (
          <div className="space-y-3">
            {/* Win summary */}
            <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
              <div className="relative flex items-center gap-6">
                <div>
                  <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">VICTORIAS</p>
                  <p className="text-[52px] font-black text-white leading-none">{totalWins}</p>
                  <p className="text-[12px] text-white/60 mt-1">de {n} rondas competitivas</p>
                </div>
                {n > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">WIN RATE</p>
                    <p className="text-[28px] font-black text-[#1f8a5b] leading-none">{Math.round(totalWins / n * 100)}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Companions */}
            {companions.length > 0 ? (
              <div>
                <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Con quién más juegas</h2>
                <div className="space-y-2">
                  {companions.slice(0, 8).map((c, i) => (
                    <div key={c.id} className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4] flex items-center gap-3">
                      <span className="font-mono text-[12px] font-bold text-[#6b7a72] w-5 text-center">{i + 1}</span>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ backgroundColor: c.avatar_color }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[14px] text-[#0e1a16]">{c.name}</p>
                        <p className="text-[11px] text-[#6b7a72]">{c.rounds} ronda{c.rounds !== 1 ? 's' : ''} juntos</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[11px] text-[#6b7a72]">te ganó</p>
                        <p className="font-mono text-[16px] font-black" style={{ color: c.wins > 0 ? '#a83a25' : '#1f8a5b' }}>{c.wins}×</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
                <p className="text-[#6b7a72] text-[14px]">Juega rondas con amigos para ver las comparativas.</p>
              </div>
            )}
          </div>
        )}

        {/* CAMPOS */}
        {section === 'campos' && (
          <div className="space-y-2">
            {courseStats.length > 0 ? courseStats.map(c => {
              const deltaBest = c.best ? c.best - c.par : null
              const vsRecord = c.record && c.best ? c.best - c.record : null
              return (
                <div key={c.name} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-[14px] text-[#0e1a16] leading-tight">{c.name}</p>
                      <p className="font-mono text-[10px] text-[#6b7a72] mt-0.5">{c.rounds} ronda{c.rounds !== 1 ? 's' : ''} · Par {c.par}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Mejor</p>
                      <p className="font-mono text-[20px] font-black text-[#0e1a16] leading-none">{c.best}</p>
                      {deltaBest !== null && (
                        <p className="font-mono text-[10px] font-bold" style={{ color: deltaBest <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                          {deltaBest > 0 ? `+${deltaBest}` : deltaBest === 0 ? 'E' : deltaBest}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 pt-2 border-t border-[#efebe1]">
                    <div>
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Media</p>
                      <p className="font-mono text-[14px] font-bold text-[#0e1a16]">{c.avg}</p>
                    </div>
                    {c.record && (
                      <div>
                        <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Récord campo</p>
                        <p className="font-mono text-[14px] font-bold text-[#e8b75a]">{c.record}</p>
                      </div>
                    )}
                    {vsRecord !== null && (
                      <div>
                        <p className="font-mono text-[9px] text-[#6b7a72] uppercase">vs Récord</p>
                        <p className="font-mono text-[14px] font-bold" style={{ color: vsRecord === 0 ? '#1f8a5b' : '#6b7a72' }}>
                          {vsRecord > 0 ? `+${vsRecord}` : vsRecord === 0 ? '= RÉCORD' : vsRecord}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
                <p className="text-[#6b7a72] text-[14px]">Completa rondas para ver estadísticas por campo.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <TabBar active="stats" />
    </div>
  )
}
