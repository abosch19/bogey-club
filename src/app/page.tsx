import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { formatHandicap } from '@/lib/golf'

type LeagueStanding = { profile_id: string; name: string; avatar_color: string; total_points: number }
type LastRound = { course_id: string; course_name: string; player_ids: string[]; guests: string[]; modes: string[]; hole_mode: string; league_id?: string }

const GOLF_QUOTES = [
  { text: "El golf es el único deporte donde puedes hacer trampa y luego confesar en el hoyo 18.", author: "Anónimo del vestuario" },
  { text: "No hay ningún hoyo que no se pueda hacer peor con un segundo golpe.", author: "Ley de Murphy golfista" },
  { text: "Golf: el arte de meter una bola en un agujero usando los instrumentos más inapropiados.", author: "Winston Churchill" },
  { text: "El golf saca lo mejor de uno... y también lo peor.", author: "Bogey-Club" },
  { text: "Si cuentas todos tus golpes en golf, nunca podrás tener amigos.", author: "Sabiduría popular" },
  { text: "El golf es un buen paseo arruinado.", author: "Mark Twain" },
  { text: "Juego con mi conciencia. Siempre que cometo un error, mi conciencia me dice que anote 5.", author: "Bob Hope" },
  { text: "En golf, la humillación llega por parejas. Y a veces por águilas.", author: "Bogey-Club" },
  { text: "El árbol que te cortó el camino llevaba ahí 200 años. Tú llevas 20 minutos.", author: "Sabiduría del campo" },
  { text: "Mi handicap no refleja mi nivel. Refleja mis esperanzas.", author: "Bogey-Club" },
]

function holeBarColor(delta: number | null): string {
  if (delta === null) return '#ece8db'
  if (delta <= -1) return '#2a6fdb'
  if (delta === 0)  return '#1f8a5b'
  if (delta === 1)  return '#e8b75a'
  return '#c6432d'
}

export default function HomePage() {
  const dailyQuote = GOLF_QUOTES[new Date().getDate() % GOLF_QUOTES.length]
  const data = useQuery(api.home.dashboard)
  const [lastRound, setLastRound]     = useState<LastRound | null>(null)
  const [quickStarting, setQuickStarting] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lastRound')
      if (stored) setLastRound(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (data === null) window.location.href = '/onboarding'
  }, [data])

  function quickStart(lr: LastRound) {
    // Navigate to jugadores with course prefilled so user can review/modify
    const params = new URLSearchParams({
      course: lr.course_id,
      practice: 'false',
      hole_mode: lr.hole_mode ?? 'all',
      ...(lr.player_ids?.length ? { prefill_players: lr.player_ids.join(',') } : {}),
      ...(lr.league_id ? { league: lr.league_id } : {}),
    })
    window.location.href = `/ronda/jugadores?${params}`
  }

  if (data === undefined || data === null) {
    return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>
  }

  const { profile, activeRound, activeLeague, feed, completedRoundsCount } = data

  const firstName = profile.name.split(' ')[0]
  const initials  = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header FIJO — no se mueve al hacer scroll */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#f4f1e9] z-40 flex items-center justify-between px-[14px] pb-2 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
            <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
          </svg>
          <span className="text-[26px] font-black tracking-tight text-[#0e1a16]">Bogey-Club</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#6b7a72] tracking-wide uppercase">
            {new Date().toLocaleDateString('es-ES', { weekday: 'short' })} · {formatHandicap(profile.handicap_index)}
          </span>
          <Link to="/perfil">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ backgroundColor: profile.avatar_color ?? '#1f8a5b' }}>
              {initials}
            </div>
          </Link>
        </div>
      </div>

      {/* Spacer para compensar el header fijo */}
      <div style={{ height: 'calc(max(14px, env(safe-area-inset-top)) + 44px)' }}/>

      <div>

        <div className="px-[14px] space-y-3 mt-2">
          {/* Hero dark card */}
          <div className="rounded-[22px] p-5 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
            <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.92 }}/>
            <div className="absolute right-[52px] top-[-8px] w-[1.5px] h-[60px] bg-white opacity-85"/>
            <svg className="absolute right-[34px] top-[-6px]" width="24" height="14" viewBox="0 0 24 14"><path d="M0 0 L20 4 L0 10 Z" fill="white"/></svg>
            <div className="absolute right-[44px] top-[52px] w-[18px] h-[18px] rounded-full bg-white" style={{ boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.08)' }}/>

            <div className="relative">
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
                <p className="text-white/70 text-[12px] italic leading-snug">"{dailyQuote.text}"</p>
                <p className="font-mono text-[9px] text-white/35 mt-1">— {dailyQuote.author}</p>
              </div>

              <div className="flex gap-2">
                <Link to="/ronda/campo" className="flex-1 flex items-center justify-center py-3.5 rounded-full font-bold text-[15px] text-[#0e1a16] transition active:scale-[0.98]" style={{ backgroundColor: '#1f8a5b' }}>
                  Competitivo
                </Link>
                <Link to="/ronda/campo?practice=true" className="flex items-center justify-center px-5 py-3.5 rounded-full font-semibold text-[14px] transition active:scale-[0.98]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                  Práctica
                </Link>
              </div>
            </div>
          </div>

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
              <Link to="/ronda/campo" className="mt-3 flex items-center justify-center w-full py-3 rounded-full font-bold text-[14px] text-white" style={{ backgroundColor: '#1f8a5b' }}>
                Primera ronda →
              </Link>
            </div>
          )}

          {/* Ultima ronda quick-start */}
          {lastRound && !activeRound && (
            <button
              onClick={() => quickStart(lastRound)}
              disabled={quickStarting}
              className="w-full text-left bg-white rounded-[22px] border border-[#e5e0d4] px-4 py-3 flex items-center justify-between transition active:scale-[0.98] disabled:opacity-60"
            >
              <div>
                <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-[0.15em] mb-1">Ultima ronda</p>
                <p className="text-[15px] font-bold text-[#0e1a16]">Repetir ronda</p>
                <p className="text-[12px] text-[#6b7a72] mt-0.5">{lastRound.course_name} · {lastRound.modes.join(', ')}</p>
              </div>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: '#1f8a5b' }}>
                {quickStarting ? '...' : '→'}
              </span>
            </button>
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
                    {Array.from({ length: activeRound.total_holes }, (_, i) => {
                      const hs = activeRound.hole_scores.find(s => s.hole_number === i + 1)
                      const delta = hs ? hs.strokes - hs.par : null
                      return (
                        <div key={i} className="flex-1 h-[26px] rounded-[4px]" style={{ backgroundColor: holeBarColor(delta) }}/>
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

              <Link to={`/tarjeta?round=${activeRound.id}`}
                className="flex items-center justify-between w-full py-3 px-4 rounded-[14px] font-bold text-[14px] text-white transition active:scale-[0.98]"
                style={{ backgroundColor: '#0e1a16' }}>
                <span>Continuar · hoyo {activeRound.next_hole} par {activeRound.next_par}</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black text-[#0e1a16]" style={{ backgroundColor: '#1f8a5b' }}>→</span>
              </Link>
            </div>
          )}

          {/* Liga card */}
          {activeLeague ? (
            <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.7 }}/>
              <div className="relative">
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
                    <div key={p.profile_id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                      <span className="font-mono text-[10px] font-bold text-white">{p.total_points}</span>
                    </div>
                  ))}
                  <div className="flex-1"/>
                  <Link to={`/ronda/campo?league=${activeLeague.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[11px] transition active:scale-[0.98]"
                    style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
                    Jugar →
                  </Link>
                  <Link to="/liga" className="font-mono text-[9px] text-white/60 ml-1">Ver liga →</Link>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/liga/nueva" className="block rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.7 }}/>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">LIGA</p>
                  <p className="text-white text-[18px] font-black tracking-tight mt-1">Crear liga →</p>
                </div>
                <div className="text-[32px] font-black text-white/30">+</div>
              </div>
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
                  <Link key={item.id} to={`/resumen?round=${item.round_id}&readonly=true`}
                    className={`flex items-center gap-3 py-2.5 active:opacity-70 ${i > 0 ? 'border-t border-[#efebe1]' : ''}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ backgroundColor: item.avatar_color }}>
                      {item.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-[#0e1a16] leading-tight">
                          <span className="font-bold">{item.name}</span> {item.action}
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
        </div>
      </div>
    </div>
  )
}
