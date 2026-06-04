'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap, formatDate, countingRounds } from '@/lib/golf'

function TabBar({ active }: { active: string }) {
  const tabs = [
    { key: 'inicio', href: '/', label: 'Inicio', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth={active==='inicio'?2.2:1.7}/></svg> },
    { key: 'tarjeta', href: '/tarjeta', label: 'Tarjeta', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={active==='tarjeta'?2.2:1.7}/><path d="M3 10h18M9 5v14" stroke="currentColor" strokeWidth={active==='tarjeta'?2.2:1.7}/></svg> },
    { key: 'stats', href: '/stats', label: 'Stats', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7" stroke="currentColor" strokeWidth={active==='stats'?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'liga', href: '/liga', label: 'Liga', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M12 17v4M5 3h14v7a7 7 0 0 1-14 0V3z" stroke="currentColor" strokeWidth={active==='liga'?2.2:1.7} strokeLinecap="round"/><path d="M5 7H2v3a3 3 0 0 0 3 3M19 7h3v3a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth={active==='liga'?2.2:1.7} strokeLinecap="round"/></svg> },
    { key: 'perfil', href: '/perfil', label: 'Perfil', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={active==='perfil'?2.2:1.7}/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth={active==='perfil'?2.2:1.7} strokeLinecap="round"/></svg> },
  ]
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e5e0d4] z-50 safe-bottom">
      <div className="flex items-stretch">
        {tabs.map(t => (
          <Link key={t.key} href={t.href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${t.key===active?'text-[#1f8a5b]':'text-[#6b7a72]'}`}>
            {t.icon}
            <span className="text-[10px] font-semibold">{t.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export default function PerfilPage() {
  const [profile, setProfile]   = useState<any>(null)
  const [email, setEmail]       = useState('')
  const [diffs, setDiffs]       = useState<{ diff: number; played_at: string; counting: boolean }[]>([])
  const [loading, setLoading]   = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setEmail(user.email ?? '')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) { window.location.href = '/onboarding'; return }
      setProfile(prof)

      const { data: d } = await supabase.from('whs_differentials').select('differential, played_at, is_counting').eq('profile_id', user.id).order('played_at', { ascending: false }).limit(20)
      setDiffs((d ?? []).map(x => ({ diff: x.differential, played_at: x.played_at, counting: x.is_counting })))
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading || !profile) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const initials = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const nCount   = countingRounds(diffs.length)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16] mb-4">Carnet</h1>

        {/* Member card */}
        <div className="rounded-[22px] p-5 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-40px] top-[-40px] w-[160px] h-[160px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="#9bc9a3"/><path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/><path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/></svg>
                <span className="text-white text-[14px] font-bold">bogeyclub</span>
              </div>
              <span className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Socio</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[20px] font-bold" style={{ backgroundColor: profile.avatar_color ?? '#1f8a5b' }}>
                {initials}
              </div>
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

        {/* WHS differentials */}
        {diffs.length > 0 && (
          <div className="bg-white rounded-[22px] border border-[#e5e0d4] p-4 mb-3">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[15px] font-bold text-[#0e1a16]">Diferenciales WHS</h2>
              <span className="font-mono text-[10px] text-[#6b7a72]">Cuentan {nCount} de {diffs.length}</span>
            </div>
            <div className="space-y-1.5">
              {diffs.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-[#efebe1] last:border-0">
                  <div className="flex items-center gap-2">
                    {/* Green dot if counting */}
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.counting ? '#1f8a5b' : '#e5e0d4' }}/>
                    <span className="text-[12px] text-[#6b7a72]">{formatDate(d.played_at)}</span>
                  </div>
                  <span className={`font-mono text-[13px] font-bold ${d.counting ? 'text-[#1f8a5b]' : 'text-[#0e1a16]'}`}>
                    {d.diff.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            {nCount > 0 && (
              <p className="text-[11px] text-[#6b7a72] mt-3">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1f8a5b] mr-1.5"/>
                Los {nCount} mejores cuentan para tu índice
              </p>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden mb-3">
          <Link href="/ronda/campo" className="flex items-center justify-between px-4 py-3.5 border-b border-[#efebe1] active:opacity-70">
            <span className="text-[14px] font-semibold text-[#0e1a16]">Nueva ronda</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
          </Link>
          <Link href="/jugadores" className="flex items-center justify-between px-4 py-3.5 border-b border-[#efebe1] active:opacity-70">
            <span className="text-[14px] font-semibold text-[#0e1a16]">El club · jugadores</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
          </Link>
          <Link href="/stats" className="flex items-center justify-between px-4 py-3.5 border-b border-[#efebe1] active:opacity-70">
            <span className="text-[14px] font-semibold text-[#0e1a16]">Mis estadísticas</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
          </Link>
          {email === 's.vallve93@gmail.com' && (
            <Link href="/admin" className="flex items-center justify-between px-4 py-3.5 active:opacity-70">
              <span className="text-[14px] font-semibold text-[#c6432d]">Panel de administración</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#c6432d" strokeWidth="2" strokeLinecap="round"/></svg>
            </Link>
          )}
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] border-2 border-[#c6432d] text-[#c6432d] bg-white transition active:opacity-80">
          Cerrar sesión
        </button>
      </div>
      <TabBar active="perfil" />
    </div>
  )
}
