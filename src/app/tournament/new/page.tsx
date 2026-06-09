import { useState, useEffect, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { formatHandicap } from '@/lib/golf'

type Course  = { id: Id<'courses'>; name: string; par: number; holes_count: number }
type Player  = { id: Id<'profiles'>; name: string; handicap_index: number; avatar_color: string; group: number }

const MODES = [
  { id: 'stableford', name: 'Stableford', desc: 'Puntos por hoyo. Gana quien más acumule.' },
  { id: 'stroke',     name: 'Stroke Play', desc: 'Menos golpes gana. Suma total.' },
  { id: 'bbb',        name: 'Bingo Bango Bongo', desc: '3 puntos por hoyo. 2+ jugadores.' },
]

const groupColors = ['#2a6fdb','#1f8a5b','#c6432d','#d4a24a','#7a3fc4','#0f9c7a']

// Hybrid: handicap tiers + random within tier + snake distribution
function autoGroup(players: Player[], groupSize: number): Player[] {
  const nGroups = Math.ceil(players.length / groupSize)
  const sorted = players.toSorted((a, b) => a.handicap_index - b.handicap_index)
  // Shuffle within handicap tiers (each tier = nGroups players)
  const result: Player[] = []
  for (let t = 0; t < Math.ceil(sorted.length / nGroups); t++) {
    const tier = sorted.slice(t * nGroups, (t + 1) * nGroups)
    for (let i = tier.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tier[i], tier[j]] = [tier[j], tier[i]]
    }
    result.push(...tier)
  }
  // Snake distribution: row 0 → 1,2,3,4 / row 1 → 4,3,2,1 / etc
  return result.map((p, i) => {
    const row = Math.floor(i / nGroups)
    const col = row % 2 === 0 ? i % nGroups : nGroups - 1 - (i % nGroups)
    return { ...p, group: col + 1 }
  })
}

function NuevoTorneoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [config, setConfig] = useState<{
    name: string
    courseId: Id<'courses'> | ''
    mode: string
    groupSize: number
    search: string
  }>({ name: '', courseId: '', mode: 'stableford', groupSize: 3, search: '' })
  const [flow, setFlow] = useState<{ step: 'config'|'grupos'; saving: boolean }>({ step: 'config', saving: false })
  const [selected, setSelected] = useState<Player[]>([])
  const [groups, setGroups]   = useState<Player[]>([])

  const { name, courseId, mode, groupSize, search } = config
  const { step, saving } = flow

  const me            = useQuery(api.profiles.me)
  const coursesData   = useQuery(api.courses.list)
  const profilesData  = useQuery(api.players.all)
  const createTournament = useMutation(api.tournaments.create)

  const courses: Course[] = (coursesData ?? []).map(c => ({ id: c._id, name: c.name, par: c.par, holes_count: c.holes_count }))
  const allProfiles: Player[] = (profilesData ?? []).map(p => ({ id: p._id, name: p.name, handicap_index: p.handicap_index, avatar_color: p.avatar_color, group: 1 }))

  const loading = me === undefined || coursesData === undefined || profilesData === undefined

  // Auth gate + initial selection from URL params
  useEffect(() => {
    if (me === undefined || coursesData === undefined || profilesData === undefined) return
    if (me === null) { navigate('/login'); return }

    const allP: Player[] = (profilesData ?? []).map(p => ({ id: p._id, name: p.name, handicap_index: p.handicap_index, avatar_color: p.avatar_color, group: 1 }))

    // Pre-select players from URL params
    const preselectedIds = searchParams.get('players')?.split(',').filter(Boolean) ?? []
    const preCoursId = searchParams.get('course')
    if (preCoursId) setConfig(c => ({ ...c, courseId: preCoursId as Id<'courses'> }))
    else if (coursesData?.length) setConfig(c => ({ ...c, courseId: coursesData[0]._id }))

    if (preselectedIds.length > 0) {
      const presels = allP.filter(p => preselectedIds.includes(p.id))
      setSelected(presels.length > 0 ? presels : allP.filter(p => p.id === me._id))
    } else {
      const meP = allP.find(p => p.id === me._id)
      if (meP) setSelected([meP])
    }
  }, [me, coursesData, profilesData, navigate, searchParams])

  function togglePlayer(p: Player) {
    if (selected.find(s => s.id === p.id)) setSelected(selected.filter(s => s.id !== p.id))
    else setSelected([...selected, p])
  }

  function goToGroups() {
    if (!name || !courseId || selected.length < 2) return
    const grouped = autoGroup(selected, groupSize)
    setGroups(grouped)
    setFlow(f => ({ ...f, step: 'grupos' }))
  }

  function moveToGroup(playerId: Id<'profiles'>, newGroup: number) {
    setGroups(prev => prev.map(p => p.id === playerId ? { ...p, group: newGroup } : p))
  }

  const nGroups = Math.max(...groups.map(p => p.group), 1)

  async function handleCreate() {
    if (!courseId) return
    setFlow(f => ({ ...f, saving: true }))
    try {
      const data = await createTournament({
        name,
        course_id: courseId as Id<'courses'>,
        mode,
        players: groups.map(p => ({ id: p.id as Id<'profiles'>, group: p.group, handicap_index: p.handicap_index })),
      })
      navigate(`/tournament/${data.tournament_id}`)
    } catch (e: any) {
      alert(e?.message ?? 'Error al crear el torneo')
      setFlow(f => ({ ...f, saving: false }))
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  return (
    <div className="min-h-screen bg-[#f4f1e9]">
      <div className="safe-top px-[14px] pt-3 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button type="button" onClick={() => step === 'grupos' ? setFlow(f => ({ ...f, step: 'config' })) : navigate(-1)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
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
              {/* Torneo info card */}
              <div className="bg-[#f4f1e9] rounded-[14px] p-4 mb-3">
                <p className="font-bold text-[13px] text-[#0e1a16] mb-1">¿Qué es el Torneo del día?</p>
                <p className="text-[12px] text-[#6b7a72] leading-relaxed">
                  Juntáis a todos (6, 8, 10 jugadores...) y el sistema os divide en grupos equilibrados por hándicap.
                  Cada grupo juega su partida y al final hay un leaderboard único para todos.
                </p>
                <div className="flex gap-3 mt-3 text-[11px] text-[#6b7a72]">
                  <span className="bg-white rounded-full px-2 py-1 border border-[#e5e0d4]">Stableford</span>
                  <span className="bg-white rounded-full px-2 py-1 border border-[#e5e0d4]">Stroke</span>
                  <span className="bg-white rounded-full px-2 py-1 border border-[#e5e0d4]">BBB</span>
                </div>
              </div>

              {/* Name */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
                <label htmlFor="tournament-name" className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-2">Nombre del torneo</label>
                <input id="tournament-name" value={name} onChange={e => setConfig(c => ({ ...c, name: e.target.value }))} placeholder="Torneo del sábado"
                  className="w-full text-[16px] font-bold text-[#0e1a16] bg-transparent outline-none placeholder-[#c4bfb5]"/>
              </div>

              {/* Course */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
                <label htmlFor="tournament-course" className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-2">Campo</label>
                <select id="tournament-course" value={courseId} onChange={e => setConfig(c => ({ ...c, courseId: e.target.value as Id<'courses'> }))}
                  className="w-full text-[14px] font-semibold text-[#0e1a16] bg-transparent outline-none">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} — Par {c.par}</option>)}
                </select>
              </div>

              {/* Mode */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4" role="radiogroup" aria-label="Modalidad del torneo">
                <p className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-3">Modalidad</p>
                <div className="space-y-2">
                  {MODES.map(m => (
                    <button type="button" key={m.id} onClick={() => setConfig(c => ({ ...c, mode: m.id }))}
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

              {/* Reparto info */}
              <div className="bg-[#f4f1e9] rounded-[14px] px-4 py-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6b7a72" strokeWidth="1.8"/><path d="M12 8v4l3 3" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <p className="text-[12px] text-[#6b7a72]">Los grupos se reparten automáticamente equilibrando hándicap con algo de aleatoriedad. Podrás ajustar en el siguiente paso.</p>
              </div>

              {/* Group size */}
              <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[14px] text-[#0e1a16]">Jugadores por grupo</p>
                  <p className="text-[12px] text-[#6b7a72] mt-0.5">Grupos de {groupSize} jugadores</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" aria-label="Reducir jugadores por grupo" onClick={() => setConfig(c => ({ ...c, groupSize: Math.max(2, c.groupSize - 1) }))} className="w-9 h-9 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-[16px] text-[#6b7a72]">−</button>
                  <span className="font-mono text-[20px] font-black text-[#0e1a16] w-6 text-center">{groupSize}</span>
                  <button type="button" aria-label="Aumentar jugadores por grupo" onClick={() => setConfig(c => ({ ...c, groupSize: Math.min(4, c.groupSize + 1) }))} className="w-9 h-9 rounded-full bg-[#0e1a16] flex items-center justify-center text-[16px] text-white">+</button>
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
                  <input value={search} onChange={e => setConfig(c => ({ ...c, search: e.target.value }))} placeholder="Buscar jugador…" aria-label="Buscar jugador" className="flex-1 bg-transparent text-[13px] text-[#0e1a16] outline-none placeholder-[#a09a90]"/>
                </div>
                <div className="space-y-1.5">
                  {allProfiles.flatMap(p => {
                    if (!p.name.toLowerCase().includes(search.toLowerCase())) return []
                    const isSel = !!selected.find(s => s.id === p.id)
                    return (
                      <button type="button" key={p.id} onClick={() => togglePlayer(p)}
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

              <button type="button" onClick={goToGroups} disabled={!name || !courseId || selected.length < 2}
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
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-[24px] font-black tracking-tight text-[#0e1a16]">Ajusta los grupos</h1>
              <button type="button" onClick={() => setGroups(autoGroup(selected, groupSize))}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold border border-[#e5e0d4] bg-white text-[#6b7a72] active:opacity-70">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 3v5h5" stroke="#6b7a72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Redistribuir
              </button>
            </div>
            <p className="text-[13px] text-[#6b7a72] mb-4">Toca los números de grupo para mover jugadores.</p>

            <div className="space-y-3 mb-5">
              {Array.from({ length: nGroups }, (_, gi) => gi + 1).map(groupNum => {
                const gi = groupNum - 1
                const gPlayers = groups.filter(p => p.group === groupNum)
                return (
                  <div key={groupNum} className="bg-white rounded-[18px] border border-[#e5e0d4] overflow-hidden">
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
                            {Array.from({ length: nGroups }, (_, gi2) => gi2 + 1).flatMap(g => g === p.group ? [] : (
                              <button type="button" key={g} aria-label={`Mover a grupo ${g}`} onClick={() => moveToGroup(p.id, g)}
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

            <button type="button" onClick={handleCreate} disabled={saving}
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


export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>}><NuevoTorneoPage /></Suspense>
}
