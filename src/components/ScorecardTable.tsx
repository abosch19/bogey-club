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
    <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
      <div className="overflow-x-auto">
        {/* table-fixed + colgroup: hole columns share the width equally, so OUT
            and IN stay aligned whether or not a hole has a score yet. */}
        <table className="w-full text-center table-fixed" style={{ minWidth: `${group.length * 30 + 96}px` }}>
          <colgroup>
            <col style={{ width: 44 }} />
            {group.map(h => (
              <col key={h.hole_number} />
            ))}
            <col style={{ width: 52 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-[#efebe1]">
              <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2 text-left">H</td>
              {group.map(h => (
                <td key={h.hole_number} className="font-mono text-[11px] font-bold text-[#0e1a16] py-2 px-0.5">
                  {h.hole_number}
                </td>
              ))}
              <td className="font-mono text-[9px] text-[#6b7a72] py-2 px-2">{label}</td>
            </tr>
            <tr className="border-b border-[#efebe1]">
              <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">PAR</td>
              {group.map(h => (
                <td key={h.hole_number} className="font-mono text-[10px] text-[#6b7a72] py-1 px-0.5">
                  {h.par}
                </td>
              ))}
              <td className="font-mono text-[11px] font-bold text-[#0e1a16] py-1 px-2">{blockPar}</td>
            </tr>
            <tr className="border-b border-[#efebe1]">
              <td className="font-mono text-[9px] text-[#2a6fdb] px-2 py-1 text-left font-bold">HCP</td>
              {group.map(h => (
                <td key={h.hole_number} className="font-mono text-[9px] text-[#2a6fdb] py-1 px-0.5">
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
                  <tr key={p.id} className="border-t border-[#efebe1]">
                    <td className="px-2 py-1.5">
                      <PlayerLink profileId={linkId}>
                        <Avatar name={p.name} src={p.avatar_url} size={24} />
                      </PlayerLink>
                    </td>
                    {group.map(h => {
                      const s = getScore(p.id, h.hole_number)
                      const d = s != null ? s - h.par : null
                      const chip =
                        s != null ? (
                          <ScoreMark strokes={s} delta={d!} size={22} />
                        ) : (
                          <span className="text-[#c4bfb5] text-[13px]">·</span>
                        )
                      return (
                        <td key={h.hole_number} className="py-1.5 px-0.5">
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
                    <td className="px-2 py-1.5 min-w-[40px]">
                      {blockTotal > 0 ? (
                        <div className="text-center">
                          <p className="font-mono text-[12px] font-black text-[#0e1a16] leading-none">{blockTotal}</p>
                          {blockDelta !== null && (
                            <p
                              className="font-mono text-[9px] font-bold"
                              style={{ color: blockDelta <= 0 ? '#1f8a5b' : '#9b6e1a' }}
                            >
                              {blockDelta > 0 ? `+${blockDelta}` : blockDelta === 0 ? 'E' : blockDelta}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#c4bfb5]">–</span>
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
                  <tr key={p.id} className="border-t border-[#efebe1]">
                    <td className="px-2 py-1">
                      <PlayerLink profileId={linkId}>
                        <Avatar name={p.name} src={p.avatar_url} size={24} />
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
                              <ScoreMark strokes={s} delta={s - h.par} size={22} />
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
                            <span className="text-[#c4bfb5] text-[13px]">·</span>
                          )}
                        </>
                      )
                      return (
                        <td key={h.hole_number} className="py-1 px-0.5">
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
                    <td className="font-mono text-[13px] font-black text-[#1f8a5b] px-2">{blockPts || '–'}</td>
                  </tr>
                )
              } else if (viewMode === 'matchplay' || viewMode === 'matchplay_hcp') {
                // One row per player; the running state (1UP, 2UP, AS) is marked
                // on the cell of whoever leads the match after that hole.
                const lastScored = [...group].reverse().find(h => matchState.get(h.hole_number))
                const endSt = lastScored ? matchState.get(lastScored.hole_number) : undefined
                return (
                  <tr key={p.id} className="border-t border-[#efebe1]">
                    <td className="px-2 py-1.5">
                      <PlayerLink profileId={linkId}>
                        <Avatar name={p.name} src={p.avatar_url} size={24} />
                      </PlayerLink>
                    </td>
                    {group.map(h => {
                      const st = matchState.get(h.hole_number)
                      const cell = !st ? (
                        <span className="text-[#c4bfb5] text-[13px]">·</span>
                      ) : st.leader?.id === p.id ? (
                        <div
                          className="mx-auto w-[26px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[8px] font-black text-white"
                          style={{ backgroundColor: avatarColor(p.name) }}
                        >
                          {st.n}UP
                        </div>
                      ) : !st.leader ? (
                        <div className="mx-auto w-[26px] h-[22px] rounded-[5px] flex items-center justify-center font-mono text-[8px] font-bold bg-[#f4f1e9] text-[#6b7a72]">
                          AS
                        </div>
                      ) : null
                      return (
                        <td key={h.hole_number} className="py-1.5 px-0.5">
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
                    <td className="px-2 py-1.5 min-w-[40px]">
                      {endSt && (endSt.leader?.id === p.id || !endSt.leader) ? (
                        <p
                          className="font-mono text-[10px] font-black text-center"
                          style={{ color: endSt.leader ? avatarColor(p.name) : '#6b7a72' }}
                        >
                          {endSt.leader ? `${endSt.n} UP` : 'AS'}
                        </p>
                      ) : (
                        <p className="text-center text-[#c4bfb5]">–</p>
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

export function ScoreLegend({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
      {viewMode === 'stroke' ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-[1.5px] border-[#0e1a16] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border border-[#0e1a16]" />
            </div>
            <span className="text-[10px] text-[#6b7a72]">Eagle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-[1.5px] border-[#0e1a16]" />
            <span className="text-[10px] text-[#6b7a72]">Birdie</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#6b7a72]">Par</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] border-[1.5px] border-[#0e1a16]" />
            <span className="text-[10px] text-[#6b7a72]">Bogey</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] border-[1.5px] border-[#0e1a16] flex items-center justify-center">
              <div className="w-2 h-2 rounded-[1px] border border-[#0e1a16]" />
            </div>
            <span className="text-[10px] text-[#6b7a72]">Doble+</span>
          </div>
        </>
      ) : viewMode === 'stableford' ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#dde7fb]" />
            <span className="text-[10px] text-[#6b7a72]">3-4 pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#d9eedd]" />
            <span className="text-[10px] text-[#6b7a72]">2 pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#f6e6c4]" />
            <span className="text-[10px] text-[#6b7a72]">1 pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#fadcd6]" />
            <span className="text-[10px] text-[#6b7a72]">0 pts</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
