import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { formatDate, formatHandicap } from '@/lib/golf'
import { Avatar } from '@/components/ui/avatar'
import { HeroCard } from '@/components/ui/hero-card'

export default function PlayerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const player = useQuery(api.players.publicProfile, id ? { profileId: id as Id<'profiles'> } : 'skip')

  if (player === undefined) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
      </div>
    )
  }
  if (player === null) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex flex-col items-center justify-center gap-3">
        <p className="text-[14px] text-[#6b7a72]">Jugador no encontrado.</p>
        <Link to="/players" className="text-[#1f8a5b] font-semibold text-[13px]">
          Ver jugadores →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header sticky */}
      <div
        className="sticky top-0 bg-[#f4f1e9]/85 backdrop-blur-md z-40 px-[14px] pb-3 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="flex items-center gap-1 text-[#6b7a72] font-semibold text-[13px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#6b7a72"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atrás
          </button>
          <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16]">{player.name.split(' ')[0]}</h1>
        </div>
      </div>

      <div className="px-[14px] pt-4 pb-4">
        {/* Member card — same look as the own carnet, without private details */}
        <HeroCard className="p-5 mb-3">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" fill="#9bc9a3" />
                  <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16" />
                </svg>
                <span className="text-white text-[14px] font-bold">Bogey Club</span>
              </div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#e8b75a] bg-[#e8b75a]/10 border border-[#e8b75a]/30 px-2.5 py-1 rounded-full">
                Socio
              </span>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <Avatar
                name={player.name}
                src={player.avatar_url}
                size={56}
                className="ring-2 ring-[#1f8a5b] ring-offset-2 ring-offset-[#0e1a16]"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white text-[21px] font-black tracking-tight leading-tight">{player.name}</p>
                  {player.clubs_sponsor_url && (
                    /* Sponsor logos come dark on white — invert to read on the dark card. */
                    <img
                      src={player.clubs_sponsor_url}
                      alt="Sponsor de palos"
                      className="h-[13px] w-auto opacity-80"
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                  )}
                </div>
                <p className="text-white/45 text-[12px] mt-0.5">
                  {player.rounds_count} ronda{player.rounds_count !== 1 ? 's' : ''} jugada
                  {player.rounds_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-end justify-between border-t border-white/10 pt-3.5">
              <div>
                <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Índice golf</p>
                <p
                  className="text-[44px] font-black leading-none"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 25%, #9bc9a3)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {formatHandicap(player.handicap_index)}
                </p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">P&P</p>
                <p className="text-white text-[28px] font-black leading-none">
                  {formatHandicap(player.handicap_index_pp)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] text-white/50 uppercase">Rondas</p>
                <p className="text-white text-[20px] font-black">{player.rounds_count}</p>
              </div>
            </div>
            {/* Embossed member strip */}
            <p className="mt-4 font-mono text-[9px] tracking-[0.3em] text-white/25 uppercase">
              BC-{player.id.slice(-4).toUpperCase()} · Miembro desde {new Date(player.member_since).getFullYear()}
            </p>
          </div>
        </HeroCard>

        {/* Last rounds */}
        <h2 className="text-[14px] font-bold text-[#0e1a16] mb-2 mt-4">Últimas partidas</h2>
        {player.rounds.length === 0 ? (
          <div className="bg-white rounded-[16px] p-6 border border-[#e5e0d4] text-center">
            <p className="text-[#6b7a72] text-[14px]">Todavía no ha firmado ninguna ronda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {player.rounds.map(r => (
              <Link
                key={r.id}
                to={`/scorecard?round=${r.id}`}
                onClick={e => e.currentTarget.style.setProperty('view-transition-name', 'round-card')}
                className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4] flex items-center gap-3 block active:scale-[0.99] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[13px] text-[#0e1a16] truncate">
                      {r.course_name}
                      {r.is_practice && <span className="text-[#6b7a72] font-normal"> · práctica</span>}
                    </p>
                    {r.won && (
                      <span className="font-mono text-[8px] bg-[#d9eedd] text-[#1f8a5b] px-1.5 py-0.5 rounded-full">
                        WIN
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6b7a72]">{formatDate(r.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[18px] font-black text-[#0e1a16]">{r.total}</p>
                  <p
                    className="font-mono text-[10px] font-bold"
                    style={{ color: r.delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}
                  >
                    {r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? 'E' : r.delta}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
