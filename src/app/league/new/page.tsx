import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'

const MODES = [
  { id: 'stroke',        name: 'Stroke Play',         desc: 'Menos golpes gana. El clásico.' },
  { id: 'stableford',    name: 'Stableford',           desc: 'Puntos por hoyo. Premia la regularidad.' },
  { id: 'matchplay',     name: 'Matchplay',            desc: 'Gana hoyos, sin handicap. Solo 2 jugadores.' },
  { id: 'matchplay_hcp', name: 'Matchplay c/ Hcp',    desc: 'Matchplay con golpes de ventaja por handicap.' },
  { id: 'bbb',           name: 'Bingo Bango Bongo',   desc: '3 puntos por hoyo: 1º en green, más cerca, 1º en meter.' },
  { id: 'scramble',      name: 'Scramble',             desc: 'Mejor bola en cada golpe. Por parejas si son 4+.' },
]

export default function NuevaLigaPage() {
  const navigate = useNavigate()
  const createLeague = useMutation(api.leagues.create)
  const [form, setForm] = useState({ name: '', rounds: 8, mode: 'stroke' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const { name, rounds, mode } = form

  async function handleCreate() {
    if (!name.trim()) { setError('Ponle un nombre a la liga.'); return }
    setLoading(true)
    setError('')
    try {
      await createLeague({ name: name.trim(), total_rounds: rounds, mode })
      navigate('/league')
    } catch (e: any) {
      setError(e?.message ?? 'Error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9]">
      <div className="safe-top px-[14px] pt-3 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Atrás
          </button>
        </div>

        <h1 className="text-[28px] font-black tracking-tight text-[#0e1a16] mb-6">
          Monta tu<br/><span className="text-[#1f8a5b]">liga.</span>
        </h1>

        <div className="space-y-3">
          <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
            <label htmlFor="league-name" className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-2">Nombre</label>
            <input id="league-name" value={name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Liga Bogey 2026"
              className="w-full text-[18px] font-bold text-[#0e1a16] bg-transparent outline-none placeholder-[#c4bfb5]"/>
          </div>

          <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-[14px] text-[#0e1a16]">Número de rondas</p>
              <p className="text-[12px] text-[#6b7a72] mt-0.5">Cuántas jornadas dura</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm(f => ({ ...f, rounds: Math.max(2, f.rounds - 1) }))} className="w-9 h-9 rounded-full border-2 border-[#e5e0d4] flex items-center justify-center text-[18px] text-[#6b7a72]">−</button>
              <span className="font-mono text-[22px] font-black text-[#0e1a16] w-8 text-center">{rounds}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, rounds: Math.min(30, f.rounds + 1) }))} className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] text-white" style={{ backgroundColor: '#0e1a16' }}>+</button>
            </div>
          </div>

          <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4">
            <p className="font-bold text-[14px] text-[#0e1a16] mb-3">Modalidad de la liga</p>
            <div className="space-y-2">
              {MODES.map(m => (
                <button type="button" key={m.id} onClick={() => setForm(f => ({ ...f, mode: m.id }))}
                  className="w-full flex items-center justify-between p-3 rounded-[12px] border transition text-left"
                  style={{ backgroundColor: mode === m.id ? '#0e1a16' : '#fff', borderColor: mode === m.id ? '#0e1a16' : '#e5e0d4' }}>
                  <div>
                    <p className="font-semibold text-[14px]" style={{ color: mode === m.id ? '#fff' : '#0e1a16' }}>{m.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: mode === m.id ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>{m.desc}</p>
                  </div>
                  {mode === m.id && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 ml-2"><path d="M5 13l4 4L19 7" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#f4f1e9] rounded-[14px] p-3 border border-[#e5e0d4]">
            <p className="text-[12px] text-[#6b7a72] leading-relaxed">
              Puntuación estilo F1: <strong className="text-[#0e1a16]">25-18-15-12-10-8-6-4-2-1</strong>. Solo puntúa el <strong className="text-[#0e1a16]">50% de jugadores</strong> (redondeando arriba).
            </p>
          </div>

          {error && <p className="text-[13px] text-[#c6432d] bg-[#fadcd6] rounded-[10px] px-4 py-2.5">{error}</p>}

          <button type="button" onClick={handleCreate} disabled={loading}
            className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}>
            <span>Crear liga · {MODES.find(m => m.id === mode)?.name}</span>
            <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">{loading ? '…' : 'CREAR →'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
