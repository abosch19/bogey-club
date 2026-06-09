import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { strokesReceived, stablefordPts } from '@/lib/golf'
import { Drawer } from 'vaul'
import { Avatar } from '@/components/ui/avatar'

type Hole   = { hole_number: number; par: number; stroke_index: number; distance_m: number | null }
type Player = { id: string; name: string; avatar_color: string; course_handicap: number }
type PlayerScore = {
  strokes: number | null
  putts: number | null
  fairway: boolean | null
  gir: boolean
  in_bunker: boolean
  penalties: number
}

function sameScores(a: Record<string, PlayerScore>, b: Record<string, PlayerScore>): boolean {
  const ak = Object.keys(a)
  if (ak.length !== Object.keys(b).length) return false
  return ak.every(k => {
    const x = a[k], y = b[k]
    return !!y && x.strokes === y.strokes && x.putts === y.putts && x.fairway === y.fairway
      && x.gir === y.gir && x.in_bunker === y.in_bunker && x.penalties === y.penalties
  })
}

function scoreColor(delta: number): { bg: string; text: string } {
  if (delta <= -1) return { bg: '#dde7fb', text: '#2a6fdb' }
  if (delta === 0)  return { bg: '#d9eedd', text: '#1f8a5b' }
  if (delta === 1)  return { bg: '#f6e6c4', text: '#9b6e1a' }
  return { bg: '#fadcd6', text: '#a83a25' }
}

type ScrambleSectionProps = {
  players: Player[]
  par: number
  holeNum: number
  get: (pid: string) => PlayerScore
  setScore: (pid: string, strokes: number) => void
  set: (pid: string, field: keyof PlayerScore, value: PlayerScore[keyof PlayerScore]) => void
}

function ScrambleSection({ players, par, holeNum, get, setScore, set }: ScrambleSectionProps) {
  const hasTwoTeams = players.length >= 4 && players.some(p => p.course_handicap === 2)
  const teams = hasTwoTeams
    ? [
        { team: 1, color: '#1f8a5b', light: '#d9eedd', members: players.filter(p => p.course_handicap === 1) },
        { team: 2, color: '#2a6fdb', light: '#dde7fb', members: players.filter(p => p.course_handicap === 2) },
      ].filter(t => t.members.length > 0)
    : [{ team: 0, color: '#1f8a5b', light: '#d9eedd', members: players }]

  const scoreOpts = [par - 1, par, par + 1, par + 2, par + 3, par + 4].filter(s => s >= 1)

  return (
    <div className="px-[14px] space-y-3">
      <div className="bg-[#d9eedd] rounded-[12px] px-4 py-2.5 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 3v18"/><path d="M5 4h11l-2 3 2 3H5"/></svg>
        <p className="text-[12px] text-[#1f8a5b] font-semibold">
          {hasTwoTeams ? 'Scramble por equipos — un resultado por equipo' : 'Scramble — todos juegan, anotar el mejor resultado del equipo'}
        </p>
      </div>

      {teams.map(({ team, color, light, members }) => {
        const sc = get(members[0]?.id ?? '')
        const delta = sc.strokes != null ? sc.strokes - par : null
        const colors = delta != null ? scoreColor(delta) : null

        return (
          <div key={team} className="bg-white rounded-[22px] overflow-hidden border-2"
            style={{ borderColor: color }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: light }}>
              <div className="flex -space-x-2">
                {members.map(m => (
                  <Avatar key={m.id} name={m.name} size={36} className="border-[3px] border-white" />
                ))}
              </div>
              <div className="flex-1">
                <p className="font-black text-[15px]" style={{ color }}>
                  {hasTwoTeams ? `Equipo ${team}` : members.map(m => m.name.split(' ')[0]).join(' & ')}
                </p>
                <p className="font-mono text-[10px] text-[#6b7a72]">
                  {members.map(m => `h${m.course_handicap}`).join(' · ')}
                </p>
              </div>
              {colors && sc.strokes != null && (
                <div className="w-12 h-12 rounded-[12px] flex flex-col items-center justify-center font-mono font-black"
                  style={{ backgroundColor: colors.bg, color: colors.text }}>
                  <span className="text-[20px] leading-none">{sc.strokes}</span>
                  <span className="text-[9px] leading-none mt-0.5">{delta! > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}</span>
                </div>
              )}
            </div>

            <div className="px-4 pt-4 pb-3">
              <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide mb-2">Resultado del equipo · hoyo {holeNum}</p>
              <div className="flex gap-2">
                {scoreOpts.map(s => {
                  const d = s - par
                  const c = scoreColor(d)
                  const isSel = sc.strokes === s
                  return (
                    <button key={s} type="button"
                      onClick={() => members.forEach(m => setScore(m.id, s))}
                      className="flex-1 h-14 rounded-[14px] transition active:scale-95 flex flex-col items-center justify-center gap-0.5"
                      style={{
                        backgroundColor: isSel ? c.bg : '#f4f1e9',
                        color: isSel ? c.text : '#9b9b8a',
                        border: isSel ? `2px solid ${c.text}55` : '2px solid transparent',
                      }}>
                      <span className="font-mono font-black leading-none" style={{ fontSize: isSel ? 20 : 17 }}>{s}</span>
                      {isSel && <span className="font-mono text-[9px] leading-none opacity-70">{d > 0 ? `+${d}` : d === 0 ? 'par' : `${d}`}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 pb-4 border-t border-[#efebe1] pt-3">
              <span className="font-mono text-[11px] text-[#6b7a72] w-12">Putts</span>
              <div className="flex gap-2 flex-1">
                {[0,1,2,3,4].map(n => (
                  <button key={n} type="button"
                    onClick={() => members.forEach(m => set(m.id, 'putts', n))}
                    className="flex-1 h-10 rounded-[10px] font-mono text-[14px] font-bold transition active:scale-95"
                    style={{ backgroundColor: sc.putts === n ? '#0e1a16' : '#f4f1e9', color: sc.putts === n ? '#fff' : '#6b7a72' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

type PlayerCardProps = {
  player: Player
  par: number
  hole: Hole
  roundModes: string[]
  expanded: boolean
  onToggleExpand: () => void
  get: (pid: string) => PlayerScore
  setScore: (pid: string, strokes: number) => void
  set: (pid: string, field: keyof PlayerScore, value: PlayerScore[keyof PlayerScore]) => void
}

function PlayerCard({ player: p, par, hole, roundModes, expanded: isExp, onToggleExpand, get, setScore, set }: PlayerCardProps) {
  const sc = get(p.id)
  const delta = sc.strokes != null ? sc.strokes - par : null
  const colors = delta != null ? scoreColor(delta) : null

  const scoreOpts = [par - 1, par, par + 1, par + 2, par + 3, par + 4].filter(s => s >= 1)

  return (
    <div className="bg-white rounded-[18px] border border-[#e5e0d4] overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2.5">
        <div className="flex-shrink-0 text-center" style={{ minWidth: 44 }}>
          <Avatar name={p.name} size={40} className="mx-auto" />
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
              <button key={s} type="button" onClick={() => setScore(p.id, s)}
                className="flex-1 h-12 rounded-[12px] transition active:scale-95 flex flex-col items-center justify-center"
                style={{
                  backgroundColor: isSelected ? c.bg : '#f4f1e9',
                  color: isSelected ? c.text : '#9b9b8a',
                  border: isSelected ? `2px solid ${c.text}55` : '2px solid transparent',
                }}>
                <span className="font-mono font-black leading-none" style={{ fontSize: isSelected ? 18 : 16 }}>{s}</span>
                {isStableford && pts !== null && (
                  <span className="font-mono leading-none mt-0.5" style={{ fontSize: 12, color: isSelected ? c.text : '#6b7a72', opacity: 0.8 }}>{pts}pt</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {colors && sc.strokes != null && (
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center font-mono text-[12px] font-black" style={{ backgroundColor: colors.bg, color: colors.text }}>
              {sc.strokes}
            </div>
          )}
          <button type="button" onClick={onToggleExpand}
            aria-label={isExp ? 'Ocultar detalles' : 'Mostrar detalles'}
            className="w-7 h-7 rounded-full flex items-center justify-center transition"
            style={{ backgroundColor: isExp ? '#0e1a16' : '#f4f1e9' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d={isExp ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} stroke={isExp ? '#fff' : '#6b7a72'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#efebe1]">
        <span className="font-mono text-[11px] text-[#6b7a72] w-12">Putts</span>
        <div className="flex gap-2 flex-1">
          {[0, 1, 2, 3, 4].map(n => (
            <button key={n} type="button" onClick={() => set(p.id, 'putts', n)}
              className="flex-1 h-11 rounded-[10px] font-mono text-[16px] font-bold transition active:scale-95"
              style={{ backgroundColor: sc.putts === n ? '#0e1a16' : '#f4f1e9', color: sc.putts === n ? '#fff' : '#6b7a72' }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pb-3 border-t border-[#efebe1] pt-2.5">
        {par > 3 && (
          <button type="button" onClick={() => set(p.id, 'fairway', !sc.fairway)}
            className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition"
            style={{ backgroundColor: sc.fairway ? '#d9eedd' : '#f4f1e9', color: sc.fairway ? '#1f8a5b' : '#6b7a72' }}>
            Calle
          </button>
        )}
        <button type="button" onClick={() => set(p.id, 'gir', !sc.gir)}
          className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition"
          style={{ backgroundColor: sc.gir ? '#d9eedd' : '#f4f1e9', color: sc.gir ? '#1f8a5b' : '#6b7a72' }}>
          GIR
        </button>
        <button type="button" onClick={() => set(p.id, 'in_bunker', !sc.in_bunker)}
          className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold transition"
          style={{ backgroundColor: sc.in_bunker ? '#f6e6c4' : '#f4f1e9', color: sc.in_bunker ? '#9b6e1a' : '#6b7a72' }}>
          Bunker
        </button>
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <button type="button" onClick={() => set(p.id, 'penalties', Math.max(0, sc.penalties - 1))} aria-label="Quitar penalti" className="w-8 h-8 rounded-full bg-[#f4f1e9] flex items-center justify-center text-[16px] text-[#6b7a72]">-</button>
          <div className="text-center">
            <span className="font-mono text-[14px] font-black text-[#0e1a16]">{sc.penalties}</span>
            <p className="font-mono text-[8px] text-[#6b7a72] leading-none">Pen</p>
          </div>
          <button type="button" onClick={() => set(p.id, 'penalties', sc.penalties + 1)} aria-label="Añadir penalti" className="w-8 h-8 rounded-full bg-[#f4f1e9] flex items-center justify-center text-[16px] text-[#6b7a72]">+</button>
        </div>
      </div>

      {isExp && (
        <div className="px-3 pb-3 pt-1 border-t border-[#efebe1]">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#6b7a72] font-medium">Golpes exactos:</span>
            <button type="button" onClick={() => sc.strokes && set(p.id, 'strokes', Math.max(1, sc.strokes - 1))} aria-label="Un golpe menos" className="w-8 h-8 rounded-full border border-[#e5e0d4] flex items-center justify-center text-[16px] text-[#6b7a72]">-</button>
            <span className="font-mono text-[20px] font-black text-[#0e1a16] w-8 text-center">{sc.strokes ?? '-'}</span>
            <button type="button" onClick={() => set(p.id, 'strokes', (sc.strokes ?? par) + 1)} aria-label="Un golpe más" className="w-8 h-8 rounded-full bg-[#0e1a16] flex items-center justify-center text-[16px] text-white">+</button>
          </div>
        </div>
      )}
    </div>
  )
}

type HoleEntryProps = {
  roundId: string
  holeNum: number
  onChangeHole: (n: number) => void
  onFinish: () => void
}

function HoleEntry({ roundId, holeNum, onChangeHole, onFinish }: HoleEntryProps) {
  const data = useQuery(api.rounds.get, roundId ? { roundId: roundId as Id<'rounds'> } : 'skip')
  const saveHoleMut = useMutation(api.scores.saveHole)

  // Only the user's edits live in state; the saved scores are derived from the
  // server query, so there is no effect syncing state to a prop.
  const [edits, setEdits]       = useState<Record<string, PlayerScore>>({})
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  const roundModes = data?.modes ?? []
  // 9_twice: a 9-hole course played twice — holes 10-18 reuse the par/SI of 1-9
  // but keep their own displayed number and stored score.
  const is9Twice = data?.round.notes === '9_twice'
  const totalHoles = is9Twice ? 18 : data?.course?.holes_count ?? 18
  const physicalHole = is9Twice && holeNum > 9 ? holeNum - 9 : holeNum
  const holeRow = (data?.holes ?? []).find(h => h.hole_number === physicalHole) ?? null
  const hole: Hole | null = holeRow
    ? { hole_number: holeNum, par: holeRow.par, stroke_index: holeRow.stroke_index, distance_m: holeRow.distance_m ?? null }
    : null

  const players: Player[] = (data?.players ?? []).map(rp => ({
    id: rp.profileId ?? `guest_${rp._id}`,
    name: rp.name ?? 'Invitado',
    avatar_color: rp.avatar_color ?? '#6b7a72',
    course_handicap: rp.course_handicap ?? 0,
  }))
  const activePlayer = players.find((p) => p.id === selectedPlayerId) ?? players[0]

  // Scores saved on the server for this hole — derived, never copied into state.
  const serverScores = useMemo(() => {
    const init: Record<string, PlayerScore> = {}
    for (const s of (data?.scores ?? []).filter(s => s.hole_number === holeNum)) {
      init[s.profileId] = { strokes: s.strokes ?? null, putts: s.putts ?? null, fairway: s.fairway ?? null, gir: s.gir ?? false, in_bunker: s.in_bunker ?? false, penalties: s.penalties ?? 0 }
    }
    return init
  }, [data, holeNum])

  // What the UI shows: saved scores with the user's pending edits layered on top.
  const scores: Record<string, PlayerScore> = { ...serverScores, ...edits }

  function get(pid: string): PlayerScore {
    return scores[pid] ?? { strokes: null, putts: null, fairway: null, gir: false, in_bunker: false, penalties: 0 }
  }

  // Can only save when something changed AND at least one stroke was entered.
  const hasChanges = !sameScores(scores, serverScores)
  const hasStrokes = Object.values(scores).some(s => s.strokes != null)
  const canSave = hasChanges && hasStrokes

  function set(pid: string, field: keyof PlayerScore, value: PlayerScore[typeof field]) {
    setEdits(prev => ({ ...prev, [pid]: { ...get(pid), [field]: value } }))
  }

  function setScore(pid: string, strokes: number) {
    const par = hole?.par ?? 4
    const current = get(pid)
    const gir = strokes <= par - 1 // heuristic
    setEdits(prev => ({ ...prev, [pid]: { ...current, strokes, gir } }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const scoresArray = Object.entries(scores).flatMap(([profileId, sc]) =>
        profileId.startsWith('guest_') ? [] : [{ profileId: profileId as Id<'profiles'>, ...sc }]
      )
      await saveHoleMut({ roundId: roundId as Id<'rounds'>, hole_number: holeNum, scores: scoresArray })
    } catch {
      setSaving(false); alert('Error guardando'); return
    }
    const isLast = holeNum >= totalHoles
    if (isLast) onFinish()
    else onChangeHole(holeNum + 1)
  }

  if (!hole) return <div className="py-16 flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const par = hole.par

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-[14px] pb-2 text-center">
        <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">Hoyo {holeNum} de {totalHoles}</span>
      </div>

      {/* Hole hero — solo lo esencial */}
      <div className="mx-[14px] rounded-[18px] px-4 py-4 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
        <div className="absolute right-[-20px] top-[-20px] w-[80px] h-[80px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
        <div className="flex items-center gap-4 relative">
          <Drawer.Title asChild><div className="text-[52px] font-black text-white leading-none">{holeNum}</div></Drawer.Title>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-[22px] font-black">Par {par}</span>
            <span className="font-mono text-[11px] text-white/50">Hcp {hole.stroke_index}</span>
          </div>
        </div>
      </div>

      {/* SCRAMBLE MODE — una tarjeta por equipo, un resultado compartido */}
      {roundModes.includes('scramble') && (
        <ScrambleSection players={players} par={par} holeNum={holeNum} get={get} setScore={setScore} set={set} />
      )}

      {/* Players — avatar selector + active player's card (non-scramble) */}
      {!roundModes.includes('scramble') && <div className="px-[14px]">
        {/* Avatar selector */}
        <div className="flex gap-3 mb-2 overflow-x-auto px-0.5 py-2">
          {players.map(p => {
            const psc = get(p.id)
            const isActive = activePlayer?.id === p.id
            const pd = psc.strokes != null ? scoreColor(psc.strokes - par) : null
            return (
              <button key={p.id} type="button" onClick={() => setSelectedPlayerId(p.id)}
                className="flex flex-col items-center gap-1 flex-shrink-0 transition active:scale-95" style={{ width: 56 }}>
                <div className="relative">
                  <Avatar name={p.name} size={48}
                    style={{ outline: isActive ? '3px solid #0e1a16' : '3px solid transparent', outlineOffset: 2 }} />
                  {psc.strokes != null && pd && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black border-2 border-white"
                      style={{ backgroundColor: pd.bg, color: pd.text }}>{psc.strokes}</div>
                  )}
                </div>
                <span className="text-[11px] font-semibold truncate w-full text-center" style={{ color: isActive ? '#0e1a16' : '#6b7a72' }}>{p.name.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
        {(activePlayer ? [activePlayer] : []).map(p => (
          <PlayerCard
            key={p.id}
            player={p}
            par={par}
            hole={hole}
            roundModes={roundModes}
            expanded={!!expanded[p.id]}
            onToggleExpand={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
            get={get}
            setScore={setScore}
            set={set}
          />
        ))}
      </div>}

      {/* CTA — guardar con cambio de hoyo a los lados */}
      <div className="px-[14px] pt-3 pb-2 mt-2 sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChangeHole(holeNum - 1)} disabled={holeNum <= 1}
            aria-label="Hoyo anterior"
            className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#f4f1e9] border border-[#e5e0d4] transition active:scale-95 disabled:opacity-30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !canSave}
            className="flex-1 h-14 rounded-full flex items-center justify-center font-bold text-[15px] text-white transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: '#0e1a16' }}>
            {saving ? 'Guardando…' : holeNum >= totalHoles ? 'Guardar y firmar' : 'Guardar'}
          </button>
          <button type="button" onClick={() => onChangeHole(holeNum + 1)} disabled={holeNum >= totalHoles}
            aria-label="Hoyo siguiente"
            className="w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center bg-[#f4f1e9] border border-[#e5e0d4] transition active:scale-95 disabled:opacity-30">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

type HoleSheetProps = {
  roundId: string
  holeNumber: number | null
  onClose: () => void
  onChangeHole: (n: number) => void
  onFinish: () => void
}

/** Bottom sheet for scoring a single hole (replaces the old /hole screen). */
export function HoleSheet({ roundId, holeNumber, onClose, onChangeHole, onFinish }: HoleSheetProps) {
  return (
    <Drawer.Root open={holeNumber !== null} onOpenChange={(o) => { if (!o) onClose() }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }} />
        <Drawer.Content aria-describedby={undefined} className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-[28px] pt-3 pb-6 max-h-[94vh] overflow-y-auto outline-none">
          <div className="w-10 h-1 rounded-full bg-[#e5e0d4] mx-auto mb-3" />
          {holeNumber !== null && (
            <HoleEntry
              key={holeNumber}
              roundId={roundId}
              holeNum={holeNumber}
              onChangeHole={onChangeHole}
              onFinish={onFinish}
            />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
