'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Check, Plus, X, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'
import { courseHandicap } from '@/lib/golf'

interface Course {
  id: string; name: string; holes_count: number; slope: number; course_rating: number; par: number
}
interface PlayerOption {
  id: string; name: string; avatar_color: string; handicap_index: number; is_guest?: boolean
}

const MODES = [
  { id: 'stableford', label: 'Stableford', desc: 'Puntos según resultado vs par con hándicap', minPlayers: 1 },
  { id: 'matchplay', label: 'Match Play', desc: 'Hoyo a hoyo sin hándicap', minPlayers: 2 },
  { id: 'matchplay_hcp', label: 'Match Play HCP', desc: 'Hoyo a hoyo con hándicap', minPlayers: 2 },
  { id: 'wolf', label: 'Wolf', desc: 'Cada hoyo un jugador elige bando', minPlayers: 4 },
  { id: 'bbb', label: 'Better Ball', desc: 'Mejor bola entre parejas', minPlayers: 4 },
] as const

export default function NuevaRondaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPractice = searchParams.get('practice') === 'true'
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const [profiles, setProfiles] = useState<PlayerOption[]>([])
  const [currentUser, setCurrentUser] = useState<PlayerOption | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerOption[]>([])
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestHcp, setGuestHcp] = useState('36.0')

  const [selectedModes, setSelectedModes] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('courses').select('*').order('name').then(({ data }) => {
      if (data) setCourses(data)
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('id, name, avatar_color, handicap_index').then(({ data }) => {
        const me = data?.find((p) => p.id === user.id)
        const others = (data ?? []).filter((p) => p.id !== user.id)
        if (me) {
          const mePlayer = { ...me, handicap_index: me.handicap_index ?? 0 }
          setCurrentUser(mePlayer)
          setSelectedPlayers([mePlayer])
        }
        setProfiles(others.map((p) => ({ ...p, handicap_index: p.handicap_index ?? 0 })))
      })
    })
  }, [])

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalPlayers = selectedPlayers.length

  function togglePlayer(player: PlayerOption) {
    const isSelected = selectedPlayers.some((p) => p.id === player.id)
    if (isSelected) {
      // Can't deselect current user
      if (currentUser && player.id === currentUser.id) return
      setSelectedPlayers(selectedPlayers.filter((p) => p.id !== player.id))
    } else {
      if (totalPlayers >= 4) return
      setSelectedPlayers([...selectedPlayers, player])
    }
  }

  async function addGuest() {
    if (!guestName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const hcp = parseFloat(guestHcp) || 36.0
    const { data: guest } = await supabase
      .from('guest_players')
      .insert({ name: guestName.trim(), handicap_index: hcp, created_by: user.id })
      .select()
      .single()
    if (guest) {
      const guestPlayer: PlayerOption = {
        id: guest.id,
        name: guest.name,
        avatar_color: '#6b7a72',
        handicap_index: hcp,
        is_guest: true,
      }
      setSelectedPlayers([...selectedPlayers, guestPlayer])
    }
    setGuestName('')
    setGuestHcp('36.0')
    setShowGuestForm(false)
  }

  function toggleMode(modeId: string) {
    if (selectedModes.includes(modeId)) {
      setSelectedModes(selectedModes.filter((m) => m !== modeId))
    } else {
      if (selectedModes.length >= 2) return
      setSelectedModes([...selectedModes, modeId])
    }
  }

  async function handleCreate() {
    if (!selectedCourse) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const today = new Date().toISOString().split('T')[0]

      const { data: round, error: roundErr } = await supabase
        .from('rounds')
        .insert({
          course_id: selectedCourse.id,
          created_by: user.id,
          status: 'active',
          date: today,
          is_practice: isPractice,
        })
        .select()
        .single()

      if (roundErr || !round) throw roundErr ?? new Error('No se pudo crear la ronda')

      // Insert round_players
      const playerInserts = selectedPlayers.map((player) => {
        const chcp = courseHandicap(
          player.handicap_index,
          selectedCourse.slope,
          selectedCourse.course_rating,
          selectedCourse.par
        )
        if (player.is_guest) {
          return { round_id: round.id, guest_id: player.id, is_guest: true, course_handicap: chcp }
        }
        return { round_id: round.id, profile_id: player.id, is_guest: false, course_handicap: chcp }
      })

      const { error: playersErr } = await supabase.from('round_players').insert(playerInserts)
      if (playersErr) throw playersErr

      // Insert round_modes
      const allModes = ['stroke', ...selectedModes]
      const modeInserts = allModes.map((mode, i) => ({
        round_id: round.id,
        mode,
        is_primary: i === 0,
      }))
      await supabase.from('round_modes').insert(modeInserts)

      router.push(`/tarjeta?round=${round.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center"
          >
            <ChevronLeft size={18} color="#0e1a16" />
          </button>
          <div className="flex-1">
            <h1 className="text-[#0e1a16] text-[17px] font-bold">
              {isPractice ? 'Ronda de práctica' : 'Nueva ronda'}
            </h1>
            <p className="text-[#6b7a72] text-[12px]">Paso {step} de 3</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1.5 px-[14px] mb-4">
          {[1,2,3].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full flex-1 transition-all"
              style={{ backgroundColor: s <= step ? '#1f8a5b' : '#e5e0d4' }}
            />
          ))}
        </div>

        <div className="px-[14px] space-y-3">

          {/* STEP 1: Course */}
          {step === 1 && (
            <>
              <div className="bg-white rounded-[22px] p-4 border border-[#e5e0d4]">
                <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-3">Campo de golf</p>
                <div className="relative mb-3">
                  <Search size={16} color="#6b7a72" className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar campo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[#f4f1e9] border border-[#e5e0d4] rounded-[12px] pl-9 pr-4 py-2.5 text-[14px] text-[#0e1a16] placeholder:text-[#6b7a72] focus:outline-none focus:border-[#1f8a5b]"
                  />
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {filteredCourses.length === 0 && (
                    <p className="text-[#6b7a72] text-[13px] text-center py-4">No hay campos disponibles</p>
                  )}
                  {filteredCourses.map((c) => {
                    const sel = selectedCourse?.id === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCourse(c)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] border transition-all text-left"
                        style={{
                          backgroundColor: sel ? '#d9eedd' : '#f9f7f3',
                          borderColor: sel ? '#1f8a5b' : '#e5e0d4',
                        }}
                      >
                        <div>
                          <p className="text-[#0e1a16] text-[14px] font-semibold">{c.name}</p>
                          <p className="text-[#6b7a72] text-[12px]">{c.holes_count} hoyos · Par {c.par}</p>
                        </div>
                        {sel && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
                            <Check size={14} color="#fff" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedCourse && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Par', value: selectedCourse.par },
                    { label: 'Slope', value: selectedCourse.slope },
                    { label: 'Rating', value: selectedCourse.course_rating },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-[16px] p-3 border border-[#e5e0d4] text-center">
                      <p className="text-[#6b7a72] text-[10px] font-medium uppercase">{label}</p>
                      <p className="text-[#0e1a16] text-[22px] font-bold leading-none mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!selectedCourse}
                className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                Siguiente → Jugadores
              </button>
            </>
          )}

          {/* STEP 2: Players */}
          {step === 2 && (
            <>
              <div className="bg-white rounded-[22px] p-4 border border-[#e5e0d4]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider">Jugadores ({totalPlayers}/4)</p>
                </div>
                <div className="space-y-2">
                  {/* Current user - always selected */}
                  {currentUser && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] border" style={{ backgroundColor: '#d9eedd', borderColor: '#1f8a5b' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                        style={{ backgroundColor: currentUser.avatar_color ?? '#1f8a5b' }}>
                        {currentUser.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#0e1a16] text-[14px] font-semibold">{currentUser.name}</p>
                        <p className="text-[#6b7a72] text-[12px]">HCP {currentUser.handicap_index?.toFixed(1) ?? '—'}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
                        <Check size={12} color="#fff" />
                      </div>
                    </div>
                  )}

                  {/* Other profiles */}
                  {profiles.map((player) => {
                    const sel = selectedPlayers.some((p) => p.id === player.id)
                    return (
                      <button
                        key={player.id}
                        onClick={() => togglePlayer(player)}
                        disabled={!sel && totalPlayers >= 4}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] border transition-all disabled:opacity-40"
                        style={{
                          backgroundColor: sel ? '#d9eedd' : '#f9f7f3',
                          borderColor: sel ? '#1f8a5b' : '#e5e0d4',
                        }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                          style={{ backgroundColor: player.avatar_color ?? '#6b7a72' }}>
                          {player.name[0]}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[#0e1a16] text-[14px] font-semibold">{player.name}</p>
                          <p className="text-[#6b7a72] text-[12px]">HCP {player.handicap_index?.toFixed(1) ?? '—'}</p>
                        </div>
                        {sel && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
                            <Check size={12} color="#fff" />
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* Guest players */}
                  {selectedPlayers.filter((p) => p.is_guest).map((guest) => (
                    <div key={guest.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] border" style={{ backgroundColor: '#f6e6c4', borderColor: '#e8b75a' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold bg-[#9b6e1a] flex-shrink-0">
                        {guest.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#0e1a16] text-[14px] font-semibold">{guest.name}</p>
                        <p className="text-[#6b7a72] text-[12px]">Invitado · HCP {guest.handicap_index}</p>
                      </div>
                      <button onClick={() => setSelectedPlayers(selectedPlayers.filter((p) => p.id !== guest.id))}>
                        <X size={16} color="#9b6e1a" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add guest form */}
              {totalPlayers < 4 && !showGuestForm && (
                <button
                  onClick={() => setShowGuestForm(true)}
                  className="w-full py-2.5 rounded-[12px] border-2 border-dashed border-[#e5e0d4] text-[#6b7a72] text-[14px] font-medium flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Añadir invitado
                </button>
              )}

              {showGuestForm && (
                <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] space-y-3">
                  <p className="text-[#0e1a16] text-[13px] font-bold">Nuevo invitado</p>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-[#f4f1e9] border border-[#e5e0d4] rounded-[10px] px-3 py-2.5 text-[14px] text-[#0e1a16] placeholder:text-[#6b7a72] focus:outline-none focus:border-[#1f8a5b]"
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="54"
                    placeholder="Hándicap (ej: 18.0)"
                    value={guestHcp}
                    onChange={(e) => setGuestHcp(e.target.value)}
                    className="w-full bg-[#f4f1e9] border border-[#e5e0d4] rounded-[10px] px-3 py-2.5 text-[14px] text-[#0e1a16] placeholder:text-[#6b7a72] focus:outline-none focus:border-[#1f8a5b]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowGuestForm(false); setGuestName(''); setGuestHcp('36.0') }}
                      className="flex-1 py-2 rounded-[10px] border border-[#e5e0d4] text-[#6b7a72] text-[13px] font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={addGuest}
                      disabled={!guestName.trim()}
                      className="flex-1 py-2 rounded-[10px] text-white text-[13px] font-semibold disabled:opacity-40"
                      style={{ backgroundColor: '#1f8a5b' }}
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(3)}
                className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                Siguiente → Modos
              </button>
            </>
          )}

          {/* STEP 3: Modes */}
          {step === 3 && (
            <>
              <div className="bg-white rounded-[22px] p-4 border border-[#e5e0d4]">
                <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-1">Modos de juego</p>
                <p className="text-[#6b7a72] text-[12px] mb-3">Stroke Play siempre activo. Elige hasta 2 adicionales.</p>

                {/* Stroke play fixed */}
                <div className="flex items-center gap-3 px-3 py-3 rounded-[12px] border mb-2" style={{ backgroundColor: '#d9eedd', borderColor: '#1f8a5b' }}>
                  <div className="flex-1">
                    <p className="text-[#0e1a16] text-[14px] font-semibold">Stroke Play</p>
                    <p className="text-[#6b7a72] text-[12px]">Conteo de golpes total</p>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
                    <Check size={12} color="#fff" />
                  </div>
                </div>

                <div className="space-y-2">
                  {MODES.map((mode) => {
                    const sel = selectedModes.includes(mode.id)
                    const disabled = !sel && (selectedModes.length >= 2 || totalPlayers < mode.minPlayers)
                    return (
                      <button
                        key={mode.id}
                        onClick={() => toggleMode(mode.id)}
                        disabled={disabled}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-[12px] border transition-all text-left disabled:opacity-40"
                        style={{
                          backgroundColor: sel ? '#d9eedd' : '#f9f7f3',
                          borderColor: sel ? '#1f8a5b' : '#e5e0d4',
                        }}
                      >
                        <div className="flex-1">
                          <p className="text-[#0e1a16] text-[14px] font-semibold">{mode.label}</p>
                          <p className="text-[#6b7a72] text-[12px]">{mode.desc}</p>
                          {totalPlayers < mode.minPlayers && !sel && (
                            <p className="text-[#a83a25] text-[11px] mt-0.5">Requiere {mode.minPlayers} jugadores</p>
                          )}
                        </div>
                        {sel && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
                            <Check size={12} color="#fff" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="bg-[#fadcd6] rounded-[12px] p-3 text-[#a83a25] text-[13px] font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white disabled:opacity-40"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                {loading ? 'Creando ronda...' : '⛳ Empezar ronda'}
              </button>
            </>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
