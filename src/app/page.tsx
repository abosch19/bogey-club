'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInitials, formatHandicap } from '@/lib/golf'

type Profile = { id: string; name: string; handicap_index: number; avatar_color: string }
type ActiveRound = { id: string; course_name: string; current_hole: number; total_holes: number; score_delta: number; holes_done: number[] }

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { window.location.href = '/onboarding'; return }
      setProfile(prof)

      // Fetch active round
      const { data: rp } = await supabase
        .from('round_players')
        .select('round_id')
        .eq('profile_id', user.id)
        .limit(10)

      if (rp && rp.length > 0) {
        const roundIds = rp.map(r => r.round_id)
        const { data: rounds } = await supabase
          .from('rounds')
          .select('id, status, courses(name, holes_count)')
          .in('id', roundIds)
          .eq('status', 'active')
          .limit(1)

        if (rounds && rounds.length > 0) {
          const r = rounds[0]
          const course = Array.isArray(r.courses) ? r.courses[0] : r.courses as { name: string; holes_count: number }
          // Fetch scores
          const { data: scores } = await supabase
            .from('scores')
            .select('hole_number, strokes')
            .eq('round_id', r.id)
            .eq('profile_id', user.id)

          const holesDone = (scores ?? []).filter(s => s.strokes != null).map(s => s.hole_number)
          setActiveRound({
            id: r.id,
            course_name: course?.name ?? 'Campo',
            current_hole: holesDone.length + 1,
            total_holes: course?.holes_count ?? 18,
            score_delta: 0, // TODO: calculate
            holes_done: holesDone,
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
      </div>
    )
  }

  const firstName = profile.name.split(' ')[0]
  const initials  = getInitials(profile.name)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">

      {/* Safe top area */}
      <div className="safe-top">

        {/* Header */}
        <div className="flex items-center justify-between px-[14px] pt-3 pb-1">
          <div className="flex items-center gap-2">
            {/* Logo pin */}
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
              <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
              <circle cx="24" cy="50" r="2.6" fill="#0e1a16"/>
            </svg>
            <span className="text-[17px] font-black tracking-tight text-[#0e1a16]">bogeyclub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#6b7a72] tracking-wide">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()} · {formatHandicap(profile.handicap_index)}
            </span>
            <Link href="/perfil">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                style={{ backgroundColor: profile.avatar_color ?? '#1f8a5b' }}
              >
                {initials}
              </div>
            </Link>
          </div>
        </div>

        <div className="px-[14px] space-y-3 mt-3">

          {/* Hero dark card */}
          <div
            className="rounded-[22px] p-5 relative overflow-hidden"
            style={{ backgroundColor: '#0e1a16' }}
          >
            {/* Green circle decoration */}
            <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.92 }} />
            {/* Flag pole */}
            <div className="absolute right-[52px] top-[-8px] w-[1.5px] h-[60px] bg-white" style={{ opacity: 0.85 }} />
            <svg className="absolute right-[34px] top-[-6px]" width="24" height="14" viewBox="0 0 24 14">
              <path d="M0 0 L20 4 L0 10 Z" fill="white"/>
            </svg>
            {/* Golf ball */}
            <div className="absolute right-[44px] top-[52px] w-[18px] h-[18px] rounded-full bg-white" style={{ boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.08)' }} />

            <div className="relative">
              {/* Status pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f8a5b]" />
                <span className="text-white text-[11px] font-semibold">Listo para jugar</span>
              </div>

              <h1 className="text-white text-[28px] font-black tracking-tight leading-tight mb-5">
                Buenas, {firstName}.<br/>
                Toca{' '}
                <span style={{ color: '#1f8a5b' }}>perder bolas</span>{' '}
                con la cuadrilla.
              </h1>

              <div className="flex gap-2">
                <Link
                  href="/ronda/campo"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px] transition active:scale-[0.98]"
                  style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}
                >
                  Competitivo →
                </Link>
                <Link
                  href="/ronda/campo?practice=true"
                  className="flex items-center justify-center px-5 py-3 rounded-full font-semibold text-[14px] text-white transition active:scale-[0.98]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  Práctica
                </Link>
              </div>
            </div>
          </div>

          {/* Active round card */}
          {activeRound && (
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#1f8a5b] bg-[#d9eedd] px-2.5 py-1 rounded-full">● En curso</span>
                  <span className="text-[13px] font-semibold text-[#0e1a16]">{activeRound.course_name}</span>
                </div>
                <span className="font-mono text-[11px] text-[#6b7a72]">{activeRound.current_hole} / {activeRound.total_holes}</span>
              </div>

              {/* Score delta */}
              <div className="flex items-end gap-4 mb-3">
                <div>
                  <p className="text-[11px] text-[#6b7a72] mb-0.5">Vas</p>
                  <p className="text-[36px] font-black leading-none text-[#0e1a16]">
                    {activeRound.score_delta > 0 ? `+${activeRound.score_delta}` : activeRound.score_delta === 0 ? 'E' : activeRound.score_delta}
                  </p>
                </div>
                {/* Hole progress bars */}
                <div className="flex-1 pb-1">
                  <div className="flex gap-[3px]">
                    {Array.from({ length: activeRound.total_holes }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 h-[26px] rounded-[4px]"
                        style={{
                          backgroundColor: activeRound.holes_done.includes(i + 1)
                            ? '#1f8a5b'
                            : '#ece8db'
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="font-mono text-[9px] text-[#6b7a72]">H1</span>
                    <span className="font-mono text-[9px] text-[#6b7a72]">H{activeRound.total_holes}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/tarjeta?round=${activeRound.id}`}
                className="flex items-center justify-between w-full py-3 px-4 rounded-[14px] font-bold text-[14px] text-white transition active:scale-[0.98]"
                style={{ backgroundColor: '#0e1a16' }}
              >
                <span>Continuar · hoyo {activeRound.current_hole} par ·</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>→</span>
              </Link>
            </div>
          )}

          {/* Liga card */}
          <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#1a2a4a' }}>
            <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#2a6fdb', opacity: 0.6 }} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em] mb-1">LIGA</p>
                  <p className="text-white text-[18px] font-black tracking-tight">
                    {activeLeague ? activeLeague.name : 'Sin liga activa'}
                  </p>
                </div>
                <Link href="/liga"
                  className="font-mono text-[9px] text-white/60 uppercase tracking-wide mt-1 hover:text-white">
                  Ver →
                </Link>
              </div>
              {activeLeague ? (
                <Link href={`/ronda/campo?league=${activeLeague.id}`}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-full font-bold text-[13px] transition active:scale-[0.98]"
                  style={{ backgroundColor: '#2a6fdb', color: '#fff' }}>
                  <span>Iniciar ronda de liga</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">→</span>
                </Link>
              ) : (
                <Link href="/liga/nueva"
                  className="flex items-center justify-center w-full px-4 py-2.5 rounded-full font-bold text-[13px] text-white/70 border border-white/20 transition active:opacity-80">
                  Crear liga →
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Tab bar */}
      <TabBar active="inicio" />
    </div>
  )
}

// ─── Tab Bar ─────────────────────────────────────────────────
function TabBar({ active }: { active: string }) {
  const tabs = [
    { key: 'inicio',   href: '/',       label: 'Inicio',   icon: HomeIcon },
    { key: 'tarjeta',  href: '/tarjeta',label: 'Tarjeta',  icon: CardIcon },
    { key: 'stats',    href: '/stats',  label: 'Stats',    icon: StatsIcon },
    { key: 'liga',     href: '/liga',   label: 'Liga',     icon: TrophyIcon },
    { key: 'perfil',   href: '/perfil', label: 'Perfil',   icon: UserIcon },
  ]
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e5e0d4] z-50 safe-bottom">
      <div className="flex items-stretch">
        {tabs.map(({ key, href, label, icon: Icon }) => {
          const isActive = key === active
          return (
            <Link key={key} href={href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${isActive ? 'text-[#1f8a5b]' : 'text-[#6b7a72]'}`}>
              <Icon active={isActive} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-[#1f8a5b]' : 'text-[#6b7a72]'}`}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7}/></svg>
}
function CardIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7}/><path d="M3 10h18M9 5v14" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7}/></svg>
}
function StatsIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round"/></svg>
}
function TrophyIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round"/><path d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round"/></svg>
}
function UserIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7}/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={active ? '#1f8a5b' : '#6b7a72'} strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round"/></svg>
}
