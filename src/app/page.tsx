import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Flag, Plus, Dumbbell, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TabBar } from '@/components/ui/tab-bar'
import { formatHandicap } from '@/lib/golf'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Fetch active round where user is a player
  const { data: activeRoundPlayer } = await supabase
    .from('round_players')
    .select('round_id, rounds(id, date, status, courses(name, holes_count))')
    .eq('profile_id', user.id)
    .eq('rounds.status', 'active')
    .not('rounds', 'is', null)
    .limit(1)
    .maybeSingle()

  const activeRound = activeRoundPlayer?.rounds as {
    id: string
    date: string
    status: string
    courses: { name: string; holes_count: number }
  } | null | undefined

  // Fetch completed rounds (last 3)
  const { data: recentRoundPlayers } = await supabase
    .from('round_players')
    .select('round_id, rounds(id, date, status, courses(name, par))')
    .eq('profile_id', user.id)
    .eq('rounds.status', 'completed')
    .order('round_id', { ascending: false })
    .limit(3)

  type RecentRound = { id: string; date: string; status: string; courses: { name: string; par: number } }
  const recentRounds = (recentRoundPlayers ?? [])
    .map((rp) => { const r = rp.rounds; if (!r) return null; return (Array.isArray(r) ? r[0] : r) as RecentRound })
    .filter(Boolean) as RecentRound[]

  // Score totals for recent rounds
  const recentRoundIds = recentRounds.map((r) => r.id)
  const { data: recentScores } = recentRoundIds.length
    ? await supabase
        .from('scores')
        .select('round_id, strokes')
        .eq('profile_id', user.id)
        .in('round_id', recentRoundIds)
    : { data: [] }

  const scoreTotals: Record<string, number> = {}
  for (const s of recentScores ?? []) {
    scoreTotals[s.round_id] = (scoreTotals[s.round_id] ?? 0) + (s.strokes ?? 0)
  }

  // Count completed rounds
  const { count: totalCompleted } = await supabase
    .from('round_players')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  // Active league
  const { data: leagueMembership } = await supabase
    .from('league_players')
    .select('league_id, leagues(id, name, active)')
    .eq('profile_id', user.id)
    .eq('leagues.active', true)
    .limit(1)
    .maybeSingle()

  const activeLeague = leagueMembership?.leagues as { id: string; name: string; active: boolean } | null | undefined

  const firstName = profile.name?.split(' ')[0] ?? 'Jugador'
  const initials = (profile.name ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
              <Flag size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-[#0e1a16]">bogeyclub</span>
          </div>
          <Link href="/carnet">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
              style={{ backgroundColor: profile.avatar_color ?? '#1f8a5b' }}
            >
              {initials}
            </div>
          </Link>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Hero dark card */}
          <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
            <div
              className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full opacity-[0.07]"
              style={{ backgroundColor: '#1f8a5b' }}
            />
            <div className="relative">
              <p className="text-[#6b7a72] text-[13px] font-medium mb-1">
                {activeRound ? 'Tienes una ronda activa' : 'Lista para jugar'}
              </p>
              <h1 className="text-white text-[26px] font-black tracking-tight leading-tight mb-3">
                Buenas, {firstName}.
              </h1>

              {/* Handicap chip */}
              <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 mb-5">
                <span className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide">HCP</span>
                <span className="text-white text-[15px] font-bold leading-none">
                  {formatHandicap(profile.handicap_index)}
                </span>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2">
                <Link
                  href="/nueva-ronda"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-[14px] text-white transition-opacity active:opacity-80"
                  style={{ backgroundColor: '#1f8a5b' }}
                >
                  <Plus size={16} />
                  Empezar ronda
                </Link>
                <Link
                  href="/nueva-ronda?practice=true"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-full font-semibold text-[14px] bg-white/10 text-white transition-opacity active:opacity-80"
                >
                  <Dumbbell size={16} />
                  Práctica
                </Link>
              </div>
            </div>
          </div>

          {/* Active round card */}
          {activeRound && (
            <div className="bg-white rounded-[22px] p-4 border border-[#e5e0d4]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#d9eedd] text-[#1f8a5b] text-[11px] font-bold mb-1.5">
                    EN CURSO
                  </div>
                  <h2 className="text-[#0e1a16] text-[16px] font-bold leading-tight">
                    {activeRound.courses?.name ?? 'Campo'}
                  </h2>
                  <p className="text-[#6b7a72] text-[12px] mt-0.5">{formatDate(activeRound.date)}</p>
                </div>
              </div>
              <Link
                href={`/tarjeta?round=${activeRound.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] font-semibold text-[14px] text-white transition-opacity active:opacity-80"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                Continuar →
              </Link>
            </div>
          )}

          {/* Recent rounds */}
          {recentRounds.length > 0 && (
            <div>
              <h3 className="text-[#0e1a16] text-[14px] font-bold px-1 mb-2">Últimas rondas</h3>
              <div className="space-y-2">
                {recentRounds.map((round) => {
                  const total = scoreTotals[round.id]
                  const par = round.courses?.par ?? 72
                  const delta = total != null ? total - par : null
                  return (
                    <Link
                      key={round.id}
                      href={`/resumen?round=${round.id}`}
                      className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4] flex items-center gap-3 block active:opacity-80"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[#0e1a16] text-[13px] font-semibold leading-tight">
                          {round.courses?.name ?? 'Campo'}
                        </p>
                        <p className="text-[#6b7a72] text-[12px]">{formatDate(round.date)}</p>
                      </div>
                      {total != null && (
                        <div className="text-right">
                          <p className="text-[#0e1a16] text-[16px] font-bold leading-none">{total}</p>
                          {delta != null && (
                            <p className="text-[11px] font-medium mt-0.5" style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                              {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : `${delta}`}
                            </p>
                          )}
                        </div>
                      )}
                      <ChevronRight size={16} color="#6b7a72" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Liga shortcut */}
          <Link
            href="/liga"
            className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] flex items-center gap-3 block active:opacity-80"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f6e6c4' }}>
              <Trophy size={20} color="#9b6e1a" />
            </div>
            <div className="flex-1">
              <p className="text-[#0e1a16] text-[14px] font-bold leading-tight">
                {activeLeague ? activeLeague.name : 'Mi Liga'}
              </p>
              <p className="text-[#6b7a72] text-[12px]">
                {activeLeague ? 'Ver clasificación →' : 'Crear o unirte a una liga'}
              </p>
            </div>
            <ChevronRight size={16} color="#6b7a72" />
          </Link>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
