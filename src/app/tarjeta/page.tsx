'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { scoreChipClass, stablefordPts, strokesReceived } from '@/lib/golf'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_color: string; course_handicap: number; is_guest: boolean }
type Hole   = { hole_number: number; par: number; stroke_index: number }
type Score  = { profile_id: string; hole_number: number; strokes: number | null }

const SPINNER = <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

type ViewMode = 'stroke' | 'stableford'

function TarjetaPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const roundId      = searchParams.get('round') ?? ''

  const [players, setPlayers]     = useState<Player[]>([])
  const [holes, setHoles]         = useState<Hole[]>([])
  const [scores, setScores]       = useState<Score[]>([])
  const [courseName, setCourse]   = useState('')
  const [totalHoles, setTotal]    = useState(18)
  const [modes, setModes]         = useState<string[]>(['stroke'])
  const [viewMode, setViewMode]   = useState<ViewMode>('stroke')
  const [myId, setMyId]           = useState('')
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!roundId) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setMyId(user.id)

      const { data: round } = await supabase.from('rounds').select('course_id, courses(name, holes_count)').eq('id', roundId).single()
      if (!round) return
      const course = Array.isArray(round.courses) ? round.courses[0] : round.courses as any
      setCourse(course?.name ?? '')
      setTotal(course?.holes_count ?? 18)

      const { data: h }   = await supabase.from('holes').select('hole_number, par, stroke_index').eq('course_id', round.course_id).order('hole_number')
      const { data: rps } = await supabase.from('round_players').select('profile_id, is_guest, course_handicap, profiles(name, avatar_color)').eq('round_id', roundId)
      const { data: s }   = await supabase.from('scores').select('profile_id, hole_number, strokes').eq('round_id', roundId)
      const { data: m }   = await supabase.from('round_modes').select('mode').eq('round_id', roundId)

      setHoles(h ?? [])
      setPlayers((rps ?? []).map((rp: any) => ({ id: rp.profile_id, name: rp.profiles?.name ?? 'Inv', avatar_color: rp.profiles?.avatar_color ?? '#6b7a72', course_handicap: rp.course_handicap ?? 0, is_guest: rp.is_guest })))
      setScores(s ?? [])
      const modeList = (m ?? []).map((x: any) => x.mode as string)
      setModes(modeList.length ? modeList : ['stroke'])
      setLoading(false)
    }
    load()
  }, [roundId])

  const getScore  = (pid: string, h: number) => scores.find(s => s.profile_id === pid && s.hole_number === h)?.strokes ?? null
  const getTotal  = (pid: string) => scores.filter(s => s.profile_id === pid).reduce((a, s) => a + (s.strokes ?? 0), 0)
  const getRealPar = (group: Hole[]) => group.reduce((a, h) => a + h.par, 0)

  const myScores   = scores.filter(s => s.profile_id === myId && s.strokes != null).map(s => s.hole_number)
  const nextHole   = Array.from({ length: totalHoles }, (_, i) => i + 1).find(h => !myScores.includes(h)) ?? null
  const allDone    = myScores.length >= totalHoles

  const front = holes.filter(h => h.hole_number <= 9)
  const back  = holes.filter(h => h.hole_number > 9)

  const hasStableford = modes.includes('stableford')

  function getStablePts(pid: string, hcp: number, hole: Hole) {
    const s = getScore(pid, hole.hole_number)
    if (!s) return null
    return stablefordPts(s, hole.par, strokesReceived(hcp, hole.stroke_index))
  }
  function getStableBlock(pid: string, hcp: number, group: Hole[]) {
    return group.reduce((a, h) => { const s = getScore(pid, h.hole_number); return s ? a + stablefordPts(s, h.par, strokesReceived(hcp, h.stroke_index)) : a }, 0)
  }

  if (loading) return SPINNER

  const ScoreTable = ({ group, gi }: { group: Hole[]; gi: number }) => {
    const blockPar = getRealPar(group)
    const label    = gi === 0 ? 'OUT' : 'IN'

    return (
      <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center" style={{ minWidth: `${group.length * 30 + 80}px` }}>
            <thead>
              <tr className="border-b border-[#efebe1]">
                <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 text-left">H</td>
                {group.map(h => (
                  <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-0.5">
                    {h.hole_number}
                  </td>
                ))}
                <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">{label}</td>
              </tr>
              <tr className="border-b border-[#efebe1]">
                <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">
                  {viewMode === 'stroke' ? 'PAR' : 'SI'}
                </td>
                {group.map(h => (
                  <td key={h.hole_number} className="font-mono text-[10px] text-[#6b7a72] py-1 px-0.5">
                    {viewMode === 'stroke' ? h.par : h.stroke_index}
                  </td>
                ))}
                <td className="font-mono text-[11px] font-bold text-[#0e1a16] py-1 px-2">
                  {viewMode === 'stroke' ? blockPar : ''}
                </td>
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                if (viewMode === 'stroke') {
                  const blockTotal = group.reduce((a, h) => { const s = getScore(p.id, h.hole_number); return s ? a + s : a }, 0)
                  const blockDelta = blockTotal ? blockTotal - blockPar : null
                  return (
                    <tr key={p.id} className="border-t border-[#efebe1]">
                      <td className="px-2 py-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                      </td>
                      {group.map(h => {
                        const s = getScore(p.id, h.hole_number)
                        const d = s != null ? s - h.par : null
                        return (
                          <td key={h.hole_number} className="py-1.5 px-0.5">
                            <button onClick={() => router.push(`/hoyo?round=${roundId}&hole=${h.hole_number}`)}
                              className="mx-auto block active:scale-95 transition">
                              {s != null
                                ? <div className={`w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold ${scoreChipClass(d!)}`}>{s}</div>
                                : <span className="text-[#c4bfb5] text-[13px]">·</span>}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1.5 min-w-[40px]">
                        {blockTotal > 0 ? (
                          <div className="text-center">
                            <p className="font-mono text-[12px] font-black text-[#0e1a16] leading-none">{blockTotal}</p>
                            {blockDelta !== null && (
                              <p className="font-mono text-[9px] font-bold" style={{ color: blockDelta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                                {blockDelta > 0 ? `+${blockDelta}` : blockDelta === 0 ? 'E' : blockDelta}
                              </p>
                            )}
                          </div>
                        ) : <span className="text-[#c4bfb5]">–</span>}
                      </td>
                    </tr>
                  )
                } else {
                  // Stableford
                  const blockPts = getStableBlock(p.id, p.course_handicap, group)
                  return (
                    <tr key={p.id} className="border-t border-[#efebe1]">
                      <td className="px-2 py-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                      </td>
                      {group.map(h => {
                        const pts = getStablePts(p.id, p.course_handicap, h)
                        return (
                          <td key={h.hole_number} className="py-1.5 px-0.5">
                            {pts != null
                              ? <div className={`mx-auto w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold ${pts >= 3 ? 'bg-[#dde7fb] text-[#2a6fdb]' : pts === 2 ? 'bg-[#d9eedd] text-[#1f8a5b]' : pts === 1 ? 'bg-[#f6e6c4] text-[#9b6e1a]' : 'bg-[#fadcd6] text-[#a83a25]'}`}>{pts}</div>
                              : <span className="text-[#c4bfb5] text-[13px]">·</span>}
                          </td>
                        )
                      })}
                      <td className="font-mono text-[13px] font-black text-[#1f8a5b] px-2">{blockPts || '–'}</td>
                    </tr>
                  )
                }
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-32">

      {/* Compact header */}
      <div className="safe-top px-[14px] pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Inicio
          </Link>
          <span className="font-mono text-[10px] text-[#6b7a72]">{myScores.length} / {totalHoles} HOYOS</span>
        </div>

        {/* Mini info bar */}
        <div className="flex items-center justify-between bg-white rounded-[14px] px-3 py-2 border border-[#e5e0d4] mb-2">
          <div>
            <p className="font-bold text-[13px] text-[#0e1a16] leading-tight">{courseName}</p>
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {modes.map(m => (
                <span key={m} className="font-mono text-[9px] text-[#6b7a72] bg-[#f4f1e9] px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {m === 'stroke' ? 'Stroke' : m === 'stableford' ? 'Stableford' : m === 'matchplay_hcp' ? 'Matchplay' : m}
                </span>
              ))}
            </div>
          </div>
          {/* Player totals mini */}
          <div className="flex gap-2">
            {players.map(p => {
              const total = getTotal(p.id)
              return (
                <div key={p.id} className="text-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold mx-auto" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                  {total > 0 && <p className="font-mono text-[11px] font-black text-[#0e1a16] mt-0.5">{total}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Mode tabs — only if stableford active */}
        {hasStableford && (
          <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4] mb-2">
            {(['stroke', 'stableford'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition"
                style={{ backgroundColor: viewMode === m ? '#0e1a16' : 'transparent', color: viewMode === m ? '#fff' : '#6b7a72' }}>
                {m === 'stroke' ? 'Stroke' : 'Stableford'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scorecard */}
      <div className="px-[14px] space-y-2">
        <ScoreTable group={front} gi={0} />
        {back.length > 0 && <ScoreTable group={back} gi={1} />}

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
          {viewMode === 'stroke' ? (
            <>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#dde7fb]"/><span className="text-[10px] text-[#6b7a72] font-medium">Eagle/Birdie</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#d9eedd]"/><span className="text-[10px] text-[#6b7a72] font-medium">Par</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#f6e6c4]"/><span className="text-[10px] text-[#6b7a72] font-medium">Bogey</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#fadcd6]"/><span className="text-[10px] text-[#6b7a72] font-medium">Doble+</span></div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#dde7fb]"/><span className="text-[10px] text-[#6b7a72] font-medium">3–4 pts</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#d9eedd]"/><span className="text-[10px] text-[#6b7a72] font-medium">2 pts (par)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#f6e6c4]"/><span className="text-[10px] text-[#6b7a72] font-medium">1 pt</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#fadcd6]"/><span className="text-[10px] text-[#6b7a72] font-medium">0 pts</span></div>
            </>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        {allDone ? (
          <Link href={`/resumen?round=${roundId}`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-full font-bold text-[14px]"
            style={{ backgroundColor: '#e8b75a', color: '#0e1a16' }}>
            <span>Ronda completada</span>
            <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">FIRMAR →</span>
          </Link>
        ) : nextHole ? (
          <Link href={`/hoyo?round=${roundId}&hole=${nextHole}`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-full font-bold text-[14px] text-white"
            style={{ backgroundColor: '#0e1a16' }}>
            <div>
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Siguiente</p>
              <p className="text-[15px] font-black">Hoyo {nextHole} · par {holes.find(h => h.hole_number === nextHole)?.par}</p>
            </div>
            <span className="text-[#0e1a16] text-[12px] font-black px-3 py-1.5 rounded-full" style={{ backgroundColor: '#1f8a5b' }}>+ ANOTAR</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={SPINNER}><TarjetaPage /></Suspense>
}
