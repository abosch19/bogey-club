import { useState, Suspense } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { formatHandicap } from '@/lib/golf'
import { Avatar } from '@/components/ui/avatar'

type Player = { _id: string; name: string; handicap_index: number; team: 1 | 2 }

const SPINNER = (
  <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
    <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
  </div>
)

const TEAM_COLORS: Record<number, { bg: string; text: string; light: string }> = {
  1: { bg: '#1f8a5b', text: '#fff', light: '#d9eedd' },
  2: { bg: '#2a6fdb', text: '#fff', light: '#dde7fb' },
}

function ParejasPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('course') ?? ''
  const playersParam = searchParams.get('players') ?? ''
  const holeMode = searchParams.get('hole_mode') ?? 'all'
  const leagueId = searchParams.get('league') ?? ''

  const allProfiles = useQuery(api.players.all)
  const loading = allProfiles === undefined

  // User-applied overrides on top of the default pairing: { [playerId]: team }
  const [overrides, setOverrides] = useState<Record<string, 1 | 2>>({})
  const [swapped, setSwapped] = useState(false)
  const [saving, setSaving] = useState(false)

  // Default pairing derived from profiles + selected players (no init effect).
  const basePlayers: Player[] = (() => {
    if (!allProfiles) return []
    const playerIds = playersParam.split(',').filter(Boolean)
    const profiles = allProfiles
      .filter(p => playerIds.includes(p._id))
      .sort((a, b) => a.handicap_index - b.handicap_index)

    // Default assignment: sorted by handicap, snake → best+worst in same team
    // e.g. 4 players sorted [1,2,3,4] → team1: [1,4], team2: [2,3]
    return profiles.map((p, i) => ({
      _id: p._id,
      name: p.name,
      handicap_index: p.handicap_index,
      // Snake: index 0,3 → team 1; index 1,2 → team 2 (for 4 players)
      team: (i % 2 === 0 ? 1 : 2) as 1 | 2,
    }))
  })()

  // Final pairing = default, flipped if "swap all" is active, then per-player overrides.
  const players: Player[] = basePlayers.map(p => {
    const base = swapped ? ((p.team === 1 ? 2 : 1) as 1 | 2) : p.team
    return { ...p, team: overrides[p._id] ?? base }
  })

  function moveToTeam(playerId: string, team: 1 | 2) {
    setOverrides(prev => ({ ...prev, [playerId]: team }))
  }

  function swapTeams() {
    // Flip the base assignment and re-flip any existing overrides so the whole
    // current layout inverts (preserving previous "intercambiar todos" behavior).
    setSwapped(s => !s)
    setOverrides(prev => {
      const next: Record<string, 1 | 2> = {}
      for (const id in prev) next[id] = (prev[id] === 1 ? 2 : 1) as 1 | 2
      return next
    })
  }

  async function handleStart() {
    setSaving(true)
    const params = new URLSearchParams({
      course: courseId,
      players: playersParam,
      hole_mode: holeMode,
      scramble_teams: players.map(p => `${p._id}:${p.team}`).join(','),
      ...(leagueId ? { league: leagueId } : {}),
    })
    navigate(`/round/format?${params}&mode=scramble`)
  }

  if (loading) return SPINNER

  const team1 = players.filter(p => p.team === 1)
  const team2 = players.filter(p => p.team === 2)
  const balanced = team1.length === team2.length

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#0e1a16"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atrás
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">SCRAMBLE · PAREJAS</span>
        </div>

        <h1 className="text-[28px] font-black tracking-tight text-[#0e1a16] leading-tight mb-1">
          Asigna las
          <br />
          <span className="text-[#1f8a5b]">parejas.</span>
        </h1>
        <p className="text-[13px] text-[#6b7a72] mb-5">
          Distribuidos por hándicap. Toca el número para cambiar de equipo.
        </p>

        {/* Teams display */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[1, 2].map(t => {
            const members = players.filter(p => p.team === t)
            const tc = TEAM_COLORS[t]
            const avgHcp = members.length
              ? (members.reduce((a, p) => a + p.handicap_index, 0) / members.length).toFixed(1)
              : '–'
            return (
              <div
                key={t}
                className="rounded-[16px] p-4 border-2"
                style={{ backgroundColor: tc.light, borderColor: tc.bg }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black"
                    style={{ backgroundColor: tc.bg }}
                  >
                    {t}
                  </div>
                  <p className="font-bold text-[14px] text-[#0e1a16]">Equipo {t}</p>
                </div>
                <div className="space-y-2">
                  {members.map(p => (
                    <div key={p._id} className="flex items-center gap-2 bg-white rounded-[10px] px-2.5 py-2">
                      <Avatar name={p.name} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[12px] text-[#0e1a16] truncate">{p.name.split(' ')[0]}</p>
                        <p className="font-mono text-[9px] text-[#6b7a72]">h{formatHandicap(p.handicap_index)}</p>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && <p className="text-[12px] text-[#6b7a72] text-center py-2">Sin jugadores</p>}
                </div>
                <div className="mt-2 pt-2 border-t border-white/60">
                  <p className="font-mono text-[9px] text-[#6b7a72] text-center">HCP medio: {avgHcp}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Player list to reassign */}
        <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden mb-3">
          <div className="px-4 py-3 border-b border-[#efebe1] flex items-center justify-between">
            <p className="font-bold text-[14px] text-[#0e1a16]">Cambiar de equipo</p>
            <button
              type="button"
              onClick={swapTeams}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#e5e0d4] text-[#6b7a72] bg-[#f4f1e9] active:opacity-70"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
                  stroke="#6b7a72"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Intercambiar todos
            </button>
          </div>
          {players.map((p, i) => (
            <div
              key={p._id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#efebe1]' : ''}`}
            >
              <Avatar name={p.name} size={36} />
              <div className="flex-1">
                <p className="font-semibold text-[13px] text-[#0e1a16]">{p.name}</p>
                <p className="font-mono text-[10px] text-[#6b7a72]">h{formatHandicap(p.handicap_index)}</p>
              </div>
              {/* Team toggle */}
              <div className="flex gap-1.5">
                {([1, 2] as const).map(t => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => moveToTeam(p._id, t)}
                    className="w-9 h-9 rounded-full font-black text-[13px] transition active:scale-90"
                    style={{
                      backgroundColor: p.team === t ? TEAM_COLORS[t].bg : '#f4f1e9',
                      color: p.team === t ? '#fff' : '#6b7a72',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {!balanced && (
          <p className="text-[12px] text-[#c6432d] bg-[#fadcd6] rounded-[10px] px-3 py-2 mb-3 text-center">
            Los equipos deben tener el mismo número de jugadores
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        <button
          type="button"
          onClick={handleStart}
          disabled={!balanced || saving}
          className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}
        >
          <span>
            {team1.length > 0 ? team1.map(p => p.name.split(' ')[0]).join(' & ') : 'Equipo 1'}
            {' vs '}
            {team2.length > 0 ? team2.map(p => p.name.split(' ')[0]).join(' & ') : 'Equipo 2'}
          </span>
          <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
            {saving ? '…' : 'EMPEZAR →'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={SPINNER}>
      <ParejasPage />
    </Suspense>
  )
}
