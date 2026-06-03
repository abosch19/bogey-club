import Link from 'next/link'
import { Bell, MapPin, Cloud, ChevronRight, Trophy, Flag } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { PLAYERS, ROUND, LIGA, FEED } from '@/lib/mock-data'

export default function HomePage() {
  const currentPlayer = PLAYERS[0] // Marcos
  const filledHoles = ROUND.currentHole - 1
  const totalHoles = 18

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Safe area + header */}
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] mb-4">
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#1f8a5b' }}
            >
              <Flag size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-[#0e1a16]">bogeyclub</span>
          </div>
          <button className="w-9 h-9 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center shadow-sm">
            <Bell size={18} strokeWidth={1.8} color="#0e1a16" />
          </button>
        </div>

        <div className="px-[14px] space-y-3">

          {/* Hero dark card */}
          <div className="rounded-[22px] p-5" style={{ backgroundColor: '#0e1a16' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[#6b7a72] text-[13px] font-medium mb-0.5">Martes, 3 junio</p>
                <h1 className="text-white text-[24px] font-bold leading-tight">
                  Buenas, Marcos
                </h1>
                <p className="text-[#6b7a72] text-[13px] mt-1">Tienes una ronda activa</p>
              </div>
              {/* Weather chip */}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <Cloud size={14} color="#d9eedd" />
                <span className="text-white text-[13px] font-medium">24°</span>
              </div>
            </div>

            {/* Handicap strip */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <div>
                <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide">Índice</p>
                <p className="text-white text-[22px] font-bold leading-none">18.2</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide">Rondas</p>
                <p className="text-white text-[22px] font-bold leading-none">24</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[#6b7a72] text-[11px] font-medium uppercase tracking-wide">Mejor</p>
                <p className="text-white text-[22px] font-bold leading-none">82</p>
              </div>
            </div>
          </div>

          {/* Active round card */}
          <div className="bg-white rounded-[22px] p-4 border border-[#e5e0d4] shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Pill variant="accent" size="sm">EN CURSO</Pill>
                </div>
                <h2 className="text-[#0e1a16] text-[15px] font-bold leading-tight">
                  {ROUND.course.shortName}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={12} color="#6b7a72" />
                  <span className="text-[#6b7a72] text-[12px]">{ROUND.date} · {ROUND.mode}</span>
                </div>
              </div>
              <Pill variant="default" size="sm">Hoyo {ROUND.currentHole}/18</Pill>
            </div>

            {/* Players strip */}
            <div className="flex items-center gap-2 mb-3">
              {PLAYERS.map((p, i) => (
                <Avatar key={p.id} name={p.name} color={p.color} size="sm" you={i === 0} />
              ))}
              <span className="text-[#6b7a72] text-[12px] ml-1">
                {PLAYERS.map(p => p.name).join(', ')}
              </span>
            </div>

            {/* Hole progress bar */}
            <div className="mb-3">
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                {Array.from({ length: totalHoles }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      backgroundColor: i < filledHoles ? '#1f8a5b' : '#e5e0d4',
                    }}
                  />
                ))}
              </div>
              <p className="text-[#6b7a72] text-[11px] mt-1">{filledHoles} de {totalHoles} hoyos completados</p>
            </div>

            {/* CTA */}
            <Link
              href="/tarjeta"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[12px] font-semibold text-[14px] text-white transition-opacity active:opacity-80"
              style={{ backgroundColor: '#1f8a5b' }}
            >
              Continuar ronda
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Liga card */}
          <Link href="/liga" className="block">
            <div className="bg-white rounded-[22px] p-4 border border-[#e5e0d4] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#fdf0d5' }}
                  >
                    <Trophy size={16} color="#e8b75a" />
                  </div>
                  <div>
                    <h2 className="text-[#0e1a16] text-[14px] font-bold leading-tight">{LIGA.name}</h2>
                    <p className="text-[#6b7a72] text-[12px]">Jornada {LIGA.roundsPlayed}/{LIGA.rounds}</p>
                  </div>
                </div>
                <ChevronRight size={16} color="#6b7a72" />
              </div>

              {/* Standings preview */}
              <div className="space-y-2">
                {LIGA.standings.slice(0, 3).map((entry) => (
                  <div key={entry.player.id} className="flex items-center gap-3">
                    <span className="text-[12px] font-bold text-[#6b7a72] w-4">{entry.pos}</span>
                    <Avatar name={entry.player.name} color={entry.player.color} size="sm" />
                    <span className="flex-1 text-[13px] font-medium text-[#0e1a16]">{entry.player.name}</span>
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: entry.pos === 1 ? '#e8b75a' : '#0e1a16' }}
                    >
                      {entry.pts} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Social feed */}
          <div>
            <h3 className="text-[#0e1a16] text-[14px] font-bold px-1 mb-2">Actividad reciente</h3>
            <div className="space-y-2">
              {FEED.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[16px] p-3.5 border border-[#e5e0d4] flex items-center gap-3"
                >
                  <Avatar name={item.player.name} color={item.player.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0e1a16] text-[13px] font-semibold leading-tight">
                      {item.player.name}
                    </p>
                    <p className="text-[#6b7a72] text-[12px] truncate">{item.action}</p>
                    <p className="text-[#6b7a72] text-[11px]">{item.detail}</p>
                  </div>
                  <span className="text-[#6b7a72] text-[11px] flex-shrink-0">{item.time}</span>
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
