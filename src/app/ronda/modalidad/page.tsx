'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GAME_MODES, type GameMode } from '@/lib/types'

function SeleccionarModalidadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId   = searchParams.get('course') ?? ''
  const isPractice = searchParams.get('practice') === 'true'
  const playerIds  = searchParams.get('players')?.split(',').filter(Boolean) ?? []
  const guests     = searchParams.get('guests')?.split('|').filter(Boolean) ?? []
  const leagueId   = searchParams.get('league') ?? ''
  const holeMode   = searchParams.get('hole_mode') ?? 'all'
  const totalPlayers = playerIds.length + guests.length

  // Stroke is always active
  const [extras, setExtras] = useState<GameMode[]>([])
  const [loading, setLoading] = useState(false)

  function isCompatible(mode: GameMode): boolean {
    if (mode === 'matchplay' || mode === 'matchplay_hcp') return totalPlayers === 2
    if (mode === 'wolf') return totalPlayers >= 3  // Wolf: 3+ jugadores
    if (mode === 'bbb') return totalPlayers >= 2   // BBB: 2+ jugadores
    return true
  }

  function toggleExtra(mode: GameMode) {
    if (extras.includes(mode)) {
      setExtras(extras.filter(m => m !== mode))
    } else {
      if (extras.length >= 2) return
      setExtras([...extras, mode])
    }
  }

  async function handleStart() {
    setLoading(true)
    try {
      const res = await fetch('/api/ronda/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseId,
          is_practice: isPractice,
          player_ids: playerIds,
          guests,
          modes: ['stroke', ...extras],
          hole_mode: holeMode,
          ...(leagueId ? { league_id: leagueId } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/tarjeta?round=${data.round_id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la ronda'
      alert(msg)
      setLoading(false)
    }
  }

  const modesByCompat = GAME_MODES.filter(m => m.id !== 'stroke')

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Atrás
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">NUEVA RONDA · 3 / 3</span>
        </div>

        <h1 className="text-[28px] font-black tracking-tight text-[#0e1a16] leading-tight">
          ¿A qué<br/><span className="text-[#1f8a5b]">jugamos?</span>
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[13px] text-[#6b7a72]">Stroke Play siempre activo. Añade hasta 2 más.</p>
          {leagueId && <span className="font-mono text-[9px] bg-[#dde7fb] text-[#2a6fdb] px-2 py-0.5 rounded-full uppercase font-bold">LIGA</span>}
        </div>
      </div>

      <div className="flex-1 px-[14px] pb-32 space-y-2 overflow-y-auto">
        {/* Stroke Play — always active */}
        <div className="rounded-[16px] p-4 border-2" style={{ backgroundColor: '#0e1a16', borderColor: '#0e1a16' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1f8a5b' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18"/><path d="M5 4h11l-2 3 2 3H5"/></svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-[15px]">Stroke Play</span>
                <span className="font-mono text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Siempre activo</span>
              </div>
              <p className="text-white/60 text-[12px] mt-0.5">Suma de golpes. Gana quien menos haga.</p>
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        {/* Other modes */}
        {modesByCompat.map(mode => {
          const compatible = isCompatible(mode.id)
          const isSelected = extras.includes(mode.id)
          const isMaxed = extras.length >= 2 && !isSelected

          return (
            <button
              key={mode.id}
              onClick={() => compatible && !isMaxed && toggleExtra(mode.id)}
              disabled={!compatible || isMaxed}
              className="w-full text-left rounded-[16px] p-4 border transition-all active:scale-[0.99] disabled:opacity-35"
              style={{
                backgroundColor: isSelected ? '#0e1a16' : '#ffffff',
                borderColor: isSelected ? '#0e1a16' : '#e5e0d4',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.12)' : mode.color + '22' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isSelected ? '#fff' : mode.color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {mode.icon === 'swords' && <><path d="M4 4l8 8M3 7l3-3 2 2M20 4l-8 8M21 7l-3-3-2 2M14 14l6 6M10 18l-4 4"/></>}
                    {mode.icon === 'star'   && <path d="M12 3l2.6 5.6L20 9.3l-4 4 1 6-5-2.9L7 19.3l1-6-4-4 5.4-.7z"/>}
                    {mode.icon === 'wolf'   && <><path d="M4 5l3 4M20 5l-3 4M5 8c0 7 3 11 7 11s7-4 7-11"/><path d="M9 11h.01M15 11h.01"/></>}
                    {mode.icon === 'target' && <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></>}
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px]" style={{ color: isSelected ? '#fff' : '#0e1a16' }}>{mode.name}</span>
                    {!compatible && (
                      <span className="font-mono text-[8px] bg-[#f6e6c4] text-[#9b6e1a] px-2 py-0.5 rounded-full uppercase">{mode.players} jug.</span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: isSelected ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>{mode.desc}</p>
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSelected ? '#1f8a5b' : 'transparent', border: isSelected ? 'none' : '1.5px solid #e5e0d4' }}>
                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
        <button onClick={handleStart} disabled={loading}
          className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
          <span>
            Stroke{extras.length > 0 ? ` + ${extras.map(e => GAME_MODES.find(m => m.id === e)?.name.split(' ')[0]).join(' + ')}` : ' Play'}
            {isPractice ? ' · Práctica' : ''}
          </span>
          <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
            {loading ? '…' : 'EMPEZAR →'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>}><SeleccionarModalidadPage /></Suspense>
}
