import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { formatDate, formatHandicap } from '@/lib/golf'
import { Avatar, avatarColor } from '@/components/ui/avatar'

function Sparkline({ values, color = '#1f8a5b' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const w = 200, h = 40, pad = 4
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => `${pad + (i / (values.length - 1)) * (w - pad * 2)},${pad + ((max - v) / range) * (h - pad * 2)}`).join(' ')
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const PAR_TYPES = [3, 4, 5]

const SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'hoyos',   label: 'Hoyos' },
  { key: 'social',  label: 'Social' },
  { key: 'campos',  label: 'Campos' },
] as const

// Per-player phrase (shown when comparing)
function playerPhrase(wins: number, losses: number): string {
  const r = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : 0
  if (r >= 70) return '¡Le tienes tomada la medida!'
  if (r >= 50) return 'Más victorias que derrotas. Por ahora.'
  if (r >= 30) return 'Él te gana más de lo que quisieras.'
  return 'Te tiene cogido el punto. Toca revancha.'
}

const emptyState = (text: string) => (
  <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
    <p className="text-[#6b7a72] text-[14px]">{text}</p>
    <Link to="/round/course" className="mt-3 inline-block text-[#1f8a5b] font-semibold text-[13px]">Empezar ronda →</Link>
  </div>
)

// ── Types ─────────────────────────────────────────────────────
type RoundStat = {
  id: string; date: string; course_id: string; course_name: string
  total: number; real_par: number; putts: number
  gir: number; gir_total: number; fairways: number; fairways_total: number
  penalties: number; bunkers: number; players: string[]; won: boolean
  scores: { hole_number: number; strokes: number; par: number }[]
}
type OtherPlayer = { id: string; name: string; avatar_color: string }
type StatScore = {
  round_id: string; profile_id: string; hole_number: number
  strokes: number | null; putts: number | null; gir: boolean | null
  fairway: boolean | null; penalties: number | null; in_bunker: boolean | null
}
type CourseStat = { name: string; best: number; avg: number; par: number; rounds: number; record: number | null; last3: number[] }
type Companion = { id: string; name: string; avatar_color: string; wins: number; draws: number; losses: number; rounds: number }
type HoleAvg = { hole: number; avg: number }

export default function StatsPage() {
  const data = useQuery(api.stats.forUser)
  const me = useQuery(api.profiles.me)
  const [section, setSection]       = useState<'general'|'hoyos'|'social'|'campos'>('general')
  const [courseType, setCourseType] = useState<'golf'|'pp'>('golf')

  const myId = me?._id ?? ''
  const statScores = useMemo(() => (data?.scores ?? []) as unknown as StatScore[], [data])

  const rounds: RoundStat[] = useMemo(() => {
    if (!data) return []
    // Build each round and keep only total > 0 of the active course type in a single pass.
    return data.rounds.flatMap((r) => {
      const course = r.course
      const myS  = statScores.filter(s => s.round_id === r.id && s.profile_id === myId)
      const allS = statScores.filter(s => s.round_id === r.id)
      const courseHoles = data.holes.filter(h => h.course_id === r.course_id)
      const realPar = courseHoles.reduce((a, h) => a + h.par, 0) || course?.par || 72
      const coPlayers = data.roundPlayers.flatMap(rp => rp.round_id === r.id ? [rp.profile_id] : [])
      const myTotal  = myS.reduce((a, s) => a + (s.strokes ?? 0), 0)
      const allTotals = Array.from(new Set(allS.map(s => s.profile_id))).flatMap(pid => {
        const total = allS.filter(s => s.profile_id === pid).reduce((a, s) => a + (s.strokes ?? 0), 0)
        return total > 0 ? [{ pid, total }] : []
      })
      const won = allTotals.length > 0 && myTotal === Math.min(...allTotals.map(p => p.total)) && myTotal > 0
      const holeScores = myS.filter(s => s.strokes != null).map(s => {
        const h = courseHoles.find(h => h.hole_number === s.hole_number)
        return { hole_number: s.hole_number, strokes: s.strokes!, par: h?.par ?? 4 }
      })
      const courseName = course?.name ?? 'Campo'
      // Drop rounds with no score or of the other course type — drives every stat below.
      if (!(myTotal > 0 && (courseType === 'pp') === courseName.startsWith('P&P'))) return []
      return [{
        id: r.id, date: r.date, course_id: r.course_id, course_name: courseName,
        total: myTotal, real_par: realPar,
        putts: myS.reduce((a, s) => a + (s.putts ?? 0), 0),
        gir: myS.filter(s => s.gir).length, gir_total: myS.length,
        fairways: myS.filter(s => s.fairway === true).length, fairways_total: myS.filter(s => s.fairway !== null).length,
        penalties: myS.reduce((a, s) => a + (s.penalties ?? 0), 0),
        bunkers: myS.filter(s => s.in_bunker).length,
        players: coPlayers, won, scores: holeScores,
      }]
    })
  }, [data, statScores, myId, courseType])

  // Course stats
  const courseStats: CourseStat[] = useMemo(() => {
    const cMap: Record<string, { name: string; scores: number[]; par: number; record: number | null }> = {}
    const coursesById = new Map((data?.courses ?? []).map(c => [String(c.id), c]))
    for (const r of rounds) {
      if (!cMap[r.course_id]) {
        const cd = coursesById.get(String(r.course_id))
        cMap[r.course_id] = { name: r.course_name, scores: [], par: r.real_par, record: cd?.record_score ?? null }
      }
      if (r.total > 0) cMap[r.course_id].scores.push(r.total)
    }
    return Object.values(cMap).map(c => ({
      name: c.name, par: c.par, record: c.record,
      best: c.scores.length ? Math.min(...c.scores) : 0,
      avg:  c.scores.length ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length) : 0,
      rounds: c.scores.length,
      last3: c.scores.slice(0, 3),
    })).sort((a, b) => b.rounds - a.rounds)
  }, [rounds, data])

  if (data === undefined || me === undefined) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  // Build derived data from the single stats query
  const hcpIndex: number | null = courseType === 'pp'
    ? (me?.handicap_index_pp ?? null)
    : (me?.handicap_index ?? data?.myHandicap ?? null)
  const hcpHistory: number[] = (data?.whsHistory ?? [])
    .flatMap(d => (courseType === 'pp') === !!d.is_pp ? [parseFloat(d.differential.toFixed(1))] : [])
  const allPlayers: OtherPlayer[] = data?.otherPlayers ?? []

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

  // Best/worst hole
  const holeAvgs: Record<number, number[]> = {}
  for (const s of allScores) {
    if (!holeAvgs[s.hole_number]) holeAvgs[s.hole_number] = []
    holeAvgs[s.hole_number].push(s.strokes - s.par)
  }
  const holeAvgList = Object.entries(holeAvgs).map(([h, ds]) => ({ hole: parseInt(h), avg: ds.reduce((a, b) => a + b, 0) / ds.length }))
  const bestHole  = holeAvgList.length ? holeAvgList.reduce((best, x) => x.avg < best.avg ? x : best) : undefined
  const worstHole = holeAvgList.length ? holeAvgList.reduce((worst, x) => x.avg > worst.avg ? x : worst) : undefined

  // Social: head-to-head
  const playerMap: Record<string, { name: string; avatar_color: string; wins: number; draws: number; losses: number; rounds: number }> = {}
  const playersById = new Map(allPlayers.map(x => [x.id, x]))
  for (const r of rounds) {
    for (const pid of r.players) {
      if (!playerMap[pid]) {
        const p = playersById.get(pid)
        playerMap[pid] = { name: p?.name ?? 'Jugador', avatar_color: p?.avatar_color ?? '#6b7a72', wins: 0, draws: 0, losses: 0, rounds: 0 }
      }
      playerMap[pid].rounds++
      if (r.won) playerMap[pid].wins++
      else playerMap[pid].losses++
    }
  }
  const companions = Object.entries(playerMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.rounds - a.rounds)
  const nemesis    = companions.length ? companions.reduce((a, b) => b.losses > a.losses ? b : a) : null

  // Funny phrases — global (shown when no player selected)
  const winRate = n > 0 ? Math.round(totalWins / n * 100) : 0
  const winPhrase = winRate >= 70 ? '¡Eres el terror del campo!' : winRate >= 50 ? 'Ganando más que perdiendo, no está mal.' : winRate >= 30 ? 'Queda algo de margen de mejora... bastante.' : '¡Ni te rindas, ni te lo tomes tan en serio!'
  const lossPhrase = winRate >= 70 ? 'Los demás te deben mucho dinero.' : winRate >= 50 ? 'Al menos no eres el último... todavía.' : winRate >= 30 ? 'El golf te está enseñando humildad gratis.' : '¡El récord de derrotas también es un récord!'

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header sticky */}
      <div className="sticky top-0 bg-[#f4f1e9] z-40 px-[14px] pb-3 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16] mb-2">Stats</h1>
        <div className="flex gap-1 bg-white rounded-full p-1 border border-[#e5e0d4] mb-2">
          {SECTIONS.map(s => (
            <button type="button" key={s.key} onClick={() => setSection(s.key)}
              className="flex-1 py-1.5 rounded-full text-[11px] font-bold transition"
              style={{ backgroundColor: section === s.key ? '#0e1a16' : 'transparent', color: section === s.key ? '#fff' : '#6b7a72' }}>
              {s.label}
            </button>
          ))}
        </div>
        {/* Golf / P&P filter — applies to every stat */}
        <div className="flex gap-1.5">
          {([['golf','Golf'],['pp','Pitch & Putt']] as const).map(([key, label]) => (
            <button type="button" key={key} onClick={() => setCourseType(key)}
              className="flex-1 py-1.5 rounded-full text-[11px] font-bold border transition"
              style={{ backgroundColor: courseType === key ? '#1f8a5b' : '#fff', color: courseType === key ? '#fff' : '#6b7a72', borderColor: courseType === key ? '#1f8a5b' : '#e5e0d4' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-[14px] pt-4 pb-4">
        {section === 'general' && (
          <GeneralSection
            rounds={rounds} n={n} hcpIndex={hcpIndex} hcpHistory={hcpHistory}
            bestScore={bestScore} totalWins={totalWins} avgScore={avgScore} avgDelta={avgDelta}
            avgPutts={avgPutts} girPct={girPct} fwPct={fwPct}
            totalBirdies={totalBirdies} totalPars={totalPars} totalBogeys={totalBogeys}
            totalDoubles={totalDoubles} totalHolesP={totalHolesP}
          />
        )}
        {section === 'hoyos' && (
          <HoyosSection rounds={rounds} bestHole={bestHole} worstHole={worstHole} />
        )}
        {section === 'social' && (
          <SocialSection
            rounds={rounds} n={n} totalWins={totalWins} companions={companions} nemesis={nemesis}
            allPlayers={allPlayers} myId={myId} winPhrase={winPhrase} lossPhrase={lossPhrase}
            avgScore={avgScore} girPct={girPct} fwPct={fwPct} avgPutts={avgPutts}
          />
        )}
        {/* key=courseType resets the selected course when switching golf/P&P */}
        {section === 'campos' && (
          <CamposSection key={courseType} rounds={rounds} courseStats={courseStats} />
        )}
      </div>
    </div>
  )
}

// ── GENERAL ──────────────────────────────────────────────────
function GeneralSection({
  rounds, n, hcpIndex, hcpHistory, bestScore, totalWins, avgScore, avgDelta,
  avgPutts, girPct, fwPct, totalBirdies, totalPars, totalBogeys, totalDoubles, totalHolesP,
}: {
  rounds: RoundStat[]; n: number; hcpIndex: number | null; hcpHistory: number[]
  bestScore: number | null; totalWins: number; avgScore: number | null; avgDelta: number | null
  avgPutts: string | null; girPct: number | null; fwPct: number | null
  totalBirdies: number; totalPars: number; totalBogeys: number; totalDoubles: number; totalHolesP: number
}) {
  return (
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


          {/* Recent rounds */}
          <div>
            <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Historial reciente</h2>
            <div className="space-y-2">
              {rounds.slice(0, 6).map(r => {
                const delta = r.total - r.real_par
                return (
                  <Link key={r.id} to={`/scorecard?round=${r.id}`}
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
  )
}

// ── HOYOS ────────────────────────────────────────────────────
function HoyosSection({
  rounds, bestHole, worstHole,
}: {
  rounds: RoundStat[]; bestHole: HoleAvg | undefined; worstHole: HoleAvg | undefined
}) {
  const [hoyosPeriod, setHoyosPeriod] = useState<'all'|'10'|'5'|'3'>('all')

  const filteredRounds = hoyosPeriod === 'all' ? rounds : rounds.slice(0, parseInt(hoyosPeriod))
  const filteredScores = filteredRounds.flatMap(r => r.scores)

  const filteredParStats = [3, 4, 5].flatMap(par => {
    const s = filteredScores.filter(h => h.par === par)
    if (!s.length) return []
    const avg = s.reduce((a, h) => a + h.strokes, 0) / s.length
    return [{
      par, avg: parseFloat(avg.toFixed(2)), total: s.length,
      birdies: s.filter(h => h.strokes - h.par <= -1).length,
      pars:    s.filter(h => h.strokes - h.par === 0).length,
      bogeys:  s.filter(h => h.strokes - h.par === 1).length,
      doubles: s.filter(h => h.strokes - h.par >= 2).length,
    }]
  })

  return (
    <div className="space-y-3">
      {/* Period filter */}
      <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4]">
        {([['all','Todas'],['10','Últ. 10'],['5','Últ. 5'],['3','Últ. 3']] as const).map(([key, label]) => (
          <button type="button" key={key} onClick={() => setHoyosPeriod(key)}
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
  )
}

// ── SOCIAL ───────────────────────────────────────────────────
function SocialSection({
  rounds, n, totalWins, companions, nemesis, allPlayers, myId, winPhrase, lossPhrase,
  avgScore, girPct, fwPct, avgPutts,
}: {
  rounds: RoundStat[]; n: number; totalWins: number; companions: Companion[]
  nemesis: Companion | null; allPlayers: OtherPlayer[]; myId: string
  winPhrase: string; lossPhrase: string
  avgScore: number | null; girPct: number | null; fwPct: number | null; avgPutts: string | null
}) {
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(null)
  const [socialPeriod, setSocialPeriod]       = useState<'all'|'10'|'5'|'3'>('all')

  // Social filtered rounds
  const socialRounds = socialPeriod === 'all' ? rounds : rounds.slice(0, parseInt(socialPeriod))
  const sAvgScore = socialRounds.length ? Math.round(socialRounds.reduce((a, r) => a + r.total, 0) / socialRounds.length) : null
  const sAvgDelta = socialRounds.length ? Math.round(socialRounds.reduce((a, r) => a + (r.total - r.real_par), 0) / socialRounds.length) : null
  const sGirPct   = socialRounds.length ? Math.round(socialRounds.reduce((a, r) => a + (r.gir_total > 0 ? r.gir / r.gir_total * 100 : 0), 0) / socialRounds.length) : null
  const sFwPct    = socialRounds.length ? Math.round(socialRounds.reduce((a, r) => a + (r.fairways_total > 0 ? r.fairways / r.fairways_total * 100 : 0), 0) / socialRounds.length) : null
  const sPutts    = socialRounds.length ? parseFloat((socialRounds.reduce((a, r) => a + r.putts, 0) / socialRounds.length).toFixed(1)) : null
  const sPen      = socialRounds.length ? parseFloat((socialRounds.reduce((a, r) => a + r.penalties, 0) / socialRounds.length).toFixed(1)) : null
  const sBunkers  = socialRounds.length ? parseFloat((socialRounds.reduce((a, r) => a + r.bunkers, 0) / socialRounds.length).toFixed(1)) : null

  return (
    <div className="space-y-3">
      {/* Win summary — changes based on selected player */}
      {(() => {
        const selPlayer = comparePlayerId ? companions.find(c => c.id === comparePlayerId) : null
        const wins   = selPlayer ? selPlayer.wins   : totalWins
        const losses = selPlayer ? selPlayer.losses : n - totalWins
        const total  = selPlayer ? selPlayer.rounds : n
        const rate   = total > 0 ? Math.round(wins / total * 100) : 0
        const phrase = selPlayer ? playerPhrase(wins, losses) : (rate >= 50 ? winPhrase : lossPhrase)
        return (
          <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
            <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: rate >= 50 ? '#1f8a5b' : '#c6432d', opacity: 0.85 }}/>
            <div className="relative">
              <div className="flex items-center gap-6 mb-3">
                <div>
                  <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">
                    {selPlayer ? `VS ${selPlayer.name.split(' ')[0].toUpperCase()}` : 'VICTORIAS TOTALES'}
                  </p>
                  <p className="text-[52px] font-black text-white leading-none">{wins}</p>
                  <p className="text-[12px] text-white/60 mt-1">de {total} rondas{selPlayer ? ' juntos' : ''}</p>
                </div>
                {total > 0 && (
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">WIN RATE</p>
                    <p className="text-[28px] font-black leading-none" style={{ color: rate >= 50 ? '#1f8a5b' : '#e8b75a' }}>{rate}%</p>
                    {selPlayer && (
                      <div className="mt-1">
                        <p className="font-mono text-[9px] text-white/50 uppercase">DERROTAS</p>
                        <p className="text-[20px] font-black text-[#fadcd6] leading-none">{losses}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-white/10 rounded-[12px] px-3 py-2">
                <p className="text-white text-[13px] font-semibold">{phrase}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Period + player selector */}
      <div className="flex gap-2">
        <div className="flex gap-1 bg-white rounded-full p-1 border border-[#e5e0d4] flex-1">
          {([['all','Todas'],['10','Últ. 10'],['5','Últ. 5'],['3','Últ. 3']] as const).map(([key, label]) => (
            <button type="button" key={key} onClick={() => setSocialPeriod(key)}
              className="flex-1 py-1.5 rounded-full text-[10px] font-bold transition"
              style={{ backgroundColor: socialPeriod === key ? '#0e1a16' : 'transparent', color: socialPeriod === key ? '#fff' : '#6b7a72' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas con selector de jugador integrado */}
      <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
        {/* Header con selector */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#efebe1]">
          <p className="font-bold text-[14px] text-[#0e1a16] flex-1">Métricas</p>
          <select value={comparePlayerId ?? ''} onChange={e => setComparePlayerId(e.target.value || null)}
            className="text-[12px] font-semibold text-[#0e1a16] bg-[#f4f1e9] border border-[#e5e0d4] rounded-full px-3 py-1.5 outline-none max-w-[140px]">
            <option value="">Solo yo</option>
            {companions.map(c => <option key={c.id} value={c.id}>{c.name.split(' ')[0]}</option>)}
          </select>
        </div>
        {/* Column headers if comparing */}
        {comparePlayerId && (() => {
          const other = companions.find(c => c.id === comparePlayerId)
          return other ? (
            <div className="grid grid-cols-3 border-b border-[#efebe1] bg-[#f4f1e9]">
              <div className="py-2 px-4"/>
              <div className="py-2 px-2 text-center">
                <p className="font-mono text-[9px] text-[#1f8a5b] font-bold uppercase">Tú</p>
              </div>
              <div className="py-2 px-2 text-center">
                <p className="font-mono text-[9px] font-bold uppercase truncate" style={{ color: other.avatar_color }}>{other.name.split(' ')[0]}</p>
              </div>
            </div>
          ) : null
        })()}
        {/* Rows */}
        {(() => {
          const other = comparePlayerId ? companions.find(c => c.id === comparePlayerId) : null
          const otherRounds = other ? rounds.filter(r => r.players.includes(other.id)) : []
          const oSocialR = socialPeriod === 'all' ? otherRounds : otherRounds.slice(0, parseInt(socialPeriod))
          const oAvg  = oSocialR.length ? Math.round(oSocialR.reduce((a,r)=>a+r.total,0)/oSocialR.length) : null
          const oGir  = oSocialR.length ? Math.round(oSocialR.reduce((a,r)=>a+(r.gir_total>0?r.gir/r.gir_total*100:0),0)/oSocialR.length) : null
          const oFw   = oSocialR.length ? Math.round(oSocialR.reduce((a,r)=>a+(r.fairways_total>0?r.fairways/r.fairways_total*100:0),0)/oSocialR.length) : null
          const oPutt = oSocialR.length ? parseFloat((oSocialR.reduce((a,r)=>a+r.putts,0)/oSocialR.length).toFixed(1)) : null
          const oPen  = oSocialR.length ? parseFloat((oSocialR.reduce((a,r)=>a+r.penalties,0)/oSocialR.length).toFixed(1)) : null
          const oBunk = oSocialR.length ? parseFloat((oSocialR.reduce((a,r)=>a+r.bunkers,0)/oSocialR.length).toFixed(1)) : null

          const rows = [
            { label: 'Media golpes', mine: sAvgScore ? `${sAvgScore} (${sAvgDelta!=null&&sAvgDelta>0?'+':''}${sAvgDelta})` : '–', theirs: oAvg ? `${oAvg}` : '–', mineN: sAvgScore, theirN: oAvg, lower: true },
            { label: 'GIR %',        mine: sGirPct!=null?`${sGirPct}%`:'–', theirs: oGir!=null?`${oGir}%`:'–', mineN: sGirPct, theirN: oGir, lower: false },
            { label: 'Calles %',     mine: sFwPct!=null?`${sFwPct}%`:'–',  theirs: oFw!=null?`${oFw}%`:'–',   mineN: sFwPct,  theirN: oFw,   lower: false },
            { label: 'Putts/ronda',  mine: sPutts??'–',   theirs: oPutt??'–',  mineN: sPutts?parseFloat(String(sPutts)):null,  theirN: oPutt, lower: true },
            { label: 'Penalizaciones', mine: sPen??'–',   theirs: oPen??'–',   mineN: sPen?parseFloat(String(sPen)):null,    theirN: oPen,  lower: true },
            { label: 'Búnkers',      mine: sBunkers??'–', theirs: oBunk??'–',  mineN: sBunkers?parseFloat(String(sBunkers)):null, theirN: oBunk, lower: true },
          ]

          return (
            <div className="divide-y divide-[#efebe1]">
              {rows.map(row => {
                const mineWins  = other && row.mineN!=null && row.theirN!=null && (row.lower ? row.mineN < row.theirN : row.mineN > row.theirN)
                const theirWins = other && row.mineN!=null && row.theirN!=null && (row.lower ? row.theirN < row.mineN : row.theirN > row.mineN)
                return (
                  <div key={row.label} className={`${other ? 'grid grid-cols-3' : 'flex items-center justify-between'} px-4 py-2.5`}>
                    <p className="text-[12px] text-[#6b7a72] py-0.5">{row.label}</p>
                    {other ? (
                      <>
                        <div className="text-center py-0.5 rounded-[6px] mx-1" style={{ backgroundColor: mineWins ? '#d9eedd' : 'transparent' }}>
                          <p className="font-mono text-[14px] font-black" style={{ color: mineWins ? '#1f8a5b' : '#0e1a16' }}>{row.mine}</p>
                        </div>
                        <div className="text-center py-0.5 rounded-[6px] mx-1" style={{ backgroundColor: theirWins ? '#fadcd6' : 'transparent' }}>
                          <p className="font-mono text-[14px] font-black" style={{ color: theirWins ? '#a83a25' : '#0e1a16' }}>{row.theirs}</p>
                        </div>
                      </>
                    ) : (
                      <p className="font-mono text-[14px] font-black text-[#0e1a16]">{row.mine}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Nemesis — solo si te han ganado alguna vez */}
      <SocialNemesis nemesis={nemesis} />

      {/* Comparativa con usuario seleccionado */}
      {companions.length > 0 && (
        <SocialCompareMetrics
          rounds={rounds} companions={companions} allPlayers={allPlayers} myId={myId}
          comparePlayerId={comparePlayerId} setComparePlayerId={setComparePlayerId}
          avgScore={avgScore} girPct={girPct} fwPct={fwPct} avgPutts={avgPutts}
        />
      )}

      {/* Head-to-head con V-E-D */}
      {companions.length > 0 && <SocialHeadToHead companions={companions} />}

      {companions.length === 0 && emptyState('Juega rondas con amigos para ver comparativas.')}
    </div>
  )
}

function SocialNemesis({ nemesis }: { nemesis: Companion | null }) {
  if (!nemesis || nemesis.losses <= 0) return null
  return (
    <div className="bg-white rounded-[16px] p-4 border border-[#fadcd6]">
      <p className="font-mono text-[9px] text-[#a83a25] uppercase tracking-wide mb-2">Tu némesis</p>
      <div className="flex items-center gap-3">
        <Avatar name={nemesis.name} size={44} />
        <div className="flex-1">
          <p className="font-bold text-[15px] text-[#0e1a16]">{nemesis.name}</p>
          <p className="text-[12px] text-[#6b7a72]">{nemesis.rounds} rondas juntos</p>
        </div>
        <p className="text-[13px] text-[#a83a25] font-semibold">te ganó {nemesis.losses}×</p>
      </div>
    </div>
  )
}

function SocialCompareMetrics({
  rounds, companions, allPlayers, myId, comparePlayerId, setComparePlayerId,
  avgScore, girPct, fwPct, avgPutts,
}: {
  rounds: RoundStat[]; companions: Companion[]; allPlayers: OtherPlayer[]; myId: string
  comparePlayerId: string | null; setComparePlayerId: (id: string | null) => void
  avgScore: number | null; girPct: number | null; fwPct: number | null; avgPutts: string | null
}) {
  return (
    <div>
      <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Comparar métricas</h2>
      {/* Player selector */}
      <div className="flex gap-2 flex-wrap mb-3">
        {companions.map(c => (
          <button type="button" key={c.id} onClick={() => setComparePlayerId(comparePlayerId === c.id ? null : c.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-full border transition text-[12px] font-bold"
            style={{ backgroundColor: comparePlayerId === c.id ? avatarColor(c.name) : '#fff', borderColor: comparePlayerId === c.id ? avatarColor(c.name) : '#e5e0d4', color: comparePlayerId === c.id ? '#fff' : '#0e1a16' }}>
            <Avatar name={c.name} size={20} />
            {c.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Side-by-side comparison */}
      {comparePlayerId && (() => {
        const other = companions.find(c => c.id === comparePlayerId)
        if (!other) return null
        // Get other's rounds stats
        const otherRounds = rounds.filter(r => r.players.includes(comparePlayerId))
        const oAvgScore = otherRounds.length ? Math.round(otherRounds.reduce((a, r) => a + r.total, 0) / otherRounds.length) : null
        const oGirPct   = otherRounds.length ? Math.round(otherRounds.reduce((a, r) => a + (r.gir_total > 0 ? r.gir / r.gir_total * 100 : 0), 0) / otherRounds.length) : null
        const oFwPct    = otherRounds.length ? Math.round(otherRounds.reduce((a, r) => a + (r.fairways_total > 0 ? r.fairways / r.fairways_total * 100 : 0), 0) / otherRounds.length) : null
        const oPutts    = otherRounds.length ? parseFloat((otherRounds.reduce((a, r) => a + r.putts, 0) / otherRounds.length).toFixed(1)) : null

        const rows = [
          { label: 'Media golpes', mine: avgScore, theirs: oAvgScore, lower: true },
          { label: 'GIR %',         mine: girPct != null ? `${girPct}%` : null, theirs: oGirPct != null ? `${oGirPct}%` : null, lower: false },
          { label: 'Calles %',      mine: fwPct != null ? `${fwPct}%` : null,  theirs: oFwPct != null ? `${oFwPct}%` : null,  lower: false },
          { label: 'Putts / ronda', mine: avgPutts, theirs: oPutts, lower: true },
        ]

        return (
          <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-[#efebe1]">
              <div className="py-3 px-3"/>
              <div className="py-3 px-3 text-center border-l border-[#efebe1]">
                <Avatar name={(allPlayers.find(p => p.id === myId) as any)?.name ?? 'Tú'} size={28} className="mx-auto mb-0.5" />
                <p className="font-mono text-[9px] text-[#6b7a72] uppercase">Tú</p>
              </div>
              <div className="py-3 px-3 text-center border-l border-[#efebe1]">
                <Avatar name={other.name} size={28} className="mx-auto mb-0.5" />
                <p className="font-mono text-[9px] text-[#6b7a72] uppercase truncate">{other.name.split(' ')[0]}</p>
              </div>
            </div>
            {rows.map(row => {
              const mineN = typeof row.mine === 'number' ? row.mine : null
              const theirN = typeof row.theirs === 'number' ? row.theirs : null
              const mineWins  = mineN !== null && theirN !== null && (row.lower ? mineN < theirN : mineN > theirN)
              const theirWins = mineN !== null && theirN !== null && (row.lower ? theirN < mineN : theirN > mineN)
              return (
                <div key={row.label} className="grid grid-cols-3 border-t border-[#efebe1]">
                  <div className="py-2.5 px-3 flex items-center">
                    <p className="text-[11px] text-[#6b7a72]">{row.label}</p>
                  </div>
                  <div className="py-2.5 px-3 text-center border-l border-[#efebe1]" style={{ backgroundColor: mineWins ? '#d9eedd' : 'transparent' }}>
                    <p className="font-mono text-[14px] font-black" style={{ color: mineWins ? '#1f8a5b' : '#0e1a16' }}>{row.mine ?? '–'}</p>
                  </div>
                  <div className="py-2.5 px-3 text-center border-l border-[#efebe1]" style={{ backgroundColor: theirWins ? '#fadcd6' : 'transparent' }}>
                    <p className="font-mono text-[14px] font-black" style={{ color: theirWins ? '#a83a25' : '#0e1a16' }}>{row.theirs ?? '–'}</p>
                  </div>
                </div>
              )
            })}
            <div className="grid grid-cols-3 border-t border-[#e5e0d4] bg-[#f4f1e9]">
              <div className="py-2 px-3"><p className="text-[10px] text-[#6b7a72]">Victorias juntos</p></div>
              <div className="py-2 px-3 text-center border-l border-[#efebe1]">
                <p className="font-mono text-[13px] font-black text-[#1f8a5b]">{other.wins}</p>
              </div>
              <div className="py-2 px-3 text-center border-l border-[#efebe1]">
                <p className="font-mono text-[13px] font-black text-[#a83a25]">{other.losses}</p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function SocialHeadToHead({ companions }: { companions: Companion[] }) {
  return (
    <div>
      <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2">Head-to-head</h2>
      <div className="space-y-2">
        {companions.map(c => {
          const total = c.wins + c.draws + c.losses
          return (
            <div key={c.id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={c.name} size={40} />
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
  )
}

// ── CAMPOS ───────────────────────────────────────────────────
function CamposSection({
  rounds, courseStats,
}: {
  rounds: RoundStat[]; courseStats: CourseStat[]
}) {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  return (
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
            <button type="button" onClick={() => setSelectedCourse(null)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
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

      {!selectedCourse && courseStats.length > 0 ? courseStats
        .map(c => {
        const deltaBest = c.best ? c.best - c.par : null
        const vsRecord  = c.record && c.best ? c.best - c.record : null
        // Evolution: is last score better than avg?
        const lastScore = c.last3[0]
        const trend = lastScore && c.avg ? (lastScore < c.avg ? 'up' : lastScore > c.avg ? 'down' : 'same') : 'same'

        return (
          <button type="button" key={c.name} onClick={() => setSelectedCourse(c.name)} className="w-full text-left bg-white rounded-[16px] p-4 border border-[#e5e0d4] active:scale-[0.99] transition block">
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
                      <span key={`${s}-${i}`} className="font-mono text-[11px] font-bold text-[#0e1a16]">{s}</span>
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
  )
}
