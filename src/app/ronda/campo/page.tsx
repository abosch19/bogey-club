'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Course = {
  id: string
  name: string
  holes_count: number
  par: number
  slope: number
  course_rating: number
  record_score: number | null
}

function SeleccionarCampoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPractice = searchParams.get('practice') === 'true'

  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('courses').select('id,name,holes_count,par,slope,course_rating,record_score').eq('active', true).order('name')
      .then(({ data }) => { setCourses(data ?? []); setLoading(false) })
  }, [])

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function handleNext() {
    if (!selected) return
    const params = new URLSearchParams({ course: selected.id, practice: String(isPractice) })
    router.push(`/ronda/jugadores?${params}`)
  }

  return (
    <div className="min-h-screen bg-[#f4f1e9] flex flex-col">
      {/* Header */}
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
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

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#e5e0d4] mt-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8"/><path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
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
          const isSel = selected?.id === course.id
          return (
            <button
              key={course.id}
              onClick={() => setSelected(isSel ? null : course)}
              className="w-full text-left rounded-[16px] p-4 border transition-all active:scale-[0.99]"
              style={{
                backgroundColor: isSel ? '#0e1a16' : '#ffffff',
                borderColor: isSel ? '#0e1a16' : '#e5e0d4',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSel ? 'rgba(255,255,255,0.12)' : '#d9eedd' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 18 Q8 6 14 12 T20 8" stroke={isSel ? '#fff' : '#1f8a5b'} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                    <circle cx="20" cy="8" r="1.8" fill={isSel ? '#fff' : '#1f8a5b'}/>
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] leading-tight" style={{ color: isSel ? '#fff' : '#0e1a16' }}>
                    {course.name}
                  </p>
                  <p className="font-mono text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: isSel ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>
                    Par {course.par} · {course.holes_count} hoyos
                    {course.record_score ? ` · Récord ${course.record_score}` : ''}
                  </p>
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
            </button>
          )
        })}
      </div>

      {/* CTA fixed bottom */}
      {selected && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-[#f4f1e9] to-transparent">
          <button
            onClick={handleNext}
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
