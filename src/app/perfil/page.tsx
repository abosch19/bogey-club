'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap, formatDate, countingRounds } from '@/lib/golf'
import { TabBar } from '@/components/ui/tab-bar'

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
      <TabBar />
    </div>
  )
}
