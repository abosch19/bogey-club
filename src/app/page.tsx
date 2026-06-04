'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap } from '@/lib/golf'
import { TabBar } from '@/components/ui/tab-bar'

type Profile = { id: string; name: string; handicap_index: number; avatar_color: string }
type HoleScore = { hole_number: number; strokes: number; par: number }
type ActiveRound = {
  id: string; course_name: string; total_holes: number
  score_delta: number; holes_played: number; hole_scores: HoleScore[]
  next_hole: number; next_par: number
}
type LeagueStanding = { profile_id: string; name: string; avatar_color: string; total_points: number }
type ActiveLeague = { id: string; name: string; round_played: number; total_rounds: number; my_position: number; my_points: number; top3: LeagueStanding[] }
type FeedItem = { id: string; name: string; avatar_color: string; action: string; detail: string; time: string }

function holeBarColor(delta: number | null): string {
  if (delta === null) return '#ece8db'
  if (delta <= -1) return '#2a6fdb'
  if (delta === 0)  return '#1f8a5b'
  if (delta === 1)  return '#e8b75a'
  return '#c6432d'
}

export default function HomePage() {
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [activeLeague, setActiveLeague] = useState<ActiveLeague | null>(null)
  const [feed, setFeed]               = useState<FeedItem[]>([])
  const [loading, setLoading]         = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { window.location.href = '/onboarding'; return }
      setProfile(prof)

      // Active round
      const { data: rps } = await supabase.from('round_players').select('round_id').eq('profile_id', user.id).limit(20)
      if (rps?.length) {
        const roundIds = rps.map(r => r.round_id)
        const { data: rounds } = await supabase
          .from('rounds').select('id, course_id, courses(name, holes_count)')
          .in('id', roundIds).eq('status', 'active').limit(1)

        if (rounds?.length) {
          const r = rounds[0]
          const course = Array.isArray(r.courses) ? r.courses[0] : r.courses as any
          const totalHoles = course?.holes_count ?? 18

          // Fetch holes (par) and scores
          const { data: holes } = await supabase.from('holes').select('hole_number, par').eq('course_id', r.course_id).order('hole_number')
          const { data: scores } = await supabase.from('scores').select('hole_number, strokes').eq('round_id', r.id).eq('profile_id', user.id)

          const holeScores: HoleScore[] = (scores ?? [])
            .filter(s => s.strokes != null)
            .map(s => {
              const hole = (holes ?? []).find(h => h.hole_number === s.hole_number)
              return { hole_number: s.hole_number, strokes: s.strokes, par: hole?.par ?? 4 }
            })

          const totalStrokes = holeScores.reduce((a, s) => a + s.strokes, 0)
          const totalPar     = holeScores.reduce((a, s) => a + s.par, 0)
          const playedHoles  = holeScores.map(s => s.hole_number)
          const nextHole     = Array.from({ length: totalHoles }, (_, i) => i + 1).find(h => !playedHoles.includes(h)) ?? 1
          const nextPar      = (holes ?? []).find(h => h.hole_number === nextHole)?.par ?? 4

          setActiveRound({
            id: r.id, course_name: course?.name ?? 'Campo',
            total_holes: totalHoles,
            score_delta: totalStrokes - totalPar,
            holes_played: holeScores.length,
            hole_scores: holeScores,
            next_hole: nextHole, next_par: nextPar,
          })
        }
      }

      // Active league
      const { data: lps } = await supabase.from('league_players').select('league_id, leagues(id, name, active, total_rounds)').eq('profile_id', user.id).limit(5)
      const activeLp = (lps ?? []).find((x: any) => {
        const l = Array.isArray(x.leagues) ? x.leagues[0] : x.leagues
        return l?.active
      })
      if (activeLp) {
        const lg = Array.isArray(activeLp.leagues) ? (activeLp.leagues as any[])[0] : activeLp.leagues as any
        if (lg) {
          const { data: standings } = await supabase
            .from('league_standings')
            .select('profile_id, total_points, profiles(name, avatar_color)')
            .eq('league_id', lg.id)
            .order('total_points', { ascending: false })
            .limit(5)

          const { data: lrs } = await supabase.from('league_rounds').select('id').eq('league_id', lg.id)
          const st = (standings ?? []).map((s: any) => ({ profile_id: s.profile_id, name: s.profiles?.name ?? 'J', avatar_color: s.profiles?.avatar_color ?? '#6b7a72', total_points: s.total_points }))
          const myPos = st.findIndex(s => s.profile_id === user.id) + 1

          setActiveLeague({
            id: lg.id, name: lg.name,
            round_played: lrs?.length ?? 0,
            total_rounds: lg.total_rounds,
            my_position: myPos || 1,
            my_points: st.find(s => s.profile_id === user.id)?.total_points ?? 0,
            top3: st.slice(0, 3),
          })
        }
      }

      // Feed — recent completed rounds from all players
      const { data: recentRounds } = await supabase
        .from('rounds')
        .select('id, date, courses(name), round_players(profile_id, profiles(name, avatar_color))')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(6)

      const feedItems: FeedItem[] = []
      for (const r of recentRounds ?? []) {
        const course = Array.isArray((r as any).courses) ? (r as any).courses[0] : (r as any).courses as any
        const rps2 = (r as any).round_players ?? []
        for (const rp of rps2.slice(0, 1)) {
          const name = rp.profiles?.name ?? 'Jugador'
          const days = Math.floor((Date.now() - new Date(r.date).getTime()) / 86400000)
          const timeStr = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
          feedItems.push({ id: r.id + rp.profile_id, name, avatar_color: rp.profiles?.avatar_color ?? '#6b7a72', action: 'completó una ronda', detail: `${course?.name ?? 'Campo'} · ${timeStr}`, time: timeStr })
        }
      }
      setFeed(feedItems.slice(0, 4))

      setLoading(false)
    }
    load()
  }, [])

  if (loading || !profile) {
    return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>
  }

  const firstName = profile.name.split(' ')[0]
  const initials  = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div className="safe-top">
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] pt-3 pb-1">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
              <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
            </svg>
            <span className="text-[17px] font-black tracking-tight text-[#0e1a16]">bogeyclub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[#6b7a72] tracking-wide uppercase">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short' })} · {formatHandicap(profile.handicap_index)}
            </span>
            <Link href="/perfil">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ backgroundColor: profile.avatar_color ?? '#1f8a5b' }}>
                {initials}
              </div>
            </Link>
          </div>
        </div>

        <div className="px-[14px] space-y-3 mt-3">
          {/* Hero dark card */}
          <div className="rounded-[22px] p-5 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
            <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.92 }}/>
            <div className="absolute right-[52px] top-[-8px] w-[1.5px] h-[60px] bg-white opacity-85"/>
            <svg className="absolute right-[34px] top-[-6px]" width="24" height="14" viewBox="0 0 24 14"><path d="M0 0 L20 4 L0 10 Z" fill="white"/></svg>
            <div className="absolute right-[44px] top-[52px] w-[18px] h-[18px] rounded-full bg-white" style={{ boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.08)' }}/>

            <div className="relative">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f8a5b]"/>
                <span className="text-white text-[11px] font-semibold">Listo para jugar</span>
              </div>
              <h1 className="text-white text-[28px] font-black tracking-tight leading-tight mb-5">
                Buenas, {firstName}.<br/>
                Toca <span style={{ color: '#1f8a5b' }}>perder bolas.</span><br/>con la cuadrilla.
              </h1>
              <div className="flex gap-2">
                <Link href="/ronda/campo" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-bold text-[14px] text-[#0e1a16] transition active:scale-[0.98]" style={{ backgroundColor: '#1f8a5b' }}>
                  Competitivo →
                </Link>
                <Link href="/ronda/campo?practice=true" className="flex items-center justify-center px-5 py-3 rounded-full font-semibold text-[14px] text-white transition active:scale-[0.98]" style={{ backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  Práctica
                </Link>
              </div>
            </div>
          </div>

          {/* Active round card */}
          {activeRound && (
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#1f8a5b] bg-[#d9eedd] px-2.5 py-1 rounded-full">
                  ● En curso · {activeRound.course_name}
                </span>
                <span className="font-mono text-[11px] text-[#6b7a72]">{activeRound.holes_played} / {activeRound.total_holes}</span>
              </div>

              <div className="flex items-end gap-4 mb-3">
                <div>
                  <p className="text-[11px] text-[#6b7a72] mb-0.5">Vas</p>
                  <p className="text-[38px] font-black text-[#0e1a16] leading-none">
                    {activeRound.score_delta > 0 ? `+${activeRound.score_delta}` : activeRound.score_delta === 0 ? 'E' : activeRound.score_delta}
                  </p>
                </div>
                {/* Colored hole bars */}
                <div className="flex-1 pb-1">
                  <div className="flex gap-[3px]">
                    {Array.from({ length: activeRound.total_holes }, (_, i) => {
                      const hs = activeRound.hole_scores.find(s => s.hole_number === i + 1)
                      const delta = hs ? hs.strokes - hs.par : null
                      return (
                        <div key={i} className="flex-1 h-[26px] rounded-[4px]" style={{ backgroundColor: holeBarColor(delta) }}/>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] text-[#6b7a72]">
                    <span>H1</span>
                    <span>H{activeRound.holes_played} ↓</span>
                    <span>H{activeRound.total_holes}</span>
                  </div>
                </div>
              </div>

              <Link href={`/tarjeta?round=${activeRound.id}`}
                className="flex items-center justify-between w-full py-3 px-4 rounded-[14px] font-bold text-[14px] text-white transition active:scale-[0.98]"
                style={{ backgroundColor: '#0e1a16' }}>
                <span>Continuar · hoyo {activeRound.next_hole} par {activeRound.next_par}</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black text-[#0e1a16]" style={{ backgroundColor: '#1f8a5b' }}>→</span>
              </Link>
            </div>
          )}

          {/* Liga card */}
          {activeLeague ? (
            <div className="rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#e8b75a', opacity: 0.9 }}/>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">
                      LIGA · JORNADA {activeLeague.round_played}/{activeLeague.total_rounds}
                    </p>
                    <p className="text-white text-[18px] font-black tracking-tight mt-1">{activeLeague.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-[32px] font-black leading-none">{activeLeague.my_position}º</p>
                    <p className="font-mono text-[9px] text-white/50">{activeLeague.my_points} PTS</p>
                  </div>
                </div>
                {/* Top 3 + actions */}
                <div className="flex items-center gap-2">
                  {activeLeague.top3.map((p, i) => (
                    <div key={p.profile_id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                      <span className="font-mono text-[10px] font-bold text-white">{p.total_points}</span>
                    </div>
                  ))}
                  <div className="flex-1"/>
                  <Link href={`/ronda/campo?league=${activeLeague.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[11px] text-[#0e1a16] transition active:scale-[0.98]"
                    style={{ backgroundColor: '#e8b75a' }}>
                    Jugar →
                  </Link>
                  <Link href="/liga" className="font-mono text-[9px] text-white/60 ml-1">Ver liga →</Link>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/liga/nueva" className="block rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#e8b75a', opacity: 0.9 }}/>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">LIGA</p>
                  <p className="text-white text-[18px] font-black tracking-tight mt-1">Crear liga →</p>
                </div>
                <div className="text-[32px] font-black text-white/30">+</div>
              </div>
            </Link>
          )}

          {/* El club feed */}
          {feed.length > 0 && (
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[17px] font-bold text-[#0e1a16]">El club</h3>
                <span className="text-[11px] text-[#2a6fdb] font-semibold">Ver feed →</span>
              </div>
              <div className="space-y-0">
                {feed.map((item, i) => (
                  <div key={item.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-[#efebe1]' : ''}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ backgroundColor: item.avatar_color }}>
                      {item.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#0e1a16] leading-tight">
                        <span className="font-bold">{item.name}</span> {item.action}
                      </p>
                      <p className="text-[11px] text-[#6b7a72] mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <TabBar />
    </div>
  )
}
