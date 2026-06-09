import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { formatHandicap } from '@/lib/golf'

export default function AdminPage() {
  const [tab, setTab]         = useState<'usuarios'|'ligas'|'campos'>('usuarios')
  const [msg, setMsg]         = useState('')

  const me       = useQuery(api.profiles.me)
  const overview = useQuery(api.admin.overview)
  const removeLeague  = useMutation(api.leagues.remove)
  const setHandicap   = useMutation(api.profiles.setHandicap)
  const navigate = useNavigate()

  // Auth + admin gate
  useEffect(() => {
    if (me === undefined) return
    if (me === null) { navigate('/login', { replace: true }); return }
    if (!me.is_admin) { navigate('/', { replace: true }); return }
  }, [me, navigate])

  async function deleteLeague(id: Id<'leagues'>) {
    if (!confirm('¿Borrar esta liga?')) return
    await removeLeague({ league_id: id })
    setMsg('Liga borrada.')
  }

  async function updateHandicap(profileId: Id<'profiles'>, value: string) {
    const hcp = parseFloat(value)
    if (isNaN(hcp)) return
    await setHandicap({ handicap_index: hcp, profileId })
  }

  if (me === undefined || overview === undefined || !me?.is_admin) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const users   = overview?.users ?? []
  const leagues = overview?.leagues ?? []
  const courses = overview?.courses ?? []
  const myEmail = me?.email ?? ''

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/profile" className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Perfil
          </Link>
        </div>

        {/* Header */}
        <div className="rounded-[22px] p-4 mb-4 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full" style={{ backgroundColor: '#c6432d', opacity: 0.8 }}/>
          <div className="relative">
            <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.18em]">PANEL DE ADMINISTRACIÓN</p>
            <p className="text-white text-[20px] font-black mt-1">Admin · Bogey Club</p>
            <p className="text-white/50 text-[12px] mt-0.5">{myEmail}</p>
          </div>
        </div>

        {msg && <p className="text-[13px] text-[#1f8a5b] bg-[#d9eedd] rounded-[10px] px-4 py-2.5 mb-3">{msg}</p>}

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4] mb-4">
          {(['usuarios', 'ligas', 'campos'] as const).map(t => (
            <button type="button" key={t} onClick={() => setTab(t)}
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
              <div key={u._id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
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
                  <label htmlFor={`hcp-${u._id}`} className="text-[11px] text-[#6b7a72] font-medium">Editar HCP:</label>
                  <input
                    id={`hcp-${u._id}`}
                    aria-label={`Editar handicap de ${u.name}`}
                    type="number" step="0.1" min="0" max="54"
                    defaultValue={u.handicap_index.toFixed(1)}
                    onBlur={e => updateHandicap(u._id, e.target.value)}
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
              <div key={l._id} className="bg-white rounded-[16px] p-4 border border-[#e5e0d4]">
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
                  <button type="button" onClick={() => deleteLeague(l._id)}
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
              <Link key={c._id} to={`/admin/course/${c._id}`}
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
