'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Minus, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/ui/tab-bar'

const MODES = [
  { id: 'stableford', label: 'Stableford', desc: 'Puntos con hándicap' },
  { id: 'stroke', label: 'Stroke Play', desc: 'Conteo de golpes' },
  { id: 'matchplay_hcp', label: 'Match Play HCP', desc: 'Hoyo a hoyo con hándicap' },
]

export default function NuevaLigaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [totalRounds, setTotalRounds] = useState(10)
  const [mode, setMode] = useState('stableford')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: league, error: leagueErr } = await supabase
        .from('leagues')
        .insert({
          name: name.trim(),
          created_by: user.id,
          total_rounds: totalRounds,
          mode,
          active: true,
        })
        .select()
        .single()

      if (leagueErr || !league) throw leagueErr ?? new Error('No se pudo crear la liga')

      // Add creator as admin player
      await supabase.from('league_players').insert({
        league_id: league.id,
        profile_id: user.id,
        is_admin: true,
      })

      // Create standings entry for creator
      await supabase.from('league_standings').insert({
        league_id: league.id,
        profile_id: user.id,
        total_points: 0,
        rounds_played: 0,
        wins: 0,
      })

      router.push('/liga')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-6">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center"
          >
            <ChevronLeft size={18} color="#0e1a16" />
          </button>
          <h1 className="text-[#0e1a16] text-[18px] font-bold">Nueva liga</h1>
        </div>

        <div className="px-[14px] space-y-4">
          {/* League name */}
          <div className="bg-white rounded-[22px] p-5 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-3">Nombre de la liga</p>
            <input
              type="text"
              placeholder="Ej: Liga Amigos 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#f4f1e9] border border-[#e5e0d4] rounded-[12px] px-4 py-3 text-[14px] text-[#0e1a16] placeholder:text-[#6b7a72] focus:outline-none focus:border-[#1f8a5b]"
            />
          </div>

          {/* Number of rounds */}
          <div className="bg-white rounded-[22px] p-5 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-4">Número de jornadas</p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setTotalRounds(Math.max(2, totalRounds - 1))}
                className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center"
              >
                <Minus size={20} color="#0e1a16" />
              </button>
              <p className="text-[#0e1a16] text-[60px] font-black leading-none w-16 text-center">{totalRounds}</p>
              <button
                onClick={() => setTotalRounds(Math.min(30, totalRounds + 1))}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-[#6b7a72] text-[12px] text-center mt-2">jornadas</p>
          </div>

          {/* Mode */}
          <div className="bg-white rounded-[22px] p-5 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-3">Modo de puntuación</p>
            <div className="space-y-2">
              {MODES.map((m) => {
                const sel = mode === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-all text-left"
                    style={{
                      backgroundColor: sel ? '#d9eedd' : '#f9f7f3',
                      borderColor: sel ? '#1f8a5b' : '#e5e0d4',
                    }}
                  >
                    <div className="flex-1">
                      <p className="text-[#0e1a16] text-[14px] font-semibold">{m.label}</p>
                      <p className="text-[#6b7a72] text-[12px]">{m.desc}</p>
                    </div>
                    {sel && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1f8a5b' }}>
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-[#dde7fb] rounded-[16px] p-4 border border-[#2a6fdb]/20">
            <p className="text-[#2a6fdb] text-[12px] font-semibold mb-1">Puntos estilo F1</p>
            <p className="text-[#2a6fdb]/70 text-[12px]">
              1° 25pts · 2° 18pts · 3° 15pts · 4° 12pts · 5° 10pts...
            </p>
          </div>

          {error && (
            <div className="bg-[#fadcd6] rounded-[12px] p-3 text-[#a83a25] text-[13px] font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white disabled:opacity-40"
            style={{ backgroundColor: '#1f8a5b' }}
          >
            {loading ? 'Creando liga...' : 'Crear liga'}
          </button>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
