import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { stablefordPts, strokesReceived } from '@/lib/golf'
import { Avatar } from '@/components/ui/avatar'

type TPlayer = { id: string; name: string; group: number; handicap: number; round_id: string | null; course_handicap: number }
type Score   = { profile_id: string; hole_number: number; strokes: number }
type Hole    = { hole_number: number; par: number; stroke_index: number }
type Ranked  = TPlayer & { score: number | null; holesPlayed: number }

const GROUP_COLORS = ['#2a6fdb','#1f8a5b','#c6432d','#d4a24a','#7a3fc4','#0f9c7a']

function calcScore(mode: string, scores: Score[], holes: Hole[], player: TPlayer): number {
  if (mode === 'stableford') {
    return scores.reduce((a, s) => {
      const h = holes.find(h => h.hole_number === s.hole_number)
      if (!h) return a
      return a + stablefordPts(s.strokes, h.par, strokesReceived(player.course_handicap, h.stroke_index))
    }, 0)
  }
  return scores.reduce((a, s) => a + s.strokes, 0)
}

function LeaderboardTab({ rankings, myId, mode, coursePar }: { rankings: Ranked[]; myId: string; mode: string; coursePar: number }) {
  return (
    <div className="space-y-1.5">
      {rankings.map((p, i) => {
        const isFirst = i === 0 && p.score !== null
        const isMe    = p.id === myId
        const delta   = p.score !== null && mode !== 'stableford' ? p.score - coursePar : null
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-[14px] p-3 border"
            style={{ backgroundColor: isFirst ? '#0e1a16' : isMe ? '#d9eedd' : '#fff', borderColor: isFirst ? '#0e1a16' : isMe ? '#1f8a5b' : '#e5e0d4' }}>
            <div className="w-7 h-7 rounded-[7px] flex items-center justify-center font-mono font-black text-[13px]"
              style={{ backgroundColor: isFirst ? '#e8b75a' : '#f4f1e9', color: isFirst ? '#0e1a16' : '#6b7a72' }}>
              {i + 1}
            </div>
            {/* Group color dot */}
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[p.group - 1] }}/>
            <Avatar name={p.name} size={32} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px]" style={{ color: isFirst ? '#fff' : '#0e1a16' }}>
                {p.name}{isMe ? ' (tú)' : ''}
              </p>
              <p className="font-mono text-[10px]" style={{ color: isFirst ? 'rgba(255,255,255,0.5)' : '#6b7a72' }}>
                G{p.group} · {p.holesPlayed} hoyos
              </p>
            </div>
            <div className="text-right">
              {p.score !== null ? (
                <>
                  <p className="font-mono text-[20px] font-black leading-none" style={{ color: isFirst ? '#e8b75a' : '#0e1a16' }}>{p.score}</p>
                  {delta !== null && (
                    <p className="font-mono text-[10px] font-bold" style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                      {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                    </p>
                  )}
                  {mode === 'stableford' && <p className="font-mono text-[9px] text-[#6b7a72]">pts</p>}
                </>
              ) : <p className="font-mono text-[13px] text-[#c4bfb5]">–</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type GruposTabProps = {
  players: TPlayer[]
  scores: Record<string, Score[]>
  holes: Hole[]
  mode: string
  myId: string
  tournamentId: Id<'tournaments'>
  nGroups: number
  totalHoles: number
  activeGroup: number | null
  onSelectGroup: (g: number) => void
}

function GruposTab({ players, scores, holes, mode, myId, tournamentId, nGroups, totalHoles, activeGroup, onSelectGroup }: GruposTabProps) {
  return (
    <div className="space-y-3">
      {/* Group selector with hole progress */}
      <div className="flex gap-1.5">
        {Array.from({ length: nGroups }, (_, i) => i + 1).map(g => {
          const gPlayers = players.filter(p => p.group === g)
          const maxHole = gPlayers.length > 0
            ? Math.max(...gPlayers.map(p => (scores[p.id] ?? []).length))
            : 0
          return (
            <button type="button" key={g} onClick={() => onSelectGroup(g)}
              className="flex-1 py-2 rounded-full text-[11px] font-bold transition flex flex-col items-center gap-0.5"
              style={{ backgroundColor: activeGroup === g ? GROUP_COLORS[g - 1] : '#fff', color: activeGroup === g ? '#fff' : '#6b7a72', border: `1.5px solid ${activeGroup === g ? GROUP_COLORS[g - 1] : '#e5e0d4'}` }}>
              <span>Grupo {g}</span>
              {maxHole > 0 && (
                <span className="font-mono text-[8px] opacity-80">H{maxHole}/{totalHoles}</span>
              )}
            </button>
          )
        })}
      </div>

      {activeGroup !== null && (() => {
        const gPlayers = players.filter(p => p.group === activeGroup)
        const gRound = gPlayers[0]?.round_id

        return (
          <div className="space-y-2">
            {/* Start round button if no round yet */}
            {!gRound && myId && gPlayers.find(p => p.id === myId) && (
              <Link to={`/round/course?tournament=${tournamentId}&group=${activeGroup}`}
                className="flex items-center justify-between w-full px-4 py-3.5 rounded-full font-bold text-[14px] text-[#0e1a16] transition"
                style={{ backgroundColor: GROUP_COLORS[activeGroup - 1] }}>
                <span>Iniciar ronda del grupo</span>
                <span className="bg-[#0e1a16] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">→</span>
              </Link>
            )}

            {gRound && myId && gPlayers.find(p => p.id === myId) && (
              <Link to={`/scorecard?round=${gRound}`}
                className="flex items-center justify-between w-full px-4 py-3.5 rounded-full font-bold text-[14px] text-white transition"
                style={{ backgroundColor: '#0e1a16' }}>
                <span>Ver tarjeta del grupo</span>
                <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: GROUP_COLORS[activeGroup - 1] }}>→</span>
              </Link>
            )}

            {/* Per-player hole progress */}
            {gPlayers.map(p => {
              const pScores = scores[p.id] ?? []
              const score   = pScores.length > 0 ? calcScore(mode, pScores, holes, p) : null
              return (
                <div key={p.id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={p.name} size={40} />
                    <div className="flex-1">
                      <p className="font-bold text-[14px] text-[#0e1a16]">{p.name}{p.id === myId ? ' (tú)' : ''}</p>
                      <p className="font-mono text-[10px] text-[#6b7a72]">HCP {p.handicap} · {pScores.length} hoyos</p>
                    </div>
                    {score !== null && (
                      <p className="font-mono text-[20px] font-black text-[#0e1a16]">{score}{mode === 'stableford' ? ' pts' : ''}</p>
                    )}
                  </div>
                  {/* Hole progress bars */}
                  {holes.length > 0 && (
                    <div className="flex gap-[2px]">
                      {holes.map(h => {
                        const s = pScores.find(sc => sc.hole_number === h.hole_number)
                        const d = s ? s.strokes - h.par : null
                        const bg = d === null ? '#ece8db' : d <= -1 ? '#2a6fdb' : d === 0 ? '#1f8a5b' : d === 1 ? '#e8b75a' : '#c6432d'
                        return <div key={h.hole_number} className="flex-1 h-4 rounded-[3px]" style={{ backgroundColor: bg }}/>
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

export default function TorneoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tournamentId = id as Id<'tournaments'>

  const me   = useQuery(api.profiles.me)
  const data = useQuery(api.tournaments.get, { tournamentId })

  const [chosenGroup, setActiveGroup] = useState<number | null>(null)
  const [tab, setTab]               = useState<'leaderboard'|'grupos'>('leaderboard')

  const myId = me?._id ?? ''

  // Redirect to login if not authenticated
  useEffect(() => {
    if (me === null) { navigate('/login', { replace: true }) }
  }, [me, navigate])

  // Build players from the reactive tournament data
  const players: TPlayer[] = !data ? [] : data.players.map((tp) => {
    const group = data.groups.find((g) => g.group_number === tp.group_number)
    const gp = group?.players.find((p) => p.profileId === tp.profileId)
    return {
      id: tp.profileId ?? '',
      group: tp.group_number,
      name: gp?.name ?? 'J',
      handicap: gp?.handicap_index ?? 0,
      round_id: group?.roundId ?? null,
      course_handicap: gp?.course_handicap ?? Math.round(gp?.handicap_index ?? 0),
    }
  })

  // Scores aggregated by player — owned by the single tournaments.get subscription.
  const scores: Record<string, Score[]> = (() => {
    const byPlayer: Record<string, Score[]> = {}
    if (!data) return byPlayer
    for (const roundScores of Object.values(data.scoresByRound)) {
      for (const s of roundScores) {
        if (!byPlayer[s.profile_id]) byPlayer[s.profile_id] = []
        byPlayer[s.profile_id].push(s)
      }
    }
    return byPlayer
  })()

  // Until the user picks a group explicitly, follow my own group.
  const activeGroup = chosenGroup ?? (players.find(p => p.id === myId)?.group ?? 1)

  // "hace Xs" live indicator. `now` ticks every second; `update.at` is the
  // baseline. secondsAgo is DERIVED in render (a plain const, not state), so no
  // effect syncs it. The baseline is re-based when fresh data arrives via the
  // sanctioned adjust-state-during-render pattern (compare against previous
  // state, not a ref — refs can't be read during render).
  const [now, setNow] = useState(() => Date.now())
  const [update, setUpdate] = useState<{ data: typeof data; at: number }>({ data: undefined, at: 0 })
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (data && update.data !== data) {
    setUpdate({ data, at: now })
  }
  const secondsAgo = now && update.at ? Math.max(0, Math.floor((now - update.at) / 1000)) : 0
  const markUpdated = () => { const t = Date.now(); setNow(t); setUpdate(u => ({ ...u, at: t })) }

  const loading = me === undefined || data === undefined

  if (loading || !data) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const tournament = data.tournament
  const mode   = tournament.mode
  const course = data.course
  const effectiveHoles: Hole[] = data.holes
  const nGroups = Math.max(...players.map(p => p.group), 1)
  const isHigherBetter = mode === 'stableford'
  const coursePar = course?.par ?? 72
  const totalHoles = course?.holes_count ?? 18

  // Compute rankings
  const rankings: Ranked[] = players.map(p => {
    const pScores = scores[p.id] ?? []
    const score = pScores.length > 0 ? calcScore(mode, pScores, effectiveHoles, p) : null
    const holesPlayed = pScores.length
    return { ...p, score, holesPlayed }
  }).sort((a, b) => {
    if (a.score === null && b.score === null) return 0
    if (a.score === null) return 1
    if (b.score === null) return -1
    return isHigherBetter ? b.score - a.score : a.score - b.score
  })

  const myGroup = players.find(p => p.id === myId)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Inicio
          </Link>
          <button type="button" onClick={markUpdated} className="font-mono text-[10px] text-[#1f8a5b] uppercase tracking-wide">
            ↻ Actualizar
          </button>
        </div>

        {/* Tournament hero */}
        <div className="rounded-[22px] p-4 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: '#e8b75a', opacity: 0.9 }}/>
          <div className="relative">
            <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">
              {course?.name} · {mode.toUpperCase()} · {players.length} JUGADORES
            </p>
            <p className="text-white text-[22px] font-black tracking-tight mt-1">{tournament.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-[#1f8a5b] animate-pulse"/>
              <span className="text-white/70 text-[12px] font-medium">
                En vivo · {secondsAgo < 5 ? 'ahora mismo' : `hace ${secondsAgo}s`}
              </span>
              {myGroup && (
                <span className="ml-auto font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[myGroup.group - 1], color: '#fff' }}>
                  Tu grupo: {myGroup.group}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4] mb-3">
          {([['leaderboard','Clasificación'],['grupos','Por grupos']] as const).map(([k, l]) => (
            <button type="button" key={k} onClick={() => setTab(k)}
              className="flex-1 py-1.5 rounded-full text-[12px] font-bold transition"
              style={{ backgroundColor: tab === k ? '#0e1a16' : 'transparent', color: tab === k ? '#fff' : '#6b7a72' }}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'leaderboard' && (
          <LeaderboardTab rankings={rankings} myId={myId} mode={mode} coursePar={coursePar} />
        )}

        {tab === 'grupos' && (
          <GruposTab
            players={players}
            scores={scores}
            holes={effectiveHoles}
            mode={mode}
            myId={myId}
            tournamentId={tournamentId}
            nGroups={nGroups}
            totalHoles={totalHoles}
            activeGroup={activeGroup}
            onSelectGroup={setActiveGroup}
          />
        )}
      </div>
    </div>
  )
}
