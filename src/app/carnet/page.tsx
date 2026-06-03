import Link from 'next/link'
import { ChevronRight, Flag, Award, Star, Target } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { Avatar } from '@/components/ui/avatar'
import { PLAYERS } from '@/lib/mock-data'

const BADGES = [
  { id: 'b1', icon: Star, label: 'Primera birdie', desc: 'Real Sotogrande · Hoyo 3', color: '#e8b75a', bg: '#fdf0d5' },
  { id: 'b2', icon: Target, label: '10 rondas', desc: 'Completaste 10 rondas', color: '#1f8a5b', bg: '#d9eedd' },
  { id: 'b3', icon: Award, label: 'Mejora de 2 pts', desc: 'Índice bajó más de 2', color: '#2a6fdb', bg: '#dde7fb' },
]

export default function CarnetPage() {
  const player = PLAYERS[0]

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        <div className="px-[14px] mb-4">
          <h1 className="text-[#0e1a16] text-[22px] font-bold">Carnet</h1>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Member card */}
          <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
            {/* Decorative circle */}
            <div
              className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full opacity-10"
              style={{ backgroundColor: '#1f8a5b' }}
            />
            <div
              className="absolute bottom-[-30px] left-[-20px] w-[100px] h-[100px] rounded-full opacity-5"
              style={{ backgroundColor: '#1f8a5b' }}
            />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#1f8a5b' }}
                  >
                    <Flag size={14} color="#fff" />
                  </div>
                  <span className="text-white text-[14px] font-bold">bogeyclub</span>
                </div>
                <span className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wider">Socio</span>
              </div>

              {/* Player info */}
              <div className="flex items-center gap-4 mb-5">
                <Avatar name={player.name} color={player.color} size="lg" you />
                <div>
                  <p className="text-white text-[20px] font-bold leading-tight">{player.name}</p>
                  <p className="text-[#6b7a72] text-[13px]">Vallvé</p>
                  <p className="text-[#6b7a72] text-[12px] mt-0.5">Desde 2022 · Nº 0042</p>
                </div>
              </div>

              {/* Handicap */}
              <div className="flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wider">Índice WHS</p>
                  <p className="text-white text-[40px] font-black leading-none">18.2</p>
                </div>
                <div className="text-right">
                  <p className="text-[#6b7a72] text-[11px]">Actualizado</p>
                  <p className="text-[#6b7a72] text-[12px]">1 jun 2024</p>
                </div>
              </div>
            </div>
          </div>

          {/* WHS detail link */}
          <Link href="/carnet/whs">
            <div className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#d9eedd' }}
              >
                <Target size={20} color="#1f8a5b" />
              </div>
              <div className="flex-1">
                <p className="text-[#0e1a16] text-[14px] font-bold">Índice WHS</p>
                <p className="text-[#6b7a72] text-[12px]">Ver historial de rondas y cálculo</p>
              </div>
              <ChevronRight size={16} color="#6b7a72" />
            </div>
          </Link>

          {/* Distinctions */}
          <div>
            <h2 className="text-[#0e1a16] text-[15px] font-bold px-1 mb-2">Distinciones</h2>
            <div className="space-y-2">
              {BADGES.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4] flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: badge.bg }}
                  >
                    <badge.icon size={20} color={badge.color} />
                  </div>
                  <div>
                    <p className="text-[#0e1a16] text-[13px] font-bold">{badge.label}</p>
                    <p className="text-[#6b7a72] text-[12px]">{badge.desc}</p>
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
