'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap } from '@/lib/golf'

type Course  = { id: string; name: string; par: number; holes_count: number }
type Player  = { id: string; name: string; handicap_index: number; avatar_color: string; group: number }

const MODES = [
  { id: 'stableford', name: 'Stableford', desc: 'Puntos por hoyo. Gana quien más acumule.' },
  { id: 'stroke',     name: 'Stroke Play', desc: 'Menos golpes gana. Suma total.' },
  { id: 'bbb',        name: 'Bingo Bango Bongo', desc: '3 puntos por hoyo. 2+ jugadores.' },
]

function autoGroup(players: Player[], groupSize: number): Player[] {
  // Sort by handicap, then distribute in snake order for balanced groups
  const sorted = [...players].sort((a, b) => a.handicap_index - b.handicap_index)
  const nGroups = Math.ceil(players.length / groupSize)
  return sorted.map((p, i) => {
    // Snake distribution: 0,1,2,2,1,0,0,1,2...
    const row = Math.floor(i / nGroups)
    const col = row % 2 === 0 ? i % nGroups : nGroups - 1 - (i % nGroups)
    return { ...p, group: col + 1 }
  })
}

export default function NuevoTorneoPage() {
  const router = useRouter()
  const [step, setStep]       = useState<'config'|'grupos'>('config')
  const [name, setName]       = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [mode, setMode]       = useState('stableford')
  const [allProfiles, setAllProfiles] = useState<Player[]>([])
  const [selected, setSelected] = useState<Player[]>([])
  const [groups, setGroups]   = useState<Player[]>([])
  const [groupSize, setGroupSize] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [coursesRes, profilesRes] = await Promise.all([
        supabase.from('courses').select('id,name,par,holes_count').eq('active', true).order('name'),
        supabase.from('profiles').select('id,name,handicap_index,avatar_color').order('handicap_index'),
      ])
      setCourses(coursesRes.data ?? [])
      const me = profilesRes.data?.find(p => p.id === user.id)
      setAllProfiles((profilesRes.data ?? []).map(p => ({ ...p, group: 1 })))
      if (me) setSelected([{ ...me, group: 1 }])
      if (coursesRes.data?.length) setCourseId(coursesRes.data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  function togglePlayer(p: Player) {
    if (selected.find(s => s.id === p.id)) setSelected(selected.filter(s => s.id !== p.id))
    else setSelected([...selected, p])
  }

  function goToGroups() {
    if (!name || !courseId || selected.length < 2) return
    const grouped = autoGroup(selected, groupSize)
    setGroups(grouped)
    setStep('grupos')
  }

  function moveToGroup(playerId: string, newGroup: number) {
    setGroups(prev => prev.map(p => p.id === playerId ? { ...p, group: newGroup } : p))
  }

  const nGroups = Math.max(...groups.map(p => p.group), 1)
  const groupColors = ['#2a6fdb','#1f8a5b','#c6432d','#d4a24a','#7a3fc4','#0f9c7a']

  async function handleCreate() {
    setSaving(true)
    const res = await fetch('/api/torneo/crear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, course_id: courseId, mode, players: groups }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setSaving(false); return }
    router.push(`/torneo/${data.tournament_id}`)
  }

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  return (
    <div className="min-h-screen bg-[#f4f1e9]">
      <div className="safe-top px-[14px] pt-3 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => step === 'grupos' ? setStep('config') : router.back()} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {step === 'grupos' ? 'Configuración' : 'Atrás'}
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-wide">
            {step === 'config' ? 'TORNEO · 1/2' : 'TORNEO · 2/2'}
          </span>
        </div>

        {step === 'config' && (
          <>
            <h1 className="text-[28px] font-black tracking-tight text-[#0e1a16] mb-5">
              Torneo del<br/><span className="text-[#1f8a5b]">día.</span>
            </h1>

            <div className="space-y-3">
              {/* Name */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
                <label className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-2">Nombre del torneo</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Torneo del sábado"
                  className="w-full text-[16px] font-bold text-[#0e1a16] bg-transparent outline-none placeholder-[#c4bfb5]"/>
              </div>

              {/* Course */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
                <label className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-2">Campo</label>
                <select value={courseId} onChange={e => setCourseId(e.target.value)}
                  className="w-full text-[14px] font-semibold text-[#0e1a16] bg-transparent outline-none">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} — Par {c.par}</option>)}
                </select>
              </div>

              {/* Mode */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
                <label className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-3">Modalidad</label>
                <div className="space-y-2">
                  {MODES.map(m => (
                    <button key={m.id} onClick={() => setMode(m.id)}
                      className="w-full flex items-center justify-between p-3 rounded-[12px] border transition text-left"
                      style={{ backgroundColor: mode === m.id ? '#0e1a16' : '#f4f1e9', borderColor: mode === m.id ? '#0e1a16' : '#e5e0d4' }}>
                      <div>
                        <p className="font-bold text-[13px]" style={{ color: mode === m.id ? '#fff' : '#0e1a16' }}>{m.name}</p>
                        <p className="text-[11px]" style={{ color: mode === m.id ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>{m.desc}</p>
                      </div>
                      {mode === m.id && <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group size */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[14px] text-[#0e1a16]">Jugadores por grupo</p>
                  <p className="text-[12px] text-[#6b7a72] mt-0.5">Grupos de {groupSize} jugadores</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setGroupSize(Math.max(2, groupSize - 1))} className="w-9 h-9 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-[16px] text-[#6b7a72]">−</button>
                  <span className="font-mono text-[20px] font-black text-[#0e1a16] w-6 text-center">{groupSize}</span>
                  <button onClick={() => setGroupSize(Math.min(4, groupSize + 1))} className="w-9 h-9 rounded-full bg-[#0e1a16] flex items-center justify-center text-[16px] text-white">+</button>
                </div>
              </div>

              {/* Players */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="font-bold text-[14px] text-[#0e1a16]">Jugadores ({selected.length})</p>
                  <p className="text-[12px] text-[#6b7a72]">{Math.ceil(selected.length / groupSize)} grupos</p>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2.5 border border-[#e5e0d4] mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8"/><path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador…" className="flex-1 bg-transparent text-[13px] text-[#0e1a16] outline-none placeholder-[#a09a90]"/>
                </div>
                <div className="space-y-1.5">
                  {allProfiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => {
                    const isSel = !!selected.find(s => s.id === p.id)
                    return (
                      <button key={p.id} onClick={() => togglePlayer(p)}
                        className="w-full flex items-center gap-3 rounded-[14px] p-3 border transition"
                        style={{ backgroundColor: isSel ? '#0e1a16' : '#fff', borderColor: isSel ? '#0e1a16' : '#e5e0d4' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-[13px]" style={{ color: isSel ? '#fff' : '#0e1a16' }}>{p.name}</p>
                          <p className="font-mono text-[10px]" style={{ color: isSel ? 'rgba(255,255,255,0.5)' : '#6b7a72' }}>HCP {formatHandicap(p.handicap_index)}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: isSel ? '#1f8a5b' : 'transparent', border: isSel ? 'none' : '1.5px solid #e5e0d4' }}>
                          {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button onClick={goToGroups} disabled={!name || !courseId || selected.length < 2}
                className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-40"
                style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
                <span>Crear grupos automáticos</span>
                <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">SIGUIENTE →</span>
              </button>
            </div>
          </>
        )}

        {step === 'grupos' && (
          <>
            <h1 className="text-[24px] font-black tracking-tight text-[#0e1a16] mb-1">Ajusta los grupos</h1>
            <p className="text-[13px] text-[#6b7a72] mb-5">Grupos creados por hándicap. Arrastra o toca para mover jugadores.</p>

            <div className="space-y-3 mb-5">
              {Array.from({ length: nGroups }, (_, gi) => {
                const gPlayers = groups.filter(p => p.group === gi + 1)
                return (
                  <div key={gi} className="bg-white rounded-[18px] border border-[#e5e0d4] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#efebe1]" style={{ backgroundColor: groupColors[gi] + '18' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-black" style={{ backgroundColor: groupColors[gi] }}>
                        {gi + 1}
                      </div>
                      <p className="font-bold text-[14px] text-[#0e1a16]">Grupo {gi + 1}</p>
                      <span className="font-mono text-[10px] text-[#6b7a72] ml-auto">{gPlayers.length} jugadores</span>
                    </div>
                    <div className="divide-y divide-[#efebe1]">
                      {gPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: p.avatar_color }}>{p.name[0]}</div>
                          <div className="flex-1">
                            <p className="font-semibold text-[13px] text-[#0e1a16]">{p.name}</p>
                            <p className="font-mono text-[10px] text-[#6b7a72]">HCP {formatHandicap(p.handicap_index)}</p>
                          </div>
                          {/* Move to other group */}
                          <div className="flex gap-1">
                            {Array.from({ length: nGroups }, (_, gi2) => gi2 + 1).filter(g => g !== p.group).map(g => (
                              <button key={g} onClick={() => moveToGroup(p.id, g)}
                                className="w-7 h-7 rounded-full text-white text-[11px] font-black"
                                style={{ backgroundColor: groupColors[g - 1] }}>
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={handleCreate} disabled={saving}
              className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
              <span>Iniciar torneo · {nGroups} grupos</span>
              <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">{saving ? '…' : 'EMPEZAR →'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
