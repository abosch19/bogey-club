'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { scoreChipClass, formatDate, stablefordPts, strokesReceived } from '@/lib/golf'
import Link from 'next/link'

const SPINNER = <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

type Player  = { id: string; name: string; avatar_color: string; course_handicap: number }
type HoleRow = { hole_number: number; par: number; stroke_index: number }
type ScoreRow = { profile_id: string; hole_number: number; strokes: number | null; putts: number | null; gir: boolean | null; fairway: boolean | null }

type Tab = 'stroke' | 'stableford' | 'clasificacion'

function ResumenPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roundId  = searchParams.get('round') ?? ''
  const readonly = searchParams.get('readonly') === 'true'

  const data = useQuery(api.rounds.get, roundId ? { roundId: roundId as Id<'rounds'> } : 'skip')
  const finalizeMut = useMutation(api.rounds.finalize)

  const [activeTab, setActiveTab] = useState<Tab>('stroke')
  const [saving, setSaving]   = useState(false)
  const [signed, setSigned]   = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const round   = data?.round ?? null
  const course  = data?.course ?? null
  const players: Player[] = (data?.players ?? []).map(rp => ({ id: rp.profileId ?? '', name: rp.name ?? 'Inv', avatar_color: rp.avatar_color ?? '#6b7a72', course_handicap: rp.course_handicap ?? 0 }))
  const holes: HoleRow[] = (data?.holes ?? []).map(h => ({ hole_number: h.hole_number, par: h.par, stroke_index: h.stroke_index }))
  const scores: ScoreRow[] = (data?.scores ?? []).map(s => ({ profile_id: s.profileId, hole_number: s.hole_number, strokes: s.strokes ?? null, putts: s.putts ?? null, gir: s.gir ?? null, fairway: s.fairway ?? null }))
  const modes = (data?.modes ?? []).length ? (data?.modes ?? []) : ['stroke']

  function getScore(pid: string, holeNum: number) {
    return scores.find(s => s.profile_id === pid && s.hole_number === holeNum)
  }
  function getTotal(pid: string) {
    return scores.filter(s => s.profile_id === pid).reduce((a, s) => a + (s.strokes ?? 0), 0)
  }
  // Calculate par from actual holes, not from courses.par (more accurate)
  const realPar = holes.reduce((a, h) => a + h.par, 0)
  function getBlockTotal(pid: string, group: HoleRow[]) {
    return group.reduce((a, h) => { const s = getScore(pid, h.hole_number); return s?.strokes ? a + s.strokes : a }, 0)
  }
  function getBlockPar(group: HoleRow[]) {
    return group.reduce((a, h) => a + h.par, 0)
  }
  function getStablefordBlock(pid: string, courseHcp: number, group: HoleRow[]) {
    return group.reduce((a, h) => {
      const s = getScore(pid, h.hole_number)
      if (!s?.strokes) return a
      return a + stablefordPts(s.strokes, h.par, strokesReceived(courseHcp, h.stroke_index))
    }, 0)
  }

  async function handleSign() {
    setSaving(true)
    await finalizeMut({ round_id: roundId as Id<'rounds'> })
    setSaving(false)
    setCelebrating(true)
    setTimeout(() => {
      setCelebrating(false)
      setSigned(true)
    }, 2000)
  }

  if (!round) return SPINNER

  const front = holes.filter(h => h.hole_number <= 9)
  const back  = holes.filter(h => h.hole_number > 9)

  // Clasificación general (stroke play)
  const ranking = [...players].sort((a, b) => {
    const ta = getTotal(a.id) || 999
    const tb = getTotal(b.id) || 999
    return ta - tb
  })

  function deltaStr(val: number) {
    return val > 0 ? `+${val}` : val === 0 ? 'E' : `${val}`
  }

  const availableTabs: Tab[] = ['stroke']
  if (modes.includes('stableford')) availableTabs.push('stableford')
  if (players.length >= 3) availableTabs.push('clasificacion')

  const TAB_LABELS: Record<Tab, string> = { stroke: 'Stroke', stableford: 'Stableford', clasificacion: 'Clasificación' }

  const firstPlayer = players[0]
  const firstTotal = firstPlayer ? getTotal(firstPlayer.id) : 0
  const firstDelta = firstTotal && realPar > 0 ? firstTotal - realPar : 0
  const celebrationDeltaStr = firstDelta > 0 ? `+${firstDelta}` : firstDelta === 0 ? 'E' : `${firstDelta}`

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-32">
      {celebrating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0e1a16]">
          <div className="text-[80px] animate-bounce">&#9971;</div>
          <p className="text-white text-[28px] font-black mt-4">Ronda firmada!</p>
          <p className="text-white/60 text-[14px] mt-2">{firstTotal} golpes · {celebrationDeltaStr}</p>
        </div>
      )}
      <div className="safe-top px-[14px] pt-3 pb-3">
        <div className="flex items-center justify-between mb-3">
          <Link href={`/tarjeta?round=${roundId}`} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Tarjeta
          </Link>
          <span className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-[0.15em]">RESUMEN</span>
        </div>

        {/* Compact hero */}
        <div className="rounded-[18px] px-4 py-3 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-20px] top-[-20px] w-[90px] h-[90px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.15em]">{course?.name}</p>
              <p className="text-white/60 text-[11px] mt-0.5">{round?.date ? formatDate(round.date) : ''}{round?.is_practice ? ' · Práctica' : ''}</p>
            </div>
            {/* Player totals compact */}
            <div className="flex gap-3">
              {players.map(p => {
                const total = getTotal(p.id)
                const delta = total && realPar > 0 ? total - realPar : null
                return (
                  <div key={p.id} className="text-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold mx-auto mb-1" style={{ backgroundColor: p.avatar_color }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <p className="font-mono text-[16px] font-black text-white leading-none">{total || '–'}</p>
                    {delta !== null && (
                      <p className="font-mono text-[10px] font-bold mt-0.5" style={{ color: delta <= 0 ? '#1f8a5b' : '#e8b75a' }}>
                        {deltaStr(delta)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        {availableTabs.length > 1 && (
          <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4]">
            {availableTabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-full text-[12px] font-bold transition"
                style={{ backgroundColor: activeTab === tab ? '#0e1a16' : 'transparent', color: activeTab === tab ? '#fff' : '#6b7a72' }}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-[14px] space-y-3">

        {/* STROKE PLAY scorecard */}
        {activeTab === 'stroke' && [front, back].map((group, gi) => {
          const blockPar = getBlockPar(group)
          return (
            <div key={gi} className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-center" style={{ minWidth: `${group.length * 30 + 90}px` }}>
                  <thead>
                    <tr className="border-b border-[#efebe1]">
                      <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 text-left">H</td>
                      {group.map(h => <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-1">{h.hole_number}</td>)}
                      <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">{gi === 0 ? 'OUT' : 'IN'}</td>
                    </tr>
                    <tr className="border-b border-[#efebe1]">
                      <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">PAR</td>
                      {group.map(h => <td key={h.hole_number} className="font-mono text-[10px] text-[#6b7a72] py-1 px-1">{h.par}</td>)}
                      <td className="font-mono text-[11px] font-bold text-[#0e1a16] py-1 px-2">{blockPar}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(p => {
                      const blockTotal = getBlockTotal(p.id, group)
                      const blockDelta = blockTotal ? blockTotal - blockPar : null
                      return (
                        <tr key={p.id} className="border-t border-[#efebe1]">
                          <td className="px-2 py-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                          </td>
                          {group.map(h => {
                            const s = getScore(p.id, h.hole_number)
                            const d = s?.strokes != null ? s.strokes - h.par : null
                            return (
                              <td key={h.hole_number} className="py-1.5 px-0.5">
                                {s?.strokes != null
                                  ? <div className={`mx-auto w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold ${scoreChipClass(d!)}`}>{s.strokes}</div>
                                  : <span className="text-[#c4bfb5] text-[13px]">·</span>}
                              </td>
                            )
                          })}
                          {/* OUT/IN: total + delta */}
                          <td className="px-2 py-1.5 min-w-[44px]">
                            {blockTotal > 0 ? (
                              <div className="text-center">
                                <p className="font-mono text-[13px] font-black text-[#0e1a16] leading-none">{blockTotal}</p>
                                {blockDelta !== null && (
                                  <p className="font-mono text-[10px] font-bold mt-0.5" style={{ color: blockDelta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                                    {deltaStr(blockDelta)}
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-[#c4bfb5]">–</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {/* STABLEFORD — split front/back like stroke */}
        {activeTab === 'stableford' && [front, back].map((group, gi) => (
          <div key={gi} className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center" style={{ minWidth: `${group.length * 30 + 90}px` }}>
                <thead>
                  <tr className="border-b border-[#efebe1]">
                    <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 text-left">H</td>
                    {group.map(h => <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-1">{h.hole_number}</td>)}
                    <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">{gi === 0 ? 'OUT' : 'IN'}</td>
                  </tr>
                  <tr className="border-b border-[#efebe1]">
                    <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">SI</td>
                    {group.map(h => <td key={h.hole_number} className="font-mono text-[9px] text-[#6b7a72] py-1 px-1">{h.stroke_index}</td>)}
                    <td/>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => {
                    const blockPts = getStablefordBlock(p.id, p.course_handicap, group)
                    return (
                      <tr key={p.id} className="border-t border-[#efebe1]">
                        <td className="px-2 py-1.5">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                        </td>
                        {group.map(h => {
                          const s = getScore(p.id, h.hole_number)
                          const rcv = strokesReceived(p.course_handicap, h.stroke_index)
                          const pts = s?.strokes ? stablefordPts(s.strokes, h.par, rcv) : null
                          return (
                            <td key={h.hole_number} className="py-1.5 px-0.5">
                              {pts != null ? (
                                <div className={`mx-auto w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold ${pts >= 3 ? 'bg-[#dde7fb] text-[#2a6fdb]' : pts === 2 ? 'bg-[#d9eedd] text-[#1f8a5b]' : pts === 1 ? 'bg-[#f6e6c4] text-[#9b6e1a]' : 'bg-[#fadcd6] text-[#a83a25]'}`}>{pts}</div>
                              ) : <span className="text-[#c4bfb5] text-[13px]">·</span>}
                            </td>
                          )
                        })}
                        <td className="font-mono text-[14px] font-black text-[#1f8a5b] px-2 min-w-[36px]">{blockPts}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* CLASIFICACIÓN */}
        {activeTab === 'clasificacion' && (
          <div className="space-y-2">
            {ranking.map((p, i) => {
              const total = getTotal(p.id)
              const delta = total && realPar > 0 ? total - realPar : null
              const isFirst = i === 0
              return (
                <div key={p.id} className="rounded-[16px] p-4 border flex items-center gap-3"
                  style={{ backgroundColor: isFirst ? '#0e1a16' : '#fff', borderColor: isFirst ? '#0e1a16' : '#e5e0d4' }}>
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center font-mono font-black text-[14px]"
                    style={{ backgroundColor: isFirst ? '#e8b75a' : '#f4f1e9', color: isFirst ? '#0e1a16' : '#6b7a72' }}>
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: p.avatar_color }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[15px]" style={{ color: isFirst ? '#fff' : '#0e1a16' }}>{p.name}</p>
                    <p className="font-mono text-[10px]" style={{ color: isFirst ? 'rgba(255,255,255,0.5)' : '#6b7a72' }}>Hcp {p.course_handicap}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[22px] font-black leading-none" style={{ color: isFirst ? '#fff' : '#0e1a16' }}>{total || '–'}</p>
                    {delta !== null && (
                      <p className="font-mono text-[11px] font-bold mt-0.5" style={{ color: delta <= 0 ? '#1f8a5b' : '#e8b75a' }}>
                        {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sign CTA */}
      {readonly && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
          <Link href="/"
            className="flex items-center justify-center w-full py-3.5 rounded-full font-bold text-[14px] text-white transition active:scale-[0.98]"
            style={{ backgroundColor: '#0e1a16' }}>
            ← Volver al inicio
          </Link>
        </div>
      )}
      {!readonly && round?.status !== 'completed' && !signed && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
          <button onClick={handleSign} disabled={saving}
            className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: '#e8b75a', color: '#0e1a16' }}>
            <span>Firmar y guardar ronda</span>
            <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">{saving ? '…' : '✓ FIRMAR'}</span>
          </button>
        </div>
      )}

      {/* After signing — navigation options */}
      {!readonly && (signed || round?.status === 'completed') && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
          {signed && (
            <>
              <div className="bg-[#d9eedd] rounded-[14px] px-4 py-3 mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="text-[#1f8a5b] font-semibold text-[13px]">Ronda firmada y guardada</span>
              </div>
              {/* Apuesta — si existe en notes */}
              {round?.notes && !['all','front','back','9_once','9_twice'].includes(round.notes) && (
                <div className="bg-[#f6e6c4] border-2 border-[#e8b75a] rounded-[14px] px-4 py-3 mb-2">
                  <p className="font-mono text-[9px] text-[#9b6e1a] uppercase tracking-wide mb-1">Apuesta de la ronda</p>
                  <p className="font-bold text-[15px] text-[#0e1a16]">{round.notes}</p>
                  {/* Winner */}
                  {(() => {
                    const sorted = [...players].map(p => ({ ...p, total: scores.filter(s => s.profile_id === p.id).reduce((a,s) => a + (s.strokes ?? 0), 0) })).filter(p => p.total > 0).sort((a,b) => a.total - b.total)
                    if (sorted.length >= 2 && sorted[0].total < sorted[1].total) {
                      const loser = sorted[sorted.length - 1]
                      return <p className="text-[13px] text-[#9b6e1a] mt-1 font-semibold">{loser.name}, te toca a ti. 😏</p>
                    }
                    return null
                  })()}
                </div>
              )}
            </>
          )}
          <div className="flex gap-2">
            <Link href="/"
              className="flex-1 flex items-center justify-center py-3.5 rounded-full font-bold text-[14px] text-white transition active:scale-[0.98]"
              style={{ backgroundColor: '#0e1a16' }}>
              Inicio
            </Link>
            <Link href="/stats"
              className="flex-1 flex items-center justify-center py-3.5 rounded-full font-bold text-[14px] transition active:scale-[0.98]"
              style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
              Ver stats
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={SPINNER}><ResumenPage /></Suspense>
}
