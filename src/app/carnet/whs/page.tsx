import Link from 'next/link'
import { ChevronLeft, TrendingDown } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { WHS_ROUNDS } from '@/lib/mock-data'

const TEES = [
  { name: 'Amarillo', cr: 73.1, slope: 138, courseHcp: 21 },
  { name: 'Blanco',   cr: 70.2, slope: 132, courseHcp: 19 },
  { name: 'Rojo',     cr: 68.0, slope: 124, courseHcp: 17 },
]

export default function WHSPage() {
  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <Link href="/carnet" className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center">
            <ChevronLeft size={18} color="#0e1a16" />
          </Link>
          <h1 className="text-[#0e1a16] text-[16px] font-bold">Índice WHS</h1>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Big handicap number */}
          <div className="bg-white rounded-[22px] p-5 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[12px] font-medium uppercase tracking-wider mb-1">Índice de Handicap</p>
            <div className="flex items-end gap-3">
              <p className="text-[#0e1a16] text-[84px] font-black leading-none">18.2</p>
              <div className="mb-3 flex items-center gap-1 bg-[#d9eedd] text-[#1f8a5b] rounded-full px-2.5 py-1 text-[12px] font-bold">
                <TrendingDown size={13} />
                -1.1 vs hace 3m
              </div>
            </div>
            <p className="text-[#6b7a72] text-[12px]">
              Calculado sobre las 8 mejores diferenciales de las últimas 20 rondas
            </p>
          </div>

          {/* Course handicap by tee */}
          <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f4f1e9] border-b border-[#e5e0d4]">
              <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Handicap de campo</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f4f1e9]">
                  <th className="text-left pl-4 pr-2 py-2 text-[11px] font-semibold text-[#6b7a72]">Tee</th>
                  <th className="text-center px-2 py-2 text-[11px] font-semibold text-[#6b7a72]">CR</th>
                  <th className="text-center px-2 py-2 text-[11px] font-semibold text-[#6b7a72]">Slope</th>
                  <th className="text-center px-4 py-2 text-[11px] font-semibold text-[#6b7a72]">Hcp Campo</th>
                </tr>
              </thead>
              <tbody>
                {TEES.map((tee) => (
                  <tr key={tee.name} className="border-b border-[#f4f1e9] last:border-0">
                    <td className="pl-4 pr-2 py-3 text-[13px] font-semibold text-[#0e1a16]">{tee.name}</td>
                    <td className="text-center px-2 py-3 text-[13px] text-[#6b7a72]">{tee.cr}</td>
                    <td className="text-center px-2 py-3 text-[13px] text-[#6b7a72]">{tee.slope}</td>
                    <td className="text-center px-4 py-3">
                      <span
                        className="inline-flex items-center justify-center w-9 h-7 rounded-full text-[13px] font-bold text-white"
                        style={{ backgroundColor: '#1f8a5b' }}
                      >
                        {tee.courseHcp}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How it's calculated */}
          <div className="bg-[#dde7fb] rounded-[16px] p-4 border border-[#b8d0f8]">
            <p className="text-[#2a6fdb] text-[12px] font-bold mb-1">¿Cómo se calcula?</p>
            <p className="text-[#4a6fa5] text-[12px] leading-relaxed">
              El índice WHS se calcula como la media de las 8 mejores diferenciales de tus últimas 20 rondas.
              La diferencial de cada ronda = (113 ÷ Slope) × (Score − Course Rating).
            </p>
          </div>

          {/* Rounds list */}
          <div>
            <h2 className="text-[#0e1a16] text-[14px] font-bold px-1 mb-2">
              Últimas rondas <span className="text-[#6b7a72] font-normal">(8 mejores resaltadas)</span>
            </h2>
            <div className="space-y-1.5">
              {WHS_ROUNDS.map((round, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[12px] p-3 border flex items-center gap-3"
                  style={{
                    borderColor: round.counting ? '#1f8a5b' : '#e5e0d4',
                    backgroundColor: round.counting ? '#f0faf4' : '#ffffff',
                  }}
                >
                  {round.counting && (
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: '#1f8a5b' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[#0e1a16] text-[13px] font-semibold truncate">{round.course}</p>
                      <span
                        className="text-[13px] font-bold flex-shrink-0 ml-2"
                        style={{ color: round.counting ? '#1f8a5b' : '#0e1a16' }}
                      >
                        {round.diff.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[#6b7a72] text-[11px]">{round.date}</span>
                      <span className="text-[#c5bfb0] text-[11px]">·</span>
                      <span className="text-[#6b7a72] text-[11px]">Golpes: {round.score}</span>
                      <span className="text-[#c5bfb0] text-[11px]">·</span>
                      <span className="text-[#6b7a72] text-[11px]">CR {round.cr} / {round.slope}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
