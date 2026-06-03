'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { scoreChipClass } from '@/lib/golf'
import Link from 'next/link'

type HoleScore = { hole_number: number; strokes: number | null }
type Player = { id: string; name: string; avatar_color: string; course_handicap: number; is_guest: boolean }
type Hole = { hole_number: number; par: number; stroke_index: number }

function TarjetaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roundId = searchParams.get('round') ?? ''

  const [players, setPlayers]     = useState<Player[]>([])
  const [holes, setHoles]         = useState<Hole[]>([])
  const [scores, setScores]       = useState<Record<string, HoleScore[]>>({})
  const [courseName, setCourseName] = useState('')
  const [totalHoles, setTotalHoles] = useState(18)
  const [loading, setLoading]     = useState(true)
  const [myId, setMyId]           = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (!roundId) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setMyId(user.id)

      // Round + course
      const { data: round } = await supabase.from('rounds').select('course_id, courses(name, holes_count)').eq('id', roundId).single()
      if (!round) return
      const course = Array.isArray(round.courses) ? round.courses[0] : round.courses as { name: string; holes_count: number }
      setCourseName(course?.name ?? '')
      setTotalHoles(course?.holes_count ?? 18)

      // Holes
      const { data: holeData } = await supabase.from('holes').select('hole_number, par, stroke_index').eq('course_id', round.course_id).order('hole_number')
      setHoles(holeData ?? [])

      // Players
      const { data: rps } = await supabase.from('round_players').select('profile_id, is_guest, course_handicap, profiles(name, avatar_color)').eq('round_id', roundId)
      const ps: Player[] = (rps ?? []).map((rp: any) => ({
        id: rp.profile_id ?? rp.id,
        name: rp.profiles?.name ?? 'Invitado',
        avatar_color: rp.profiles?.avatar_color ?? '#6b7a72',
        course_handicap: rp.course_handicap,
        is_guest: rp.is_guest,
      }))
      setPlayers(ps)

      // Scores
      const { data: scoreData } = await supabase.from('scores').select('profile_id, hole_number, strokes').eq('round_id', roundId)
      const byPlayer: Record<string, HoleScore[]> = {}
      for (const s of scoreData ?? []) {
        if (!byPlayer[s.profile_id]) byPlayer[s.profile_id] = []
        byPlayer[s.profile_id].push({ hole_number: s.hole_number, strokes: s.strokes })
      }
      setScores(byPlayer)
      setLoading(false)
    }
    load()
  }, [roundId])

  // Find next unplayed hole for current user
  const myScores = scores[myId] ?? []
  const playedHoles = myScores.map(s => s.hole_number)
  const nextHole = Array.from({ length: totalHoles }, (_, i) => i + 1).find(h => !playedHoles.includes(h)) ?? null
  const allDone = playedHoles.length >= totalHoles

  function getScore(playerId: string, holeNum: number) {
    return (scores[playerId] ?? []).find(s => s.hole_number === holeNum)?.strokes ?? null
  }

  function getTotal(playerId: string) {
    return (scores[playerId] ?? []).reduce((a, s) => a + (s.strokes ?? 0), 0) || null
  }

  const front = holes.filter(h => h.hole_number <= 9)
  const back  = holes.filter(h => h.hole_number > 9)
  const frontPar = front.reduce((a, h) => a + h.par, 0)
  const backPar  = back.reduce((a, h) => a + h.par, 0)

  if (loading) return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-32">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Inicio
          </Link>
          <span className="font-mono text-[10px] text-[#6b7a72]">{playedHoles.length} / {totalHoles} HOYOS</span>
        </div>

        {/* Course banner */}
        <div className="rounded-[22px] p-4 mb-3" style={{ backgroundColor: '#0e1a16' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold text-[#1f8a5b] bg-[#1f8a5b]/20 px-2.5 py-1 rounded-full">● En curso</span>
          </div>
          <p className="text-white text-[20px] font-black tracking-tight">{courseName}</p>
          {/* Player strip */}
          <div className="flex gap-2 mt-3">
            {players.map(p => {
              const total = getTotal(p.id)
              const par = holes.reduce((a, h) => a + h.par, 0)
              const delta = total ? total - par : null
              return (
                <div key={p.id} className="flex-1 rounded-[12px] p-2.5 text-center" style={{ backgroundColor: p.id === myId ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold mx-auto mb-1" style={{ backgroundColor: p.avatar_color }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <p className="text-[10px] font-bold text-white/80">{p.name.split(' ')[0]}</p>
                  <p className="font-mono text-[13px] font-black" style={{ color: '#1f8a5b' }}>
                    {delta !== null ? (delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta) : '–'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Scorecard */}
      <div className="px-[14px] space-y-3">
        {[front, back].map((group, gi) => (
          <div key={gi} className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center" style={{ minWidth: `${group.length * 32 + 100}px` }}>
                <thead>
                  <tr className="border-b border-[#efebe1]">
                    <td className="font-mono text-[9px] text-[#6b7a72] uppercase py-2 px-2 text-left w-10">H</td>
                    {group.map(h => (
                      <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-1">{h.hole_number}</td>
                    ))}
                    <td className="font-mono text-[9px] text-[#6b7a72] uppercase py-2 px-2">{gi === 0 ? 'OUT' : 'IN'}</td>
                  </tr>
                  <tr className="border-b border-[#efebe1]">
                    <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">PAR</td>
                    {group.map(h => <td key={h.hole_number} className="font-mono text-[10px] text-[#6b7a72] py-1 px-1">{h.par}</td>)}
                    <td className="font-mono text-[11px] font-bold text-[#0e1a16] py-1 px-2">{gi === 0 ? frontPar : backPar}</td>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => {
                    const blockTotal = group.reduce((a, h) => {
                      const s = getScore(p.id, h.hole_number)
                      return s ? a + s : a
                    }, 0) || null
                    return (
                      <tr key={p.id} className="border-t border-[#efebe1]">
                        <td className="px-2 py-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>
                            {p.name[0].toUpperCase()}
                          </div>
                        </td>
                        {group.map(h => {
                          const s = getScore(p.id, h.hole_number)
                          const delta = s != null ? s - h.par : null
                          return (
                            <td key={h.hole_number} className="py-1.5 px-0.5">
                              {s != null ? (
                                <div className={`mx-auto w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold ${scoreChipClass(delta!)}`}>
                                  {s}
                                </div>
                              ) : (
                                <span className="text-[#c4bfb5] text-[13px]">·</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="font-mono text-[13px] font-black text-[#0e1a16] px-2">{blockTotal ?? '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        {allDone ? (
          <Link href={`/resumen?round=${roundId}`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-full font-bold text-[14px] text-[#0e1a16]"
            style={{ backgroundColor: '#e8b75a' }}>
            <span>Ronda completada</span>
            <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">FIRMAR →</span>
          </Link>
        ) : nextHole ? (
          <Link href={`/hoyo?round=${roundId}&hole=${nextHole}`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-full font-bold text-[14px] text-[#0e1a16]"
            style={{ backgroundColor: '#0e1a16', color: '#fff' }}>
            <div>
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Jugando</p>
              <p className="text-[15px] font-black">Hoyo {nextHole} · par {holes.find(h => h.hole_number === nextHole)?.par}</p>
            </div>
            <span className="bg-[#1f8a5b] text-[#0e1a16] text-[12px] font-black px-3 py-1.5 rounded-full">+ ANOTAR</span>
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>}><TarjetaPage /></Suspense>
}
