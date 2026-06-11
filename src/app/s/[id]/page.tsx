// Public, read-only scorecard view — the target of the "Enlace" share option.
// Lives outside the auth guard so anyone with the link can open it without an
// account. Renders the same card as /scorecard but with no editing, no player
// links and no auth-dependent queries.

import { useParams } from 'react-router'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Avatar } from '@/components/ui/avatar'
import { Segmented } from '@/components/ui/segmented'
import { ScoreTable, type Player, type Hole, type ViewMode } from '@/components/ScorecardTable'
import { ScoreLegend } from '@/components/ScoreLegend'
import { RoundStats, type Score } from '@/components/RoundStats'

const SPINNER = (
  <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
    <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
  </div>
)

export default function PublicScorecardPage() {
  const { id } = useParams()
  const data = useQuery(api.rounds.getShared, id ? { roundId: id } : 'skip')
  const [viewMode, setViewMode] = useState<ViewMode>('stroke')

  if (data === undefined) return SPINNER
  if (data === null || !id) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-[15px] font-bold text-[#0e1a16]">Tarjeta no encontrada</p>
        <p className="text-[12px] text-[#6b7a72]">El enlace no es válido o la ronda ya no existe.</p>
      </div>
    )
  }

  const courseName = data.course?.name ?? ''
  const holeMode = data.round.notes ?? 'all'
  const dateLabel = (data.round.date ?? '').split('-').reverse().join('/')
  const completed = data.round.status === 'completed'

  const allHoles: Hole[] = data.holes.map(h => ({
    hole_number: h.hole_number,
    par: h.par,
    stroke_index: h.stroke_index,
  }))
  const players: Player[] = data.players.map(p => ({
    id: p.profileId ?? '',
    name: p.name ?? 'Inv',
    course_handicap: p.course_handicap ?? 0,
    is_guest: p.is_guest,
    avatar_url: p.avatar_url ?? null,
  }))
  const modes = data.modes.length ? data.modes : ['stroke']

  // Same hole filtering as /scorecard (notes doubles as the hole-mode field).
  const holes: Hole[] = (() => {
    if (holeMode === 'front') return allHoles.filter(h => h.hole_number <= 9)
    if (holeMode === 'back') return allHoles.filter(h => h.hole_number >= 10)
    if (holeMode === '9_once') return allHoles.filter(h => h.hole_number <= 9)
    if (holeMode === '9_twice') {
      const nine = allHoles.filter(h => h.hole_number <= 9)
      return [...nine, ...nine.map(h => ({ ...h, hole_number: h.hole_number + 9 }))]
    }
    return allHoles
  })()

  const scores: Score[] = data.scores.map(s => ({
    profile_id: s.profileId,
    hole_number: s.hole_number,
    strokes: s.strokes ?? null,
    putts: s.putts ?? null,
    gir: s.gir ?? null,
    fairway: s.fairway ?? null,
    penalties: s.penalties ?? null,
    in_bunker: s.in_bunker ?? null,
  }))

  const getScore = (pid: string, h: number) =>
    scores.find(s => s.profile_id === pid && s.hole_number === h)?.strokes ?? null
  const getTotal = (pid: string) =>
    holes.reduce((a, h) => {
      const s = getScore(pid, h.hole_number)
      return s ? a + s : a
    }, 0)
  const getDelta = (pid: string) =>
    holes.reduce((a, h) => {
      const s = getScore(pid, h.hole_number)
      return s ? a + (s - h.par) : a
    }, 0)

  const front = holeMode === 'back' ? holes : holes.filter(h => h.hole_number <= 9)
  const back = holeMode === 'back' ? [] : holes.filter(h => h.hole_number > 9)
  const groups = back.length > 0 ? [front, back] : [front]

  const availableModes: { key: ViewMode; label: string }[] = [
    { key: 'stroke', label: 'Stroke' },
    ...(modes.includes('stableford') ? [{ key: 'stableford' as ViewMode, label: 'Stableford' }] : []),
  ]

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-12">
      <div className="safe-top px-[14px] pt-4 pb-2">
        {/* Brand strip — this page is the first contact for invitees */}
        <div className="flex items-center gap-1.5 mb-3">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="#9bc9a3" />
            <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16" />
            <circle cx="24" cy="50" r="2.6" fill="#0e1a16" />
          </svg>
          <span className="text-[14px] leading-none font-black tracking-tight text-[#0e1a16]">
            Bogey <span className="text-[#1f8a5b]">Club</span>
          </span>
        </div>

        {/* Round info card */}
        <div className="bg-white rounded-[16px] px-3.5 py-3 border border-[#e5e0d4] mb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-[#0e1a16] leading-tight truncate">{courseName}</p>
              <p className="font-mono text-[10px] text-[#6b7a72] mt-0.5">
                {dateLabel} · {holes.length} hoyos
              </p>
            </div>
            {completed && (
              <span className="font-mono text-[9px] font-bold text-[#1f8a5b] bg-[#d9eedd] px-2 py-1 rounded-full uppercase tracking-wide flex-shrink-0">
                Firmada
              </span>
            )}
          </div>
          {/* Totals per player */}
          <div className="mt-2.5 pt-2.5 border-t border-[#efebe1] flex items-center gap-x-5 gap-y-2 flex-wrap">
            {players.map(p => {
              const total = getTotal(p.id)
              const delta = getDelta(p.id)
              return (
                <div key={p.id || p.name} className="flex items-center gap-2">
                  <Avatar name={p.name} src={p.avatar_url} size={28} />
                  {total > 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[20px] font-black text-[#0e1a16] leading-none">{total}</span>
                      <span
                        className="font-mono text-[12px] font-bold"
                        style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}
                      >
                        {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#c4bfb5] text-[13px] font-mono">—</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {availableModes.length > 1 && (
          <Segmented options={availableModes} value={viewMode} onChange={setViewMode} className="mb-2" />
        )}
      </div>

      <div className="px-[14px] space-y-2">
        {groups.map((group, gi) => (
          <ScoreTable
            key={group[0]?.hole_number ?? gi}
            group={group}
            gi={gi}
            groupsCount={groups.length}
            players={players}
            viewMode={viewMode}
            getScore={getScore}
            matchState={new Map()}
            linkPlayers={false}
          />
        ))}
        <ScoreLegend viewMode={viewMode} />

        {/* Round stats — same comparative table as the scorecard, read-only */}
        <RoundStats players={players} scores={scores} holes={holes} myId="" linkPlayers={false} />
      </div>
    </div>
  )
}
