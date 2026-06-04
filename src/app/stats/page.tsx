'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatHandicap } from '@/lib/golf'
import { TabBar } from '@/components/ui/tab-bar'

function Sparkline({ values, color = '#1f8a5b' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const w = 200, h = 40, pad = 4
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => `${pad + (i / (values.length - 1)) * (w - pad * 2)},${pad + ((max - v) / range) * (h - pad * 2)}`).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

// ── Types ─────────────────────────────────────────────────────
type RoundStat = {
  id: string; date: string; course_id: string; course_name: string
  total: number; real_par: number; putts: number
  gir: number; gir_total: number; fairways: number; fairways_total: number
  penalties: number; bunkers: number; players: string[]; won: boolean
  scores: { hole_number: number; strokes: number; par: number }[]
}
type OtherPlayer = { id: string; name: string; avatar_color: string }

export default function StatsPage() {
  const [rounds, setRounds]       = useState<RoundStat[]>([])
  const [hcpIndex, setHcp]        = useState<number | null>(null)
  const [hcpHistory, setHcpHist]  = useState<number[]>([])
  const [allPlayers, setAllPlayers] = useState<OtherPlayer[]>([])
  const [courseStats, setCourseStats] = useState<{ name: string; best: number; avg: number; par: number; rounds: number; record: number | null; last3: number[] }[]>([])
  const [myId, setMyId]           = useState('')
  const [loading, setLoading]     = useState(true)
  const [section, setSection]     = useState<'general'|'hoyos'|'social'|'campos'>('general')
  const [hoyosPeriod, setHoyosPeriod] = useState<'all'|'10'|'5'|'3'>('all')
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [courseHoleData, setCourseHoleData] = useState<{ hole_number: number; par: number; my_last: number | null; my_best: number | null }[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setMyId(user.id)

      // Parallel: profile, differentials, all profiles
      const [profRes, diffsRes, allProfilesRes] = await Promise.all([
        supabase.from('profiles').select('handicap_index').eq('id', user.id).single(),
        supabase.from('whs_differentials').select('differential, played_at').eq('profile_id', user.id).order('played_at', { ascending: true }).limit(20),
        supabase.from('profiles').select('id, name, avatar_color').neq('id', user.id),
      ])
      setHcp(profRes.data?.handicap_index ?? null)
      setHcpHist((diffsRes.data ?? []).map(d => parseFloat(d.differential.toFixed(1))))
      setAllPlayers(allProfilesRes.data ?? [])

      // My round IDs
      const { data: rps } = await supabase.from('round_players').select('round_id').eq('profile_id', user.id)
      if (!rps?.length) { setLoading(false); return }
      const roundIds = rps.map(r => r.round_id)

      // Parallel: rounds + all scores + all round_players + courses
      const [roundsRes, scoresRes, allRPsRes] = await Promise.all([
        supabase.from('rounds').select('id, date, course_id, status, courses(name, par)').in('id', roundIds).eq('status', 'completed').order('date', { ascending: false }).limit(30),
        supabase.from('scores').select('round_id, profile_id, hole_number, strokes, putts, gir, fairway, penalties, in_bunker').in('round_id', roundIds),
        supabase.from('round_players').select('round_id, profile_id').in('round_id', roundIds).neq('profile_id', user.id),
      ])

      if (!roundsRes.data?.length) { setLoading(false); return }

      const courseIds = Array.from(new Set(roundsRes.data.map((r: any) => r.course_id)))
      const [holesRes, coursesRes] = await Promise.all([
        supabase.from('holes').select('course_id, hole_number, par, stroke_index').in('course_id', courseIds),
        supabase.from('courses').select('id, par, record_score').in('id', courseIds),
      ])

      // Build round stats
      const statsArr: RoundStat[] = roundsRes.data.map((r: any) => {
        const course = Array.isArray(r.courses) ? r.courses[0] : r.courses
        const myS  = (scoresRes.data ?? []).filter(s => s.round_id === r.id && s.profile_id === user.id)
        const allS = (scoresRes.data ?? []).filter(s => s.round_id === r.id)
        const courseHoles = (holesRes.data ?? []).filter(h => h.course_id === r.course_id)
        const realPar = courseHoles.reduce((a, h) => a + h.par, 0) || course?.par || 72
        const coPlayers = (allRPsRes.data ?? []).filter(rp => rp.round_id === r.id).map((rp: any) => rp.profile_id)
        const myTotal  = myS.reduce((a, s) => a + (s.strokes ?? 0), 0)
        const allTotals = Array.from(new Set(allS.map(s => s.profile_id))).map(pid => ({ pid, total: allS.filter(s => s.profile_id === pid).reduce((a, s) => a + (s.strokes ?? 0), 0) })).filter(p => p.total > 0)
        const won = allTotals.length > 0 && myTotal === Math.min(...allTotals.map(p => p.total)) && myTotal > 0
        const holeScores = myS.filter(s => s.strokes != null).map(s => {
          const h = courseHoles.find(h => h.hole_number === s.hole_number)
          return { hole_number: s.hole_number, strokes: s.strokes!, par: h?.par ?? 4 }
        })
        return {
          id: r.id, date: r.date, course_id: r.course_id, course_name: course?.name ?? 'Campo',
          total: myTotal, real_par: realPar,
          putts: myS.reduce((a, s) => a + (s.putts ?? 0), 0),
          gir: myS.filter(s => s.gir).length, gir_total: myS.length,
          fairways: myS.filter(s => s.fairway === true).length, fairways_total: myS.filter(s => s.fairway !== null).length,
          penalties: myS.reduce((a, s) => a + (s.penalties ?? 0), 0),
          bunkers: myS.filter(s => s.in_bunker).length,
          players: coPlayers, won, scores: holeScores,
        }
      }).filter(r => r.total > 0)
      setRounds(statsArr)

      // Course stats
      const cMap: Record<string, { name: string; scores: number[]; par: number; record: number | null }> = {}
      for (const r of statsArr) {
        if (!cMap[r.course_id]) {
          const cd = (coursesRes.data ?? []).find((c: any) => c.id === r.course_id)
          cMap[r.course_id] = { name: r.course_name, scores: [], par: r.real_par, record: cd?.record_score ?? null }
        }
        if (r.total > 0) cMap[r.course_id].scores.push(r.total)
      }
      setCourseStats(Object.values(cMap).map(c => ({
        name: c.name, par: c.par, record: c.record,
        best: c.scores.length ? Math.min(...c.scores) : 0,
        avg:  c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) : 0,
        rounds: c.scores.length,
        last3: c.scores.slice(0, 3),
      })).sort((a, b) => b.rounds - a.rounds))

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const n = rounds.length
  const avgScore  = n ? Math.round(rounds.reduce((a, r) => a + r.total, 0) / n) : null
  const avgDelta  = n ? Math.round(rounds.reduce((a, r) => a + (r.total - r.real_par), 0) / n) : null
  const bestScore = n ? Math.min(...rounds.map(r => r.total)) : null
  const avgPutts  = n ? (rounds.reduce((a, r) => a + r.putts, 0) / n).toFixed(1) : null
  const girPct    = n ? Math.round(rounds.reduce((a, r) => a + (r.gir_total > 0 ? r.gir / r.gir_total * 100 : 0), 0) / n) : null
  const fwPct     = n ? Math.round(rounds.reduce((a, r) => a + (r.fairways_total > 0 ? r.fairways / r.fairways_total * 100 : 0), 0) / n) : null
  const totalWins = rounds.filter(r => r.won).length

  // All scores flat
  const allScores = rounds.flatMap(r => r.scores)
  // Totals by result
  const totalBirdies  = allScores.filter(s => s.strokes - s.par <= -1).length
  const totalPars     = allScores.filter(s => s.strokes - s.par === 0).length
  const totalBogeys   = allScores.filter(s => s.strokes - s.par === 1).length
  const totalDoubles  = allScores.filter(s => s.strokes - s.par >= 2).length
  const totalHolesP   = allScores.length || 1

  // Best streak (consecutive rounds under avgScore+2)
  let bestStreak = 0, curStreak = 0
  const threshold = (avgScore ?? 100) + 2
  for (const r of [...rounds].reverse()) {
    if (r.total <= threshold) { curStreak++; bestStreak = Math.max(bestStreak, curStreak) } else curStreak = 0

  }

  // Par type stats
  const parTypes = [3, 4, 5]
  const parStats = parTypes.map(par => {
    const s = allScores.filter(h => h.par === par)
    if (!s.length) return null
    const avg = s.reduce((a, h) => a + h.strokes, 0) / s.length
    const birdies = s.filter(h => h.strokes - h.par <= -1).length
    const pars    = s.filter(h => h.strokes - h.par === 0).length
    const bogeys  = s.filter(h => h.strokes - h.par === 1).length
    const doubles = s.filter(h => h.strokes - h.par >= 2).length
    return { par, avg: parseFloat(avg.toFixed(2)), birdies, pars, bogeys, doubles, total: s.length }
  }).filter(Boolean) as { par: number; avg: number; birdies: number; pars: number; bogeys: number; doubles: number; total: number }[]

  // Best/worst hole
  const holeAvgs: Record<number, number[]> = {}
  for (const s of allScores) {
    if (!holeAvgs[s.hole_number]) holeAvgs[s.hole_number] = []
    holeAvgs[s.hole_number].push(s.strokes - s.par)
  }
  const holeAvgList = Object.entries(holeAvgs).map(([h, ds]) => ({ hole: parseInt(h), avg: ds.reduce((a, b) => a + b, 0) / ds.length }))
  const bestHole  = holeAvgList.sort((a, b) => a.avg - b.avg)[0]
  const worstHole = holeAvgList.sort((a, b) => b.avg - a.avg)[0]

  // Social: head-to-head
  const playerMap: Record<string, { name: string; avatar_color: string; wins: number; draws: number; losses: number; rounds: number }> = {}
  for (const r of rounds) {
    for (const pid of r.players) {
      if (!playerMap[pid]) {
        const p = allPlayers.find(x => x.id === pid)
        playerMap[pid] = { name: p?.name ?? 'Jugador', avatar_color: p?.avatar_color ?? '#6b7a72', wins: 0, draws: 0, losses: 0, rounds: 0 }
      }
      playerMap[pid].rounds++
      if (r.won) playerMap[pid].wins++
      else playerMap[pid].losses++
    }
  }
  const companions = Object.entries(playerMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.rounds - a.rounds)
  const nemesis    = companions.length ? companions.reduce((a, b) => b.losses > a.losses ? b : a) : null

  // Club avg (others avg score)
  const otherRounds: Record<string, number[]> = {}
  for (const r of rounds) {
    for (const pid of r.players) {
      if (!otherRounds[pid]) otherRounds[pid] = []
      // We don't have their scores directly — skip for now
    }
  }

  // Filtered rounds for hoyos section
  const filteredRounds = hoyosPeriod === 'all' ? rounds : rounds.slice(0, parseInt(hoyosPeriod))
  const filteredScores = filteredRounds.flatMap(r => r.scores)

  const filteredParStats = [3, 4, 5].map(par => {
    const s = filteredScores.filter(h => h.par === par)
    if (!s.length) return null
    const avg = s.reduce((a, h) => a + h.strokes, 0) / s.length
    return {
      par, avg: parseFloat(avg.toFixed(2)), total: s.length,
      birdies: s.filter(h => h.strokes - h.par <= -1).length,
      pars:    s.filter(h => h.strokes - h.par === 0).length,
      bogeys:  s.filter(h => h.strokes - h.par === 1).length,
      doubles: s.filter(h => h.strokes - h.par >= 2).length,
    }
  }).filter(Boolean) as { par: number; avg: number; total: number; birdies: number; pars: number; bogeys: number; doubles: number }[]

  // Funny phrases based on win rate
  const winRate = n > 0 ? Math.round(totalWins / n * 100) : 0
  const winPhrase = winRate >= 70 ? '¡Eres el terror del campo!' : winRate >= 50 ? 'Ganando más que perdiendo, no está mal.' : winRate >= 30 ? 'Queda algo de margen de mejora... bastante.' : '¡Ni te rindas, ni te lo tomes tan en serio!'
  const lossPhrase = winRate >= 70 ? 'Los demás te deben mucho dinero.' : winRate >= 50 ? 'Al menos no eres el último... todavía.' : winRate >= 30 ? 'El golf te está enseñando humildad gratis.' : '¡El récord de derrotas también es un récord!'

  // Social: club averages for comparison
  const clubAvgGIR  = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.gir_total > 0 ? r.gir / r.gir_total * 100 : 0), 0) / rounds.length) : 0
  const clubAvgPutts = rounds.length ? parseFloat((rounds.reduce((a, r) => a + r.putts, 0) / rounds.length).toFixed(1)) : 0
  const clubAvgFW   = rounds.length ? Math.round(rounds.reduce((a, r) => a + (r.fairways_total > 0 ? r.fairways / r.fairways_total * 100 : 0), 0) / rounds.length) : 0
  const clubAvgPen  = rounds.length ? parseFloat((rounds.reduce((a, r) => a + r.penalties, 0) / rounds.length).toFixed(1)) : 0

  const SECTIONS = [
    { key: 'general', label: 'General' },
    { key: 'hoyos',   label: 'Hoyos' },
    { key: 'social',  label: 'Social' },
    { key: 'campos',  label: 'Campos' },
  ] as const

  const emptyState = (text: string) => (
    <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
      <p className="text-[#6b7a72] text-[14px]">{text}</p>
      <Link href="/ronda/campo" className="mt-3 inline-block text-[#1f8a5b] font-semibold text-[13px]">Empezar ronda →</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16] mb-3">Stats</h1>

        {/* Section tabs */}
        <div className="flex gap-1 bg-white rounded-full p-1 border border-[#e5e0d4] mb-4">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className="flex-1 py-1.5 rounded-full text-[11px] font-bold transition"
              style={{ backgroundColor: section === s.key ? '#0e1a16' : 'transparent', color: section === s.key ? '#fff' : '#6b7a72' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── GENERAL ── */}
        {section === 'general' && (
          <div className="space-y-3">
            {/* HCP hero */}
            <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
              <div className="relative">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">ÍNDICE WHS</p>
                    <p className="text-[52px] font-black text-white leading-none">{hcpIndex != null ? formatHandicap(hcpIndex) : '–'}</p>
                  </div>
                  <div className="text-right space-y-1.5 pb-1">
                    {[['MEJOR', bestScore ?? '–'], ['RONDAS', n], ['VICTORIAS', totalWins]].map(([l, v]) => (
                      <div key={String(l)}>
                        <p className="font-mono text-[8px] text-white/50 uppercase">{l}</p>
                        <p className="text-white font-black text-[16px] leading-none">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {hcpHistory.length >= 3 && <div className="opacity-60"><Sparkline values={hcpHistory} color="#1f8a5b"/></div>}
              </div>
            </div>

            {n > 0 ? (
              <>
                {/* KPIs grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Media golpes', value: avgScore ? String(avgScore) : '–', sub: avgDelta != null ? `${avgDelta > 0 ? '+' : ''}${avgDelta} vs par` : '' },
                    { label: 'Putts / ronda', value: avgPutts ?? '–', sub: '' },
                    { label: 'GIR %',         value: girPct != null ? `${girPct}%` : '–', sub: 'greens en reg.' },
                    { label: 'Calles %',      value: fwPct != null ? `${fwPct}%` : '–', sub: 'fairways' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide">{s.label}</p>
                      <p className="text-[22px] font-black text-[#0e1a16] mt-1 leading-none">{s.value}</p>
                      {s.sub && <p className="text-[10px] text-[#6b7a72] mt-0.5">{s.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* Score distribution bars */}
                <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                  <p className="font-bold text-[14px] text-[#0e1a16] mb-3">Distribución de resultados</p>
                  {[
                    { label: 'Birdie o mejor', count: totalBirdies, color: '#2a6fdb', bg: '#dde7fb' },
                    { label: 'Par',            count: totalPars,    color: '#1f8a5b', bg: '#d9eedd' },
                    { label: 'Bogey',          count: totalBogeys,  color: '#9b6e1a', bg: '#f6e6c4' },
                    { label: 'Doble +',        count: totalDoubles, color: '#a83a25', bg: '#fadcd6' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 mb-2">
                      <p className="text-[12px] text-[#6b7a72] w-28 flex-shrink-0">{s.label}</p>
                      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: '#f4f1e9' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(s.count / totalHolesP * 100)}%`, backgroundColor: s.bg, border: `1px solid ${s.color}22` }}/>
                      </div>
                      <p className="font-mono text-[11px] font-bold w-8 text-right" style={{ color: s.color }}>{Math.round(s.count / totalHolesP * 100)}%</p>
                    </div>
                  ))}
                </div>

                {/* Extra stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                    <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide">Mejor racha</p>
                    <p className="text-[22px] font-black text-[#0e1a16] mt-1 leading-none">{bestStreak}</p>
                    <p className="text-[10px] text-[#6b7a72] mt-0.5">rondas consecutivas</p>
                  </div>
                  <div className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                    <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide">Total golpes</p>
                    <p className="text-[22px] font-black text-[#0e1a16] mt-1 leading-none">{rounds.reduce((a, r) => a + r.total, 0).toLocaleString()}</p>
                    <p className="text-[10px] text-[#6b7a72] mt-0.5">en toda tu carrera</p>
                  </div>
                </div>

                {/* Recent rounds */}
                <div>
                  <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Historial reciente</h2>
                  <div className="space-y-2">
                    {rounds.slice(0, 6).map(r => {
                      const delta = r.total - r.real_par
                      return (
                        <Link key={r.id} href={`/resumen?round=${r.id}`}
                          className="bg-white rounded-[16px] p-3.5 border flex items-center gap-3 block"
                          style={{ borderColor: r.total === bestScore ? '#e8b75a' : '#e5e0d4' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[13px] text-[#0e1a16] truncate">{r.course_name}</p>
                              {r.total === bestScore && <span className="font-mono text-[8px] bg-[#f6e6c4] text-[#9b6e1a] px-1.5 py-0.5 rounded-full">PB</span>}
                              {r.won && <span className="font-mono text-[8px] bg-[#d9eedd] text-[#1f8a5b] px-1.5 py-0.5 rounded-full">WIN</span>}
                            </div>
                            <p className="text-[11px] text-[#6b7a72]">{formatDate(r.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-[18px] font-black text-[#0e1a16]">{r.total}</p>
                            <p className="font-mono text-[10px] font-bold" style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>{delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}</p>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : emptyState('Completa tu primera ronda para ver estadísticas.')}
          </div>
        )}

        {/* ── HOYOS ── */}
        {section === 'hoyos' && (
          <div className="space-y-3">
            {/* Period filter */}
            <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4]">
              {([['all','Todas'],['10','Últ. 10'],['5','Últ. 5'],['3','Últ. 3']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setHoyosPeriod(key)}
                  className="flex-1 py-1.5 rounded-full text-[11px] font-bold transition"
                  style={{ backgroundColor: hoyosPeriod === key ? '#0e1a16' : 'transparent', color: hoyosPeriod === key ? '#fff' : '#6b7a72' }}>
                  {label}
                </button>
              ))}
            </div>
            {filteredParStats.length > 0 ? (
              <>
                {/* Best / worst hole */}
                {bestHole && worstHole && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-1">Mejor hoyo</p>
                      <p className="text-[32px] font-black text-[#1f8a5b] leading-none">#{bestHole.hole}</p>
                      <p className="font-mono text-[11px] text-[#6b7a72] mt-1">{bestHole.avg > 0 ? '+' : ''}{bestHole.avg.toFixed(2)} vs par</p>
                    </div>
                    <div className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4]">
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-1">Peor hoyo</p>
                      <p className="text-[32px] font-black text-[#a83a25] leading-none">#{worstHole.hole}</p>
                      <p className="font-mono text-[11px] text-[#6b7a72] mt-1">+{worstHole.avg.toFixed(2)} vs par</p>
                    </div>
                  </div>
                )}

                {/* Par type breakdown */}
                {filteredParStats.map(ps => (
                  <div key={ps.par} className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#efebe1]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[16px] text-white" style={{ backgroundColor: ps.par === 3 ? '#2a6fdb' : ps.par === 4 ? '#1f8a5b' : '#d4a24a' }}>
                          P{ps.par}
                        </div>
                        <div>
                          <p className="font-bold text-[14px] text-[#0e1a16]">Par {ps.par}</p>
                          <p className="font-mono text-[10px] text-[#6b7a72]">{ps.total} hoyos jugados</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Media</p>
                        <p className="font-mono text-[24px] font-black text-[#0e1a16] leading-none">{ps.avg.toFixed(1)}</p>
                        <p className="font-mono text-[10px] font-bold" style={{ color: ps.avg - ps.par <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                          {(ps.avg - ps.par) > 0 ? '+' : ''}{(ps.avg - ps.par).toFixed(2)} vs par
                        </p>
                      </div>
                    </div>
                    {/* Distribution */}
                    <div className="grid grid-cols-4 divide-x divide-[#efebe1]">
                      {[
                        { label: 'Birdie-', count: ps.birdies, color: '#2a6fdb' },
                        { label: 'Par',     count: ps.pars,    color: '#1f8a5b' },
                        { label: 'Bogey',   count: ps.bogeys,  color: '#9b6e1a' },
                        { label: 'Dbl+',    count: ps.doubles, color: '#a83a25' },
                      ].map(d => (
                        <div key={d.label} className="py-3 text-center">
                          <p className="font-mono text-[9px] text-[#6b7a72] uppercase">{d.label}</p>
                          <p className="font-mono text-[18px] font-black mt-0.5 leading-none" style={{ color: d.color }}>{d.count}</p>
                          <p className="font-mono text-[9px] text-[#6b7a72] mt-0.5">{Math.round(d.count / ps.total * 100)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : emptyState('Necesitas más rondas para ver estadísticas por tipo de hoyo.')}
            <p className="font-mono text-[10px] text-[#6b7a72] text-center">
              {filteredRounds.length} ronda{filteredRounds.length !== 1 ? 's' : ''} analizadas
            </p>
          </div>
        )}

        {/* ── SOCIAL ── */}
        {section === 'social' && (
          <div className="space-y-3">
            {/* Win summary with funny phrase */}
            <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: winRate >= 50 ? '#1f8a5b' : '#c6432d', opacity: 0.85 }}/>
              <div className="relative">
                <div className="flex items-center gap-6 mb-3">
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">VICTORIAS</p>
                    <p className="text-[52px] font-black text-white leading-none">{totalWins}</p>
                    <p className="text-[12px] text-white/60 mt-1">de {n} rondas</p>
                  </div>
                  {n > 0 && (
                    <div>
                      <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">WIN RATE</p>
                      <p className="text-[28px] font-black leading-none" style={{ color: winRate >= 50 ? '#1f8a5b' : '#e8b75a' }}>{winRate}%</p>
                    </div>
                  )}
                </div>
                <div className="bg-white/10 rounded-[12px] px-3 py-2">
                  <p className="text-white text-[13px] font-semibold">{winRate >= 50 ? winPhrase : lossPhrase}</p>
                </div>
              </div>
            </div>

            {/* My metrics vs all rounds */}
            <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#efebe1]">
                <p className="font-bold text-[14px] text-[#0e1a16]">Mis métricas</p>
              </div>
              <div className="divide-y divide-[#efebe1]">
                {[
                  { label: 'Media golpes', value: avgScore ? `${avgScore} (${avgDelta! > 0 ? '+' : ''}${avgDelta})` : '–', icon: '⛳' },
                  { label: 'GIR %',        value: girPct != null ? `${girPct}%` : '–', icon: '🟩' },
                  { label: 'Calles %',     value: fwPct != null ? `${fwPct}%` : '–', icon: '🌿' },
                  { label: 'Putts / ronda',value: avgPutts ?? '–', icon: '🏌️' },
                  { label: 'Penalizaciones',value: rounds.length ? (rounds.reduce((a,r)=>a+r.penalties,0)/rounds.length).toFixed(1) : '–', icon: '⚠️' },
                  { label: 'Búnkers',      value: rounds.length ? (rounds.reduce((a,r)=>a+r.bunkers,0)/rounds.length).toFixed(1) : '–', icon: '🏖' },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-[13px] text-[#0e1a16]">{m.label}</p>
                    <p className="font-mono text-[14px] font-black text-[#0e1a16]">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nemesis */}
            {nemesis && (
              <div className="bg-white rounded-[16px] p-4 border border-[#fadcd6]">
                <p className="font-mono text-[9px] text-[#a83a25] uppercase tracking-wide mb-2">Tu némesis</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold" style={{ backgroundColor: nemesis.avatar_color }}>
                    {nemesis.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[15px] text-[#0e1a16]">{nemesis.name}</p>
                    <p className="text-[12px] text-[#6b7a72]">{nemesis.rounds} rondas juntos</p>
                  </div>
                  <p className="text-[13px] text-[#a83a25] font-semibold">te ganó {nemesis.losses}×</p>
                </div>
              </div>
            )}

            {/* Head-to-head con V-E-D */}
            {companions.length > 0 && (
              <div>
                <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Head-to-head</h2>
                <div className="space-y-2">
                  {companions.map(c => {
                    const total = c.wins + c.draws + c.losses
                    return (
                      <div key={c.id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: c.avatar_color }}>
                            {c.name[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-[14px] text-[#0e1a16]">{c.name}</p>
                            <p className="text-[11px] text-[#6b7a72]">{c.rounds} ronda{c.rounds !== 1 ? 's' : ''} juntos</p>
                          </div>
                        </div>
                        {/* V-E-D */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'V', count: c.wins,   color: '#1f8a5b', bg: '#d9eedd' },
                            { label: 'E', count: c.draws,  color: '#6b7a72', bg: '#f4f1e9' },
                            { label: 'D', count: c.losses, color: '#a83a25', bg: '#fadcd6' },
                          ].map(d => (
                            <div key={d.label} className="rounded-[12px] py-2.5 text-center" style={{ backgroundColor: d.bg }}>
                              <p className="font-mono text-[9px] uppercase tracking-wide font-bold" style={{ color: d.color }}>{d.label}</p>
                              <p className="font-mono text-[22px] font-black leading-none mt-0.5" style={{ color: d.color }}>{d.count}</p>
                            </div>
                          ))}
                        </div>
                        {/* Bar */}
                        {total > 0 && (
                          <div className="flex h-2 rounded-full overflow-hidden mt-2 gap-px">
                            {c.wins   > 0 && <div style={{ flex: c.wins,   backgroundColor: '#1f8a5b' }}/>}
                            {c.draws  > 0 && <div style={{ flex: c.draws,  backgroundColor: '#e5e0d4' }}/>}
                            {c.losses > 0 && <div style={{ flex: c.losses, backgroundColor: '#fadcd6' }}/>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {companions.length === 0 && emptyState('Juega rondas con amigos para ver comparativas.')}
          </div>
        )}

        {/* ── CAMPOS ── */}
        {section === 'campos' && (
          <div className="space-y-2">
            {selectedCourse && (() => {
              const c = courseStats.find(x => x.name === selectedCourse)
              if (!c) return null
              // Get rounds for this course
              const cRounds = rounds.filter(r => r.course_name === selectedCourse)
              const lastRound = cRounds[0]
              const bestRound = cRounds.length ? cRounds.reduce((a, b) => a.total < b.total ? a : b) : null

              // Get unique hole numbers from all scores in this course
              const holeNums = Array.from(new Set(cRounds.flatMap(r => r.scores.map(s => s.hole_number)))).sort((a, b) => a - b)
              // Per-hole: my last, my best
              const holeRows = holeNums.map(hn => {
                const lastS = lastRound?.scores.find(s => s.hole_number === hn)
                const allS  = cRounds.flatMap(r => r.scores.filter(s => s.hole_number === hn))
                const bestS = allS.length ? allS.reduce((a, b) => a.strokes < b.strokes ? a : b) : null
                const par   = lastS?.par ?? bestS?.par ?? 4
                return { hole_number: hn, par, my_last: lastS?.strokes ?? null, my_best: bestS?.strokes ?? null }
              })

              const scoreChip = (strokes: number | null, par: number) => {
                if (!strokes) return <span className="text-[#c4bfb5]">–</span>
                const d = strokes - par
                const bg = d <= -1 ? '#dde7fb' : d === 0 ? '#d9eedd' : d === 1 ? '#f6e6c4' : '#fadcd6'
                const tx = d <= -1 ? '#2a6fdb' : d === 0 ? '#1f8a5b' : d === 1 ? '#9b6e1a' : '#a83a25'
                return <div className="mx-auto w-7 h-7 rounded-[6px] flex items-center justify-center font-mono text-[12px] font-black" style={{ backgroundColor: bg, color: tx }}>{strokes}</div>
              }

              // Distribution comparison: last vs best
              const distFor = (r: typeof lastRound | null) => {
                if (!r) return { birdies: 0, pars: 0, bogeys: 0, doubles: 0 }
                return {
                  birdies: r.scores.filter(s => s.strokes - s.par <= -1).length,
                  pars:    r.scores.filter(s => s.strokes - s.par === 0).length,
                  bogeys:  r.scores.filter(s => s.strokes - s.par === 1).length,
                  doubles: r.scores.filter(s => s.strokes - s.par >= 2).length,
                }
              }
              const lastDist = distFor(lastRound)
              const bestDist = distFor(bestRound)

              return (
                <div className="space-y-3">
                  <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Todos los campos
                  </button>

                  {/* Course header */}
                  <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                    <p className="font-black text-[17px] text-[#0e1a16]">{c.name}</p>
                    <div className="flex gap-4 mt-2">
                      {[['Mejor', c.best], ['Media', c.avg], ['Rondas', c.rounds], ...(c.record ? [['Récord', c.record]] : [])].map(([l, v]) => (
                        <div key={String(l)}>
                          <p className="font-mono text-[9px] text-[#6b7a72] uppercase">{l}</p>
                          <p className="font-mono text-[16px] font-black text-[#0e1a16]">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distribution comparison */}
                  {lastRound && (
                    <div className="grid grid-cols-2 gap-2">
                      {[{ label: 'Última vuelta', dist: lastDist, score: lastRound.total }, { label: 'Mejor vuelta', dist: bestDist, score: bestRound?.total ?? c.best }].map(v => (
                        <div key={v.label} className="bg-white rounded-[16px] p-3 border border-[#e5e0d4]">
                          <p className="font-mono text-[9px] text-[#6b7a72] uppercase mb-1">{v.label}</p>
                          <p className="font-mono text-[22px] font-black text-[#0e1a16] mb-2">{v.score}</p>
                          {[
                            { label: 'Birdie-', count: v.dist.birdies, color: '#2a6fdb' },
                            { label: 'Par',     count: v.dist.pars,    color: '#1f8a5b' },
                            { label: 'Bogey',   count: v.dist.bogeys,  color: '#9b6e1a' },
                            { label: 'Dbl+',    count: v.dist.doubles, color: '#a83a25' },
                          ].map(d => (
                            <div key={d.label} className="flex items-center justify-between py-0.5">
                              <span className="text-[10px] text-[#6b7a72]">{d.label}</span>
                              <span className="font-mono text-[11px] font-bold" style={{ color: d.color }}>{d.count}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hole table: rows = holes, cols = my last / my best */}
                  {holeRows.length > 0 && (
                    <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
                      <table className="w-full text-center">
                        <thead>
                          <tr className="border-b border-[#efebe1] bg-[#f4f1e9]">
                            <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-3 text-left uppercase">Hoyo</td>
                            <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 uppercase">Par</td>
                            <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 uppercase">Última</td>
                            <td className="font-mono text-[9px] text-[#1f8a5b] py-2 px-2 uppercase">Mi mejor</td>
                            {c.record && <td className="font-mono text-[9px] text-[#e8b75a] py-2 px-2 uppercase">Récord</td>}
                          </tr>
                        </thead>
                        <tbody>
                          {holeRows.map(h => (
                            <tr key={h.hole_number} className="border-t border-[#efebe1]">
                              <td className="font-mono text-[12px] font-bold text-[#0e1a16] py-2 px-3 text-left">{h.hole_number}</td>
                              <td className="font-mono text-[11px] text-[#6b7a72] py-2 px-2">{h.par}</td>
                              <td className="py-2 px-2">{scoreChip(h.my_last, h.par)}</td>
                              <td className="py-2 px-2">{scoreChip(h.my_best, h.par)}</td>
                              {c.record && <td className="font-mono text-[11px] text-[#e8b75a] py-2 px-2 font-bold">–</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}

            {!selectedCourse && courseStats.length > 0 ? courseStats.map(c => {
              const deltaBest = c.best ? c.best - c.par : null
              const vsRecord  = c.record && c.best ? c.best - c.record : null
              // Evolution: is last score better than avg?
              const lastScore = c.last3[0]
              const trend = lastScore && c.avg ? (lastScore < c.avg ? 'up' : lastScore > c.avg ? 'down' : 'same') : 'same'

              return (
                <button key={c.name} onClick={() => setSelectedCourse(c.name)} className="w-full text-left bg-white rounded-[16px] p-4 border border-[#e5e0d4] active:scale-[0.99] transition block">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[14px] text-[#0e1a16] leading-tight truncate">{c.name}</p>
                        {trend === 'up'   && <span className="text-[#1f8a5b] text-[14px]">↑</span>}
                        {trend === 'down' && <span className="text-[#a83a25] text-[14px]">↓</span>}
                      </div>
                      <p className="font-mono text-[10px] text-[#6b7a72] mt-0.5">{c.rounds} ronda{c.rounds !== 1 ? 's' : ''} · Par {c.par}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Mejor</p>
                      <p className="font-mono text-[22px] font-black text-[#0e1a16] leading-none">{c.best}</p>
                      {deltaBest !== null && (
                        <p className="font-mono text-[10px] font-bold" style={{ color: deltaBest <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                          {deltaBest > 0 ? `+${deltaBest}` : deltaBest === 0 ? 'E' : deltaBest}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-[#efebe1]">
                    <div>
                      <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Media</p>
                      <p className="font-mono text-[14px] font-bold text-[#0e1a16]">{c.avg}</p>
                    </div>
                    {c.record && (
                      <div>
                        <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Récord</p>
                        <p className="font-mono text-[14px] font-bold text-[#e8b75a]">{c.record}</p>
                      </div>
                    )}
                    {vsRecord !== null && (
                      <div>
                        <p className="font-mono text-[9px] text-[#6b7a72] uppercase">vs Récord</p>
                        <p className="font-mono text-[14px] font-bold" style={{ color: vsRecord === 0 ? '#1f8a5b' : '#6b7a72' }}>
                          {vsRecord === 0 ? '= RÉCORD' : `+${vsRecord}`}
                        </p>
                      </div>
                    )}
                    {/* Last 3 scores trend */}
                    {c.last3.length >= 2 && (
                      <div className="ml-auto">
                        <p className="font-mono text-[9px] text-[#6b7a72] uppercase mb-1">Últimas</p>
                        <div className="flex gap-1 items-end">
                          {c.last3.slice(0, 3).reverse().map((s, i) => (
                            <span key={i} className="font-mono text-[11px] font-bold text-[#0e1a16]">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="font-mono text-[9px] text-[#1f8a5b] mt-2">Ver detalle →</p>
                </button>
              )
            }) : emptyState('Completa rondas en distintos campos para ver comparativas.')}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  )
}
