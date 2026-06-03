'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingDown, TrendingUp, Trophy, ChevronRight } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { cn } from '@/lib/utils'

const PERIODS = ['7d', '30d', '90d', 'Año'] as const
type Period = (typeof PERIODS)[number]

// Fake sparkline data points (normalized 0-40 for SVG)
const SPARKLINE: Record<Period, number[]> = {
  '7d':  [28, 26, 24, 25, 22, 20, 18],
  '30d': [32, 30, 28, 29, 26, 24, 23, 22, 21, 20, 19, 18],
  '90d': [38, 35, 33, 30, 28, 26, 25, 24, 22, 20, 19, 18],
  'Año': [40, 38, 35, 33, 30, 28, 27, 25, 23, 21, 19, 18],
}

const STATS: Record<Period, { handicap: number; promedio: number; gir: number; fairways: number; putts: number }> = {
  '7d':  { handicap: 18.2, promedio: 91.4, gir: 28, fairways: 52, putts: 33.2 },
  '30d': { handicap: 18.2, promedio: 92.1, gir: 26, fairways: 50, putts: 33.8 },
  '90d': { handicap: 18.5, promedio: 93.6, gir: 24, fairways: 48, putts: 34.1 },
  'Año': { handicap: 19.3, promedio: 95.2, gir: 21, fairways: 45, putts: 34.9 },
}

function Sparkline({ data }: { data: number[] }) {
  const n = data.length
  const w = 200
  const h = 48
  const maxVal = Math.max(...data)
  const minVal = Math.min(...data)
  const range = maxVal - minVal || 1

  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * w
    const y = h - ((v - minVal) / range) * (h - 8) - 4
    return `${x},${y}`
  })

  const pathD = `M ${pts.join(' L ')}`
  const areaD = `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f8a5b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1f8a5b" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="#1f8a5b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const stats = STATS[period]
  const prevStats = STATS['Año']

  const hcpTrend = stats.handicap < prevStats.handicap

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        <div className="px-[14px] mb-4">
          <h1 className="text-[#0e1a16] text-[22px] font-bold">Estadísticas</h1>
          <p className="text-[#6b7a72] text-[13px]">Marcos Vallvé · HCP 18.2</p>
        </div>

        {/* Segmented control */}
        <div className="px-[14px] mb-4">
          <div className="flex bg-white rounded-[12px] p-1 border border-[#e5e0d4]">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'flex-1 py-1.5 rounded-[9px] text-[13px] font-semibold transition-all',
                  period === p
                    ? 'bg-[#0e1a16] text-white shadow-sm'
                    : 'text-[#6b7a72]'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Handicap index card */}
          <div className="bg-white rounded-[22px] p-5 border border-[#e5e0d4]">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[#6b7a72] text-[12px] font-medium uppercase tracking-wider">Índice de Handicap</p>
                <div className="flex items-end gap-2 mt-1">
                  <p className="text-[#0e1a16] text-[48px] font-black leading-none">{stats.handicap}</p>
                  <div className={cn(
                    'flex items-center gap-0.5 mb-2 px-2 py-0.5 rounded-full text-[12px] font-bold',
                    hcpTrend ? 'bg-[#d9eedd] text-[#1f8a5b]' : 'bg-[#fee2e2] text-[#dc2626]'
                  )}>
                    {hcpTrend
                      ? <TrendingDown size={12} />
                      : <TrendingUp size={12} />
                    }
                    {hcpTrend ? '-1.1' : '+0.5'}
                  </div>
                </div>
              </div>
            </div>
            <Sparkline data={SPARKLINE[period]} />
            <p className="text-[#6b7a72] text-[11px] mt-1">Evolución del índice en {period}</p>
          </div>

          {/* Stats tiles */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
              <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide mb-1">Promedio golpes</p>
              <p className="text-[#0e1a16] text-[28px] font-bold leading-none">{stats.promedio}</p>
              <p className="text-[#6b7a72] text-[11px] mt-1">por ronda</p>
            </div>
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
              <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide mb-1">GIR</p>
              <p className="text-[#0e1a16] text-[28px] font-bold leading-none">{stats.gir}%</p>
              <p className="text-[#6b7a72] text-[11px] mt-1">greens en regulación</p>
            </div>
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
              <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide mb-1">Fairways</p>
              <p className="text-[#0e1a16] text-[28px] font-bold leading-none">{stats.fairways}%</p>
              <p className="text-[#6b7a72] text-[11px] mt-1">de calle</p>
            </div>
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
              <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide mb-1">Putts</p>
              <p className="text-[#0e1a16] text-[28px] font-bold leading-none">{stats.putts}</p>
              <p className="text-[#6b7a72] text-[11px] mt-1">por ronda</p>
            </div>
          </div>

          {/* Liga shortcut */}
          <Link href="/liga">
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#fdf0d5' }}
              >
                <Trophy size={20} color="#e8b75a" />
              </div>
              <div className="flex-1">
                <p className="text-[#0e1a16] text-[14px] font-bold">Liga Amigos 2024</p>
                <p className="text-[#6b7a72] text-[12px]">3.° con 58 pts · Ver tabla completa</p>
              </div>
              <ChevronRight size={16} color="#6b7a72" />
            </div>
          </Link>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
