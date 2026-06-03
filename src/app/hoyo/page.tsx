'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Minus, Plus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'
import { scoreLabel, scoreChipColors } from '@/lib/golf'

interface HoleInfo {
  hole_number: number; par: number; stroke_index: number
}

interface PlayerScore {
  profile_id: string
  name: string
  avatar_color: string
  strokes: number
  putts: number
  fairway: boolean
  gir: boolean
  in_bunker: boolean
  penalties: number
}

export default function HoyoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const roundId = searchParams.get('round')
  const holeNum = parseInt(searchParams.get('hole') ?? '1', 10)

  const [holeInfo, setHoleInfo] = useState<HoleInfo | null>(null)
  const [totalHoles, setTotalHoles] = useState(18)
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const loadData = useCallback(async () => {
    if (!roundId) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    const { data: round } = await supabase
      .from('rounds')
      .select('course_id')
      .eq('id', roundId)
      .single()

    if (!round) { setLoading(false); return }

    const { data: hole } = await supabase
      .from('holes')
      .select('hole_number, par, stroke_index')
      .eq('course_id', round.course_id)
      .eq('hole_number', holeNum)
      .single()

    const { data: allHoles } = await supabase
      .from('holes')
      .select('hole_number')
      .eq('course_id', round.course_id)

    setTotalHoles(allHoles?.length ?? 18)
    if (hole) setHoleInfo(hole)

    // Fetch players
    const { data: roundPlayers } = await supabase
      .from('round_players')
      .select('profile_id, profiles(name, avatar_color)')
      .eq('round_id', roundId)
      .not('profile_id', 'is', null)

    // Fetch existing scores for this hole
    const { data: existingScores } = await supabase
      .from('scores')
      .select('*')
      .eq('round_id', roundId)
      .eq('hole_number', holeNum)

    const par = hole?.par ?? 4
    const players: PlayerScore[] = (roundPlayers ?? []).map((rp) => {
      const profile = rp.profiles as { name: string; avatar_color: string }
      const existing = existingScores?.find((s) => s.profile_id === rp.profile_id)
      return {
        profile_id: rp.profile_id,
        name: profile?.name ?? 'Jugador',
        avatar_color: profile?.avatar_color ?? '#1f8a5b',
        strokes: existing?.strokes ?? par + 1,
        putts: existing?.putts ?? 2,
        fairway: existing?.fairway ?? false,
        gir: existing?.gir ?? false,
        in_bunker: existing?.in_bunker ?? false,
        penalties: existing?.penalties ?? 0,
      }
    })

    setPlayerScores(players)
    setLoading(false)
  }, [roundId, holeNum, supabase, router])

  useEffect(() => { loadData() }, [loadData])

  function updatePlayer(profileId: string, field: keyof PlayerScore, value: number | boolean) {
    setPlayerScores((prev) => prev.map((p) =>
      p.profile_id === profileId ? { ...p, [field]: value } : p
    ))
  }

  async function handleSave(goNext: boolean) {
    if (!roundId || !holeInfo) return
    setSaving(true)

    const upserts = playerScores.map((p) => ({
      round_id: roundId,
      profile_id: p.profile_id,
      hole_number: holeNum,
      strokes: p.strokes,
      putts: p.putts,
      fairway: p.fairway,
      gir: p.gir,
      in_bunker: p.in_bunker,
      penalties: p.penalties,
    }))

    await supabase.from('scores').upsert(upserts, { onConflict: 'round_id,profile_id,hole_number' })

    if (goNext && holeNum < totalHoles) {
      router.push(`/hoyo?round=${roundId}&hole=${holeNum + 1}`)
    } else {
      router.push(`/tarjeta?round=${roundId}`)
    }
  }

  if (loading || !holeInfo) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <p className="text-[#6b7a72] text-[14px]">Cargando hoyo...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <button
            onClick={() => router.push(`/tarjeta?round=${roundId}`)}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center"
          >
            <ChevronLeft size={18} color="#0e1a16" />
          </button>
          <h1 className="text-[#0e1a16] text-[16px] font-bold flex-1">Anotar hoyo</h1>
          <div className="flex items-center gap-1">
            {holeNum > 1 && (
              <button
                onClick={() => router.push(`/hoyo?round=${roundId}&hole=${holeNum - 1}`)}
                className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center"
              >
                <ChevronLeft size={16} color="#6b7a72" />
              </button>
            )}
            {holeNum < totalHoles && (
              <button
                onClick={() => router.push(`/hoyo?round=${roundId}&hole=${holeNum + 1}`)}
                className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center"
              >
                <ChevronRight size={16} color="#6b7a72" />
              </button>
            )}
          </div>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Hole hero card */}
          <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
            <div className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full opacity-[0.07]" style={{ backgroundColor: '#1f8a5b' }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[#6b7a72] text-[11px] font-mono uppercase tracking-[0.15em] mb-1">Hoyo</p>
                <p className="text-white font-black leading-none" style={{ fontSize: 84 }}>{holeNum}</p>
              </div>
              <div className="flex gap-2 mt-1">
                <div className="bg-white/10 rounded-[14px] px-4 py-2 text-center">
                  <p className="text-[#6b7a72] text-[10px] font-mono uppercase tracking-wider">Par</p>
                  <p className="text-white text-[28px] font-bold leading-none">{holeInfo.par}</p>
                </div>
                <div className="bg-white/10 rounded-[14px] px-4 py-2 text-center">
                  <p className="text-[#6b7a72] text-[10px] font-mono uppercase tracking-wider">SI</p>
                  <p className="text-white text-[28px] font-bold leading-none">{holeInfo.stroke_index}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Player score cards */}
          {playerScores.map((player, idx) => {
            const delta = player.strokes - holeInfo.par
            const { bg, text } = scoreChipColors(delta)
            const isCurrentUser = player.profile_id === currentUserId
            return (
              <div
                key={player.profile_id}
                className="bg-white rounded-[22px] p-4 border border-[#e5e0d4]"
              >
                {/* Player header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                    style={{ backgroundColor: player.avatar_color }}
                  >
                    {player.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-[#0e1a16] text-[14px] font-bold leading-tight">
                      {player.name}{isCurrentUser && <span className="text-[#6b7a72] text-[11px] font-medium ml-1">(tú)</span>}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold"
                    style={{ backgroundColor: bg, color: text }}
                  >
                    {scoreLabel(player.strokes, holeInfo.par)}
                  </span>
                </div>

                {/* Stroke counter */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <button
                    onClick={() => updatePlayer(player.profile_id, 'strokes', Math.max(1, player.strokes - 1))}
                    className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center active:bg-[#f4f1e9]"
                  >
                    <Minus size={20} color="#0e1a16" />
                  </button>
                  <p className="text-[72px] font-black leading-none w-16 text-center" style={{ color: bg }}>
                    {player.strokes}
                  </p>
                  <button
                    onClick={() => updatePlayer(player.profile_id, 'strokes', player.strokes + 1)}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: '#1f8a5b' }}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {/* Putts */}
                <div className="flex items-center justify-between px-1 mb-3">
                  <p className="text-[#0e1a16] text-[13px] font-semibold">Putts</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updatePlayer(player.profile_id, 'putts', Math.max(0, player.putts - 1))}
                      className="w-8 h-8 rounded-full border border-[#e5e0d4] flex items-center justify-center"
                    >
                      <Minus size={14} color="#0e1a16" />
                    </button>
                    <span className="text-[#0e1a16] text-[20px] font-bold w-5 text-center">{player.putts}</span>
                    <button
                      onClick={() => updatePlayer(player.profile_id, 'putts', player.putts + 1)}
                      className="w-8 h-8 rounded-full border border-[#e5e0d4] flex items-center justify-center"
                    >
                      <Plus size={14} color="#0e1a16" />
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Calle', field: 'fairway' as keyof PlayerScore, value: player.fairway },
                    { label: 'Green en reg.', field: 'gir' as keyof PlayerScore, value: player.gir },
                    { label: 'Búnker', field: 'in_bunker' as keyof PlayerScore, value: player.in_bunker },
                    { label: `Penalti (${player.penalties})`, field: 'penalties' as keyof PlayerScore, value: player.penalties > 0, isCounter: true },
                  ].map(({ label, field, value, isCounter }) => (
                    <button
                      key={field}
                      onClick={() => {
                        if (isCounter) {
                          const cur = player.penalties
                          updatePlayer(player.profile_id, 'penalties', cur > 0 ? 0 : 1)
                        } else {
                          updatePlayer(player.profile_id, field, !value)
                        }
                      }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-[10px] border transition-all text-[12px] font-medium"
                      style={{
                        backgroundColor: value ? '#d9eedd' : '#f9f7f3',
                        borderColor: value ? '#1f8a5b' : '#e5e0d4',
                        color: value ? '#1f8a5b' : '#6b7a72',
                      }}
                    >
                      {label}
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{
                          borderColor: value ? '#1f8a5b' : '#c5bfb0',
                          backgroundColor: value ? '#1f8a5b' : 'transparent',
                        }}
                      >
                        {value && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Save buttons */}
          <div className="flex gap-2">
            {holeNum < totalHoles ? (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-full font-semibold text-[14px] border border-[#e5e0d4] bg-white text-[#0e1a16] disabled:opacity-40"
                >
                  Guardar
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-[14px] text-white disabled:opacity-40"
                  style={{ backgroundColor: '#1f8a5b' }}
                >
                  {saving ? 'Guardando...' : `Guardar y hoyo ${holeNum + 1}`}
                  {!saving && <ArrowRight size={16} />}
                </button>
              </>
            ) : (
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-[14px] text-white disabled:opacity-40"
                style={{ backgroundColor: '#2a6fdb' }}
              >
                {saving ? 'Guardando...' : 'Guardar último hoyo →'}
              </button>
            )}
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
