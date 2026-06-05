'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { strokesReceived, stablefordPts } from '@/lib/golf'

type Hole   = { hole_number: number; par: number; stroke_index: number; distance_m: number | null }
type Player = { id: string; name: string; short: string; avatar_color: string; course_handicap: number }
type PlayerScore = {
  strokes: number | null
  putts: number
  fairway: boolean | null
  gir: boolean
  in_bunker: boolean
  penalties: number
}

const SPINNER = <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

function scoreColor(delta: number): { bg: string; text: string } {
  if (delta <= -1) return { bg: '#dde7fb', text: '#2a6fdb' }
  if (delta === 0)  return { bg: '#d9eedd', text: '#1f8a5b' }
  if (delta === 1)  return { bg: '#f6e6c4', text: '#9b6e1a' }
  return { bg: '#fadcd6', text: '#a83a25' }
}

function HoyoPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const roundId  = searchParams.get('round') ?? ''
  const holeNum  = parseInt(searchParams.get('hole') ?? '1')

  const [hole, setHole]         = useState<Hole | null>(null)
  const [players, setPlayers]   = useState<Player[]>([])
  const [scores, setScores]     = useState<Record<string, PlayerScore>>({})
  const [saving, setSaving]     = useState(false)
  const [totalHoles, setTotal]  = useState(18)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [roundModes, setRoundModes] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!roundId) return
    async function load() {
      const [roundRes, playersRes, modesRes] = await Promise.all([
        supabase.from('rounds').select('course_id, courses(holes_count)').eq('id', roundId).single(),
        supabase.from('round_players').select('profile_id, is_guest, course_handicap, profiles(name, avatar_color)').eq('round_id', roundId),
        supabase.from('round_modes').select('mode').eq('round_id', roundId),
      ])
      setRoundModes((modesRes.data ?? []).map((m: any) => m.mode))

      const course = Array.isArray(roundRes.data?.courses) ? roundRes.data!.courses[0] : roundRes.data?.courses as any
      setTotal(course?.holes_count ?? 18)

      const { data: h } = await supabase.from('holes').select('hole_number, par, stroke_index, distance_m').eq('course_id', roundRes.data?.course_id).eq('hole_number', holeNum).single()
      setHole(h)

      const ps: Player[] = (playersRes.data ?? []).map((rp: any) => ({
        id: rp.profile_id ?? `guest_${rp.id}`,
        name: (rp.profiles as any)?.name ?? 'Invitado',
        short: ((rp.profiles as any)?.name ?? 'I')[0].toUpperCase(),
        avatar_color: (rp.profiles as any)?.avatar_color ?? '#6b7a72',
        course_handicap: rp.course_handicap ?? 0,
      }))
      setPlayers(ps)

      // Load existing scores
      const ids = ps.filter(p => !p.id.startsWith('guest_')).map(p => p.id)
      if (ids.length > 0 && h) {
        const { data: existing } = await supabase.from('scores').select('*').eq('round_id', roundId).eq('hole_number', holeNum).in('profile_id', ids)
        const init: Record<string, PlayerScore> = {}
        for (const s of existing ?? []) {
          init[s.profile_id] = { strokes: s.strokes ?? null, putts: s.putts ?? 2, fairway: s.fairway ?? null, gir: s.gir ?? false, in_bunker: s.in_bunker ?? false, penalties: s.penalties ?? 0 }
        }
        setScores(init)
      }
    }
    load()
  }, [roundId, holeNum])

  function get(pid: string): PlayerScore {
    return scores[pid] ?? { strokes: null, putts: 2, fairway: null, gir: false, in_bunker: false, penalties: 0 }
  }

  function set(pid: string, field: keyof PlayerScore, value: PlayerScore[typeof field]) {
    setScores(prev => ({ ...prev, [pid]: { ...get(pid), [field]: value } }))
  }

  function setScore(pid: string, strokes: number) {
    const par = hole?.par ?? 4
    // Auto-set GIR if strokes <= par - putts
    const current = get(pid)
    const gir = strokes <= par - 1 // heuristic
    setScores(prev => ({ ...prev, [pid]: { ...current, strokes, gir } }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/hoyo/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: roundId, hole_number: holeNum, scores }),
    })
    if (!res.ok) { setSaving(false); alert('Error guardando'); return }
    const isLast = holeNum >= totalHoles
    if (isLast) router.push(`/resumen?round=${roundId}`)
    else router.push(`/tarjeta?round=${roundId}`)
  }

  if (!hole) return SPINNER

  const par = hole.par

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      {/* Header */}
      <div className="safe-top px-[14px] pt-3 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push(`/tarjeta?round=${roundId}`)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Tarjeta
          </button>
          <div className="flex items-center gap-3">
            {holeNum > 1 && (
              <button onClick={() => router.push(`/hoyo?round=${roundId}&hole=${holeNum - 1}`)} className="font-mono text-[11px] text-[#6b7a72]">← H{holeNum - 1}</button>
            )}
            <span className="font-mono text-[10px] text-[#6b7a72] uppercase">HOYO {String(holeNum).padStart(2,'0')} / {totalHoles}</span>
            {holeNum < totalHoles && (
              <button onClick={() => router.push(`/hoyo?round=${roundId}&hole=${holeNum + 1}`)} className="font-mono text-[11px] text-[#6b7a72]">H{holeNum + 1} →</button>
            )}
          </div>
        </div>
      </div>

      {/* Compact hole hero */}
      <div className="mx-[14px] rounded-[18px] px-4 py-3 mb-3 relative overflow-hidden flex items-center gap-4" style={{ backgroundColor: '#0e1a16' }}>
        <div className="absolute right-[-20px] top-[-20px] w-[80px] h-[80px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
        <div className="text-[56px] font-black text-white leading-none relative">{holeNum}</div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-[18px] font-black">Par {par}</span>
            <span className="font-mono text-[10px] text-white/50">SI {hole.stroke_index}</span>
            {hole.distance_m && <span className="font-mono text-[10px] text-white/50">{hole.distance_m}m</span>}
          </div>
          {/* Handicap strokes per player — highlighted if receiving on this hole */}
          <div className="flex gap-2 flex-wrap mt-1">
            {players.map(p => {
              const rcv = strokesReceived(p.course_handicap, hole.stroke_index)
              return (
                <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ backgroundColor: rcv > 0 ? 'rgba(31,138,91,0.25)' : 'rgba(255,255,255,0.1)' }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ backgroundColor: p.avatar_color }}>{p.short}</div>
                  <span className="font-mono text-[10px] text-white/70">h{p.course_handicap}</span>
                  {rcv > 0 && <span className="font-mono text-[10px] font-black text-[#1f8a5b]">+{rcv}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Players — compact 2-row per player */}
      <div className="flex-1 px-[14px] space-y-2 pb-28">
        {players.map(p => {
          const sc = get(p.id)
          const delta = sc.strokes != null ? sc.strokes - par : null
          const colors = delta != null ? scoreColor(delta) : null
          const isExp = expanded[p.id]

          // Score button options: par-1, par, par+1, par+2, par+3, par+4
          const scoreOpts = [par - 1, par, par + 1, par + 2, par + 3, par + 4].filter(s => s >= 1)

          return (
            <div key={p.id} className="bg-white rounded-[18px] border border-[#e5e0d4] overflow-hidden">
              {/* Row 1: player + score buttons */}
              <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5">
                <div className="flex-shrink-0 text-center" style={{ minWidth: 44 }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold mx-auto" style={{ backgroundColor: p.avatar_color }}>
                    {p.short}
                  </div>
                  <p className="font-mono text-[9px] text-[#6b7a72] mt-0.5">
                    h{p.course_handicap}
                    {(() => { const rcv = strokesReceived(p.course_handicap, hole?.stroke_index ?? 18); return rcv > 0 ? <span className="text-[#1f8a5b] font-black"> +{rcv}</span> : null })()}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-1">
                  {scoreOpts.map(s => {
                    const d = s - par
                    const c = scoreColor(d)
                    const isSelected = sc.strokes === s
                    const isStableford = roundModes.includes('stableford')
                    const rcv = strokesReceived(p.course_handicap, hole?.stroke_index ?? 18)
                    const pts = isStableford ? stablefordPts(s, par, rcv) : null
                    return (
                      <button key={s} onClick={() => setScore(p.id, s)}
                        className="flex-1 h-12 rounded-[12px] transition active:scale-95 flex flex-col items-center justify-center"
                        style={{
                          backgroundColor: isSelected ? c.bg : '#f4f1e9',
                          color: isSelected ? c.text : '#9b9b8a',
                          border: isSelected ? `2px solid ${c.text}55` : '2px solid transparent',
                        }}>
                        <span className="font-mono font-black leading-none" style={{ fontSize: isSelected ? 18 : 16 }}>{s}</span>
                        {isStableford && pts !== null && (
                          <span className="font-mono leading-none mt-0.5" style={{ fontSize: 9, color: isSelected ? c.text : '#6b7a72', opacity: 0.8 }}>{pts}pt</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Selected chip + expand */}
                <div className="flex items-center gap-1.5">
                  {colors && sc.strokes != null && (
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center font-mono text-[12px] font-black" style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {sc.strokes}
                    </div>
                  )}
                  <button onClick={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition"
                    style={{ backgroundColor: isExp ? '#0e1a16' : '#f4f1e9' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d={isExp ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} stroke={isExp ? '#fff' : '#6b7a72'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>

              {/* Row 2: putts */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#efebe1]">
                <span className="font-mono text-[11px] text-[#6b7a72] w-12">Putts</span>
                <div className="flex gap-2 flex-1">
                  {[0, 1, 2, 3, 4].map(n => (
                    <button key={n} onClick={() => set(p.id, 'putts', n)}
                      className="flex-1 h-11 rounded-[10px] font-mono text-[16px] font-bold transition active:scale-95"
                      style={{ backgroundColor: sc.putts === n ? '#0e1a16' : '#f4f1e9', color: sc.putts === n ? '#fff' : '#6b7a72' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: toggles */}
              <div className="flex items-center gap-2 px-3 pb-3 border-t border-[#efebe1] pt-2.5">
                {par > 3 && (
                  <button onClick={() => set(p.id, 'fairway', !sc.fairway)}
                    className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition"
                    style={{ backgroundColor: sc.fairway ? '#d9eedd' : '#f4f1e9', color: sc.fairway ? '#1f8a5b' : '#6b7a72' }}>
                    Calle
                  </button>
                )}
                <button onClick={() => set(p.id, 'gir', !sc.gir)}
                  className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition"
                  style={{ backgroundColor: sc.gir ? '#d9eedd' : '#f4f1e9', color: sc.gir ? '#1f8a5b' : '#6b7a72' }}>
                  GIR
                </button>
                <button onClick={() => set(p.id, 'in_bunker', !sc.in_bunker)}
                  className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition"
                  style={{ backgroundColor: sc.in_bunker ? '#f6e6c4' : '#f4f1e9', color: sc.in_bunker ? '#9b6e1a' : '#6b7a72' }}>
                  Búnker
                </button>
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <button onClick={() => set(p.id, 'penalties', Math.max(0, sc.penalties - 1))} className="w-8 h-8 rounded-full bg-[#f4f1e9] flex items-center justify-center text-[16px] text-[#6b7a72]">−</button>
                  <div className="text-center">
                    <span className="font-mono text-[14px] font-black text-[#0e1a16]">{sc.penalties}</span>
                    <p className="font-mono text-[8px] text-[#6b7a72] leading-none">Pen</p>
                  </div>
                  <button onClick={() => set(p.id, 'penalties', sc.penalties + 1)} className="w-8 h-8 rounded-full bg-[#f4f1e9] flex items-center justify-center text-[16px] text-[#6b7a72]">+</button>
                </div>
              </div>

              {/* Expanded: custom stroke input */}
              {isExp && (
                <div className="px-3 pb-3 pt-1 border-t border-[#efebe1]">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-[#6b7a72] font-medium">Golpes exactos:</span>
                    <button onClick={() => sc.strokes && set(p.id, 'strokes', Math.max(1, sc.strokes - 1))} className="w-8 h-8 rounded-full border border-[#e5e0d4] flex items-center justify-center text-[16px] text-[#6b7a72]">−</button>
                    <span className="font-mono text-[20px] font-black text-[#0e1a16] w-8 text-center">{sc.strokes ?? '–'}</span>
                    <button onClick={() => set(p.id, 'strokes', (sc.strokes ?? par) + 1)} className="w-8 h-8 rounded-full bg-[#0e1a16] flex items-center justify-center text-[16px] text-white">+</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-3 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] text-white transition active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: '#0e1a16' }}>
          <span>{holeNum >= totalHoles ? 'Guardar · ver resumen' : `Guardar · hoyo ${holeNum + 1}`}</span>
          <span className="px-3 py-1.5 rounded-full text-[12px] font-black text-[#0e1a16]" style={{ backgroundColor: '#1f8a5b' }}>
            {saving ? '…' : holeNum >= totalHoles ? '✓' : `H${holeNum + 1} →`}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={SPINNER}><HoyoPage /></Suspense>
}
