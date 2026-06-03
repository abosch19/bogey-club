'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { scoreChipClass, formatDate } from '@/lib/golf'
import Link from 'next/link'

const SPINNER = <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

function ResumenPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roundId = searchParams.get('round') ?? ''

  const [data, setData]     = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!roundId) return
    async function load() {
      const { data: round } = await supabase.from('rounds').select('id, date, is_practice, status, courses(name, par, holes_count)').eq('id', roundId).single()
      const { data: rps }   = await supabase.from('round_players').select('profile_id, course_handicap, profiles(name, avatar_color)').eq('round_id', roundId)
      const { data: holes } = await supabase.from('holes').select('hole_number, par, stroke_index').eq('course_id', (round as any)?.course_id).order('hole_number')
      const { data: scores } = await supabase.from('scores').select('profile_id, hole_number, strokes, putts, gir, fairway, in_bunker, penalties').eq('round_id', roundId)

      const players = (rps ?? []).map((rp: any) => ({
        id: rp.profile_id,
        name: rp.profiles?.name ?? 'Invitado',
        avatar_color: rp.profiles?.avatar_color ?? '#6b7a72',
        course_handicap: rp.course_handicap,
      }))

      const course = Array.isArray((round as any)?.courses) ? (round as any).courses[0] : (round as any)?.courses

      setData({ round, course, players, holes: holes ?? [], scores: scores ?? [] })
    }
    load()
  }, [roundId])

  function getScore(playerId: string, holeNum: number) {
    return data?.scores.find((s: any) => s.profile_id === playerId && s.hole_number === holeNum)
  }

  function getTotal(playerId: string): number {
    return data?.scores.filter((s: any) => s.profile_id === playerId).reduce((a: number, s: any) => a + (s.strokes ?? 0), 0) ?? 0
  }

  async function handleSign() {
    setSaving(true)
    await fetch('/api/ronda/finalizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: roundId }),
    })
    router.push('/')
  }

  if (!data) return SPINNER

  const { round, course, players, holes } = data
  const par = course?.par ?? 72
  const front = (holes as any[]).filter(h => h.hole_number <= 9)
  const back  = (holes as any[]).filter(h => h.hole_number > 9)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-32">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/tarjeta?round=${roundId}`} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Tarjeta
          </Link>
        </div>

        {/* Hero */}
        <div className="rounded-[22px] p-5 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-40px] top-[-40px] w-[160px] h-[160px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
          <div className="relative">
            <div className="font-mono text-[9px] text-white/50 uppercase tracking-[0.2em] mb-2">
              {course?.name} · {round?.date ? formatDate(round.date) : ''}
              {round?.is_practice ? ' · PRÁCTICA' : ' · COMPETITIVA'}
            </div>
            {players.map((p: any) => {
              const total = getTotal(p.id)
              const delta = total - par
              return (
                <div key={p.id} className="flex items-end gap-4 mb-2">
                  <div>
                    <p className="text-white/60 text-[13px]">{p.name}</p>
                    <p className="text-white text-[72px] font-black leading-none tracking-tight">{total || '–'}</p>
                  </div>
                  {total > 0 && (
                    <div className="pb-3">
                      <span className="text-[22px] font-black" style={{ color: delta <= 0 ? '#1f8a5b' : '#e8b75a' }}>
                        {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                      </span>
                    </div>
                  )}
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
                    <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 text-left">H</td>
                    {group.map((h: any) => <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-1">{h.hole_number}</td>)}
                    <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">{gi === 0 ? 'OUT' : 'IN'}</td>
                  </tr>
                  <tr className="border-b border-[#efebe1]">
                    <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">PAR</td>
                    {group.map((h: any) => <td key={h.hole_number} className="font-mono text-[10px] text-[#6b7a72] py-1 px-1">{h.par}</td>)}
                    <td className="font-mono text-[11px] font-bold text-[#0e1a16] py-1 px-2">{group.reduce((a: number, h: any) => a + h.par, 0)}</td>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p: any) => {
                    const blockTotal = group.reduce((a: number, h: any) => { const s = getScore(p.id, h.hole_number); return s ? a + (s.strokes ?? 0) : a }, 0)
                    return (
                      <tr key={p.id} className="border-t border-[#efebe1]">
                        <td className="px-2 py-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0].toUpperCase()}</div>
                        </td>
                        {group.map((h: any) => {
                          const s = getScore(p.id, h.hole_number)
                          const delta = s?.strokes != null ? s.strokes - h.par : null
                          return (
                            <td key={h.hole_number} className="py-1.5 px-0.5">
                              {s?.strokes != null ? (
                                <div className={`mx-auto w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold ${scoreChipClass(delta!)}`}>{s.strokes}</div>
                              ) : <span className="text-[#c4bfb5] text-[13px]">·</span>}
                            </td>
                          )
                        })}
                        <td className="font-mono text-[13px] font-black text-[#0e1a16] px-2">{blockTotal || '–'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Sign CTA */}
      {round?.status !== 'completed' && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
          <button onClick={handleSign} disabled={saving}
            className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: '#e8b75a', color: '#0e1a16' }}>
            <span>Firmar y guardar ronda</span>
            <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">{saving ? '…' : '✓ FIRMAR'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={SPINNER}><ResumenPage /></Suspense>
}
