'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { scoreLabel, strokesReceived } from '@/lib/golf'

type Hole   = { hole_number: number; par: number; stroke_index: number; distance_m: number | null }
type Player = { id: string; name: string; avatar_color: string; course_handicap: number; is_guest: boolean }
type ScoreEntry = {
  strokes: number
  putts: number
  fairway: boolean | null   // null = par3 (no aplica)
  gir: boolean
  in_bunker: boolean
  penalties: number
}

const SPINNER = <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

function HoyoPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const roundId  = searchParams.get('round') ?? ''
  const holeNum  = parseInt(searchParams.get('hole') ?? '1')

  const [hole, setHole]       = useState<Hole | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [scores, setScores]   = useState<Record<string, ScoreEntry>>({})
  const [saving, setSaving]   = useState(false)
  const [totalHoles, setTotalHoles] = useState(18)
  const supabase = createClient()

  useEffect(() => {
    if (!roundId) return
    async function load() {
      // Round → course
      const { data: round } = await supabase.from('rounds').select('course_id, courses(holes_count)').eq('id', roundId).single()
      if (!round) return
      const courseData = Array.isArray(round.courses) ? round.courses[0] : round.courses as { holes_count: number }
      setTotalHoles(courseData?.holes_count ?? 18)

      // Hole info
      const { data: h } = await supabase.from('holes').select('hole_number, par, stroke_index, distance_m').eq('course_id', round.course_id).eq('hole_number', holeNum).single()
      setHole(h)

      // Players
      const { data: rps } = await supabase.from('round_players').select('profile_id, is_guest, course_handicap, profiles(name, avatar_color)').eq('round_id', roundId)
      const ps: Player[] = (rps ?? []).map((rp: any) => ({
        id: rp.profile_id ?? `guest_${rp.id}`,
        name: (rp.profiles as any)?.name ?? 'Invitado',
        avatar_color: (rp.profiles as any)?.avatar_color ?? '#6b7a72',
        course_handicap: rp.course_handicap ?? 0,
        is_guest: rp.is_guest,
      }))
      setPlayers(ps)

      // Existing scores for this hole
      if (ps.length > 0) {
        const ids = ps.filter(p => !p.is_guest).map(p => p.id)
        if (ids.length > 0) {
          const { data: existing } = await supabase.from('scores').select('*').eq('round_id', roundId).eq('hole_number', holeNum).in('profile_id', ids)
          const init: Record<string, ScoreEntry> = {}
          for (const s of existing ?? []) {
            init[s.profile_id] = { strokes: s.strokes ?? (h?.par ?? 4), putts: s.putts ?? 2, fairway: s.fairway ?? null, gir: s.gir ?? false, in_bunker: s.in_bunker ?? false, penalties: s.penalties ?? 0 }
          }
          setScores(init)
        }
      }
    }
    load()
  }, [roundId, holeNum])

  function getScore(pid: string): ScoreEntry {
    return scores[pid] ?? { strokes: hole?.par ?? 4, putts: 2, fairway: null, gir: false, in_bunker: false, penalties: 0 }
  }

  function update(pid: string, field: keyof ScoreEntry, value: number | boolean | null) {
    setScores(prev => ({ ...prev, [pid]: { ...getScore(pid), [field]: value } }))
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

  const delta = (s: ScoreEntry) => s.strokes - (hole?.par ?? 4)
  const chipColor = (d: number) => d <= -1 ? '#dde7fb' : d === 0 ? '#d9eedd' : d === 1 ? '#f6e6c4' : '#fadcd6'
  const chipText  = (d: number) => d <= -1 ? '#2a6fdb' : d === 0 ? '#1f8a5b' : d === 1 ? '#9b6e1a' : '#a83a25'

  return (
    <div className="min-h-screen bg-[#f4f1e9]">
      {/* Header */}
      <div className="safe-top px-[14px] pt-3 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push(`/tarjeta?round=${roundId}`)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Tarjeta
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">HOYO {String(holeNum).padStart(2,'0')} / {totalHoles}</span>
          {holeNum < totalHoles && (
            <button onClick={() => router.push(`/hoyo?round=${roundId}&hole=${holeNum+1}`)} className="text-[#6b7a72] font-semibold text-[13px]">
              H{holeNum+1} →
            </button>
          )}
        </div>
      </div>

      {/* Hole hero */}
      <div className="mx-[14px] rounded-[22px] p-5 relative overflow-hidden mb-3" style={{ backgroundColor: '#0e1a16' }}>
        <div className="absolute right-[-30px] top-[-30px] w-[130px] h-[130px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
        {/* Mini course map */}
        <svg width="100%" height="44" viewBox="0 0 300 44" className="mb-3">
          <ellipse cx="18" cy="22" rx="12" ry="8" fill="#d9eedd"/>
          <path d="M26 22 Q80 6 150 22 T280 26" stroke="#1f8a5b" strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.8"/>
          <circle cx="280" cy="26" r="9" fill="#d9eedd"/>
          <circle cx="280" cy="26" r="3" fill="#0e1a16"/>
          <line x1="280" y1="26" x2="280" y2="10" stroke="white" strokeWidth="1.5"/>
          <path d="M280 10 L292 13 L280 16 Z" fill="#1f8a5b"/>
        </svg>
        <div className="flex items-end gap-3 relative">
          <div className="text-[80px] font-black text-white leading-none tracking-tight" style={{ lineHeight: '0.85' }}>{holeNum}</div>
          <div className="pb-2">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 mb-2">
              <span className="text-white text-[12px] font-bold">Par {hole.par}</span>
              <span className="text-white/50 text-[10px]">·</span>
              <span className="font-mono text-white/70 text-[10px]">Hcp {hole.stroke_index}</span>
              {hole.distance_m && <><span className="text-white/50 text-[10px]">·</span><span className="font-mono text-white/70 text-[10px]">{hole.distance_m}m</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="px-[14px] space-y-3 pb-28">
        {players.map(p => {
          const sc = getScore(p.id)
          const d  = delta(sc)
          const rcv = strokesReceived(p.course_handicap, hole.stroke_index)

          return (
            <div key={p.id} className="bg-white rounded-[20px] border border-[#e5e0d4] p-4">
              {/* Player header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ backgroundColor: p.avatar_color }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-[#0e1a16]">{p.name}</p>
                    <p className="font-mono text-[10px] text-[#6b7a72]">Hcp juego {p.course_handicap}{rcv > 0 ? ` · +${rcv} este hoyo` : ''}</p>
                  </div>
                </div>
                {/* Score chip */}
                <div className="rounded-[8px] px-3 py-1.5 text-center" style={{ backgroundColor: chipColor(d), color: chipText(d) }}>
                  <p className="font-mono text-[11px] font-bold">{sc.strokes}</p>
                  <p className="text-[9px] font-semibold mt-0.5">{scoreLabel(sc.strokes, hole.par)}</p>
                </div>
              </div>

              {/* Stroke counter */}
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-[#6b7a72] uppercase tracking-wide mb-2">Golpes</p>
                <div className="flex items-center justify-between">
                  <button onClick={() => update(p.id, 'strokes', Math.max(1, sc.strokes - 1))}
                    className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-[22px] text-[#6b7a72] font-light active:scale-95 transition">−</button>
                  <span className="text-[72px] font-black text-[#0e1a16] leading-none tabular-nums">{sc.strokes}</span>
                  <button onClick={() => update(p.id, 'strokes', sc.strokes + 1)}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] text-white font-light active:scale-95 transition" style={{ backgroundColor: '#0e1a16' }}>+</button>
                </div>
              </div>

              {/* Putts */}
              <div className="mb-4 border-t border-[#efebe1] pt-3">
                <p className="text-[11px] font-semibold text-[#6b7a72] uppercase tracking-wide mb-2">Putts</p>
                <div className="flex gap-2">
                  {[0,1,2,3,4].map(n => (
                    <button key={n} onClick={() => update(p.id, 'putts', n)}
                      className="flex-1 h-10 rounded-full font-bold text-[14px] transition active:scale-95"
                      style={{ backgroundColor: sc.putts === n ? '#0e1a16' : '#f4f1e9', color: sc.putts === n ? '#fff' : '#6b7a72' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail toggles */}
              <div className="grid grid-cols-2 gap-2">
                {/* Fairway — only for par 4 and 5 */}
                {hole.par > 3 && (
                  <button onClick={() => update(p.id, 'fairway', !sc.fairway)}
                    className="flex items-center justify-between rounded-[14px] px-3 py-2.5 border transition"
                    style={{ backgroundColor: sc.fairway ? '#d9eedd' : '#fff', borderColor: sc.fairway ? '#1f8a5b' : '#e5e0d4' }}>
                    <span className="text-[13px] font-semibold" style={{ color: sc.fairway ? '#1f8a5b' : '#0e1a16' }}>Calle</span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: sc.fairway ? '#1f8a5b' : 'transparent', border: sc.fairway ? 'none' : '1.5px solid #e5e0d4' }}>
                      {sc.fairway && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )}
                {/* GIR */}
                <button onClick={() => update(p.id, 'gir', !sc.gir)}
                  className="flex items-center justify-between rounded-[14px] px-3 py-2.5 border transition"
                  style={{ backgroundColor: sc.gir ? '#d9eedd' : '#fff', borderColor: sc.gir ? '#1f8a5b' : '#e5e0d4' }}>
                  <span className="text-[13px] font-semibold" style={{ color: sc.gir ? '#1f8a5b' : '#0e1a16' }}>Green</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: sc.gir ? '#1f8a5b' : 'transparent', border: sc.gir ? 'none' : '1.5px solid #e5e0d4' }}>
                    {sc.gir && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </button>
                {/* Búnker */}
                <button onClick={() => update(p.id, 'in_bunker', !sc.in_bunker)}
                  className="flex items-center justify-between rounded-[14px] px-3 py-2.5 border transition"
                  style={{ backgroundColor: sc.in_bunker ? '#f6e6c4' : '#fff', borderColor: sc.in_bunker ? '#9b6e1a' : '#e5e0d4' }}>
                  <span className="text-[13px] font-semibold" style={{ color: sc.in_bunker ? '#9b6e1a' : '#0e1a16' }}>Búnker</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: sc.in_bunker ? '#9b6e1a' : 'transparent', border: sc.in_bunker ? 'none' : '1.5px solid #e5e0d4' }}>
                    {sc.in_bunker && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </button>
                {/* Penalizaciones */}
                <div className="flex items-center justify-between rounded-[14px] px-3 py-2.5 border border-[#e5e0d4] bg-white">
                  <span className="text-[13px] font-semibold text-[#0e1a16]">Penalti</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => update(p.id, 'penalties', Math.max(0, sc.penalties - 1))} className="w-6 h-6 rounded-full border border-[#e5e0d4] flex items-center justify-center text-[14px] text-[#6b7a72]">−</button>
                    <span className="font-mono text-[14px] font-bold text-[#0e1a16] w-4 text-center">{sc.penalties}</span>
                    <button onClick={() => update(p.id, 'penalties', sc.penalties + 1)} className="w-6 h-6 rounded-full border border-[#e5e0d4] flex items-center justify-center text-[14px] text-[#6b7a72]">+</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Save CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: '#0e1a16', color: '#fff' }}>
          <span>{holeNum >= totalHoles ? 'Guardar · ver resumen' : `Guardar · hoyo ${holeNum + 1}`}</span>
          <span className="px-3 py-1.5 rounded-full text-[12px] font-black text-[#0e1a16]" style={{ backgroundColor: '#1f8a5b' }}>
            {saving ? '…' : holeNum >= totalHoles ? '✓' : `H${holeNum+1} →`}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={SPINNER}><HoyoPage /></Suspense>
}
