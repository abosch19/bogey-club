import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '@convex/_generated/api'
import { formatHandicap, formatDate, countingRounds } from '@/lib/golf'

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
  const profile = useQuery(api.profiles.me)
  const rawDiffs = useQuery(api.profiles.myDifferentials)
  const recalc = useMutation(api.whs.recalc)
  const setHandicap = useMutation(api.profiles.setHandicap)
  const deleteMe = useMutation(api.profiles.deleteMe)
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const [recalculating, setRecalculating] = useState(false)

  const email = profile?.email ?? ''
  const diffs = (rawDiffs ?? []).map(x => ({ diff: x.differential, played_at: x.played_at, counting: x.is_counting }))

  async function recalculate() {
    setRecalculating(true)
    try {
      const data = await recalc({})
      alert(`Hándicap recalculado correctamente (${data.rounds_processed ?? 0} rondas procesadas)`)
    } catch (err: unknown) {
      alert('Error al recalcular: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setRecalculating(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleDeleteProfile() {
    if (!confirm('¿Borrar tu perfil? Se eliminarán tus rondas, golpes y estadísticas. Esta acción no se puede deshacer.')) return
    try {
      await deleteMe({})
      await signOut()
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      alert('No se pudo borrar el perfil: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    }
  }

  if (profile === undefined || profile === null) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  const initials = profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const nCount   = countingRounds(diffs.length)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      {/* Header sticky */}
      <div className="sticky top-0 bg-[#f4f1e9] z-40 px-[14px] pb-3 border-b border-[#e5e0d4]"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16]">Carnet</h1>
      </div>

      <div className="px-[14px] pt-4 pb-4">
        {/* Member card */}
        <div className="rounded-[22px] p-5 mb-3 relative overflow-hidden" style={{ backgroundColor: '#0e1a16' }}>
          <div className="absolute right-[-40px] top-[-40px] w-[160px] h-[160px] rounded-full" style={{ backgroundColor: '#1f8a5b', opacity: 0.85 }}/>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" fill="#9bc9a3"/><path d="M24 16 L24 50" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round"/><path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/></svg>
                <span className="text-white text-[14px] font-bold">Bogey Club</span>
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
                <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Índice golf</p>
                <p className="text-white text-[42px] font-black leading-none">{formatHandicap(profile.handicap_index)}</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">P&P</p>
                <p className="text-white text-[28px] font-black leading-none">{formatHandicap(profile.handicap_index_pp ?? null)}</p>
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
                  <div key={`${d.played_at}-${d.diff}`} className="flex items-center gap-3 py-2 border-b border-[#efebe1] last:border-0">
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

        {/* Recalcular WHS + editar hándicaps (golf / P&P) */}
        <button type="button" onClick={recalculate} disabled={recalculating}
          className="w-full py-3 rounded-[14px] text-[12px] font-semibold border border-[#e5e0d4] bg-white text-[#0e1a16] transition active:opacity-80 disabled:opacity-60 mb-2">
          {recalculating ? 'Calculando...' : 'Recalcular WHS'}
        </button>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button type="button" onClick={() => {
            const val = prompt(`Hándicap de golf (0–54):\nActual: ${profile.handicap_index?.toFixed(1) ?? '–'}`)
            if (val === null) return
            const num = parseFloat(val)
            if (isNaN(num) || num < 0 || num > 54) { alert('Valor inválido. Debe ser entre 0 y 54.'); return }
            setHandicap({ handicap_index: num })
          }}
            className="py-3 rounded-[14px] text-[12px] font-semibold border border-[#e8b75a] bg-white text-[#9b6e1a] transition active:opacity-80">
            Editar golf
          </button>
          <button type="button" onClick={() => {
            const val = prompt(`Hándicap de Pitch & Putt (0–54):\nActual: ${profile.handicap_index_pp?.toFixed(1) ?? '–'}`)
            if (val === null) return
            const num = parseFloat(val)
            if (isNaN(num) || num < 0 || num > 54) { alert('Valor inválido. Debe ser entre 0 y 54.'); return }
            setHandicap({ handicap_index_pp: num })
          }}
            className="py-3 rounded-[14px] text-[12px] font-semibold border border-[#e8b75a] bg-white text-[#9b6e1a] transition active:opacity-80">
            Editar P&P
          </button>
        </div>

        {/* ── ACCESOS ── */}
        <div className="space-y-2 mb-3">
          {/* Jugadores registrados */}
          <Link to="/players" className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#e5e0d4] active:opacity-70">
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
          <Link to="/round/course" className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#e5e0d4] active:opacity-70">
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
            <Link to="/admin" className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#fadcd6] active:opacity-70">
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
        <button type="button" onClick={handleSignOut}
          className="w-full py-3.5 rounded-[16px] font-semibold text-[15px] border-2 border-[#c6432d] text-[#c6432d] bg-white transition active:opacity-80">
          Cerrar sesión
        </button>

        {/* Delete profile — discreet */}
        <button type="button" onClick={handleDeleteProfile}
          className="block mx-auto mt-4 text-[12px] font-semibold text-[#a09a90] hover:text-[#c6432d] underline underline-offset-2 transition">
          Borrar perfil
        </button>
      </div>
    </div>
  )
}
