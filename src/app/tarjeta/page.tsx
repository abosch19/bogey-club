'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { scoreChipClass, stablefordPts, strokesReceived } from '@/lib/golf'
import Link from 'next/link'

type Player = { id: string; name: string; avatar_color: string; course_handicap: number; is_guest: boolean }
type Hole   = { hole_number: number; par: number; stroke_index: number }
type Score  = { profile_id: string; hole_number: number; strokes: number | null }

const SPINNER = <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

type ViewMode = 'stroke' | 'stableford' | 'matchplay_hcp' | 'matchplay' | 'bbb' | 'wolf'

function TarjetaPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const roundId      = searchParams.get('round') ?? ''

  const me   = useQuery(api.profiles.me)
  const data = useQuery(api.rounds.get, roundId ? { roundId: roundId as Id<'rounds'> } : 'skip')
  const allProfiles = useQuery(api.players.all)

  const [viewMode, setViewMode]   = useState<ViewMode>('stroke')
  const [showEditPlayers, setShowEditPlayers] = useState(false)
  const [bet, setBet]             = useState('')
  const [betInit, setBetInit]     = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)
  const [savingBet, setSavingBet] = useState(false)

  const addPlayerMut    = useMutation(api.roundPlayers.add)
  const removePlayerMut = useMutation(api.roundPlayers.remove)
  const setBetMut       = useMutation(api.rounds.setBet)
  const removeRoundMut  = useMutation(api.rounds.remove)

  const myId = me?._id ?? ''

  // Derived data from the single rounds.get query
  const courseName  = data?.course?.name ?? ''
  const holeMode    = data?.round.notes ?? 'all'
  const notesVal    = data?.round.notes ?? ''
  const isPractice  = !!data?.round.is_practice
  const base        = data?.course?.holes_count ?? 18
  const totalHoles  = holeMode === '9_twice' ? 18 : holeMode === 'front' || holeMode === 'back' ? 9 : base
  const allHoles: Hole[] = (data?.holes ?? []).map(h => ({ hole_number: h.hole_number, par: h.par, stroke_index: h.stroke_index }))
  const players: Player[] = (data?.players ?? []).map(p => ({ id: p.profileId ?? '', name: p.name ?? 'Inv', avatar_color: p.avatar_color ?? '#6b7a72', course_handicap: p.course_handicap ?? 0, is_guest: p.is_guest }))
  const scores: Score[] = (data?.scores ?? []).map(s => ({ profile_id: s.profileId, hole_number: s.hole_number, strokes: s.strokes ?? null }))
  const modes = (data?.modes ?? []).length ? (data?.modes ?? []) : ['stroke']

  // Initialize bet input from notes once data loads
  if (data && !betInit) {
    if (!['all','front','back','9_once','9_twice'].includes(notesVal)) setBet(notesVal)
    setBetInit(true)
  }

  const loading = data === undefined || me === undefined

  // Filtered holes based on holeMode
  const holes: Hole[] = (() => {
    if (holeMode === 'front') return allHoles.filter(h => h.hole_number <= 9)
    if (holeMode === 'back')  return allHoles.filter(h => h.hole_number >= 10)
    if (holeMode === '9_once') return allHoles.filter(h => h.hole_number <= 9)
    if (holeMode === '9_twice') {
      // First 9 + second 9 mapped to same holes
      const nine = allHoles.filter(h => h.hole_number <= 9)
      return [
        ...nine,
        ...nine.map(h => ({ ...h, hole_number: h.hole_number + 9 }))
      ]
    }
    return allHoles
  })()

  const getScore  = (pid: string, h: number) => {
    // For 9_twice, holes 10-18 map to 1-9
    const actualHole = (holeMode === '9_twice' && h > 9) ? h - 9 : h
    return scores.find(s => s.profile_id === pid && s.hole_number === actualHole)?.strokes ?? null
  }
  const getTotal  = (pid: string) => holes.reduce((a, h) => { const s = getScore(pid, h.hole_number); return s ? a + s : a }, 0)
  const getRealPar = (group: Hole[]) => group.reduce((a, h) => a + h.par, 0)

  const myScores   = holes.filter(h => getScore(myId, h.hole_number) != null).map(h => h.hole_number)
  const nextHole   = holes.find(h => !myScores.includes(h.hole_number))
  const allDone    = myScores.length >= holes.length

  // Groups: for 9_twice split at 9, else split at 9
  const front = holeMode === 'back' ? holes : holes.filter(h => h.hole_number <= 9)
  const back  = holeMode === 'back' ? [] : holes.filter(h => h.hole_number > 9)
  const groups = back.length > 0 ? [front, back] : [front]

  // Mode tabs available
  const availableModes: { key: ViewMode; label: string }[] = [
    { key: 'stroke', label: 'Stroke' },
    ...(modes.includes('stableford')    ? [{ key: 'stableford'    as ViewMode, label: 'Stableford' }] : []),
    ...(modes.includes('matchplay_hcp') ? [{ key: 'matchplay_hcp' as ViewMode, label: 'Matchplay' }] : []),
    ...(modes.includes('matchplay')     ? [{ key: 'matchplay'     as ViewMode, label: 'Matchplay' }] : []),
    ...(modes.includes('bbb')           ? [{ key: 'bbb'           as ViewMode, label: 'BBB' }] : []),
    ...(modes.includes('wolf')          ? [{ key: 'wolf'          as ViewMode, label: 'Wolf' }] : []),
  ]

  // Matchplay calculation
  const matchplayResult = (() => {
    if (players.length < 2) return null
    const [a, b] = players
    let state = 0
    holes.forEach(h => {
      const sa = getScore(a.id, h.hole_number)
      const sb = getScore(b.id, h.hole_number)
      if (!sa || !sb) return
      const recA = modes.includes('matchplay_hcp') ? strokesReceived(Math.abs(a.course_handicap - b.course_handicap), h.stroke_index) : 0
      const netA = sa - (a.course_handicap > b.course_handicap ? recA : 0)
      const netB = sb - (b.course_handicap > a.course_handicap ? recA : 0)
      if (netA < netB) state++
      else if (netB < netA) state--
    })
    const label = state === 0 ? 'AS' : state > 0 ? `${state} UP` : `${-state} UP`
    const leader = state === 0 ? null : state > 0 ? a : b
    return { state, label, leader, a, b }
  })()

  // Add/remove player
  async function addPlayer(profileId: string) {
    await addPlayerMut({ roundId: roundId as Id<'rounds'>, profileId: profileId as Id<'profiles'> })
  }

  async function removePlayer(profileId: string) {
    if (!confirm('¿Eliminar este jugador de la ronda?')) return
    await removePlayerMut({ roundId: roundId as Id<'rounds'>, profileId: profileId as Id<'profiles'> })
  }

  if (loading) return SPINNER

  const ScoreTable = ({ group, gi }: { group: Hole[]; gi: number }) => {
    const blockPar = getRealPar(group)
    const label    = gi === 0 && groups.length > 1 ? 'OUT' : groups.length > 1 ? 'IN' : 'TOT'
    return (
      <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center" style={{ minWidth: `${group.length * 30 + 80}px` }}>
            <thead>
              <tr className="border-b border-[#efebe1]">
                <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 text-left">H</td>
                {group.map(h => <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-0.5">{h.hole_number}</td>)}
                <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">{label}</td>
              </tr>
              <tr className="border-b border-[#efebe1]">
                <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">PAR</td>
                {group.map(h => <td key={h.hole_number} className="font-mono text-[10px] text-[#6b7a72] py-1 px-0.5">{h.par}</td>)}
                <td className="font-mono text-[11px] font-bold text-[#0e1a16] py-1 px-2">{blockPar}</td>
              </tr>
              <tr className="border-b border-[#efebe1]">
                <td className="font-mono text-[9px] text-[#2a6fdb] px-2 py-1 text-left font-bold">HCP</td>
                {group.map(h => <td key={h.hole_number} className="font-mono text-[9px] text-[#2a6fdb] py-1 px-0.5">{h.stroke_index}</td>)}
                <td/>
              </tr>
            </thead>
            <tbody>
              {players.map(p => {
                if (viewMode === 'stroke') {
                  const blockTotal = group.reduce((a, h) => { const s = getScore(p.id, h.hole_number); return s ? a + s : a }, 0)
                  const blockDelta = blockTotal ? blockTotal - blockPar : null
                  return (
                    <tr key={p.id} className="border-t border-[#efebe1]">
                      <td className="px-2 py-1.5"><div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div></td>
                      {group.map(h => {
                        const s = getScore(p.id, h.hole_number)
                        const d = s != null ? s - h.par : null
                        return (
                          <td key={h.hole_number} className="py-1.5 px-0.5">
                            <button onClick={() => router.push(`/hoyo?round=${roundId}&hole=${h.hole_number}`)} className="mx-auto block active:scale-95 transition">
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
                            {blockDelta !== null && <p className="font-mono text-[9px] font-bold" style={{ color: blockDelta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>{blockDelta > 0 ? `+${blockDelta}` : blockDelta === 0 ? 'E' : blockDelta}</p>}
                          </div>
                        ) : <span className="text-[#c4bfb5]">–</span>}
                      </td>
                    </tr>
                  )
                } else if (viewMode === 'stableford') {
                  const blockPts = group.reduce((a, h) => { const s = getScore(p.id, h.hole_number); return s ? a + stablefordPts(s, h.par, strokesReceived(p.course_handicap, h.stroke_index)) : a }, 0)
                  return (
                    <tr key={p.id} className="border-t border-[#efebe1]">
                      <td className="px-2 py-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                      </td>
                      {group.map(h => {
                        const s = getScore(p.id, h.hole_number)
                        const rcv = strokesReceived(p.course_handicap, h.stroke_index)
                        const pts = s ? stablefordPts(s, h.par, rcv) : null
                        return (
                          <td key={h.hole_number} className="py-1 px-0.5">
                            <button onClick={() => router.push(`/hoyo?round=${roundId}&hole=${h.hole_number}`)} className="mx-auto block text-center relative">
                              {/* Asterisks for handicap strokes */}
                              {rcv > 0 && (
                                <div className="flex justify-center gap-px mb-0.5">
                                  {Array.from({ length: rcv }).map((_, i) => (
                                    <span key={i} className="text-[8px] font-black leading-none" style={{ color: p.avatar_color }}>*</span>
                                  ))}
                                </div>
                              )}
                              {s != null ? (
                                <div className="text-center">
                                  <div className={`w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[11px] font-bold mx-auto ${scoreChipClass(s - h.par)}`}>{s}</div>
                                  {pts !== null && (
                                    <p className="font-mono text-[9px] font-black leading-none mt-0.5"
                                      style={{ color: pts>=3?'#2a6fdb':pts===2?'#1f8a5b':pts===1?'#9b6e1a':'#a83a25' }}>
                                      {pts}pt
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[#c4bfb5] text-[13px]">·</span>
                              )}
                            </button>
                          </td>
                        )
                      })}
                      <td className="font-mono text-[13px] font-black text-[#1f8a5b] px-2">{blockPts || '–'}</td>
                    </tr>
                  )
                }
                return null
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-32">
      {/* Header */}
      <div className="safe-top px-[14px] pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex items-center gap-1 text-[#6b7a72] font-semibold text-[13px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Atrás
            </button>
            <Link href="/" className="font-mono text-[10px] text-[#6b7a72] bg-[#f4f1e9] px-2.5 py-1 rounded-full">Inicio</Link>
          </div>
          <span className="font-mono text-[10px] text-[#6b7a72]">{myScores.length} / {holes.length} HOYOS</span>
        </div>

        {/* Mini info bar */}
        <div className="flex items-center justify-between bg-white rounded-[14px] px-3 py-2 border border-[#e5e0d4] mb-2">
          <div>
            <p className="font-bold text-[13px] text-[#0e1a16] leading-tight">{courseName}</p>
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {modes.map(m => <span key={m} className="font-mono text-[9px] text-[#6b7a72] bg-[#f4f1e9] px-2 py-0.5 rounded-full uppercase">{m === 'stroke' ? 'Stroke' : m === 'stableford' ? 'Stableford' : m === 'matchplay_hcp' ? 'Matchplay Hcp' : m}</span>)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Player totals mini */}
            {players.map(p => {
              const total = getTotal(p.id)
              return (
                <div key={p.id} className="text-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold mx-auto" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                  {total > 0 && <p className="font-mono text-[11px] font-black text-[#0e1a16] mt-0.5">{total}</p>}
                </div>
              )
            })}
            {/* Bet button */}
            <button onClick={() => setShowBetModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-full border transition"
              style={{ backgroundColor: bet ? '#f6e6c4' : '#f4f1e9', borderColor: bet ? '#e8b75a' : '#e5e0d4' }}
              title={bet || 'Añadir apuesta'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill={bet ? '#9b6e1a' : '#6b7a72'}/></svg>
              <span className="font-mono text-[9px] font-bold" style={{ color: bet ? '#9b6e1a' : '#6b7a72' }}>
                {bet ? 'Apuesta' : 'Apostar'}
              </span>
            </button>
            {/* Edit players button */}
            <button onClick={() => setShowEditPlayers(true)}
              className="w-8 h-8 rounded-full bg-[#f4f1e9] border border-[#e5e0d4] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#6b7a72" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        {/* Matchplay live result */}
        {(viewMode === 'matchplay_hcp' || viewMode === 'matchplay') && matchplayResult && (
          <div className="bg-white rounded-[14px] px-4 py-3 border border-[#e5e0d4] mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: matchplayResult.a.avatar_color }}>{matchplayResult.a.name[0]}</div>
                <span className="font-bold text-[13px] text-[#0e1a16]">{matchplayResult.a.name.split(' ')[0]}</span>
              </div>
              <div className="text-center px-4">
                <p className="font-mono text-[20px] font-black text-[#0e1a16]">{matchplayResult.label}</p>
                {matchplayResult.leader && <p className="font-mono text-[9px] text-[#6b7a72] uppercase">{matchplayResult.leader.name.split(' ')[0]} gana</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px] text-[#0e1a16]">{matchplayResult.b.name.split(' ')[0]}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: matchplayResult.b.avatar_color }}>{matchplayResult.b.name[0]}</div>
              </div>
            </div>
          </div>
        )}

        {/* Mode tabs */}
        {availableModes.length > 1 && (
          <div className="flex gap-1 bg-white rounded-full p-1 border border-[#e5e0d4] mb-2">
            {availableModes.map(m => (
              <button key={m.key} onClick={() => setViewMode(m.key)}
                className="flex-1 py-1.5 rounded-full text-[11px] font-bold transition"
                style={{ backgroundColor: viewMode === m.key ? '#0e1a16' : 'transparent', color: viewMode === m.key ? '#fff' : '#6b7a72' }}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scorecard */}
      <div className="px-[14px] space-y-2">
        {groups.map((group, gi) => <ScoreTable key={gi} group={group} gi={gi} />)}

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
          {viewMode === 'stroke' ? (
            <>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#dde7fb]"/><span className="text-[10px] text-[#6b7a72]">Eagle/Birdie</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#d9eedd]"/><span className="text-[10px] text-[#6b7a72]">Par</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#f6e6c4]"/><span className="text-[10px] text-[#6b7a72]">Bogey</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#fadcd6]"/><span className="text-[10px] text-[#6b7a72]">Doble+</span></div>
            </>
          ) : viewMode === 'stableford' ? (
            <>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#dde7fb]"/><span className="text-[10px] text-[#6b7a72]">3-4 pts</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#d9eedd]"/><span className="text-[10px] text-[#6b7a72]">2 pts</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#f6e6c4]"/><span className="text-[10px] text-[#6b7a72]">1 pt</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-[3px] bg-[#fadcd6]"/><span className="text-[10px] text-[#6b7a72]">0 pts</span></div>
            </>
          ) : null}
        </div>
      </div>

      {/* Bet modal */}
      {showBetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }}>
          <div className="w-full max-w-[430px] bg-white rounded-t-[28px] p-5 pb-10">
            <div className="w-10 h-1 rounded-full bg-[#e5e0d4] mx-auto mb-4"/>
            <h2 className="text-[18px] font-black text-[#0e1a16] mb-1">Apuesta de la ronda</h2>
            <p className="text-[12px] text-[#6b7a72] mb-4">El que pierda tiene que cumplirla. Se mostrará al firmar.</p>
            <input
              value={bet}
              onChange={e => setBet(e.target.value)}
              placeholder="Ej: el que pierde paga las cervezas..."
              className="w-full border-2 border-[#e5e0d4] rounded-[14px] px-4 py-3 text-[14px] text-[#0e1a16] outline-none focus:border-[#e8b75a] mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowBetModal(false)}
                className="flex-1 py-3 rounded-full border border-[#e5e0d4] font-semibold text-[14px] text-[#6b7a72]">
                Cancelar
              </button>
              <button disabled={savingBet} onClick={async () => {
                setSavingBet(true)
                await setBetMut({ round_id: roundId as Id<'rounds'>, bet: bet || null })
                setSavingBet(false)
                setShowBetModal(false)
              }}
                className="flex-1 py-3 rounded-full font-bold text-[14px] text-[#0e1a16] disabled:opacity-60"
                style={{ backgroundColor: '#e8b75a' }}>
                {savingBet ? 'Guardando...' : bet ? 'Guardar apuesta' : 'Quitar apuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit players modal */}
      {showEditPlayers && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }}>
          <div className="w-full max-w-[430px] bg-white rounded-t-[28px] p-5 pb-10 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 rounded-full bg-[#e5e0d4] mx-auto mb-4"/>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-black text-[#0e1a16]">Jugadores</h2>
              <button onClick={() => setShowEditPlayers(false)} className="text-[#6b7a72] text-[20px]">×</button>
            </div>
            {/* Current players */}
            <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-2">En esta ronda</p>
            <div className="space-y-2 mb-4">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-[#f4f1e9] rounded-[12px] px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                  <span className="flex-1 font-semibold text-[13px] text-[#0e1a16]">{p.name}</span>
                  <span className="font-mono text-[10px] text-[#6b7a72]">hcp {p.course_handicap}</span>
                  {p.id !== myId && (
                    <button onClick={() => removePlayer(p.id)} className="text-[#c6432d] text-[11px] font-semibold px-2 py-1 rounded-full border border-[#c6432d] hover:bg-[#fadcd6] transition">
                      Quitar
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Add players */}
            <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-2">Añadir jugador</p>
            <div className="space-y-2">
              {(allProfiles ?? []).filter(p => !players.find(rp => rp.id === p._id)).map(p => (
                <button key={p._id} onClick={() => addPlayer(p._id)}
                  className="w-full flex items-center gap-3 bg-white rounded-[12px] px-3 py-2.5 border border-[#e5e0d4] text-left active:opacity-70">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                  <span className="flex-1 font-semibold text-[13px] text-[#0e1a16]">{p.name}</span>
                  <span className="font-mono text-[10px] text-[#1f8a5b] font-bold">+ Añadir</span>
                </button>
              ))}
            </div>

            {/* Danger zone — solo práctica */}
            <div className="mt-5 pt-4 border-t border-[#efebe1]">
              {isPractice ? (
                <button onClick={async () => {
                  if (!confirm('¿Borrar esta ronda de práctica? Se eliminarán todos los golpes.')) return
                  await removeRoundMut({ round_id: roundId as Id<'rounds'> })
                  router.push('/')
                }}
                  className="w-full py-3 rounded-full border-2 border-[#c6432d] text-[#c6432d] font-bold text-[14px] transition active:opacity-80">
                  Borrar ronda de práctica
                </button>
              ) : (
                <div className="bg-[#f4f1e9] rounded-[12px] px-4 py-3 text-center">
                  <p className="text-[12px] text-[#6b7a72] font-semibold">Ronda competitiva — no se puede borrar</p>
                  <p className="font-mono text-[10px] text-[#6b7a72] mt-0.5">Contacta al admin si hay un error</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          <Link href={`/hoyo?round=${roundId}&hole=${nextHole.hole_number}`}
            className="flex items-center justify-between w-full px-5 py-4 rounded-full font-bold text-[14px] text-white"
            style={{ backgroundColor: '#0e1a16' }}>
            <div>
              <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Siguiente</p>
              <p className="text-[15px] font-black">Hoyo {nextHole.hole_number} · par {nextHole.par}</p>
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
