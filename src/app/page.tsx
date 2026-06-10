import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { ScoreMark } from '@/components/ui/score-mark'
import { Avatar } from '@/components/ui/avatar'
import { HeroCard } from '@/components/ui/hero-card'
import { PlayerLink } from '@/components/ui/player-link'

type LeagueStanding = { profile_id: string; name: string; total_points: number; avatar_url: string | null }

const GOLF_QUOTES = [
  { text: "El golf es el único deporte donde puedes hacer trampa y luego confesar en el hoyo 18.", author: "Anónimo del vestuario" },
  { text: "No hay ningún hoyo que no se pueda hacer peor con un segundo golpe.", author: "Ley de Murphy golfista" },
  { text: "Golf: el arte de meter una bola en un agujero usando los instrumentos más inapropiados.", author: "Winston Churchill" },
  { text: "El golf saca lo mejor de uno... y también lo peor.", author: "Bogey Club" },
  { text: "Si cuentas todos tus golpes en golf, nunca podrás tener amigos.", author: "Sabiduría popular" },
  { text: "El golf es un buen paseo arruinado.", author: "Mark Twain" },
  { text: "Juego con mi conciencia. Siempre que cometo un error, mi conciencia me dice que anote 5.", author: "Bob Hope" },
  { text: "En golf, la humillación llega por parejas. Y a veces por águilas.", author: "Bogey Club" },
  { text: "El árbol que te cortó el camino llevaba ahí 200 años. Tú llevas 20 minutos.", author: "Sabiduría del campo" },
  { text: "Mi handicap no refleja mi nivel. Refleja mis esperanzas.", author: "Bogey Club" },
]

function holeBarColor(delta: number | null): string {
  if (delta === null) return '#ece8db'
  if (delta <= -1) return '#2a6fdb'
  if (delta === 0)  return '#1f8a5b'
  if (delta === 1)  return '#e8b75a'
  return '#c6432d'
}

function fmtDelta(delta: number | null): string {
  if (delta === null) return '–'
  if (delta === 0) return 'E'
  return delta > 0 ? `+${delta}` : `${delta}`
}

function fmtRoundDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

type RoundHole   = { hole_number: number; par: number }
type RoundPlayer = {
  name: string; profile_id: string | null; avatar_url: string | null; is_guest: boolean
  total: number | null; delta: number | null; holes_played: number
  hole_scores: { hole_number: number; strokes: number }[]
}

/** One nine (OUT / IN) of a round's mini scorecard. */
function ScoreNine({ holes, players, label }: { holes: RoundHole[]; players: RoundPlayer[]; label: string }) {
  if (holes.length === 0) return null
  const blockPar = holes.reduce((a, h) => a + h.par, 0)
  return (
    // table-fixed + colgroup: hole columns share the width equally, so OUT
    // and IN stay aligned whether or not a hole has a score yet.
    <table className="w-full text-center table-fixed" style={{ minWidth: `${holes.length * 24 + 92}px` }}>
      <colgroup>
        <col style={{ width: 40 }} />
        {holes.map(h => <col key={h.hole_number} />)}
        <col style={{ width: 52 }} />
      </colgroup>
      <thead>
        <tr className="border-y border-[#efebe1] bg-[#faf8f2]">
          <td className="font-mono text-[9px] text-[#6b7a72] py-1.5 px-2 text-left">H</td>
          {holes.map(h => <td key={h.hole_number} className="font-mono text-[10px] font-bold text-[#0e1a16] py-1.5 px-0.5">{h.hole_number}</td>)}
          <td className="font-mono text-[9px] text-[#6b7a72] py-1.5 px-2">{label}</td>
        </tr>
        <tr className="border-b border-[#efebe1]">
          <td className="font-mono text-[9px] text-[#6b7a72] px-2 py-1 text-left">PAR</td>
          {holes.map(h => <td key={h.hole_number} className="font-mono text-[9px] text-[#6b7a72] py-1 px-0.5">{h.par}</td>)}
          <td className="font-mono text-[10px] font-bold text-[#0e1a16] py-1 px-2">{blockPar}</td>
        </tr>
      </thead>
      <tbody>
        {players.map(p => {
          const byHole = new Map(p.hole_scores.map(s => [s.hole_number, s.strokes]))
          const blockScores = holes.map(h => byHole.get(h.hole_number)).filter((s): s is number => s != null)
          const blockTotal = blockScores.length ? blockScores.reduce((a, s) => a + s, 0) : null
          const blockDelta = blockTotal !== null
            ? holes.reduce((a, h) => { const s = byHole.get(h.hole_number); return s != null ? a + (s - h.par) : a }, 0)
            : null
          return (
            <tr key={p.name} className="border-t border-[#efebe1]">
              <td className="px-2 py-1.5">
                <PlayerLink profileId={p.profile_id}><Avatar name={p.name} src={p.avatar_url} size={20} /></PlayerLink>
              </td>
              {holes.map(h => {
                const s = byHole.get(h.hole_number)
                const d = s != null ? s - h.par : null
                return (
                  <td key={h.hole_number} className="py-1.5 px-0.5">
                    {s != null
                      ? <ScoreMark strokes={s} delta={d!} size={20} />
                      : <span className="text-[#c4bfb5] text-[12px]">·</span>}
                  </td>
                )
              })}
              <td className="px-2 py-1.5">
                {blockTotal !== null ? (
                  <div>
                    <p className="font-mono text-[11px] font-black text-[#0e1a16] leading-none">{blockTotal}</p>
                    <p className="font-mono text-[8px] font-bold" style={{ color: (blockDelta ?? 0) <= 0 ? '#1f8a5b' : '#9b6e1a' }}>{fmtDelta(blockDelta)}</p>
                  </div>
                ) : <span className="text-[#c4bfb5] text-[12px]">–</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// Picked once per app load — the quote only rotates daily anyway.
const DAILY_QUOTE = GOLF_QUOTES[new Date().getDate() % GOLF_QUOTES.length]

export default function HomePage() {
  const data = useQuery(api.home.dashboard)
  const recentRounds = useQuery(api.home.recentRounds) ?? []
  const navigate = useNavigate()

  useEffect(() => {
    if (data === null) navigate('/onboarding', { replace: true })
  }, [data, navigate])

  if (data === undefined || data === null) {
    return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>
  }

  const { profile, activeRound, activeLeague, feed, completedRoundsCount } = data

  const firstName = profile.name.split(' ')[0]

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header sticky — se mantiene arriba al hacer scroll */}
      <div className="sticky top-0 bg-[#f4f1e9]/85 backdrop-blur-md z-40 flex items-center justify-between px-[14px] pb-2 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
            <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
          </svg>
          <span className="text-[26px] font-black tracking-tight text-[#0e1a16]">Bogey Club</span>
        </div>
        <Link to="/round/course"
          className="btn-glow flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-[13px] text-white transition active:scale-[0.97]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
          Nueva
        </Link>
      </div>

      <div>

        <div className="px-[14px] space-y-3 mt-2">
          {/* Hero dark card */}
          <HeroCard className="p-5" orbSize={200} decor={
            <>
              <div className="absolute right-[52px] top-[-8px] w-[1.5px] h-[60px] bg-white opacity-85"/>
              <svg className="absolute right-[34px] top-[-6px]" width="24" height="14" viewBox="0 0 24 14"><path d="M0 0 L20 4 L0 10 Z" fill="white"/></svg>
              <div className="absolute right-[44px] top-[52px] w-[18px] h-[18px] rounded-full bg-white" style={{ boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.08)' }}/>
            </>
          }>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1f8a5b]"/>
              <span className="text-white text-[11px] font-semibold">Listo para jugar</span>
            </div>
            <h1 className="text-white text-[28px] font-black tracking-tight leading-tight mb-3">
              Buenas, {firstName}.<br/>
              Toca <span style={{ color: '#1f8a5b' }}>perder bolas.</span>
            </h1>

            {/* Frase del día — entre el texto y los botones */}
            <div className="rounded-[12px] px-3 py-2.5 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white/70 text-[12px] italic leading-snug">"{DAILY_QUOTE.text}"</p>
              <p className="font-mono text-[9px] text-white/35 mt-1">— {DAILY_QUOTE.author}</p>
            </div>

            <Link to="/round/course" className="btn-glow flex items-center justify-center py-3.5 rounded-full font-bold text-[15px] text-white transition active:scale-[0.98]">
              Empezar ronda
            </Link>
          </HeroCard>

          {/* Onboarding card — only when 0 completed rounds and no active round */}
          {completedRoundsCount === 0 && !activeRound && (
            <div className="bg-white rounded-[22px] border-2 border-[#1f8a5b] p-4">
              <p className="font-black text-[16px] text-[#0e1a16] mb-2">Bienvenido al club 🏌️</p>
              <div className="space-y-2">
                {[
                  { n: '1', text: 'Empieza una ronda con tus amigos' },
                  { n: '2', text: 'Anota golpe a golpe en el campo' },
                  { n: '3', text: 'Ve tus stats y el ranking al terminar' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-[#1f8a5b] flex items-center justify-center text-white text-[11px] font-black">{s.n}</div>
                    <p className="text-[13px] text-[#6b7a72]">{s.text}</p>
                  </div>
                ))}
              </div>
              <Link to="/round/course" className="mt-3 flex items-center justify-center w-full py-3 rounded-full font-bold text-[14px] text-white" style={{ backgroundColor: '#1f8a5b' }}>
                Primera ronda →
              </Link>
            </div>
          )}


          {/* Active round card */}
          {activeRound && (
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#1f8a5b] bg-[#d9eedd] px-2.5 py-1 rounded-full">
                  ● En curso · {activeRound.course_name}
                </span>
                <span className="font-mono text-[11px] text-[#6b7a72]">{activeRound.holes_played} / {activeRound.total_holes}</span>
              </div>

              <div className="flex items-end gap-4 mb-3">
                <div>
                  <p className="text-[11px] text-[#6b7a72] mb-0.5">Vas</p>
                  <p className="text-[38px] font-black text-[#0e1a16] leading-none">
                    {activeRound.score_delta > 0 ? `+${activeRound.score_delta}` : activeRound.score_delta === 0 ? 'E' : activeRound.score_delta}
                  </p>
                </div>
                {/* Colored hole bars */}
                <div className="flex-1 pb-1">
                  <div className="flex gap-[3px]">
                    {Array.from({ length: activeRound.total_holes }, (_, i) => i + 1).map(holeNum => {
                      const hs = activeRound.hole_scores.find(s => s.hole_number === holeNum)
                      const delta = hs ? hs.strokes - hs.par : null
                      return (
                        <div key={holeNum} className="flex-1 h-[26px] rounded-[4px]" style={{ backgroundColor: holeBarColor(delta) }}/>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] text-[#6b7a72]">
                    <span>H1</span>
                    <span>H{activeRound.holes_played} ↓</span>
                    <span>H{activeRound.total_holes}</span>
                  </div>
                </div>
              </div>

              <Link to={`/scorecard?round=${activeRound.id}`}
                onClick={e => e.currentTarget.style.setProperty('view-transition-name', 'round-card')}
                className="flex items-center justify-between w-full py-3 px-4 rounded-[16px] font-bold text-[14px] text-white transition active:scale-[0.98]"
                style={{ backgroundColor: '#0e1a16' }}>
                <span>Continuar · hoyo {activeRound.next_hole} par {activeRound.next_par}</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black text-[#0e1a16]" style={{ backgroundColor: '#1f8a5b' }}>→</span>
              </Link>
            </div>
          )}

          {/* Liga card */}
          {activeLeague ? (
            <HeroCard className="p-4" orbSize={120}>
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">
                      LIGA · JORNADA {activeLeague.round_played}/{activeLeague.total_rounds}
                    </p>
                    <p className="text-white text-[18px] font-black tracking-tight mt-1">{activeLeague.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-[32px] font-black leading-none">{activeLeague.my_position}º</p>
                    <p className="font-mono text-[9px] text-white/50">{activeLeague.my_points} PTS</p>
                  </div>
                </div>
                {/* Top 3 + actions */}
                <div className="flex items-center gap-2">
                  {activeLeague.top3.map((p: LeagueStanding) => (
                    <PlayerLink key={p.profile_id} profileId={p.profile_id}>
                      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                        <Avatar name={p.name} src={p.avatar_url} size={20} />
                        <span className="font-mono text-[10px] font-bold text-white">{p.total_points}</span>
                      </div>
                    </PlayerLink>
                  ))}
                  <div className="flex-1"/>
                  <Link to={`/round/course?league=${activeLeague.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[11px] transition active:scale-[0.98]"
                    style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
                    Jugar →
                  </Link>
                  <Link to="/league" className="font-mono text-[9px] text-white/60 ml-1">Ver liga →</Link>
                </div>
              </div>
            </HeroCard>
          ) : (
            <Link to="/league/new" className="block">
              <HeroCard className="p-4" orbSize={120}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">LIGA</p>
                    <p className="text-white text-[18px] font-black tracking-tight mt-1">Crear liga →</p>
                  </div>
                  <div className="text-[32px] font-black text-white/30">+</div>
                </div>
              </HeroCard>
            </Link>
          )}


          {/* El club feed */}
          {feed.length > 0 && (
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[17px] font-bold text-[#0e1a16]">El club</h3>
                <span className="text-[11px] text-[#2a6fdb] font-semibold">Ver feed →</span>
              </div>
              <div className="space-y-0">
                {feed.map((item, i) => (
                  <Link key={item.id} to={`/scorecard?round=${item.round_id}`}
                    className={`flex items-center gap-3 py-2.5 active:opacity-70 ${i > 0 ? 'border-t border-[#efebe1]' : ''}`}>
                    <PlayerLink profileId={item.profile_id}><Avatar name={item.name} src={item.avatar_url} size={36} /></PlayerLink>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-[#0e1a16] leading-tight">
                          <PlayerLink profileId={item.profile_id} className="font-bold">{item.name}</PlayerLink> {item.action}
                        </p>
                        {item.badge === 'PB' && (
                          <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#e8b75a', color: '#0e1a16' }}>PB</span>
                        )}
                        {item.badge === '🐦' && (
                          <span className="text-[14px] flex-shrink-0">🐦</span>
                        )}
                        {item.badge === '🦅' && (
                          <span className="text-[14px] flex-shrink-0">🦅</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6b7a72] mt-0.5">{item.detail}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Últimas partidas de todos — tarjeta por partida, ordenadas por fecha */}
          {recentRounds.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h3 className="text-[17px] font-bold text-[#0e1a16]">Últimas partidas</h3>
                <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-wide">Todos</span>
              </div>
              <div className="space-y-2">
                {recentRounds.map(r => (
                  <Link key={r.id} to={`/scorecard?round=${r.id}`}
                    onClick={e => e.currentTarget.style.setProperty('view-transition-name', 'round-card')}
                    className="block bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden active:scale-[0.99] transition">
                    {/* Cabecera de la partida */}
                    <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
                      <p className="text-[13px] font-bold text-[#0e1a16] truncate">
                        {r.course_name}
                        {r.is_practice && <span className="text-[#6b7a72] font-normal"> · práctica</span>}
                      </p>
                      <span className="font-mono text-[10px] text-[#6b7a72] flex-shrink-0 ml-2">{fmtRoundDate(r.date)}</span>
                    </div>
                    {/* Mini scorecard — 2 filas: OUT (1-9) / IN (10-18) */}
                    {r.holes.length > 0 ? (() => {
                      const front = r.holes.filter(h => h.hole_number <= 9)
                      const back  = r.holes.filter(h => h.hole_number >= 10)
                      return (
                        <div>
                          <div className="overflow-x-auto">
                            <ScoreNine holes={front} players={r.players} label={back.length ? 'OUT' : 'TOT'} />
                          </div>
                          {back.length > 0 && (
                            <div className="overflow-x-auto border-t-2 border-[#efebe1]">
                              <ScoreNine holes={back} players={r.players} label="IN" />
                            </div>
                          )}
                        </div>
                      )
                    })() : (
                      <p className="px-3 pb-3 text-[11px] text-[#6b7a72]">Sin golpes anotados</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
