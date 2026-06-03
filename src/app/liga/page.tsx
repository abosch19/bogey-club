'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'
import { F1_POINTS } from '@/lib/golf'

interface LeagueStanding {
  profile_id: string; name: string; avatar_color: string
  total_points: number; rounds_played: number; wins: number
}

interface LeagueData {
  id: string; name: string; total_rounds: number; mode: string; active: boolean; created_by: string
  standings: LeagueStanding[]
}

const POSITION_COLORS = ['#e8b75a', '#9ca3af', '#cd7c2f']

export default function LigaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [leagues, setLeagues] = useState<LeagueData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Get leagues user belongs to
      const { data: memberships } = await supabase
        .from('league_players')
        .select('league_id, leagues(id, name, total_rounds, mode, active, created_by)')
        .eq('profile_id', user.id)

      const leagueList = (memberships ?? [])
        .map((m) => m.leagues as { id: string; name: string; total_rounds: number; mode: string; active: boolean; created_by: string } | null)
        .filter(Boolean) as { id: string; name: string; total_rounds: number; mode: string; active: boolean; created_by: string }[]

      // Get standings for each league
      const leaguesWithStandings: LeagueData[] = []
      for (const league of leagueList) {
        const { data: standings } = await supabase
          .from('league_standings')
          .select('profile_id, total_points, rounds_played, wins, profiles(name, avatar_color)')
          .eq('league_id', league.id)
          .order('total_points', { ascending: false })

        leaguesWithStandings.push({
          ...league,
          standings: (standings ?? []).map((s) => ({
            profile_id: s.profile_id,
            name: (s.profiles as { name: string; avatar_color: string })?.name ?? 'Jugador',
            avatar_color: (s.profiles as { name: string; avatar_color: string })?.avatar_color ?? '#6b7a72',
            total_points: s.total_points ?? 0,
            rounds_played: s.rounds_played ?? 0,
            wins: s.wins ?? 0,
          })),
        })
      }

      setLeagues(leaguesWithStandings)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <p className="text-[#6b7a72] text-[14px]">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-[14px] mb-4">
          <h1 className="text-[#0e1a16] text-[22px] font-black tracking-tight">Liga</h1>
          <Link
            href="/liga/nueva"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-white text-[13px] font-semibold"
            style={{ backgroundColor: '#1f8a5b' }}
          >
            <Plus size={14} />
            Nueva liga
          </Link>
        </div>

        <div className="px-[14px] space-y-4">
          {leagues.length === 0 ? (
            <div className="bg-white rounded-[22px] p-8 border border-[#e5e0d4] text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#f6e6c4' }}>
                <Trophy size={24} color="#9b6e1a" />
              </div>
              <p className="text-[#0e1a16] text-[16px] font-bold mb-1">Sin ligas activas</p>
              <p className="text-[#6b7a72] text-[13px] mb-4">Crea una liga para competir con tus amigos</p>
              <Link
                href="/liga/nueva"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white text-[14px] font-semibold"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                <Plus size={16} />
                Crear mi primera liga
              </Link>
            </div>
          ) : (
            leagues.map((league) => (
              <div key={league.id} className="space-y-3">
                {/* League hero */}
                <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy size={16} color="#e8b75a" />
                      <span className="text-[#e8b75a] text-[11px] font-bold uppercase tracking-wider">
                        {league.active ? 'En curso' : 'Finalizada'}
                      </span>
                    </div>
                    <h2 className="text-white text-[20px] font-black tracking-tight">{league.name}</h2>
                    <p className="text-[#6b7a72] text-[12px] mt-1">
                      {league.standings.length > 0 ? `${league.standings[0]?.rounds_played ?? 0}` : 0} de {league.total_rounds} jornadas ·{' '}
                      {league.mode === 'stableford' ? 'Stableford' : league.mode}
                    </p>

                    {league.standings.length > 0 && (
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold"
                          style={{ backgroundColor: league.standings[0].avatar_color }}
                        >
                          {league.standings[0].name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-[14px] font-bold">{league.standings[0].name.split(' ')[0]}</p>
                          <p className="text-[#6b7a72] text-[11px]">Líder</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#e8b75a] text-[28px] font-black leading-none">{league.standings[0].total_points}</p>
                          <p className="text-[#6b7a72] text-[11px]">pts</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Standings table */}
                {league.standings.length > 0 && (
                  <div className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden">
                    <div className="px-4 py-3 bg-[#f4f1e9] border-b border-[#e5e0d4] flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Clasificación</span>
                      <div className="flex gap-3 text-[10px] text-[#6b7a72] font-semibold uppercase">
                        <span>Rondas</span>
                        <span>Pts</span>
                      </div>
                    </div>
                    {league.standings.map((entry, i) => (
                      <div
                        key={entry.profile_id}
                        className="flex items-center gap-3 px-4 py-3 border-b border-[#f4f1e9] last:border-0"
                        style={{
                          backgroundColor: entry.profile_id === currentUserId ? '#f9fffe' : undefined,
                        }}
                      >
                        <span
                          className="text-[15px] font-black w-5 text-center"
                          style={{ color: POSITION_COLORS[i] ?? '#6b7a72' }}
                        >
                          {i + 1}
                        </span>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                          style={{ backgroundColor: entry.avatar_color }}
                        >
                          {entry.name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-[#0e1a16] text-[13px] font-semibold">
                            {entry.name.split(' ')[0]}
                            {entry.profile_id === currentUserId && (
                              <span className="text-[#6b7a72] text-[11px] font-normal ml-1">(tú)</span>
                            )}
                          </p>
                          <p className="text-[#6b7a72] text-[11px]">{entry.wins} victorias</p>
                        </div>
                        <span className="text-[#6b7a72] text-[13px] w-8 text-center">{entry.rounds_played}</span>
                        <span className="text-[#0e1a16] text-[17px] font-bold w-8 text-center">{entry.total_points}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Points reference */}
                <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                  <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-2">Puntos F1 por posición</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {F1_POINTS.slice(0, 6).map((pts, i) => (
                      <div key={i} className="flex items-center gap-1 bg-[#f4f1e9] rounded-full px-2.5 py-1">
                        <span className="text-[10px] text-[#6b7a72]">{i + 1}°</span>
                        <span className="text-[11px] font-bold text-[#0e1a16]">{pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
