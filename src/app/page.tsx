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
type FeedItem = { id: string; round_id: string; name: string; avatar_color: string; action: string; detail: string; time: string; badge?: string | null }
type LastRound = { course_id: string; course_name: string; player_ids: string[]; guests: string[]; modes: string[]; hole_mode: string; league_id?: string }

const GOLF_QUOTES = [
  { text: "El golf es el único deporte donde puedes hacer trampa y luego confesar en el hoyo 18.", author: "Anónimo del vestuario" },
  { text: "No hay ningún hoyo que no se pueda hacer peor con un segundo golpe.", author: "Ley de Murphy golfista" },
  { text: "Golf: el arte de meter una bola en un agujero usando los instrumentos más inapropiados.", author: "Winston Churchill" },
  { text: "El golf saca lo mejor de uno... y también lo peor.", author: "Bogey-Club" },
  { text: "Si cuentas todos tus golpes en golf, nunca podrás tener amigos.", author: "Sabiduría popular" },
  { text: "El golf es un buen paseo arruinado.", author: "Mark Twain" },
  { text: "Juego con mi conciencia. Siempre que cometo un error, mi conciencia me dice que anote 5.", author: "Bob Hope" },
  { text: "En golf, la humillación llega por parejas. Y a veces por águilas.", author: "Bogey-Club" },
  { text: "El árbol que te cortó el camino llevaba ahí 200 años. Tú llevas 20 minutos.", author: "Sabiduría del campo" },
  { text: "Mi handicap no refleja mi nivel. Refleja mis esperanzas.", author: "Bogey-Club" },
]

function holeBarColor(delta: number | null): string {
  if (delta === null) return '#ece8db'
  if (delta <= -1) return '#2a6fdb'
  if (delta === 0)  return '#1f8a5b'
  if (delta === 1)  return '#e8b75a'
  return '#c6432d'
}

export default function HomePage() {
  const [profile, setProfile]         = useState<Profile | null>(null)
  const dailyQuote = GOLF_QUOTES[new Date().getDate() % GOLF_QUOTES.length]
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [activeLeague, setActiveLeague] = useState<ActiveLeague | null>(null)
  const [feed, setFeed]               = useState<FeedItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastRound, setLastRound]     = useState<LastRound | null>(null)
  const [quickStarting, setQuickStarting] = useState(false)
  const [completedRoundsCount, setCompletedRoundsCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lastRound')
      if (stored) setLastRound(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Run independent queries in parallel
      const [profRes, rpsRes, lpsRes, recentRoundsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('round_players').select('round_id').eq('profile_id', user.id).limit(20),
        supabase.from('league_players').select('league_id, leagues(id, name, active, total_rounds)').eq('profile_id', user.id).limit(5),
        supabase.from('rounds').select('id, date, courses(name), round_players(profile_id, profiles(name, avatar_color))').eq('status', 'completed').order('created_at', { ascending: false }).limit(6),
      ])

      const prof = profRes.data
      if (!prof) { window.location.href = '/onboarding'; return }
      setProfile(prof)

      const rps = rpsRes.data
      const lps = lpsRes.data
      const recentRounds = recentRoundsRes.data

      // Active round — depends on rps
      if (rps?.length) {
        const roundIds = rps.map((r: any) => r.round_id)
        const { data: rounds } = await supabase
          .from('rounds').select('id, course_id, courses(name, holes_count)')
          .in('id', roundIds).eq('status', 'active').limit(1)

        if (rounds?.length) {
          const r = rounds[0]
          const course = Array.isArray(r.courses) ? r.courses[0] : r.courses as any
          const totalHoles = course?.holes_count ?? 18

          const [holesRes, scoresRes] = await Promise.all([
            supabase.from('holes').select('hole_number, par').eq('course_id', r.course_id).order('hole_number'),
            supabase.from('scores').select('hole_number, strokes').eq('round_id', r.id).eq('profile_id', user.id),
          ])

          const holes = holesRes.data
          const scores = scoresRes.data

          const holeScores: HoleScore[] = (scores ?? [])
            .filter((s: any) => s.strokes != null)
            .map((s: any) => {
              const hole = (holes ?? []).find((h: any) => h.hole_number === s.hole_number)
              return { hole_number: s.hole_number, strokes: s.strokes, par: hole?.par ?? 4 }
            })

          const totalStrokes = holeScores.reduce((a, s) => a + s.strokes, 0)
          const totalPar     = holeScores.reduce((a, s) => a + s.par, 0)
          const playedHoles  = holeScores.map(s => s.hole_number)
          const nextHole     = Array.from({ length: totalHoles }, (_, i) => i + 1).find(h => !playedHoles.includes(h)) ?? 1
          const nextPar      = (holes ?? []).find((h: any) => h.hole_number === nextHole)?.par ?? 4

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

      // Active league — depends on lps
      const activeLp = (lps ?? []).find((x: any) => {
        const l = Array.isArray(x.leagues) ? x.leagues[0] : x.leagues
        return l?.active
      })
      if (activeLp) {
        const lg = Array.isArray(activeLp.leagues) ? (activeLp.leagues as any[])[0] : activeLp.leagues as any
        if (lg) {
          const [standingsRes, lrsRes] = await Promise.all([
            supabase.from('league_standings').select('profile_id, total_points, profiles(name, avatar_color)').eq('league_id', lg.id).order('total_points', { ascending: false }).limit(5),
            supabase.from('league_rounds').select('id').eq('league_id', lg.id),
          ])

          const standings = standingsRes.data
          const lrs = lrsRes.data
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

      // Feed — recent completed rounds, fetch scores for birdie/eagle detection
      const roundIds = (recentRounds ?? []).map((r: any) => r.id)

      // Fetch scores for all recent rounds in one query + completed rounds count for user
      const [allRecentScoresRes, holesDataRes, userCompletedRes] = await Promise.all([
        roundIds.length > 0
          ? supabase.from('scores').select('round_id, profile_id, hole_number, strokes').in('round_id', roundIds)
          : Promise.resolve({ data: [] }),
        supabase.from('holes').select('hole_number, par, course_id'),
        rps?.length
          ? supabase.from('rounds').select('id').in('id', (rps ?? []).map((r: any) => r.round_id)).eq('status', 'completed')
          : Promise.resolve({ data: [] }),
      ])

      const allRecentScores = (allRecentScoresRes as any).data ?? []
      const allHoles = (holesDataRes as any).data ?? []
      const userCompleted = (userCompletedRes as any).data ?? []
      setCompletedRoundsCount(userCompleted.length)

      const feedItems: FeedItem[] = []
      for (const r of recentRounds ?? []) {
        const course = Array.isArray((r as any).courses) ? (r as any).courses[0] : (r as any).courses as any
        const rps2 = (r as any).round_players ?? []
        for (const rp of rps2.slice(0, 1)) {
          const name = rp.profiles?.name ?? 'Jugador'
          const pid = rp.profile_id
          const days = Math.floor((Date.now() - new Date(r.date).getTime()) / 86400000)
          const timeStr = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`

          // Get this player's scores for this round from the pre-fetched data
          const playerScores = allRecentScores.filter((s: any) => s.round_id === r.id && s.profile_id === pid)
          const total = playerScores.reduce((a: number, s: any) => a + (s.strokes ?? 0), 0)

          // Detect birdie/eagle using fetched hole pars
          let birdieHole: number | null = null
          let eagleHole: number | null = null
          for (const s of playerScores) {
            const holeInfo = allHoles.find((h: any) => h.hole_number === s.hole_number)
            if (!holeInfo) continue
            const delta = s.strokes - holeInfo.par
            if (delta <= -2 && eagleHole === null) eagleHole = s.hole_number
            else if (delta === -1 && birdieHole === null) birdieHole = s.hole_number
          }

          let action = 'completó una ronda'
          let badge: string | null = null

          if (eagleHole !== null) {
            action = `hizo eagle en el hoyo ${eagleHole}`
            badge = '🦅'
          } else if (birdieHole !== null) {
            action = `hizo birdie en el hoyo ${birdieHole}`
            badge = '🐦'
          } else if (total > 0) {
            // Check PB using allRecentScores already fetched — only do extra query if needed
            try {
              const { data: allScores } = await supabase.from('scores').select('strokes, round_id').eq('profile_id', pid).not('strokes', 'is', null).limit(200)
              const roundTotals: Record<string, number> = {}
              for (const s of allScores ?? []) {
                if (!roundTotals[s.round_id]) roundTotals[s.round_id] = 0
                roundTotals[s.round_id] += s.strokes ?? 0
              }
              const pastBests = Object.entries(roundTotals).filter(([rid]) => rid !== r.id).map(([, v]) => v).filter(v => v > 0)
              if (pastBests.length > 0 && total <= Math.min(...pastBests)) {
                action = 'batió su récord personal!'
                badge = 'PB'
              }
            } catch {}
          }

          feedItems.push({ id: r.id + pid, round_id: r.id, name, avatar_color: rp.profiles?.avatar_color ?? '#6b7a72', action, detail: `${course?.name ?? 'Campo'} · ${timeStr}`, time: timeStr, badge })
        }
      }
      setFeed(feedItems.slice(0, 4))

      setLoading(false)
    }
    load()
  }, [])

  async function quickStart(lr: LastRound) {
    setQuickStarting(true)
    try {
      const res = await fetch('/api/ronda/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: lr.course_id,
          is_practice: false,
          player_ids: lr.player_ids,
          guests: lr.guests ?? [],
          modes: lr.modes,
          hole_mode: lr.hole_mode ?? 'all',
          ...(lr.league_id ? { league_id: lr.league_id } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = `/tarjeta?round=${data.round_id}`
    } catch {
      alert('Error al iniciar ronda')
      setQuickStarting(false)
    }
  }

  if (loading || !profile) {
    return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>
  }

  const firstName = profile.name.split(' ')[0]
  const initials  = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header FIJO — no se mueve al hacer scroll */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#f4f1e9] z-40 flex items-center justify-between px-[14px] pb-2 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
            <path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
          </svg>
          <span className="text-[26px] font-black tracking-tight text-[#0e1a16]">Bogey-Club</span>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Spacer para compensar el header fijo */}
      <div style={{ height: 'calc(max(14px, env(safe-area-inset-top)) + 44px)' }}/>

      <div>

        <div className="px-[14px] space-y-3 mt-2">
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
              <h1 className="text-white text-[28px] font-black tracking-tight leading-tight mb-3">
                Buenas, {firstName}.<br/>
                Toca <span style={{ color: '#1f8a5b' }}>perder bolas.</span>
              </h1>

              {/* Frase del día — entre el texto y los botones */}
              <div className="rounded-[12px] px-3 py-2.5 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-white/70 text-[12px] italic leading-snug">"{dailyQuote.text}"</p>
                <p className="font-mono text-[9px] text-white/35 mt-1">— {dailyQuote.author}</p>
              </div>

              <div className="flex gap-2">
                <Link href="/ronda/campo" className="flex-1 flex items-center justify-center py-3.5 rounded-full font-bold text-[15px] text-[#0e1a16] transition active:scale-[0.98]" style={{ backgroundColor: '#1f8a5b' }}>
                  Competitivo
                </Link>
                <Link href="/ronda/campo?practice=true" className="flex items-center justify-center px-5 py-3.5 rounded-full font-semibold text-[14px] transition active:scale-[0.98]" style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                  Práctica
                </Link>
              </div>
            </div>
          </div>

          {/* Onboarding card — only when 0 completed rounds and no active round */}
          {completedRoundsCount === 0 && !activeRound && (
            <div className="bg-white rounded-[22px] border-2 border-[#1f8a5b] p-4">
              <p className="font-black text-[16px] text-[#0e1a16] mb-2">Bienvenido al club 🏌️</p>
              <div className="space-y-2">
                {[
                  { n: '1', text: 'Empieza una ronda con tus amigos' },
                  { n: '2', text: 'Anota golpe a golpe en el campo' },
                  { n: '3', text: 'Ve tus stats y el ranking al terminar' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-[#1f8a5b] flex items-center justify-center text-white text-[11px] font-black">{s.n}</div>
                    <p className="text-[13px] text-[#6b7a72]">{s.text}</p>
                  </div>
                ))}
              </div>
              <Link href="/ronda/campo" className="mt-3 flex items-center justify-center w-full py-3 rounded-full font-bold text-[14px] text-white" style={{ backgroundColor: '#1f8a5b' }}>
                Primera ronda →
              </Link>
            </div>
          )}

          {/* Ultima ronda quick-start */}
          {lastRound && !activeRound && (
            <button
              onClick={() => quickStart(lastRound)}
              disabled={quickStarting}
              className="w-full text-left bg-white rounded-[22px] border border-[#e5e0d4] px-4 py-3 flex items-center justify-between transition active:scale-[0.98] disabled:opacity-60"
            >
              <div>
                <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-[0.15em] mb-1">Ultima ronda</p>
                <p className="text-[15px] font-bold text-[#0e1a16]">Repetir ronda</p>
                <p className="text-[12px] text-[#6b7a72] mt-0.5">{lastRound.course_name} · {lastRound.modes.join(', ')}</p>
              </div>
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: '#1f8a5b' }}>
                {quickStarting ? '...' : '→'}
              </span>
            </button>
          )}

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
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.7 }}/>
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
                  {activeLeague.top3.map((p) => (
                    <div key={p.profile_id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                      <span className="font-mono text-[10px] font-bold text-white">{p.total_points}</span>
                    </div>
                  ))}
                  <div className="flex-1"/>
                  <Link href={`/ronda/campo?league=${activeLeague.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[11px] transition active:scale-[0.98]"
                    style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
                    Jugar →
                  </Link>
                  <Link href="/liga" className="font-mono text-[9px] text-white/60 ml-1">Ver liga →</Link>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/liga/nueva" className="block rounded-[22px] p-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
              <div className="absolute right-[-30px] top-[-30px] w-[120px] h-[120px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.7 }}/>
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
                  <Link key={item.id} href={`/resumen?round=${item.round_id}&readonly=true`}
                    className={`flex items-center gap-3 py-2.5 active:opacity-70 ${i > 0 ? 'border-t border-[#efebe1]' : ''}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ backgroundColor: item.avatar_color }}>
                      {item.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] text-[#0e1a16] leading-tight">
                          <span className="font-bold">{item.name}</span> {item.action}
                        </p>
                        {item.badge === 'PB' && (
                          <span className="font-mono text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#e8b75a', color: '#0e1a16' }}>PB</span>
                        )}
                        {item.badge === '🐦' && (
                          <span className="text-[14px] flex-shrink-0">🐦</span>
                        )}
                        {item.badge === '🦅' && (
                          <span className="text-[14px] flex-shrink-0">🦅</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6b7a72] mt-0.5">{item.detail}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
                  </Link>
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
