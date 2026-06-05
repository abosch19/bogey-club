'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap } from '@/lib/golf'

const ADMIN_EMAIL = 's.vallve93@gmail.com'

type User = { id: string; name: string; handicap_index: number; avatar_color: string; email?: string }
type League = { id: string; name: string; mode: string; total_rounds: number; created_by: string; active: boolean; creator_name: string }

export default function AdminPage() {
  const [tab, setTab]         = useState<'usuarios'|'ligas'|'campos'>('usuarios')
  const [users, setUsers]     = useState<User[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [myEmail, setMyEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg]         = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setMyEmail(user.email ?? '')
      if (user.email !== ADMIN_EMAIL) { window.location.href = '/'; return }

      const { data: profiles } = await supabase.from('profiles').select('*').order('created_at')
      setUsers(profiles ?? [])

      const { data: ls } = await supabase.from('leagues').select('*, profiles(name)').order('created_at', { ascending: false })
      setLeagues((ls ?? []).map((l: any) => ({ ...l, creator_name: l.profiles?.name ?? '–' })))

      const { data: cs } = await supabase.from('courses').select('id, name, holes_count, par, slope, course_rating, record_score').order('name')
      setCourses(cs ?? [])

      setLoading(false)
    }
    load()
  }, [])

  async function deleteLeague(id: string) {
    if (!confirm('¿Borrar esta liga?')) return
    await fetch('/api/liga/borrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ league_id: id }) })
    setLeagues(prev => prev.filter(l => l.id !== id))
    setMsg('Liga borrada.')
  }

  async function updateHandicap(userId: string, value: string) {
    const hcp = parseFloat(value)
    if (isNaN(hcp)) return
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handicap_index: hcp, user_id: userId }) })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, handicap_index: hcp } : u))
  }

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/perfil" className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Perfil
          </Link>
        </div>

        {/* Header */}
        <div className="rounded-[22px] p-4 mb-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: '#c6432d', opacity: 0.8 }}/>
          <div className="relative">
            <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">PANEL DE ADMINISTRACIÓN</p>
            <p className="text-white text-[20px] font-black mt-1">Admin · Bogey-Club</p>
            <p className="text-white/50 text-[12px] mt-0.5">{myEmail}</p>
          </div>
        </div>

        {msg && <p className="text-[13px] text-[#1f8a5b] bg-[#d9eedd] rounded-[10px] px-4 py-2.5 mb-3">{msg}</p>}

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4] mb-4">
          {(['usuarios', 'ligas', 'campos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-full text-[12px] font-bold capitalize transition"
              style={{ backgroundColor: tab === t ? '#0e1a16' : 'transparent', color: tab === t ? '#fff' : '#6b7a72' }}>
              {t} {t === 'usuarios' ? `(${users.length})` : t === 'ligas' ? `(${leagues.length})` : `(${courses.length})`}
            </button>
          ))}
        </div>

        {/* USUARIOS */}
        {tab === 'usuarios' && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[14px] font-bold" style={{ backgroundColor: u.avatar_color }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[14px] text-[#0e1a16]">{u.name}</p>
                    <p className="text-[11px] text-[#6b7a72]">HCP {formatHandicap(u.handicap_index)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-[#6b7a72] font-medium">Editar HCP:</label>
                  <input
                    type="number" step="0.1" min="0" max="54"
                    defaultValue={u.handicap_index.toFixed(1)}
                    onBlur={e => updateHandicap(u.id, e.target.value)}
                    className="flex-1 border border-[#e5e0d4] rounded-[8px] px-3 py-1.5 text-[13px] font-mono text-[#0e1a16] outline-none focus:border-[#1f8a5b]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIGAS */}
        {tab === 'ligas' && (
          <div className="space-y-2">
            {leagues.length === 0 && <p className="text-center text-[#6b7a72] text-[14px] py-6">No hay ligas.</p>}
            {leagues.map(l => (
              <div key={l.id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-[14px] text-[#0e1a16]">{l.name}</p>
                    <p className="text-[11px] text-[#6b7a72] mt-0.5">
                      {l.mode} · {l.total_rounds} jornadas · por {l.creator_name}
                    </p>
                    <span className={`inline-block mt-1 font-mono text-[9px] px-2 py-0.5 rounded-full uppercase ${l.active ? 'bg-[#d9eedd] text-[#1f8a5b]' : 'bg-[#f4f1e9] text-[#6b7a72]'}`}>
                      {l.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <button onClick={() => deleteLeague(l.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold text-[#c6432d] border border-[#c6432d] hover:bg-[#fadcd6] transition">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#c6432d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CAMPOS */}
        {tab === 'campos' && (
          <div className="space-y-2">
            {courses.map(c => (
              <Link key={c.id} href={`/admin/campo/${c.id}`}
                className="bg-white rounded-[16px] p-4 border border-[#e5e0d4] flex items-center gap-3 block active:opacity-80">
                <div className="flex-1">
                  <p className="font-bold text-[14px] text-[#0e1a16]">{c.name}</p>
                  <p className="text-[11px] text-[#6b7a72] mt-0.5">
                    Par {c.par} · {c.holes_count} hoyos · Slope {c.slope} · CR {c.course_rating}
                  </p>
                  {c.record_score && <p className="text-[11px] text-[#e8b75a] mt-0.5">Récord: {c.record_score}</p>}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round"/></svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
