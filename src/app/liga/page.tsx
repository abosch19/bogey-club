import Link from 'next/link'
import { ChevronLeft, Trophy } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { LIGA } from '@/lib/mock-data'

const POSITION_COLORS = ['#e8b75a', '#9ca3af', '#cd7c2f', '#6b7a72']

export default function LigaPage() {
  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <Link href="/" className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center">
            <ChevronLeft size={18} color="#0e1a16" />
          </Link>
          <div>
            <h1 className="text-[#0e1a16] text-[16px] font-bold">{LIGA.name}</h1>
            <p className="text-[#6b7a72] text-[12px]">Jornada {LIGA.roundsPlayed} de {LIGA.rounds}</p>
          </div>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Leader card */}
          <div className="rounded-[22px] p-5" style={{ backgroundColor: '#0e1a16' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} color="#e8b75a" />
              <span className="text-[#e8b75a] text-[12px] font-bold uppercase tracking-wider">Líder</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar name={LIGA.standings[0].player.name} color={LIGA.standings[0].player.color} size="lg" />
              <div>
                <p className="text-white text-[22px] font-bold leading-tight">{LIGA.standings[0].player.name}</p>
                <p className="text-[#6b7a72] text-[13px]">HCP {LIGA.standings[0].player.hcp}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[#e8b75a] text-[36px] font-black leading-none">{LIGA.standings[0].pts}</p>
                <p className="text-[#6b7a72] text-[12px]">puntos</p>
              </div>
            </div>
          </div>

          {/* Full standings */}
          <div className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e5e0d4]">
              <span className="text-[12px] font-bold text-[#6b7a72] uppercase tracking-wider">Clasificación</span>
            </div>
            {LIGA.standings.map((entry, i) => (
              <div
                key={entry.player.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#f4f1e9] last:border-0"
              >
                <span
                  className="text-[15px] font-black w-5 text-center"
                  style={{ color: POSITION_COLORS[i] || '#6b7a72' }}
                >
                  {entry.pos}
                </span>
                <Avatar name={entry.player.name} color={entry.player.color} size="md" />
                <div className="flex-1">
                  <p className="text-[#0e1a16] text-[14px] font-semibold">{entry.player.name}</p>
                  <p className="text-[#6b7a72] text-[12px]">{entry.rounds} rondas · HCP {entry.player.hcp}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#0e1a16] text-[17px] font-bold">{entry.pts}</p>
                  <p className="text-[#6b7a72] text-[11px]">pts</p>
                </div>
              </div>
            ))}
          </div>

          {/* Next round info */}
          <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
            <p className="text-[#6b7a72] text-[11px] font-bold uppercase tracking-wider mb-2">Próxima jornada</p>
            <p className="text-[#0e1a16] text-[15px] font-bold">Real Club de Golf Valderrama</p>
            <div className="flex items-center gap-2 mt-1">
              <Pill variant="accent" size="sm">Jornada 6</Pill>
              <span className="text-[#6b7a72] text-[12px]">15 jun 2024</span>
            </div>
          </div>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
