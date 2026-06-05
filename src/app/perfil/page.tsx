'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap, formatDate, countingRounds } from '@/lib/golf'
import { TabBar } from '@/components/ui/tab-bar'

function Sparkline({ diffs }: { diffs: { diff: number }[] }) {
  if (diffs.length < 2) return null
  const vals = [...diffs].reverse().map(d => d.diff)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const w = 300, h = 60, pad = 6
  const pts = vals.map((v, i) => `${pad + (i/(vals.length-1))*(w-pad*2)},${pad + ((max-v)/range)*(h-pad*2)}`).join(' ')
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={`${pts} ${w-pad},${h} ${pad},${h}`} fill="#d9eedd" opacity="0.6"/>
      <polyline points={pts} fill="none" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function PerfilPage() {
  const [profile, setProfile]   = useState<any>(null)
  const [email, setEmail]       = useState('')
  const [diffs, setDiffs]       = useState<{ diff: number; played_at: string; counting: boolean }[]>([])
  const [loading, setLoading]   = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email ?? '')

      // Try sessionStorage cache for profile (30s TTL)
      let prof: any = null
      try {
        const cachedProfile = sessionStorage.getItem('profile')
        const cacheTime = sessionStorage.getItem('profileTime')
        if (cachedProfile && cacheTime && Date.now() - parseInt(cacheTime) < 30000) {
          prof = JSON.parse(cachedProfile)
          setProfile(prof)
        }
      } catch {}

      if (!prof) {
        const { data: fetchedProf } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (!fetchedProf) { window.location.href = '/onboarding'; return }
        prof = fetchedProf
        setProfile(prof)
        try {
          sessionStorage.setItem('profile', JSON.stringify(prof))
          sessionStorage.setItem('profileTime', Date.now().toString())
        } catch {}
      }

      const { data: d } = await supabase.from('whs_differentials').select('differential, played_at, is_counting').eq('profile_id', user.id).order('played_at', { ascending: false }).limit(20)
      setDiffs((d ?? []).map(x => ({ diff: x.differential, played_at: x.played_at, counting: x.is_counting })))
      setLoading(false)
    }
    load()
  }, [])

  async function recalculate() {
    setRecalculating(true)
    try {
      const res = await fetch('/api/profile/recalcular-whs', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Reload diffs and profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [profRes, diffsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('whs_differentials').select('differential, played_at, is_counting').eq('profile_id', user.id).order('played_at', { ascending: false }).limit(20),
        ])
        if (profRes.data) setProfile(profRes.data)
        setDiffs((diffsRes.data ?? []).map((x: any) => ({ diff: x.differential, played_at: x.played_at, counting: x.is_counting })))
      }
      alert(`Hándicap recalculado correctamente (${data.rounds_processed ?? 0} rondas procesadas)`)
    } catch (err: unknown) {
      alert('Error al recalcular: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setRecalculating(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading || !profile) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const initials = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const nCount   = countingRounds(diffs.length)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header fijo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#f4f1e9] z-40 px-[14px] pb-3 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16]">Carnet</h1>
      </div>
      <div style={{ height: 'calc(max(14px, env(safe-area-inset-top)) + 50px)' }}/>

      <div className="px-[14px] pb-4">
        {/* Member card */}
        <div className="rounded-[22px] p-5 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-40px] top-[-40px] w-[160px] h-[160px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="#9bc9a3"/><path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/><path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/></svg>
                <span className="text-white text-[14px] font-bold">Bogey-Club</span>
              </div>
              <span className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Socio</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[20px] font-bold" style={{ backgroundColor: profile.avatar_color ?? '#1f8a5b' }}>{initials}</div>
              <div>
                <p className="text-white text-[20px] font-bold leading-tight">{profile.name}</p>
                <p className="text-white/50 text-[12px] mt-0.5">{email}</p>
              </div>
            </div>
            <div className="flex items-end justify-between border-t border-white/10 pt-3">
              <div>
                <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Índice WHS</p>
                <p className="text-white text-[42px] font-black leading-none">{formatHandicap(profile.handicap_index)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] text-white/50 uppercase">Rondas</p>
                <p className="text-white text-[20px] font-black">{diffs.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── WHS HANDICAP ── */}
        <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4 mb-3">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-[16px] font-bold text-[#0e1a16]">Evolución hándicap</h2>
            {diffs.length > 0 && <span className="font-mono text-[10px] text-[#6b7a72]">{nCount} cuentan de {diffs.length}</span>}
          </div>

          {diffs.length >= 2 ? (
            <>
              <Sparkline diffs={diffs} />
              <div className="flex justify-between mt-1 mb-4">
                <span className="font-mono text-[9px] text-[#6b7a72]">{formatDate(diffs[diffs.length-1]?.played_at)}</span>
                <span className="font-mono text-[10px] font-bold text-[#1f8a5b]">Actual: {formatHandicap(profile.handicap_index)}</span>
                <span className="font-mono text-[9px] text-[#6b7a72]">{formatDate(diffs[0]?.played_at)}</span>
              </div>
            </>
          ) : diffs.length === 0 ? (
            <p className="text-[13px] text-[#6b7a72] py-3">Completa rondas para ver la evolución de tu hándicap.</p>
          ) : null}

          {/* Rounds detail */}
          {diffs.length > 0 && (
            <>
              {/* WHS explanation card */}
              <div className="bg-[#f4f1e9] rounded-[14px] px-4 py-3 mb-4">
                <p className="font-bold text-[13px] text-[#0e1a16] mb-2">¿Qué es el índice WHS?</p>
                <p className="text-[12px] text-[#6b7a72] leading-relaxed mb-2">
                  Es tu nivel de juego oficial. Se calcula con tus mejores {nCount || 8} diferenciales
                  de las últimas {diffs.length || 20} rondas.
                  Cuanto más bajo, mejor juegas.
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { range: '0–5', label: 'Scratch', color: '#2a6fdb' },
                    { range: '6–18', label: 'Amateur', color: '#1f8a5b' },
                    { range: '19–54', label: 'Alto', color: '#9b6e1a' },
                  ].map(r => (
                    <div key={r.label} className="bg-white rounded-[10px] p-2 border border-[#e5e0d4]">
                      <p className="font-mono text-[10px] font-bold" style={{color: r.color}}>{r.range}</p>
                      <p className="text-[10px] text-[#6b7a72] mt-0.5">{r.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#6b7a72] mt-2">
                  <strong className="text-[#0e1a16]">Diferencial</strong> = (113 / Slope) × (Golpes − CR del campo).
                  Los {nCount || 8} mejores de los últimos {diffs.length || 20} calculan tu índice.
                </p>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <p className="font-bold text-[13px] text-[#0e1a16]">Partidos del cálculo</p>
              </div>
              <div className="space-y-1">
                {diffs.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[#efebe1] last:border-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: d.counting ? '#1f8a5b' : '#f4f1e9' }}>
                      {d.counting
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <span className="font-mono text-[9px] text-[#6b7a72]">{i+1}</span>
                      }
                    </div>
                    <span className="text-[12px] text-[#6b7a72] flex-1">{formatDate(d.played_at)}</span>
                    <span className="font-mono text-[14px] font-black" style={{ color: d.counting ? '#1f8a5b' : '#0e1a16' }}>{d.diff.toFixed(1)}</span>
                    {d.counting && <span className="font-mono text-[8px] bg-[#d9eedd] text-[#1f8a5b] px-1.5 py-0.5 rounded-full">cuenta</span>}
                  </div>
                ))}
              </div>
              {nCount > 0 && (
                <p className="text-[11px] text-[#6b7a72] mt-3 bg-[#f4f1e9] rounded-[10px] px-3 py-2">
                  Media de los <strong className="text-[#0e1a16]">{nCount} diferenciales más bajos</strong> de las últimas {diffs.length} rondas.
                </p>
              )}
            </>
          )}
        </div>

        {/* Recalcular hándicap */}
        <div className="mb-3">
          <button onClick={recalculate} disabled={recalculating}
            className="w-full py-3 rounded-[14px] text-[13px] font-semibold border border-[#e5e0d4] bg-white text-[#0e1a16] transition active:opacity-80 disabled:opacity-60">
            {recalculating ? 'Recalculando...' : 'Recalcular mi hándicap WHS'}
          </button>
        </div>

        {/* ── ACCESOS ── */}
        <div className="space-y-2 mb-3">
          {/* Jugadores registrados */}
          <Link href="/jugadores" className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#e5e0d4] active:opacity-70">
            <div className="w-9 h-9 rounded-full bg-[#d9eedd] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#1f8a5b" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#1f8a5b" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#1f8a5b" strokeWidth="1.8" strokeLinecap="round"/></svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-[#0e1a16]">El club</p>
              <p className="text-[11px] text-[#6b7a72]">Ver todos los jugadores registrados</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
          </Link>

          {/* Editar campos */}
          <Link href="/ronda/campo" className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#e5e0d4] active:opacity-70">
            <div className="w-9 h-9 rounded-full bg-[#dde7fb] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 18 Q8 6 14 12 T20 8" stroke="#2a6fdb" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx="20" cy="8" r="1.8" fill="#2a6fdb"/></svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[14px] text-[#0e1a16]">Campos</p>
              <p className="text-[11px] text-[#6b7a72]">Editar campos, hoyos y distancias</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
          </Link>

          {/* Admin — solo para admin */}
          {email === 's.vallve93@gmail.com' && (
            <Link href="/admin" className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#fadcd6] active:opacity-70">
              <div className="w-9 h-9 rounded-full bg-[#fadcd6] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#c6432d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[14px] text-[#c6432d]">Administración</p>
                <p className="text-[11px] text-[#6b7a72]">Gestionar usuarios y ligas</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
            </Link>
          )}
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] border-2 border-[#c6432d] text-[#c6432d] bg-white transition active:opacity-80">
          Cerrar sesión
        </button>
      </div>
      <TabBar />
    </div>
  )
}
