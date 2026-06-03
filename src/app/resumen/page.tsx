'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Flag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'
import { scoreChipColors, stablefordPts, strokesReceived, scoreDifferential, formatHandicap } from '@/lib/golf'

interface Hole { hole_number: number; par: number; stroke_index: number }
interface Player {
  profile_id: string; name: string; avatar_color: string; course_handicap: number
  scores: { strokes: number | null; putts: number | null }[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ResumenPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const roundId = searchParams.get('round')

  const [courseName, setCourseName] = useState('')
  const [courseDate, setCourseDate] = useState('')
  const [courseSlope, setCourseSlope] = useState(113)
  const [courseCr, setCourseCr] = useState(72.0)
  const [coursePar, setCoursePar] = useState(72)
  const [holes, setHoles] = useState<Hole[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [roundStatus, setRoundStatus] = useState('active')
  const [modes, setModes] = useState<string[]>([])
  const [activeMode, setActiveMode] = useState('stroke')
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadData = useCallback(async () => {
    if (!roundId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: round } = await supabase
      .from('rounds')
      .select('id, date, status, course_id, courses(name, slope, course_rating, par)')
      .eq('id', roundId)
      .single()

    if (!round) { setLoading(false); return }

    const course = round.courses as { name: string; slope: number; course_rating: number; par: number }
    setCourseName(course.name ?? '')
    setCourseDate(round.date ?? '')
    setRoundStatus(round.status ?? 'active')
    setCourseSlope(course.slope ?? 113)
    setCourseCr(course.course_rating ?? 72)
    setCoursePar(course.par ?? 72)

    const { data: holesData } = await supabase
      .from('holes')
      .select('hole_number, par, stroke_index')
      .eq('course_id', round.course_id)
      .order('hole_number')

    setHoles(holesData ?? [])

    const { data: roundModes } = await supabase
      .from('round_modes')
      .select('mode')
      .eq('round_id', roundId)

    const modeList = (roundModes ?? []).map((m) => m.mode)
    setModes(modeList)
    if (modeList.length > 0) setActiveMode(modeList[0])

    const { data: roundPlayers } = await supabase
      .from('round_players')
      .select('profile_id, course_handicap, profiles(name, avatar_color)')
      .eq('round_id', roundId)
      .not('profile_id', 'is', null)

    const { data: scoresData } = await supabase
      .from('scores')
      .select('profile_id, hole_number, strokes, putts')
      .eq('round_id', roundId)

    const playersArr: Player[] = (roundPlayers ?? []).map((rp) => {
      const profile = rp.profiles as { name: string; avatar_color: string }
      const holesList = holesData ?? []
      return {
        profile_id: rp.profile_id,
        name: profile?.name ?? 'Jugador',
        avatar_color: profile?.avatar_color ?? '#1f8a5b',
        course_handicap: rp.course_handicap ?? 0,
        scores: holesList.map((h) => {
          const s = scoresData?.find((sc) => sc.profile_id === rp.profile_id && sc.hole_number === h.hole_number)
          return { strokes: s?.strokes ?? null, putts: s?.putts ?? null }
        }),
      }
    })

    setPlayers(playersArr)
    setLoading(false)
  }, [roundId, supabase, router])

  useEffect(() => { loadData() }, [loadData])

  async function handleSignAndSave() {
    if (!roundId) return
    setSigning(true)

    await supabase.from('rounds').update({ status: 'completed' }).eq('id', roundId)

    // Calculate and save WHS differentials for each player
    for (const player of players) {
      const totalStrokes = player.scores.reduce((s, sc) => s + (sc.strokes ?? 0), 0)
      if (totalStrokes === 0) continue
      const diff = scoreDifferential(totalStrokes, courseCr, courseSlope)
      await supabase.from('whs_differentials').insert({
        profile_id: player.profile_id,
        round_id: roundId,
        adjusted_gross_score: totalStrokes,
        course_rating: courseCr,
        slope: courseSlope,
        differential: Math.round(diff * 10) / 10,
        is_counting: true,
        played_at: courseDate,
      })
    }

    router.push('/')
  }

  function getPlayerTotal(player: Player) {
    return player.scores.reduce((s, sc) => s + (sc.strokes ?? 0), 0)
  }

  function getPlayerStableford(player: Player) {
    return holes.reduce((total, hole, i) => {
      const strokes = player.scores[i]?.strokes
      if (!strokes) return total
      const recv = strokesReceived(player.course_handicap, hole.stroke_index)
      return total + stablefordPts(strokes, hole.par, recv)
    }, 0)
  }

  const totalPar = holes.reduce((s, h) => s + h.par, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <p className="text-[#6b7a72] text-[14px]">Cargando resumen...</p>
      </div>
    )
  }

  const myPlayer = players.find((p) => p.profile_id === currentUserId) ?? players[0]
  const myTotal = myPlayer ? getPlayerTotal(myPlayer) : 0
  const myDelta = myTotal - totalPar
  const { bg: heroBg, text: heroText } = myTotal > 0 ? scoreChipColors(myDelta) : { bg: '#d9eedd', text: '#1f8a5b' }

  const sortedPlayers = [...players].sort((a, b) => {
    if (activeMode === 'stableford') return getPlayerStableford(b) - getPlayerStableford(a)
    return getPlayerTotal(a) - getPlayerTotal(b)
  })

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-[14px] mb-4">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
            <Flag size={14} color="#fff" />
          </div>
          <h1 className="text-[#0e1a16] text-[17px] font-bold">Resumen de ronda</h1>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Hero card */}
          {myPlayer && myTotal > 0 && (
            <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
              <div className="relative">
                <p className="text-[#6b7a72] text-[12px] font-medium mb-1">{courseName}</p>
                <p className="text-[#6b7a72] text-[12px] capitalize mb-3">{formatDate(courseDate)}</p>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-[#6b7a72] text-[11px] font-mono uppercase tracking-wider mb-1">Total</p>
                    <p className="text-white font-black leading-none" style={{ fontSize: 84 }}>{myTotal}</p>
                  </div>
                  <div className="mb-4">
                    <span
                      className="inline-flex items-center px-4 py-2 rounded-full text-[20px] font-black"
                      style={{ backgroundColor: heroBg, color: heroText }}
                    >
                      {myDelta > 0 ? `+${myDelta}` : myDelta === 0 ? 'E' : myDelta}
                    </span>
                  </div>
                </div>
                <p className="text-[#6b7a72] text-[12px]">Par {totalPar} · HCP {formatHandicap(myPlayer.course_handicap)}</p>
              </div>
            </div>
          )}

          {/* Mode tabs */}
          {modes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold capitalize transition-all"
                  style={{
                    backgroundColor: activeMode === mode ? '#0e1a16' : '#fff',
                    color: activeMode === mode ? '#fff' : '#6b7a72',
                    border: `1px solid ${activeMode === mode ? '#0e1a16' : '#e5e0d4'}`,
                  }}
                >
                  {mode === 'stroke' ? 'Stroke' : mode === 'stableford' ? 'Stableford' : mode === 'matchplay' ? 'Match Play' : mode === 'matchplay_hcp' ? 'Match HCP' : mode.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden">
            <div className="px-4 py-3 bg-[#f4f1e9] border-b border-[#e5e0d4]">
              <p className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Clasificación</p>
            </div>
            <div className="divide-y divide-[#f4f1e9]">
              {sortedPlayers.map((player, i) => {
                const total = getPlayerTotal(player)
                const pts = getPlayerStableford(player)
                const delta = total - totalPar
                const { bg, text } = total > 0 ? scoreChipColors(delta) : { bg: '#f4f1e9', text: '#6b7a72' }
                return (
                  <div key={player.profile_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[#6b7a72] text-[13px] font-bold w-5">{i + 1}</span>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                      style={{ backgroundColor: player.avatar_color }}
                    >
                      {player.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#0e1a16] text-[14px] font-semibold">{player.name.split(' ')[0]}</p>
                      <p className="text-[#6b7a72] text-[11px]">HCP {player.course_handicap}</p>
                    </div>
                    {activeMode === 'stableford' ? (
                      <div className="text-right">
                        <p className="text-[#0e1a16] text-[18px] font-bold leading-none">{pts}</p>
                        <p className="text-[#6b7a72] text-[11px]">pts</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        {total > 0 ? (
                          <>
                            <p className="text-[#0e1a16] text-[18px] font-bold leading-none">{total}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold mt-0.5"
                              style={{ backgroundColor: bg, color: text }}>
                              {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                            </span>
                          </>
                        ) : (
                          <p className="text-[#6b7a72] text-[14px]">—</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Hole by hole for current user */}
          {myPlayer && holes.length > 0 && (
            <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
              <div className="px-4 py-3 bg-[#f4f1e9] border-b border-[#e5e0d4]">
                <p className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Hoyo a hoyo — {myPlayer.name.split(' ')[0]}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-[#e5e0d4]">
                      <td className="pl-3 pr-2 py-1.5 text-[10px] text-[#6b7a72] font-medium">Hoyo</td>
                      {holes.map((h) => (
                        <td key={h.hole_number} className="text-center px-1 py-1.5 text-[10px] text-[#6b7a72]">{h.hole_number}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                      <td className="pl-3 pr-2 py-1.5 text-[10px] text-[#6b7a72]">Par</td>
                      {holes.map((h) => (
                        <td key={h.hole_number} className="text-center px-1 py-1.5 text-[10px] text-[#6b7a72]">{h.par}</td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pl-3 pr-2 py-2 text-[11px] font-semibold text-[#0e1a16]">Score</td>
                      {myPlayer.scores.map((sc, i) => {
                        if (!sc.strokes) return <td key={i} className="text-center px-1 py-2 text-[11px] text-[#c5bfb0]">·</td>
                        const delta = sc.strokes - holes[i].par
                        const { bg, text } = scoreChipColors(delta)
                        return (
                          <td key={i} className="text-center px-1 py-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold"
                              style={{ backgroundColor: bg, color: text }}>
                              {sc.strokes}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                    {activeMode === 'stableford' && (
                      <tr>
                        <td className="pl-3 pr-2 py-2 text-[11px] font-semibold text-[#0e1a16]">Pts</td>
                        {myPlayer.scores.map((sc, i) => {
                          if (!sc.strokes) return <td key={i} className="text-center px-1 py-2 text-[10px] text-[#c5bfb0]">·</td>
                          const recv = strokesReceived(myPlayer.course_handicap, holes[i].stroke_index)
                          const pts = stablefordPts(sc.strokes, holes[i].par, recv)
                          return (
                            <td key={i} className="text-center px-1 py-2 text-[11px] font-bold text-[#2a6fdb]">{pts}</td>
                          )
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sign button */}
          {roundStatus === 'active' && (
            <button
              onClick={handleSignAndSave}
              disabled={signing}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-[14px] text-white disabled:opacity-40"
              style={{ backgroundColor: '#1f8a5b' }}
            >
              <CheckCircle size={18} />
              {signing ? 'Guardando...' : 'Firmar y guardar ronda'}
            </button>
          )}

          {roundStatus === 'completed' && (
            <div className="flex items-center justify-center gap-2 py-3 rounded-full text-[#1f8a5b] text-[14px] font-semibold bg-[#d9eedd]">
              <CheckCircle size={16} />
              Ronda firmada y guardada
            </div>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
