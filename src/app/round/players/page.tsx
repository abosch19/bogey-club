import { useState, Suspense, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Avatar } from '@/components/ui/avatar'

type Player = { _id: string; name: string; handicap_index: number; isGuest?: boolean }

type GuestState = { show: boolean; name: string; hcp: string }

type GuestFormProps = {
  guestName: string
  guestHcp: string
  setGuest: Dispatch<SetStateAction<GuestState>>
  onAdd: () => void
}

function GuestForm({ guestName, guestHcp, setGuest, onAdd }: GuestFormProps) {
  return (
    <div className="bg-white rounded-[16px] p-4 border border-[#1f8a5b]">
      <p className="text-[13px] font-bold text-[#0e1a16] mb-3">Datos del invitado</p>
      <input
        value={guestName}
        onChange={e => setGuest(g => ({ ...g, name: e.target.value }))}
        placeholder="Nombre"
        aria-label="Nombre del invitado"
        className="w-full border border-[#e5e0d4] rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f8a5b] mb-2"
      />
      <input
        value={guestHcp}
        onChange={e => setGuest(g => ({ ...g, hcp: e.target.value }))}
        placeholder="Hándicap"
        type="number"
        min="0"
        max="54"
        aria-label="Hándicap del invitado"
        className="w-full border border-[#e5e0d4] rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f8a5b] mb-3"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setGuest(g => ({ ...g, show: false }))}
          className="flex-1 py-2.5 rounded-full border border-[#e5e0d4] text-[13px] font-semibold text-[#6b7a72]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-[#0e1a16]"
          style={{ backgroundColor: '#1f8a5b' }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}

type PlayerRowProps = {
  player: Player
  isSel: boolean
  onToggle: (p: Player) => void
}

function PlayerRow({ player: p, isSel, onToggle }: PlayerRowProps) {
  const isDisabled = false // sin límite
  return (
    <button
      type="button"
      onClick={() => !isDisabled && onToggle(p)}
      className={`w-full flex items-center gap-3 rounded-[16px] p-4 border transition-all ${isDisabled ? 'opacity-40' : 'active:scale-[0.99]'}`}
      style={{ backgroundColor: isSel ? '#0e1a16' : '#ffffff', borderColor: isSel ? '#0e1a16' : '#e5e0d4' }}
    >
      <Avatar name={p.name} size={44} />
      <div className="flex-1 text-left min-w-0">
        <p className="font-bold text-[14px]" style={{ color: isSel ? '#fff' : '#0e1a16' }}>
          {p.name}
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: isSel ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>
          HCP {p.handicap_index?.toFixed(1)}
        </p>
      </div>
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: isSel ? '#1f8a5b' : 'transparent',
          border: isSel ? 'none' : '1.5px solid #e5e0d4',
        }}
      >
        {isSel && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  )
}

type FooterCtaProps = {
  count: number
  onNext: () => void
}

function FooterCta({ count, onNext }: FooterCtaProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
      {/* Torneo info — no toggle, just info */}
      {count >= 5 && (
        <div className="flex items-center gap-2 bg-[#dde7fb] rounded-[10px] px-3 py-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z"
              stroke="#2a6fdb"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="font-mono text-[10px] font-bold text-[#2a6fdb] uppercase tracking-wide">
            Modo torneo — {Math.ceil(count / 4)} grupos automáticos
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={count === 0}
        className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-40"
        style={{
          backgroundColor: count >= 5 ? '#2a6fdb' : '#1f8a5b',
          color: count >= 5 ? '#fff' : '#0e1a16',
        }}
      >
        <span>
          {count} jugador{count !== 1 ? 'es' : ''}
        </span>
        <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
          {count >= 5 ? 'CREAR TORNEO →' : 'SIGUIENTE →'}
        </span>
      </button>
    </div>
  )
}

function SeleccionarJugadoresPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('course') ?? ''
  const leagueId = searchParams.get('league') ?? ''
  const holeMode = searchParams.get('hole_mode') ?? 'all'
  const prefillPlayers = searchParams.get('prefill_players')?.split(',').filter(Boolean) ?? []

  const me = useQuery(api.profiles.me)
  const profiles = useQuery(api.players.all)
  const loading = me === undefined || profiles === undefined

  const allPlayers: Player[] = (profiles ?? []).flatMap(p =>
    p._id === me?._id ? [] : [{ _id: p._id, name: p.name, handicap_index: p.handicap_index }],
  )

  const [selectedOverride, setSelected] = useState<Player[] | null>(null)
  const [search, setSearch] = useState('')

  // Guest form
  const [guest, setGuest] = useState({ show: false, name: '', hcp: '18' })
  const { show: showGuestForm, name: guestName, hcp: guestHcp } = guest

  const meParsed: Player | null = me
    ? { _id: me._id, name: [me.name, me.last_name].filter(Boolean).join(' '), handicap_index: me.handicap_index }
    : null

  // Selection defaults to the URL prefills (falling back to me) until the user
  // touches it — derived, so no init effect is needed while data loads.
  const defaultSelected: Player[] = (() => {
    if (!meParsed || !profiles) return []
    if (prefillPlayers.length > 0) {
      const prefilled = profiles.flatMap(p =>
        prefillPlayers.includes(p._id) ? [{ _id: p._id, name: p.name, handicap_index: p.handicap_index }] : [],
      )
      if (prefilled.length > 0) return prefilled
    }
    return [meParsed]
  })()
  const selected = selectedOverride ?? defaultSelected

  function togglePlayer(p: Player) {
    const totalWithMe = selected.length // me is always included
    if (selected.find(s => s._id === p._id)) {
      setSelected(selected.filter(s => s._id !== p._id))
    } else {
      if (totalWithMe >= 4) return // max 4 players
      setSelected([...selected, p])
    }
  }

  async function addGuest() {
    if (!guestName.trim()) return
    const hcp = parseFloat(guestHcp) || 18
    const guestPlayer: Player = {
      _id: `guest_${Date.now()}`,
      name: guestName.trim(),
      handicap_index: hcp,
      isGuest: true,
    }
    setSelected([...selected, guestPlayer])
    setGuest({ show: false, name: '', hcp: '18' })
  }

  function handleNext() {
    if (selected.length === 0) return
    const playerIds = selected.flatMap(p => (p.isGuest ? [] : [p._id])).join(',')
    const guestData = selected.flatMap(p => (p.isGuest ? [`${p.name}:${p.handicap_index}`] : [])).join('|')

    // 5+ players → torneo automático
    if (selected.length >= 5) {
      const params = new URLSearchParams({
        course: courseId,
        players: playerIds,
        ...(guestData ? { guests: guestData } : {}),
      })
      navigate(`/tournament/new?${params}`)
      return
    }

    // Remove any lingering torneoMode reference

    const params = new URLSearchParams({
      course: courseId,
      players: playerIds,
      hole_mode: holeMode,
      ...(guestData ? { guests: guestData } : {}),
      ...(leagueId ? { league: leagueId } : {}),
    })
    navigate(`/round/format?${params}`)
  }

  const filtered = allPlayers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#0e1a16"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atrás
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">NUEVA RONDA · 2 / 3</span>
        </div>

        <h1 className="text-[28px] font-black tracking-tight text-[#0e1a16] leading-tight mb-1">
          ¿Quién juega
          <br />
          <span className="text-[#1f8a5b]">hoy?</span>
        </h1>
        <p className="text-[13px] text-[#6b7a72] mb-4">Selecciona hasta 4 jugadores en total.</p>

        {/* Selected players strip */}
        {selected.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {selected.map(p => (
              <div
                key={p._id}
                className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-[#e5e0d4]"
              >
                <Avatar name={p.name} size={20} />
                <span className="text-[12px] font-semibold text-[#0e1a16]">{p.name.split(' ')[0]}</span>
                {p._id !== meParsed?._id && (
                  <button
                    type="button"
                    onClick={() => togglePlayer(p)}
                    aria-label={`Quitar a ${p.name}`}
                    className="text-[#6b7a72] hover:text-[#c6432d] ml-0.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#e5e0d4]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8" />
            <path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar amigos…"
            aria-label="Buscar amigos"
            className="flex-1 bg-transparent text-[14px] text-[#0e1a16] placeholder-[#a09a90] outline-none"
          />
        </div>
      </div>

      <div className="flex-1 px-[14px] pb-32 space-y-2 overflow-y-auto">
        {/* Guest button */}
        {!showGuestForm && selected.length < 4 && (
          <button
            type="button"
            onClick={() => setGuest(g => ({ ...g, show: true }))}
            className="w-full flex items-center gap-3 bg-white rounded-[16px] p-4 border border-dashed border-[#c4bfb5] text-[#6b7a72] text-[14px] font-semibold transition hover:border-[#1f8a5b] hover:text-[#1f8a5b]"
          >
            <div className="w-11 h-11 rounded-full border-2 border-dashed border-current flex items-center justify-center text-[20px] font-light">
              +
            </div>
            Añadir invitado
          </button>
        )}

        {/* Guest form */}
        {showGuestForm && <GuestForm guestName={guestName} guestHcp={guestHcp} setGuest={setGuest} onAdd={addGuest} />}

        {/* Players list */}
        {loading ? (
          <div className="flex justify-center pt-6">
            <div className="w-6 h-6 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
          </div>
        ) : (
          filtered.map(p => (
            <PlayerRow key={p._id} player={p} isSel={!!selected.find(s => s._id === p._id)} onToggle={togglePlayer} />
          ))
        )}
      </div>

      {/* CTA */}
      <FooterCta count={selected.length} onNext={handleNext} />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
        </div>
      }
    >
      <SeleccionarJugadoresPage />
    </Suspense>
  )
}
