'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getHandicapLabel(value: number): { label: string; sub: string } {
  if (value <= 5) return { label: 'Índice WHS oficial', sub: 'Jugador avanzado' }
  if (value <= 18) return { label: 'Índice WHS oficial', sub: 'Amateur' }
  if (value <= 36) return { label: 'Índice WHS oficial', sub: 'Principiante' }
  return { label: 'Índice WHS oficial', sub: 'Iniciación' }
}

export default function OnboardingPage() {
  const router = useRouter()
  const [handicap, setHandicap] = useState(18)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function increment() {
    setHandicap(v => Math.min(54, v + 1))
  }
  function decrement() {
    setHandicap(v => Math.max(0, v - 1))
  }

  async function handleStart() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ handicap_index: handicap })
      .eq('id', user.id)

    if (error) {
      setError('Error al guardar el hándicap. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const { label, sub } = getHandicapLabel(handicap)

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-4">
      <div className="w-full max-w-[430px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-[#1f8a5b] flex items-center justify-center mb-4 shadow-md">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="13" r="5" fill="white" />
              <path d="M16 18 L16 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-2xl font-black tracking-tight text-[#0e1a16]">
            bogey<span className="text-[#1f8a5b]">club</span>
          </div>
        </div>

        <div className="bg-white rounded-[20px] shadow-sm border border-[#e5e0d4] px-8 py-10 text-center">
          <h1 className="text-2xl font-bold text-[#0e1a16] mb-3">
            ¿Cuál es tu hándicap?
          </h1>
          <p className="text-sm text-[#6b7280] leading-relaxed mb-10 px-2">
            Si no sabes tu índice exacto, pon tu mejor estimación.
            Lo iremos ajustando con cada ronda.
          </p>

          {/* Handicap stepper */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <button
              onClick={decrement}
              className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-2xl font-light text-[#4a5568] hover:border-[#1f8a5b] hover:text-[#1f8a5b] active:scale-95 transition"
            >
              −
            </button>

            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-6xl font-black text-[#0e1a16] leading-none tabular-nums">
                {handicap}
              </span>
            </div>

            <button
              onClick={increment}
              className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-2xl font-light text-[#4a5568] hover:border-[#1f8a5b] hover:text-[#1f8a5b] active:scale-95 transition"
            >
              +
            </button>
          </div>

          {/* Slider */}
          <div className="px-4 mb-6">
            <input
              type="range"
              min={0}
              max={54}
              value={handicap}
              onChange={e => setHandicap(Number(e.target.value))}
              className="w-full accent-[#1f8a5b]"
            />
            <div className="flex justify-between text-xs text-[#a0aec0] mt-1">
              <span>0</span>
              <span>27</span>
              <span>54</span>
            </div>
          </div>

          {/* Helper text */}
          <div className="bg-[#f4f1e9] rounded-[12px] px-4 py-3 mb-8 inline-block w-full">
            <p className="text-xs font-semibold text-[#1f8a5b] uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-[#0e1a16] mt-0.5">{sub}</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-2.5 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-[#1f8a5b] text-white font-semibold py-3.5 rounded-[14px] hover:bg-[#186f4a] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Guardando...' : 'Empezar a jugar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
