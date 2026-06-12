import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { formatHandicap } from '@/lib/golf'
import { Avatar } from '@/components/ui/avatar'

export default function JugadoresPage() {
  const players = useQuery(api.players.directory)
  const me = useQuery(api.profiles.me)
  const [search, setSearch] = useState('')

  const myId = me?._id ?? ''
  const filtered = (players ?? []).filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  if (players === undefined)
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )

  return (
    <div className="min-h-screen bg-paper pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/profile" className="flex items-center gap-1.5 text-ink font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#0e1a16"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Perfil
          </Link>
        </div>

        <h1 className="text-[26px] font-black tracking-tight text-ink mb-4">El club</h1>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-rule mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8" />
            <path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar jugador…"
            aria-label="Buscar jugador"
            className="flex-1 bg-transparent text-[14px] text-ink placeholder-[#a09a90] outline-none"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((p, i) => (
            <Link
              key={p.id}
              to={`/player/${p.id}`}
              className={`bg-white rounded-btn p-4 border flex items-center gap-3 active:scale-[0.99] transition ${p.id === myId ? 'border-accent' : 'border-rule'}`}
            >
              <span className="font-mono text-[12px] font-bold text-mute w-5 text-center">{i + 1}</span>
              <Avatar name={p.name} src={p.avatar_url} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[14px] text-ink">{p.name}</p>
                  {p.id === myId && (
                    <span className="font-mono text-[8px] text-accent bg-accent-light px-1.5 py-0.5 rounded-full uppercase">
                      Tú
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-mute mt-0.5">
                  {p.rounds_played} ronda{p.rounds_played !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] text-mute uppercase">HCP</p>
                <p className="font-mono text-[18px] font-black text-ink">{formatHandicap(p.handicap_index)}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
