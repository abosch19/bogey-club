import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TabBar } from '@/components/ui/tab-bar'
import { formatHandicap } from '@/lib/golf'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function StatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, handicap_index')
    .eq('id', user.id)
    .single()

  // Fetch completed rounds for this user (last 20)
  const { data: roundPlayers } = await supabase
    .from('round_players')
    .select('round_id, rounds(id, date, status, courses(name, par))')
    .eq('profile_id', user.id)
    .eq('rounds.status', 'completed')
    .order('round_id', { ascending: false })
    .limit(20)

  type RoundInfo = { id: string; date: string; status: string; courses: { name: string; par: number } }
  const completedRounds: RoundInfo[] = (roundPlayers ?? [])
    .map((rp) => { const r = rp.rounds; if (!r) return null; return (Array.isArray(r) ? r[0] : r) as RoundInfo })
    .filter(Boolean) as RoundInfo[]

  const completedRoundIds = completedRounds.map((r) => r.id)

  const { data: scores } = completedRoundIds.length
    ? await supabase
        .from('scores')
        .select('round_id, strokes, putts, fairway, gir')
        .eq('profile_id', user.id)
        .in('round_id', completedRoundIds)
    : { data: [] }

  // Score totals per round
  const scoreTotals: Record<string, number> = {}
  const puttTotals: Record<string, number> = {}
  const fairwayHits: Record<string, { hits: number; total: number }> = {}
  const girHits: Record<string, { hits: number; total: number }> = {}

  for (const s of scores ?? []) {
    scoreTotals[s.round_id] = (scoreTotals[s.round_id] ?? 0) + (s.strokes ?? 0)
    puttTotals[s.round_id] = (puttTotals[s.round_id] ?? 0) + (s.putts ?? 0)
    if (s.fairway !== null) {
      if (!fairwayHits[s.round_id]) fairwayHits[s.round_id] = { hits: 0, total: 0 }
      fairwayHits[s.round_id].total++
      if (s.fairway) fairwayHits[s.round_id].hits++
    }
    if (s.gir !== null) {
      if (!girHits[s.round_id]) girHits[s.round_id] = { hits: 0, total: 0 }
      girHits[s.round_id].total++
      if (s.gir) girHits[s.round_id].hits++
    }
  }

  const totals = Object.values(scoreTotals).filter((t) => t > 0)
  const totalRounds = completedRounds.length
  const bestScore = totals.length > 0 ? Math.min(...totals) : null
  const avgScore = totals.length > 0 ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : null

  const allPutts = Object.values(puttTotals).filter((p) => p > 0)
  const avgPutts = allPutts.length > 0 ? (allPutts.reduce((a, b) => a + b, 0) / allPutts.length).toFixed(1) : null

  const allFairways = Object.values(fairwayHits)
  const fwPct = allFairways.length > 0
    ? Math.round((allFairways.reduce((a, b) => a + b.hits, 0) / allFairways.reduce((a, b) => a + b.total, 0)) * 100)
    : null

  const allGir = Object.values(girHits)
  const girPct = allGir.length > 0
    ? Math.round((allGir.reduce((a, b) => a + b.hits, 0) / allGir.reduce((a, b) => a + b.total, 0)) * 100)
    : null

  // Last 5 for handicap trend
  const last5Rounds = completedRounds.slice(0, 5)
  const last10Rounds = completedRounds.slice(0, 10)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        <div className="px-[14px] mb-4">
          <h1 className="text-[#0e1a16] text-[22px] font-black tracking-tight">Estadísticas</h1>
          {profile && (
            <p className="text-[#6b7a72] text-[13px]">
              {profile.name} · HCP {formatHandicap(profile.handicap_index)}
            </p>
          )}
        </div>

        <div className="px-[14px] space-y-3">
          {/* Main stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] col-span-2">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[#6b7a72] text-[11px] font-mono uppercase tracking-wider mb-1">Índice WHS</p>
                  <p className="text-[#0e1a16] font-black leading-none" style={{ fontSize: 56 }}>
                    {formatHandicap(profile?.handicap_index)}
                  </p>
                </div>
                <div className="text-right space-y-1 mb-1">
                  <div>
                    <p className="text-[#6b7a72] text-[10px] uppercase">Rondas</p>
                    <p className="text-[#0e1a16] text-[24px] font-bold leading-none">{totalRounds}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] text-center">
              <p className="text-[#6b7a72] text-[10px] font-mono uppercase mb-1">Promedio</p>
              <p className="text-[#0e1a16] text-[28px] font-bold leading-none">{avgScore ?? '—'}</p>
            </div>
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] text-center">
              <p className="text-[#6b7a72] text-[10px] font-mono uppercase mb-1">Mejor</p>
              <p className="text-[#0e1a16] text-[28px] font-bold leading-none">{bestScore ?? '—'}</p>
            </div>
          </div>

          {/* Secondary stats */}
          {(avgPutts || fwPct !== null || girPct !== null) && (
            <div className="grid grid-cols-3 gap-2">
              {avgPutts && (
                <div className="bg-white rounded-[16px] p-3 border border-[#e5e0d4] text-center">
                  <p className="text-[#6b7a72] text-[10px] font-mono uppercase mb-1">Putts/r</p>
                  <p className="text-[#0e1a16] text-[22px] font-bold leading-none">{avgPutts}</p>
                </div>
              )}
              {fwPct !== null && (
                <div className="bg-white rounded-[16px] p-3 border border-[#e5e0d4] text-center">
                  <p className="text-[#6b7a72] text-[10px] font-mono uppercase mb-1">FW %</p>
                  <p className="text-[#0e1a16] text-[22px] font-bold leading-none">{fwPct}%</p>
                </div>
              )}
              {girPct !== null && (
                <div className="bg-white rounded-[16px] p-3 border border-[#e5e0d4] text-center">
                  <p className="text-[#6b7a72] text-[10px] font-mono uppercase mb-1">GIR %</p>
                  <p className="text-[#0e1a16] text-[22px] font-bold leading-none">{girPct}%</p>
                </div>
              )}
            </div>
          )}

          {/* Handicap trend */}
          {last5Rounds.length > 0 && (
            <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
              <p className="text-[#0e1a16] text-[13px] font-bold mb-3">Tendencia últimas {last5Rounds.length} rondas</p>
              <div className="flex items-end gap-2 h-16">
                {last5Rounds.reverse().map((round) => {
                  const total = scoreTotals[round.id] ?? 0
                  const par = round.courses?.par ?? 72
                  const delta = total - par
                  const height = Math.max(20, Math.min(100, 60 - delta * 5))
                  return (
                    <div key={round.id} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t-[4px]"
                        style={{
                          height: `${height}%`,
                          backgroundColor: delta <= 0 ? '#1f8a5b' : delta <= 5 ? '#e8b75a' : '#f87171',
                        }}
                      />
                      <p className="text-[9px] text-[#6b7a72]">{delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent rounds list */}
          {last10Rounds.length > 0 ? (
            <div>
              <h3 className="text-[#0e1a16] text-[14px] font-bold px-1 mb-2">Últimas rondas</h3>
              <div className="space-y-2">
                {last10Rounds.map((round) => {
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
                        <p className="text-[#0e1a16] text-[13px] font-semibold leading-tight">{round.courses?.name ?? 'Campo'}</p>
                        <p className="text-[#6b7a72] text-[12px]">{formatDate(round.date)}</p>
                      </div>
                      {total != null && (
                        <div className="text-right">
                          <p className="text-[#0e1a16] text-[18px] font-bold leading-none">{total}</p>
                          {delta != null && (
                            <p className="text-[12px] font-medium" style={{ color: delta <= 0 ? '#1f8a5b' : '#9b6e1a' }}>
                              {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : `${delta}`}
                            </p>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[22px] p-8 border border-[#e5e0d4] text-center">
              <p className="text-[#6b7a72] text-[14px]">Sin rondas completadas todavía</p>
              <p className="text-[#6b7a72] text-[12px] mt-1">Juega tu primera ronda para ver estadísticas</p>
            </div>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
