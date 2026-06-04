'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getInitials, avatarColor } from '@/lib/golf'

type Player = { id: string; name: string; handicap_index: number; avatar_color: string; isGuest?: boolean }

function SeleccionarJugadoresPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('course') ?? ''
  const isPractice = searchParams.get('practice') === 'true'
  const leagueId   = searchParams.get('league') ?? ''

  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [selected, setSelected] = useState<Player[]>([])
  const [me, setMe] = useState<Player | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Guest form
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestHcp, setGuestHcp] = useState('18')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profiles } = await supabase.from('profiles').select('*').order('name')
      if (!profiles) return

      const myProfile = profiles.find(p => p.id === user.id)
      if (myProfile) {
        const me: Player = { ...myProfile }
        setMe(me)
        setSelected([me]) // auto-select self
      }

      setAllPlayers(profiles.filter(p => p.id !== user.id))
      setLoading(false)
    }
    load()
  }, [])

  function togglePlayer(p: Player) {
    const totalWithMe = selected.length // me is always included
    if (selected.find(s => s.id === p.id)) {
      setSelected(selected.filter(s => s.id !== p.id))
    } else {
      if (totalWithMe >= 4) return // max 4 players
      setSelected([...selected, p])
    }
  }

  async function addGuest() {
    if (!guestName.trim()) return
    const hcp = parseFloat(guestHcp) || 18
    const guest: Player = {
      id: `guest_${Date.now()}`,
      name: guestName.trim(),
      handicap_index: hcp,
      avatar_color: avatarColor(selected.length),
      isGuest: true,
    }
    setSelected([...selected, guest])
    setGuestName('')
    setGuestHcp('18')
    setShowGuestForm(false)
  }

  function handleNext() {
    if (selected.length === 0) return
    const playerIds = selected.filter(p => !p.isGuest).map(p => p.id).join(',')
    const guestData = selected.filter(p => p.isGuest).map(p => `${p.name}:${p.handicap_index}`).join('|')
    const params = new URLSearchParams({
      course: courseId,
      practice: String(isPractice),
      players: playerIds,
      ...(guestData ? { guests: guestData } : {}),
      ...(leagueId ? { league: leagueId } : {}),
    })
    router.push(`/ronda/modalidad?${params}`)
  }

  const filtered = allPlayers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Atrás
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">NUEVA RONDA · 2 / 3</span>
        </div>

        <h1 className="text-[28px] font-black tracking-tight text-[#0e1a16] leading-tight mb-1">
          ¿Quién juega<br/><span className="text-[#1f8a5b]">hoy?</span>
        </h1>
        <p className="text-[13px] text-[#6b7a72] mb-4">Selecciona hasta 4 jugadores en total.</p>

        {/* Selected players strip */}
        {selected.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {selected.map((p, i) => (
              <div key={p.id} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-[#e5e0d4]">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: p.avatar_color ?? avatarColor(i) }}>
                  {getInitials(p.name)}
                </div>
                <span className="text-[12px] font-semibold text-[#0e1a16]">{p.name.split(' ')[0]}</span>
                {p.id !== me?.id && (
                  <button onClick={() => togglePlayer(p)} className="text-[#6b7a72] hover:text-[#c6432d] ml-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#e5e0d4]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8"/><path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar amigos…"
            className="flex-1 bg-transparent text-[14px] text-[#0e1a16] placeholder-[#a09a90] outline-none"/>
        </div>
      </div>

      <div className="flex-1 px-[14px] pb-32 space-y-2 overflow-y-auto">
        {/* Guest button */}
        {!showGuestForm && selected.length < 4 && (
          <button onClick={() => setShowGuestForm(true)}
            className="w-full flex items-center gap-3 bg-white rounded-[16px] p-4 border border-dashed border-[#c4bfb5] text-[#6b7a72] text-[14px] font-semibold transition hover:border-[#1f8a5b] hover:text-[#1f8a5b]">
            <div className="w-11 h-11 rounded-full border-2 border-dashed border-current flex items-center justify-center text-[20px] font-light">+</div>
            Añadir invitado
          </button>
        )}

        {/* Guest form */}
        {showGuestForm && (
          <div className="bg-white rounded-[16px] p-4 border border-[#1f8a5b]">
            <p className="text-[13px] font-bold text-[#0e1a16] mb-3">Datos del invitado</p>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nombre"
              className="w-full border border-[#e5e0d4] rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f8a5b] mb-2"/>
            <input value={guestHcp} onChange={e => setGuestHcp(e.target.value)} placeholder="Hándicap" type="number" min="0" max="54"
              className="w-full border border-[#e5e0d4] rounded-[12px] px-4 py-2.5 text-[14px] outline-none focus:border-[#1f8a5b] mb-3"/>
            <div className="flex gap-2">
              <button onClick={() => setShowGuestForm(false)} className="flex-1 py-2.5 rounded-full border border-[#e5e0d4] text-[13px] font-semibold text-[#6b7a72]">Cancelar</button>
              <button onClick={addGuest} className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-[#0e1a16]" style={{ backgroundColor: '#1f8a5b' }}>Añadir</button>
            </div>
          </div>
        )}

        {/* Players list */}
        {loading ? (
          <div className="flex justify-center pt-6"><div className="w-6 h-6 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>
        ) : filtered.map((p, i) => {
          const isSel = !!selected.find(s => s.id === p.id)
          const isDisabled = !isSel && selected.length >= 4
          return (
            <button key={p.id} onClick={() => !isDisabled && togglePlayer(p)}
              className={`w-full flex items-center gap-3 rounded-[16px] p-4 border transition-all ${isDisabled ? 'opacity-40' : 'active:scale-[0.99]'}`}
              style={{ backgroundColor: isSel ? '#0e1a16' : '#ffffff', borderColor: isSel ? '#0e1a16' : '#e5e0d4' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0"
                style={{ backgroundColor: p.avatar_color ?? avatarColor(i) }}>
                {getInitials(p.name)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-[14px]" style={{ color: isSel ? '#fff' : '#0e1a16' }}>{p.name}</p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: isSel ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>
                  HCP {p.handicap_index?.toFixed(1)}
                </p>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: isSel ? '#1f8a5b' : 'transparent', border: isSel ? 'none' : '1.5px solid #e5e0d4' }}>
                {isSel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        <button onClick={handleNext} disabled={selected.length === 0}
          className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
          <span>Tú {selected.length > 1 ? `+ ${selected.length - 1} jugador${selected.length > 2 ? 'es' : ''}` : 'solo'}</span>
          <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">SIGUIENTE →</span>
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>}><SeleccionarJugadoresPage /></Suspense>
}
