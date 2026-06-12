// Per-player stats of a round — same comparative table as Stats > Social >
// Métricas. Shared by /scorecard (when signed) and the public share view.

import { Avatar, avatarColor } from '@/components/ui/avatar'
import { CountUp } from '@/components/ui/count-up'
import { PlayerLink } from '@/components/ui/player-link'
import type { Player, Hole } from '@/components/ScorecardTable'

export type Score = {
  profile_id: string
  hole_number: number
  strokes: number | null
  putts: number | null
  gir: boolean | null
  fairway: boolean | null
  penalties: number | null
  in_bunker: boolean | null
}

type RoundStatsProps = { players: Player[]; scores: Score[]; holes: Hole[]; myId: string; linkPlayers?: boolean }

/** Per-player stats of a finished round — same comparative table as Stats > Social > Métricas. */
export function RoundStats({ players, scores, holes, myId, linkPlayers = true }: RoundStatsProps) {
  const parByHole = new Map(holes.map(h => [h.hole_number, h.par]))
  const cols = players.map(p => {
    const mine = scores.filter(s => s.profile_id === p.id && s.strokes != null)
    const played = mine.length
    const fwTotal = mine.filter(s => s.fairway !== null).length
    const deltas = mine.flatMap(s => {
      const par = parByHole.get(s.hole_number)
      return par != null ? [s.strokes! - par] : []
    })
    return {
      p,
      played,
      total: played ? mine.reduce((a, s) => a + (s.strokes ?? 0), 0) : null,
      gir:
        mine.some(s => s.gir !== null) && played > 0
          ? Math.round((mine.filter(s => s.gir === true).length / played) * 100)
          : null,
      fw: fwTotal > 0 ? Math.round((mine.filter(s => s.fairway === true).length / fwTotal) * 100) : null,
      putts: mine.some(s => s.putts != null) ? mine.reduce((a, s) => a + (s.putts ?? 0), 0) : null,
      penalties: mine.some(s => s.penalties != null) ? mine.reduce((a, s) => a + (s.penalties ?? 0), 0) : null,
      bunkers: played ? mine.filter(s => s.in_bunker === true).length : null,
      birdies: played ? deltas.filter(d => d <= -1).length : null,
      pars: played ? deltas.filter(d => d === 0).length : null,
      bogeys: played ? deltas.filter(d => d === 1).length : null,
      doubles: played ? deltas.filter(d => d >= 2).length : null,
    }
  })
  if (!cols.some(c => c.played > 0)) return null

  const rows = [
    { label: 'Golpes', vals: cols.map(c => c.total), pct: false, lower: true },
    { label: 'GIR %', vals: cols.map(c => c.gir), pct: true, lower: false },
    { label: 'Calles %', vals: cols.map(c => c.fw), pct: true, lower: false },
    { label: 'Putts', vals: cols.map(c => c.putts), pct: false, lower: true },
    { label: 'Penaltis', vals: cols.map(c => c.penalties), pct: false, lower: true },
    { label: 'Búnkers', vals: cols.map(c => c.bunkers), pct: false, lower: true },
    { label: 'Birdies', vals: cols.map(c => c.birdies), pct: false, lower: false },
    { label: 'Pares', vals: cols.map(c => c.pars), pct: false, lower: false },
    { label: 'Bogeys', vals: cols.map(c => c.bogeys), pct: false, lower: true },
    { label: 'Doble+', vals: cols.map(c => c.doubles), pct: false, lower: true },
  ]

  const compare = cols.filter(c => c.played > 0).length > 1
  const grid = { display: 'grid', gridTemplateColumns: `minmax(76px, 1.1fr) repeat(${cols.length}, 1fr)` }

  return (
    <div className="bg-white rounded-btn border border-rule overflow-hidden">
      <div className="px-4 py-3 border-b border-rule-soft">
        <p className="font-bold text-[14px] text-ink">Estadísticas de la ronda</p>
      </div>
      {/* Column headers */}
      <div className="border-b border-rule-soft bg-paper" style={grid}>
        <div className="py-2 px-4" />
        {cols.map(({ p }, i) => (
          <div key={p.id || i} className="py-2 px-1 text-center">
            <PlayerLink profileId={linkPlayers && !p.is_guest ? p.id : null}>
              <Avatar name={p.name} src={p.avatar_url} size={24} className="mx-auto mb-0.5" />
            </PlayerLink>
            <p
              className="font-mono text-[9px] font-bold uppercase truncate"
              style={{ color: p.id === myId ? '#1f8a5b' : avatarColor(p.name) }}
            >
              {p.id === myId ? 'Tú' : p.name.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-rule-soft">
        {rows.map(row => {
          const nums = row.vals.filter((x): x is number => x != null)
          const best = compare && nums.length > 1 ? (row.lower ? Math.min(...nums) : Math.max(...nums)) : null
          const worst = compare && nums.length > 1 ? (row.lower ? Math.max(...nums) : Math.min(...nums)) : null
          return (
            <div key={row.label} className="px-4 py-2.5" style={grid}>
              <p className="text-[12px] text-mute py-0.5">{row.label}</p>
              {row.vals.map((v, i) => {
                const wins = v != null && best != null && best !== worst && v === best
                return (
                  <div
                    key={cols[i].p.id || i}
                    className="text-center py-0.5 rounded-[6px] mx-1"
                    style={{ backgroundColor: wins ? '#d9eedd' : 'transparent' }}
                  >
                    <p className="font-mono text-[14px] font-black" style={{ color: wins ? '#1f8a5b' : '#0e1a16' }}>
                      {v != null ? <CountUp value={v} format={n => `${Math.round(n)}${row.pct ? '%' : ''}`} /> : '–'}
                    </p>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
