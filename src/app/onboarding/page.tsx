'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'

function hcpLabel(v: number) {
  if (v <= 5)  return { level: 'Jugador avanzado', sub: 'Índice WHS bajo' }
  if (v <= 18) return { level: 'Amateur',          sub: 'Índice WHS estándar' }
  if (v <= 36) return { level: 'Principiante',     sub: 'Índice WHS alto' }
  return { level: 'Iniciación', sub: 'Sin índice oficial aún' }
}

export default function OnboardingPage() {
  const [hcp, setHcp]       = useState('18.0')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const num = parseFloat(hcp) || 0
  const setHandicap = useMutation(api.profiles.setHandicap)

  function adjust(delta: number) {
    const next = Math.min(54, Math.max(0, Math.round((num + delta) * 10) / 10))
    setHcp(next.toFixed(1))
  }

  async function handleStart() {
    const value = parseFloat(hcp)
    if (isNaN(value) || value < 0 || value > 54) {
      setError('Introduce un hándicap válido entre 0 y 54.')
      return
    }
    setLoading(true)
    setError('')

    try {
      await setHandicap({ handicap_index: value })
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.')
      setLoading(false)
    }
  }

  const { level, sub } = hcpLabel(num)

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center px-[14px]">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="mb-3">
            <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
            <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
            <circle cx="24" cy="50" r="2.6" fill="#0e1a16"/>
          </svg>
          <div className="text-[22px] font-black tracking-tight text-[#0e1a16]">
            Bogey<span className="text-[#1f8a5b]">-Club</span>
          </div>
        </div>

        <div className="bg-white rounded-[22px] border border-[#e5e0d4] px-6 py-8 text-center">
          <h1 className="text-[24px] font-black text-[#0e1a16] tracking-tight mb-2">
            ¿Cuál es tu hándicap?
          </h1>
          <p className="text-[13px] text-[#6b7a72] mb-8 leading-relaxed">
            Si no sabes tu índice exacto, pon tu estimación.
            Lo iremos ajustando con cada ronda.
          </p>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-5 mb-5">
            <button
              onClick={() => adjust(-0.1)}
              className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-[22px] text-[#6b7a72] font-light hover:border-[#1f8a5b] hover:text-[#1f8a5b] transition active:scale-95"
            >−</button>

            <input
              type="number" min={0} max={54} step={0.1}
              value={hcp}
              onChange={e => setHcp(e.target.value)}
              className="w-28 text-center text-[52px] font-black text-[#0e1a16] bg-transparent border-b-2 border-[#1f8a5b] focus:outline-none tabular-nums py-1"
            />

            <button
              onClick={() => adjust(0.1)}
              className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-[22px] text-[#6b7a72] font-light hover:border-[#1f8a5b] hover:text-[#1f8a5b] transition active:scale-95"
            >+</button>
          </div>

          {/* Slider */}
          <div className="px-2 mb-6">
            <input
              type="range" min={0} max={54} step={0.1} value={num}
              onChange={e => setHcp(parseFloat(e.target.value).toFixed(1))}
              className="w-full accent-[#1f8a5b]"
            />
            <div className="flex justify-between text-[11px] text-[#a09a90] mt-1 font-mono">
              <span>0</span><span>27</span><span>54</span>
            </div>
          </div>

          {/* Label */}
          <div className="bg-[#f4f1e9] rounded-[14px] px-4 py-3 mb-7">
            <p className="text-[13px] font-bold text-[#0e1a16]">{level}</p>
            <p className="text-[12px] text-[#6b7a72] mt-0.5">{sub}</p>
          </div>

          {error && (
            <p className="text-[13px] text-[#c6432d] bg-[#fadcd6] rounded-[10px] px-4 py-2.5 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleStart} disabled={loading}
            className="w-full py-3.5 rounded-[14px] font-semibold text-[15px] text-white transition active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: '#1f8a5b' }}
          >
            {loading ? 'Guardando…' : 'Empezar a jugar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
