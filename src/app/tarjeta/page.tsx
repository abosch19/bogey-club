'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'
import { scoreChipColors } from '@/lib/golf'

function ScoreCell({ score, par }: { score: number | null; par: number }) {
  if (score === null) {
    return (
      <td className="text-center px-1 py-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-medium text-[#c5bfb0]">·</span>
      </td>
    )
  }
  const delta = score - par
  const { bg, text } = scoreChipColors(delta)
  return (
    <td className="text-center px-1 py-2">
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold"
        style={{ backgroundColor: bg, color: text }}
      >
        {score}
      </span>
    </td>
  )
}

interface Hole { hole_number: number; par: number; stroke_index: number }
interface Player { profile_id: string; name: string; avatar_color: string; scores: (number | null)[] }

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TarjetaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const roundId = searchParams.get('round')

  const [courseName, setCourseName] = useState('')
  const [courseDate, setCourseDate] = useState('')
  const [holes, setHoles] = useState<Hole[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [totalPar, setTotalPar] = useState(72)
  const [loading, setLoading] = useState(true)
  const [roundStatus, setRoundStatus] = useState('active')
  const [isPractice, setIsPractice] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadData = useCallback(async () => {
    if (!roundId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: round } = await supabase
      .from('rounds')
      .select('id, date, status, course_id, is_practice, courses(name, holes_count, par)')
      .eq('id', roundId)
      .single()

    if (!round) { setLoading(false); return }

    setCourseName((round.courses as { name: string }).name ?? '')
    setCourseDate(round.date ?? '')
    setRoundStatus(round.status ?? 'active')
    setIsPractice(round.is_practice ?? false)

    const { data: holesData } = await supabase
      .from('holes')
      .select('hole_number, par, stroke_index')
      .eq('course_id', round.course_id)
      .order('hole_number')

    const holesList: Hole[] = holesData ?? []
    setHoles(holesList)
    setTotalPar(holesList.reduce((s, h) => s + h.par, 0))

    const { data: roundPlayers } = await supabase
      .from('round_players')
      .select('profile_id, profiles(name, avatar_color)')
      .eq('round_id', roundId)
      .not('profile_id', 'is', null)

    const { data: scoresData } = await supabase
      .from('scores')
      .select('profile_id, hole_number, strokes')
      .eq('round_id', roundId)

    const playersArr: Player[] = (roundPlayers ?? []).map((rp) => {
      const profile = rp.profiles as { name: string; avatar_color: string }
      const playerScores = (scoresData ?? []).filter((s) => s.profile_id === rp.profile_id)
      const scoreArr = holesList.map((h) => {
        const found = playerScores.find((s) => s.hole_number === h.hole_number)
        return found ? found.strokes : null
      })
      return {
        profile_id: rp.profile_id,
        name: profile?.name ?? 'Jugador',
        avatar_color: profile?.avatar_color ?? '#1f8a5b',
        scores: scoreArr,
      }
    })

    setPlayers(playersArr)
    setLoading(false)
  }, [roundId, supabase, router])

  useEffect(() => { loadData() }, [loadData])

  function getNextUnplayedHole() {
    const myPlayer = players.find((p) => p.profile_id === currentUserId)
    if (!myPlayer) return 1
    const idx = myPlayer.scores.findIndex((s) => s === null)
    return idx === -1 ? holes.length : holes[idx]?.hole_number ?? 1
  }

  function isRoundComplete() {
    const myPlayer = players.find((p) => p.profile_id === currentUserId)
    if (!myPlayer) return false
    return myPlayer.scores.every((s) => s !== null)
  }

  const frontHoles = holes.slice(0, 9)
  const backHoles = holes.slice(9, 18)
  const is18 = holes.length >= 18

  function getPlayerSubTotal(player: Player, start: number, end: number) {
    const slice = player.scores.slice(start, end).filter((s) => s !== null) as number[]
    return slice.length > 0 ? slice.reduce((a, b) => a + b, 0) : null
  }

  const nextHole = getNextUnplayedHole()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <p className="text-[#6b7a72] text-[14px]">Cargando tarjeta...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center">
            <ChevronLeft size={18} color="#0e1a16" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[#0e1a16] text-[16px] font-bold leading-tight">{courseName}</h1>
              {isPractice && (
                <span className="px-2 py-0.5 bg-[#f6e6c4] text-[#9b6e1a] text-[10px] font-bold rounded-full uppercase">Práctica</span>
              )}
            </div>
            <span className="text-[#6b7a72] text-[12px]">{formatDate(courseDate)}</span>
          </div>
          {roundStatus === 'completed' && (
            <span className="flex items-center gap-1 text-[#1f8a5b] text-[12px] font-semibold">
              <CheckCircle size={14} />
              Final
            </span>
          )}
        </div>

        {/* Players avatars */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          {players.map((p) => (
            <div key={p.profile_id} className="flex flex-col items-center gap-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                style={{ backgroundColor: p.avatar_color }}
              >
                {p.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span className="text-[11px] font-medium text-[#6b7a72]">{p.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        <div className="px-[14px] space-y-3">
          {/* Front 9 */}
          <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            <div className="px-3 py-2 bg-[#f4f1e9] border-b border-[#e5e0d4]">
              <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">
                {is18 ? 'Ida · 1-9' : `Hoyos 1-${holes.length}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-[#e5e0d4]">
                    <th className="text-left pl-3 pr-2 py-2 text-[11px] font-semibold text-[#6b7a72] w-20">Jug.</th>
                    {frontHoles.map((h) => (
                      <th key={h.hole_number} className="text-center px-1 py-2 text-[11px] font-semibold text-[#6b7a72] w-8">
                        {h.hole_number}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 text-[11px] font-bold text-[#0e1a16] w-10">OUT</th>
                  </tr>
                  <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                    <td className="pl-3 pr-2 py-1.5 text-[10px] font-medium text-[#6b7a72]">Par</td>
                    {frontHoles.map((h) => (
                      <td key={h.hole_number} className="text-center px-1 py-1.5 text-[11px] font-medium text-[#6b7a72]">{h.par}</td>
                    ))}
                    <td className="text-center px-2 py-1.5 text-[11px] font-bold text-[#0e1a16]">
                      {frontHoles.reduce((s, h) => s + h.par, 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                    <td className="pl-3 pr-2 py-1 text-[10px] font-medium text-[#6b7a72]">SI</td>
                    {frontHoles.map((h) => (
                      <td key={h.hole_number} className="text-center px-1 py-1 text-[10px] text-[#c5bfb0]">{h.stroke_index}</td>
                    ))}
                    <td className="text-center px-2 py-1 text-[10px] text-[#c5bfb0]">—</td>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const frontTotal = getPlayerSubTotal(player, 0, 9)
                    return (
                      <tr key={player.profile_id} className="border-b border-[#f4f1e9] last:border-0">
                        <td className="pl-3 pr-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: player.avatar_color }}>
                              {player.name[0]}
                            </div>
                            <span className="text-[12px] font-semibold text-[#0e1a16] truncate max-w-[60px]">
                              {player.name.split(' ')[0]}
                            </span>
                          </div>
                        </td>
                        {player.scores.slice(0, 9).map((score, i) => (
                          <ScoreCell key={i} score={score} par={frontHoles[i]?.par ?? 4} />
                        ))}
                        <td className="text-center px-2 py-2">
                          <span className="text-[13px] font-bold text-[#0e1a16]">{frontTotal ?? '—'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Back 9 */}
          {is18 && backHoles.length > 0 && (
            <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
              <div className="px-3 py-2 bg-[#f4f1e9] border-b border-[#e5e0d4]">
                <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Vuelta · 10-18</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-[#e5e0d4]">
                      <th className="text-left pl-3 pr-2 py-2 text-[11px] font-semibold text-[#6b7a72] w-20">Jug.</th>
                      {backHoles.map((h) => (
                        <th key={h.hole_number} className="text-center px-1 py-2 text-[11px] font-semibold text-[#6b7a72] w-8">
                          {h.hole_number}
                        </th>
                      ))}
                      <th className="text-center px-1 py-2 text-[11px] font-bold text-[#0e1a16] w-8">IN</th>
                      <th className="text-center px-2 py-2 text-[11px] font-bold text-[#0e1a16] w-10">TOT</th>
                    </tr>
                    <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                      <td className="pl-3 pr-2 py-1.5 text-[10px] font-medium text-[#6b7a72]">Par</td>
                      {backHoles.map((h) => (
                        <td key={h.hole_number} className="text-center px-1 py-1.5 text-[11px] font-medium text-[#6b7a72]">{h.par}</td>
                      ))}
                      <td className="text-center px-1 py-1.5 text-[11px] font-bold text-[#0e1a16]">
                        {backHoles.reduce((s, h) => s + h.par, 0)}
                      </td>
                      <td className="text-center px-2 py-1.5 text-[11px] font-bold text-[#0e1a16]">{totalPar}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      const backTotal = getPlayerSubTotal(player, 9, 18)
                      const frontTotal = getPlayerSubTotal(player, 0, 9)
                      const grandTotal = frontTotal !== null && backTotal !== null
                        ? frontTotal + backTotal
                        : (frontTotal ?? backTotal)
                      return (
                        <tr key={player.profile_id} className="border-b border-[#f4f1e9] last:border-0">
                          <td className="pl-3 pr-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                style={{ backgroundColor: player.avatar_color }}>
                                {player.name[0]}
                              </div>
                              <span className="text-[12px] font-semibold text-[#0e1a16] truncate max-w-[60px]">
                                {player.name.split(' ')[0]}
                              </span>
                            </div>
                          </td>
                          {player.scores.slice(9, 18).map((score, i) => (
                            <ScoreCell key={i} score={score} par={backHoles[i]?.par ?? 4} />
                          ))}
                          <td className="text-center px-1 py-2">
                            <span className="text-[13px] font-bold text-[#0e1a16]">{backTotal ?? '—'}</span>
                          </td>
                          <td className="text-center px-2 py-2">
                            <span className="text-[13px] font-bold text-[#0e1a16]">{grandTotal ?? '—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CTA */}
          {roundStatus === 'active' && (
            <div className="space-y-2">
              {!isRoundComplete() ? (
                <Link
                  href={`/hoyo?round=${roundId}&hole=${nextHole}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-semibold text-[14px] text-white"
                  style={{ backgroundColor: '#1f8a5b' }}
                >
                  <Plus size={18} />
                  Anotar Hoyo {nextHole}
                </Link>
              ) : (
                <Link
                  href={`/resumen?round=${roundId}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-semibold text-[14px] text-white"
                  style={{ backgroundColor: '#2a6fdb' }}
                >
                  <CheckCircle size={18} />
                  Finalizar ronda
                </Link>
              )}
            </div>
          )}

          {roundStatus === 'completed' && (
            <Link
              href={`/resumen?round=${roundId}`}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full font-semibold text-[14px] text-white"
              style={{ backgroundColor: '#0e1a16' }}
            >
              Ver resumen →
            </Link>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
