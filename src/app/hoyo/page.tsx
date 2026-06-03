'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Minus, Plus, ArrowRight } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { Pill } from '@/components/ui/pill'
import { HOLE_PARS, HOLE_SI, HOLE_DIST, ROUND } from '@/lib/mock-data'
import { scoreLabel, scoreChipColors } from '@/lib/golf'

export default function HoyoPage() {
  const holeIndex = ROUND.currentHole - 1
  const par = HOLE_PARS[holeIndex]
  const si = HOLE_SI[holeIndex]
  const dist = HOLE_DIST[holeIndex]
  const holeNum = ROUND.currentHole

  const [strokes, setStrokes] = useState(par + 1)
  const [putts, setPutts] = useState(2)
  const [calle, setCalle] = useState(false)
  const [green, setGreen] = useState(false)
  const [bunker, setBunker] = useState(false)
  const [penalty, setPenalty] = useState(false)

  const delta = strokes - par
  const { bg, text } = scoreChipColors(delta)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <Link href="/tarjeta" className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center">
            <ChevronLeft size={18} color="#0e1a16" />
          </Link>
          <h1 className="text-[#0e1a16] text-[16px] font-bold">Anotar hoyo</h1>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Hole hero card */}
          <div className="rounded-[22px] p-5 text-white" style={{ backgroundColor: '#0e1a16' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[#6b7a72] text-[12px] font-medium uppercase tracking-wider mb-1">Hoyo</p>
                <p className="text-white text-[72px] font-black leading-none">{holeNum}</p>
              </div>
              <div className="text-right">
                <div className="flex flex-col gap-2 items-end">
                  <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                    <p className="text-[#6b7a72] text-[10px] font-medium uppercase">Par</p>
                    <p className="text-white text-[24px] font-bold leading-none">{par}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
                    <p className="text-[#6b7a72] text-[10px] font-medium uppercase">SI</p>
                    <p className="text-white text-[18px] font-bold leading-none">{si}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Distance + mini map placeholder */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[#6b7a72] text-[13px]">{dist}m</span>
                <span className="text-[#6b7a72] text-[12px]">· Tee Amarillo</span>
              </div>
              {/* Mini map placeholder */}
              <div className="w-16 h-16 rounded-full bg-[#1f8a5b]/30 flex items-center justify-center relative">
                <div className="w-8 h-12 rounded-full bg-[#1f8a5b]/50 flex items-end justify-center pb-1">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Stroke counter */}
          <div className="bg-white rounded-[22px] p-5 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[12px] font-semibold uppercase tracking-wider mb-4 text-center">Golpes</p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setStrokes(Math.max(1, strokes - 1))}
                className="w-12 h-12 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center active:bg-[#f4f1e9] transition-colors"
              >
                <Minus size={20} color="#0e1a16" />
              </button>

              <div className="text-center">
                <p
                  className="text-[80px] font-black leading-none"
                  style={{ color: bg }}
                >
                  {strokes}
                </p>
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold mt-1"
                  style={{ backgroundColor: bg, color: text }}
                >
                  {scoreLabel(strokes, par)}
                </span>
              </div>

              <button
                onClick={() => setStrokes(strokes + 1)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors"
                style={{ backgroundColor: '#1f8a5b' }}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Putts counter */}
          <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
            <div className="flex items-center justify-between">
              <p className="text-[#0e1a16] text-[14px] font-semibold">Putts</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPutts(Math.max(0, putts - 1))}
                  className="w-9 h-9 rounded-full border border-[#e5e0d4] flex items-center justify-center"
                >
                  <Minus size={16} color="#0e1a16" />
                </button>
                <span className="text-[#0e1a16] text-[22px] font-bold w-6 text-center">{putts}</span>
                <button
                  onClick={() => setPutts(putts + 1)}
                  className="w-9 h-9 rounded-full border border-[#e5e0d4] flex items-center justify-center"
                >
                  <Plus size={16} color="#0e1a16" />
                </button>
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[11px] font-semibold uppercase tracking-wider mb-3">Situaciones</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Calle', value: calle, set: setCalle },
                { label: 'Green en regulación', value: green, set: setGreen },
                { label: 'Búnker', value: bunker, set: setBunker },
                { label: 'Penalti', value: penalty, set: setPenalty },
              ].map(({ label, value, set }) => (
                <button
                  key={label}
                  onClick={() => set(!value)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-[10px] border transition-all text-[13px] font-medium"
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

          {/* Navigation between holes */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] bg-white border border-[#e5e0d4] font-semibold text-[14px] text-[#0e1a16]">
              <ChevronLeft size={16} />
              Anterior
            </button>
            <Link
              href="/tarjeta"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] font-bold text-[15px] text-white"
              style={{ backgroundColor: '#1f8a5b' }}
            >
              Guardar
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
