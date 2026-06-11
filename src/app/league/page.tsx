import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Avatar } from '@/components/ui/avatar'
import { PlayerLink } from '@/components/ui/player-link'

export default function LigaPage() {
  const data = useQuery(api.leagues.listForUser)
  const removeLeague = useMutation(api.leagues.remove)
  const [deleting, setDeleting] = useState<string | null>(null)

  const leagues = data ?? []

  async function handleDelete(leagueId: Id<'leagues'>) {
    if (!confirm('¿Seguro que quieres borrar esta liga? Esta acción no se puede deshacer.')) return
    setDeleting(leagueId)
    try {
      await removeLeague({ league_id: leagueId })
    } catch (err) {
      setDeleting(null)
      throw err
    }
    setDeleting(null)
  }

  if (data === undefined)
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
      </div>
    )

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header sticky */}
      <div
        className="sticky top-0 bg-[#f4f1e9]/85 backdrop-blur-md z-40 px-[14px] pb-3 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16]">Liga</h1>
          <Link
            to="/league/new"
            className="btn-glow flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold text-[13px] text-white transition active:scale-[0.97]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Nueva
          </Link>
        </div>
      </div>

      <div className="px-[14px] pt-4 pb-4">
        {leagues.length === 0 ? (
          <div className="space-y-3">
            {/* Hero empty state */}
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-6">
              <div className="w-14 h-14 rounded-full bg-[#f6e6c4] flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z"
                    stroke="#9b6e1a"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-[18px] font-black text-[#0e1a16] mb-1">¿Qué es una liga?</p>
              <p className="text-[13px] text-[#6b7a72] mb-4">
                Una competición entre amigos a lo largo de varias jornadas. Cada ronda puntúa y al final hay un campeón.
              </p>
              <Link
                to="/league/new"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-bold text-[14px] text-white"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                Crear primera liga →
              </Link>
            </div>

            {/* How it works */}
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <p className="text-[13px] font-bold text-[#0e1a16] mb-3">¿Cómo funciona?</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#d9eedd] flex items-center justify-center flex-shrink-0 text-[14px]">
                    👥
                  </div>
                  <p className="text-[12px] text-[#6b7a72]">
                    Invita a tus amigos — con 8 jugadores, puntúan los 4 primeros de cada ronda
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#dde7fb] flex items-center justify-center flex-shrink-0 text-[14px]">
                    🏎️
                  </div>
                  <p className="text-[12px] text-[#6b7a72]">
                    Sistema de puntos al estilo F1: 25, 18, 15, 12... El mejor acumula más
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#f6e6c4] flex items-center justify-center flex-shrink-0 text-[14px]">
                    🏆
                  </div>
                  <p className="text-[12px] text-[#6b7a72]">
                    Al final de la temporada, el clasificado número 1 se lleva la gloria
                  </p>
                </div>
              </div>
            </div>

            {/* Example standings preview */}
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <p className="text-[13px] font-bold text-[#0e1a16] mb-3">Ejemplo de clasificación</p>
              <div className="space-y-1.5">
                {[
                  { pos: 1, name: 'Tú', pts: 68, color: '#1f8a5b', highlight: true },
                  { pos: 2, name: 'Amigo 1', pts: 61, color: '#2a6fdb', highlight: false },
                  { pos: 3, name: 'Amigo 2', pts: 43, color: '#d4a24a', highlight: false },
                ].map(p => (
                  <div
                    key={p.pos}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-[10px]"
                    style={{ backgroundColor: p.highlight ? '#d9eedd' : 'transparent' }}
                  >
                    <span
                      className="font-mono text-[12px] font-bold w-5 text-center"
                      style={{ color: p.highlight ? '#1f8a5b' : '#6b7a72' }}
                    >
                      {p.pos}
                    </span>
                    <Avatar name={p.name} size={28} />
                    <span className="flex-1 text-[13px] font-semibold text-[#0e1a16]">{p.name}</span>
                    <span className="font-mono text-[14px] font-black text-[#0e1a16]">{p.pts}</span>
                    <span className="font-mono text-[9px] text-[#6b7a72]">PTS</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {leagues.map(({ league, standings: st }) => {
              return (
                <div key={league._id} className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden">
                  {/* League header */}
                  <div className="p-4 relative overflow-hidden" style={{ backgroundColor: '#1a2a4a' }}>
                    <div
                      className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full"
                      style={{ backgroundColor: '#2a6fdb', opacity: 0.6 }}
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">
                            {league.mode?.toUpperCase()} · {league.total_rounds} JORNADAS
                          </p>
                          <p className="text-white text-[20px] font-black tracking-tight mt-1">{league.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(league._id)}
                          disabled={deleting === league._id}
                          className="mt-1 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#c6432d]/80 hover:bg-[#c6432d] transition disabled:opacity-50 text-white text-[11px] font-semibold"
                          title="Borrar liga"
                        >
                          {deleting === league._id ? (
                            <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>{' '}
                              Borrar
                            </>
                          )}
                        </button>
                      </div>
                      {/* Iniciar ronda de liga */}
                      <Link
                        to={`/round/course?league=${league._id}`}
                        className="flex items-center justify-between w-full px-4 py-2.5 rounded-full font-bold text-[13px] text-white transition active:scale-[0.98]"
                        style={{ backgroundColor: '#2a6fdb' }}
                      >
                        <span>Iniciar ronda de liga</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">→</span>
                      </Link>
                    </div>
                  </div>

                  {/* Standings */}
                  {st.length > 0 ? (
                    <div className="p-3 space-y-1.5">
                      {st.slice(0, 5).map((s: any, i: number) => (
                        <div
                          key={s.profile_id}
                          className="flex items-center gap-3 py-1.5 px-2 rounded-[12px]"
                          style={{ backgroundColor: i === 0 ? '#f6e6c4' : 'transparent' }}
                        >
                          <span
                            className="font-mono text-[12px] font-bold w-5 text-center"
                            style={{ color: i === 0 ? '#9b6e1a' : '#6b7a72' }}
                          >
                            {i + 1}
                          </span>
                          <PlayerLink profileId={s.profile_id}>
                            <Avatar name={s.name} size={28} />
                          </PlayerLink>
                          <PlayerLink
                            profileId={s.profile_id}
                            className="flex-1 text-[13px] font-semibold text-[#0e1a16]"
                          >
                            {s.name}
                          </PlayerLink>
                          <span className="font-mono text-[14px] font-black text-[#0e1a16]">{s.total_points}</span>
                          <span className="font-mono text-[9px] text-[#6b7a72]">PTS</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-[13px] text-[#6b7a72] py-4">Aún no hay clasificación</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
