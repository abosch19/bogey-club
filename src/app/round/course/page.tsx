import { useState, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { Drawer } from 'vaul'

type Course = {
  _id: Id<'courses'>
  name: string
  holes_count: number
  par: number
  slope: number
  course_rating: number
  record_score: number | null
  myScores: number[]
}

const isPP = (name: string) => name.startsWith('P&P')

function SeleccionarCampoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPractice = searchParams.get('practice') === 'true'
  const leagueId   = searchParams.get('league') ?? ''

  const courses = useQuery(api.courses.listForNewRound) as Course[] | undefined
  const loading = courses === undefined
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState<'golf' | 'pp'>('golf')
  // Hole-selection modal state grouped into one object
  type HoleMode = 'all' | 'front' | 'back' | '9_once' | '9_twice'
  const [modal, setModal] = useState<{ selected: Course | null; show: boolean; holeMode: HoleMode }>({
    selected: null,
    show: false,
    holeMode: 'all',
  })
  const { selected, show: showHoleModal, holeMode } = modal
  const setSelected = (selected: Course | null) => setModal(m => ({ ...m, selected }))
  const setShowHoleModal = (show: boolean) => setModal(m => ({ ...m, show }))
  const setHoleMode = (holeMode: HoleMode) => setModal(m => ({ ...m, holeMode }))

  const searchLower = search.toLowerCase()
  const filtered = (courses ?? []).filter(c =>
    (tab === 'pp' ? isPP(c.name) : !isPP(c.name)) &&
    c.name.toLowerCase().includes(searchLower)
  )

  function handleCourseSelect(course: Course) {
    setSelected(course)
    setShowHoleModal(true)
    // default mode
    setHoleMode(course.holes_count === 9 ? '9_once' : 'all')
  }

  function handleNext() {
    if (!selected) return
    const params = new URLSearchParams({
      course: selected._id,
      practice: String(isPractice),
      hole_mode: holeMode,
      ...(leagueId ? { league: leagueId } : {}),
    })
    navigate(`/round/players?${params}`)
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      {/* Header */}
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Atrás
          </button>
          <span className="font-mono text-[10px] text-[#6b7a72] uppercase tracking-[0.15em]">
            NUEVA RONDA · 1 / 3
          </span>
        </div>

        <h1 className="text-[30px] font-black tracking-tight text-[#0e1a16] leading-tight mb-1">
          ¿Dónde<br/><span className="text-[#1f8a5b]">jugamos hoy?</span>
        </h1>

        {/* Golf / P&P tabs */}
        <div className="flex gap-1.5 bg-white rounded-full p-1 border border-[#e5e0d4] mt-4 mb-3">
          {([['golf', 'Golf'], ['pp', 'Pitch & Putt']] as const).map(([key, label]) => (
            <button type="button" key={key} onClick={() => { setTab(key); setSelected(null) }}
              className="flex-1 py-2 rounded-full text-[13px] font-bold transition"
              style={{ backgroundColor: tab === key ? '#0e1a16' : 'transparent', color: tab === key ? '#fff' : '#6b7a72' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#e5e0d4]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8"/><path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            aria-label="Buscar campo"
            placeholder="Buscar campo…"
            className="flex-1 bg-transparent text-[14px] text-[#0e1a16] placeholder-[#a09a90] outline-none"
          />
        </div>
      </div>

      {/* Course list */}
      <div className="flex-1 px-[14px] pb-32 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="w-6 h-6 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[#6b7a72] text-[14px] pt-10">No hay campos con ese nombre</p>
        ) : filtered.map(course => {
          const isSel = selected?._id === course._id
          return (
            <div
              key={course._id}
              className="relative w-full text-left rounded-[16px] p-4 border transition-all active:scale-[0.99]"
              style={{
                backgroundColor: isSel ? '#0e1a16' : '#ffffff',
                borderColor: isSel ? '#0e1a16' : '#e5e0d4',
              }}
            >
              <button
                type="button"
                onClick={() => handleCourseSelect(course)}
                aria-label={`Seleccionar ${course.name}`}
                className="absolute inset-0 rounded-[16px] cursor-pointer"
              />
              <div className="relative pointer-events-none flex items-center gap-3">
                {/* Icon */}
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSel ? 'rgba(255,255,255,0.12)' : '#d9eedd' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 18 Q8 6 14 12 T20 8" stroke={isSel ? '#fff' : '#1f8a5b'} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                    <circle cx="20" cy="8" r="1.8" fill={isSel ? '#fff' : '#1f8a5b'}/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[15px] leading-tight" style={{ color: isSel ? '#fff' : '#0e1a16' }}>
                      {course.name}
                    </p>
                    <button type="button" onClick={e => { e.stopPropagation(); navigate(`/course/${course._id}`) }}
                      className="pointer-events-auto relative font-mono text-[9px] px-2 py-0.5 rounded-full font-bold transition"
                      style={{ backgroundColor: isSel ? 'rgba(255,255,255,0.15)' : '#f4f1e9', color: isSel ? '#fff' : '#6b7a72' }}>
                      Editar
                    </button>
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: isSel ? 'rgba(255,255,255,0.18)' : '#f4f1e9', color: isSel ? '#fff' : '#6b7a72' }}>
                      {course.holes_count} hoyos
                    </span>
                  </div>
                  <p className="font-mono text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: isSel ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>
                    Par {course.par}{course.record_score ? ` · Récord ${course.record_score}` : ''}
                  </p>
                  {course.myScores?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {course.myScores.slice(0, 3).map((s, i) => (
                        <span key={`${s}-${i}`} className="font-mono text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: isSel ? 'rgba(255,255,255,0.18)' : '#d9eedd', color: isSel ? '#fff' : '#1f8a5b' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Checkmark */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSel ? '#1f8a5b' : 'transparent', border: isSel ? 'none' : '1.5px solid #e5e0d4' }}>
                  {isSel && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA fixed bottom */}
      {/* Hole selection bottom sheet (Vaul) */}
      <Drawer.Root open={showHoleModal} onOpenChange={(o) => { if (!o) { setShowHoleModal(false); setSelected(null) } }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }} />
          <Drawer.Content aria-describedby={undefined} className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-[28px] p-6 pb-10 outline-none">
            <div className="w-10 h-1 rounded-full bg-[#e5e0d4] mx-auto mb-5"/>
            {selected && (<>
            <Drawer.Title className="text-[20px] font-black text-[#0e1a16] mb-1">{selected.name}</Drawer.Title>
            <p className="text-[13px] text-[#6b7a72] mb-5">
              {selected.holes_count === 9 ? '¿Cuántos hoyos vais a jugar?' : '¿Qué parte del campo jugáis?'}
            </p>
            <div className="space-y-2 mb-5">
              {selected.holes_count === 9 ? (
                <>
                  <button type="button" onClick={() => setHoleMode('9_once')}
                    className="w-full flex items-center justify-between p-4 rounded-[16px] border transition"
                    style={{ backgroundColor: holeMode === '9_once' ? '#0e1a16' : '#fff', borderColor: holeMode === '9_once' ? '#0e1a16' : '#e5e0d4' }}>
                    <div className="text-left">
                      <p className="font-bold text-[14px]" style={{ color: holeMode === '9_once' ? '#fff' : '#0e1a16' }}>9 hoyos</p>
                      <p className="text-[12px]" style={{ color: holeMode === '9_once' ? 'rgba(255,255,255,0.6)' : '#6b7a72' }}>Una vuelta estándar</p>
                    </div>
                    {holeMode === '9_once' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                  <button type="button" onClick={() => setHoleMode('9_twice')}
                    className="w-full flex items-center justify-between p-4 rounded-[16px] border transition"
                    style={{ backgroundColor: holeMode === '9_twice' ? '#0e1a16' : '#fff', borderColor: holeMode === '9_twice' ? '#0e1a16' : '#e5e0d4' }}>
                    <div className="text-left">
                      <p className="font-bold text-[14px]" style={{ color: holeMode === '9_twice' ? '#fff' : '#0e1a16' }}>18 hoyos (vuelta completa)</p>
                      <p className="text-[12px]" style={{ color: holeMode === '9_twice' ? 'rgba(255,255,255,0.6)' : '#6b7a72' }}>Los 9 hoyos jugados dos veces</p>
                    </div>
                    {holeMode === '9_twice' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                </>
              ) : (
                <>
                  {[
                    { key: 'all',   label: '18 hoyos completos', sub: 'Todos los hoyos (1-18)' },
                    { key: 'front', label: 'Primera vuelta',      sub: 'Solo los hoyos 1-9' },
                    { key: 'back',  label: 'Segunda vuelta',      sub: 'Solo los hoyos 10-18' },
                  ].map(opt => (
                    <button type="button" key={opt.key} onClick={() => setHoleMode(opt.key as any)}
                      className="w-full flex items-center justify-between p-4 rounded-[16px] border transition"
                      style={{ backgroundColor: holeMode === opt.key ? '#0e1a16' : '#fff', borderColor: holeMode === opt.key ? '#0e1a16' : '#e5e0d4' }}>
                      <div className="text-left">
                        <p className="font-bold text-[14px]" style={{ color: holeMode === opt.key ? '#fff' : '#0e1a16' }}>{opt.label}</p>
                        <p className="text-[12px]" style={{ color: holeMode === opt.key ? 'rgba(255,255,255,0.6)' : '#6b7a72' }}>{opt.sub}</p>
                      </div>
                      {holeMode === opt.key && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#1f8a5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowHoleModal(false); setSelected(null) }}
                className="flex-1 py-3.5 rounded-full border border-[#e5e0d4] font-semibold text-[14px] text-[#6b7a72]">
                Cancelar
              </button>
              <button type="button" onClick={() => { setShowHoleModal(false); handleNext() }}
                className="flex-1 py-3.5 rounded-full font-bold text-[14px] text-[#0e1a16]"
                style={{ backgroundColor: '#1f8a5b' }}>
                Siguiente →
              </button>
            </div>
            </>)}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {selected && !showHoleModal && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
          <button
            type="button"
            onClick={() => setShowHoleModal(true)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] text-[#0e1a16] transition active:scale-[0.98]"
            style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}
          >
            <span>{selected.name}</span>
            <span className="bg-[#0e1a16] text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
              SIGUIENTE →
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>}><SeleccionarCampoPage /></Suspense>
}
