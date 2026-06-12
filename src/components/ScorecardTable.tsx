// Scorecard table and legend shared by the authenticated scorecard screen
// (/scorecard) and the public share view (/s/:id). Moved out of the page so
// both routes render the exact same card.

import { stablefordPts, strokesReceived } from '@/lib/golf'
import { ScoreMark } from '@/components/ui/score-mark'
import { Avatar, avatarColor } from '@/components/ui/avatar'
import { PlayerLink } from '@/components/ui/player-link'

export type Player = { id: string; name: string; course_handicap: number; is_guest: boolean; avatar_url: string | null }
export type Hole = { hole_number: number; par: number; stroke_index: number }

export type ViewMode = 'stroke' | 'stableford' | 'matchplay_hcp' | 'matchplay' | 'bbb' | 'wolf' | 'clasificacion'

export type ScoreTableProps = {
  group: Hole[]
  gi: number
  groupsCount: number
  players: Player[]
  viewMode: ViewMode
  getScore: (pid: string, holeNumber: number) => number | null
  matchState: Map<number, { n: number; leader: Player | null }>
  onEditHole?: (holeNumber: number) => void
  /** Avatars link to /player/:id (auth-gated) — off in the public share view. */
  linkPlayers?: boolean
}

export function ScoreTable({
  group,
  gi,
  groupsCount,
  players,
  viewMode,
  getScore,
  matchState,
  onEditHole,
  linkPlayers = true,
}: ScoreTableProps) {
  const blockPar = group.reduce((a, h) => a + h.par, 0)
  const label = gi === 0 && groupsCount > 1 ? 'OUT' : groupsCount > 1 ? 'IN' : 'TOT'
  return (
    <div className="rounded-card border border-[#ded8cb] bg-white p-1.5 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        {/* table-fixed + colgroup: hole columns share the width equally, so OUT
            and IN stay aligned whether or not a hole has a score yet. */}
        <table className="w-full text-center table-fixed overflow-hidden rounded-btn">
          <colgroup>
            <col style={{ width: 36 }} />
            {group.map(h => (
              <col key={h.hole_number} />
            ))}
            <col style={{ width: 42 }} />
          </colgroup>
          <thead>
            <tr className="bg-ink">
              <td className="font-mono text-[9px] text-white/55 py-2 px-1.5 text-left rounded-tl-[14px]">H</td>
              {group.map(h => (
                <td key={h.hole_number} className="font-mono text-[10px] font-bold text-white py-2 px-0">
                  {h.hole_number}
                </td>
              ))}
              <td className="font-mono text-[8px] text-white/55 py-2 px-1 rounded-tr-[14px]">{label}</td>
            </tr>
            <tr className="border-b border-[#e9e4d8] bg-[#fbfaf6]">
              <td className="font-mono text-[8px] text-mute px-1.5 py-1 text-left">PAR</td>
              {group.map(h => (
                <td key={h.hole_number} className="font-mono text-[9px] text-mute py-1 px-0">
                  {h.par}
                </td>
              ))}
              <td className="font-mono text-[10px] font-bold text-ink py-1 px-1">{blockPar}</td>
            </tr>
            <tr className="border-b border-[#e9e4d8] bg-[#fbfaf6]">
              <td className="font-mono text-[8px] text-blue px-1.5 py-1 text-left font-bold">HCP</td>
              {group.map(h => (
                <td key={h.hole_number} className="font-mono text-[8px] text-blue py-1 px-0">
                  {h.stroke_index}
                </td>
              ))}
              <td aria-label="Índice de hándicap" />
            </tr>
          </thead>
          <tbody>
            {players.map(p => {
              const linkId = linkPlayers && !p.is_guest ? p.id : null
              if (viewMode === 'stroke') {
                const blockTotal = group.reduce((a, h) => {
                  const s = getScore(p.id, h.hole_number)
                  return s ? a + s : a
                }, 0)
                const blockDelta = blockTotal ? blockTotal - blockPar : null
                return (
                  <tr key={p.id} className="border-t border-rule-soft">
                    <td className="px-1.5 py-1.5">
                      <PlayerLink profileId={linkId}>
                        <Avatar name={p.name} src={p.avatar_url} size={22} />
                      </PlayerLink>
                    </td>
                    {group.map(h => {
                      const s = getScore(p.id, h.hole_number)
                      const d = s != null ? s - h.par : null
                      const chip =
                        s != null ? (
                          <ScoreMark strokes={s} delta={d!} size={20} />
                        ) : (
                          <span className="text-faint text-[13px]">·</span>
                        )
                      return (
                        <td key={h.hole_number} className="py-1.5 px-0">
                          {onEditHole ? (
                            <button
                              type="button"
                              onClick={() => onEditHole(h.hole_number)}
                              aria-label={`Editar hoyo ${h.hole_number}`}
                              className="mx-auto block active:scale-95 transition"
                            >
                              {chip}
                            </button>
                          ) : (
                            <div className="mx-auto w-fit">{chip}</div>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-1 py-1.5 bg-[#fbfaf6]">
                      {blockTotal > 0 ? (
                        <div className="text-center">
                          <p className="font-mono text-[11px] font-black text-ink leading-none">{blockTotal}</p>
                          {blockDelta !== null && (
                            <p
                              className="font-mono text-[8px] font-bold"
                              style={{ color: blockDelta <= 0 ? '#1f8a5b' : '#9b6e1a' }}
                            >
                              {blockDelta > 0 ? `+${blockDelta}` : blockDelta === 0 ? 'E' : blockDelta}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-faint">–</span>
                      )}
                    </td>
                  </tr>
                )
              } else if (viewMode === 'stableford') {
                const blockPts = group.reduce((a, h) => {
                  const s = getScore(p.id, h.hole_number)
                  return s ? a + stablefordPts(s, h.par, strokesReceived(p.course_handicap, h.stroke_index)) : a
                }, 0)
                return (
                  <tr key={p.id} className="border-t border-rule-soft">
                    <td className="px-1.5 py-1.5">
                      <PlayerLink profileId={linkId}>
                        <Avatar name={p.name} src={p.avatar_url} size={22} />
                      </PlayerLink>
                    </td>
                    {group.map(h => {
                      const s = getScore(p.id, h.hole_number)
                      const rcv = strokesReceived(p.course_handicap, h.stroke_index)
                      const pts = s ? stablefordPts(s, h.par, rcv) : null
                      const cell = (
                        <>
                          {/* Asterisks for handicap strokes */}
                          {rcv > 0 && (
                            <div className="flex justify-center mb-0.5">
                              <span
                                className="text-[8px] font-black leading-none tracking-[1px]"
                                style={{ color: avatarColor(p.name) }}
                              >
                                {'*'.repeat(rcv)}
                              </span>
                            </div>
                          )}
                          {s != null ? (
                            <div className="text-center">
                              <ScoreMark strokes={s} delta={s - h.par} size={20} />
                              {pts !== null && (
                                <p
                                  className="font-mono text-[9px] font-black leading-none mt-0.5"
                                  style={{
                                    color:
                                      pts >= 3 ? '#2a6fdb' : pts === 2 ? '#1f8a5b' : pts === 1 ? '#9b6e1a' : '#a83a25',
                                  }}
                                >
                                  {pts}pt
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-faint text-[13px]">·</span>
                          )}
                        </>
                      )
                      return (
                        <td key={h.hole_number} className="py-1.5 px-0">
                          {onEditHole ? (
                            <button
                              type="button"
                              onClick={() => onEditHole(h.hole_number)}
                              aria-label={`Editar hoyo ${h.hole_number}`}
                              className="mx-auto block text-center relative"
                            >
                              {cell}
                            </button>
                          ) : (
                            <div className="mx-auto text-center relative">{cell}</div>
                          )}
                        </td>
                      )
                    })}
                    <td className="bg-[#fbfaf6] px-1 font-mono text-[12px] font-black text-accent">
                      {blockPts || '–'}
                    </td>
                  </tr>
                )
              } else if (viewMode === 'matchplay' || viewMode === 'matchplay_hcp') {
                // One row per player; the running state (1UP, 2UP, AS) is marked
                // on the cell of whoever leads the match after that hole.
                const lastScored = [...group].reverse().find(h => matchState.get(h.hole_number))
                const endSt = lastScored ? matchState.get(lastScored.hole_number) : undefined
                return (
                  <tr key={p.id} className="border-t border-rule-soft">
                    <td className="px-1.5 py-1.5">
                      <PlayerLink profileId={linkId}>
                        <Avatar name={p.name} src={p.avatar_url} size={22} />
                      </PlayerLink>
                    </td>
                    {group.map(h => {
                      const st = matchState.get(h.hole_number)
                      const cell = !st ? (
                        <span className="text-faint text-[13px]">·</span>
                      ) : st.leader?.id === p.id ? (
                        <div
                          className="mx-auto w-[26px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[8px] font-black text-white"
                          style={{ backgroundColor: avatarColor(p.name) }}
                        >
                          {st.n}UP
                        </div>
                      ) : !st.leader ? (
                        <div className="mx-auto w-[26px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[8px] font-bold bg-paper text-mute">
                          AS
                        </div>
                      ) : null
                      return (
                        <td key={h.hole_number} className="py-1.5 px-0">
                          {onEditHole ? (
                            <button
                              type="button"
                              onClick={() => onEditHole(h.hole_number)}
                              aria-label={`Editar hoyo ${h.hole_number}`}
                              className="mx-auto block min-w-[26px] min-h-[22px] active:scale-95 transition"
                            >
                              {cell}
                            </button>
                          ) : (
                            <div className="mx-auto w-fit min-h-[22px] flex items-center">{cell}</div>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-1 py-1.5 bg-[#fbfaf6]">
                      {endSt && (endSt.leader?.id === p.id || !endSt.leader) ? (
                        <p
                          className="font-mono text-[10px] font-black text-center"
                          style={{ color: endSt.leader ? avatarColor(p.name) : '#6b7a72' }}
                        >
                          {endSt.leader ? `${endSt.n} UP` : 'AS'}
                        </p>
                      ) : (
                        <p className="text-center text-faint">–</p>
                      )}
                    </td>
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
