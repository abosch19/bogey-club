'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Hole = { id: string; hole_number: number; par: number; stroke_index: number; distance_m: number | null }

export default function EditCampoPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [course, setCourse]   = useState<any>(null)
  const [holes, setHoles]     = useState<Hole[]>([])
  const [courseName, setCourseName] = useState('')
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: c } = await supabase.from('courses').select('*').eq('id', id).single()
      const { data: h } = await supabase.from('holes').select('*').eq('course_id', id).order('hole_number')
      setCourse(c)
      setCourseName(c?.name ?? '')
      setHoles(h ?? [])
    }
    load()
  }, [id])

  function updateHole(holeId: string, field: keyof Hole, value: string) {
    setHoles(prev => prev.map(h => h.id === holeId ? { ...h, [field]: field === 'distance_m' ? (parseInt(value) || null) : (parseInt(value) || h[field]) } : h))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/campo/editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: id, name: courseName, holes }),
    })
    setSaving(false)
    if (res.ok) { setMsg('Guardado correctamente.'); setTimeout(() => setMsg(''), 3000) }
    else setMsg('Error al guardar.')
  }

  if (!course) return <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center"><div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/></div>

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Atrás
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-full font-bold text-[13px] text-white disabled:opacity-60"
            style={{ backgroundColor: '#1f8a5b' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {/* Course name */}
        <div className="bg-white rounded-[16px] border border-[#e5e0d4] p-4 mb-3">
          <label className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide block mb-2">Nombre del campo</label>
          <input value={courseName} onChange={e => setCourseName(e.target.value)}
            className="w-full text-[16px] font-bold text-[#0e1a16] bg-transparent outline-none border-b border-[#e5e0d4] pb-1"/>
        </div>

        {msg && <p className="text-[13px] text-[#1f8a5b] bg-[#d9eedd] rounded-[10px] px-4 py-2.5 mb-3">{msg}</p>}

        {/* Holes table */}
        <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
          <div className="grid grid-cols-5 gap-0 border-b border-[#efebe1] bg-[#f4f1e9]">
            {['Hoyo', 'Par', 'HCP (SI)', 'Dist (m)', ''].map((h, i) => (
              <div key={i} className="font-mono text-[9px] text-[#6b7a72] uppercase tracking-wide py-2.5 px-2 text-center">{h}</div>
            ))}
          </div>
          {holes.map((h, i) => (
            <div key={h.id} className={`grid grid-cols-5 gap-0 ${i > 0 ? 'border-t border-[#efebe1]' : ''}`}>
              <div className="flex items-center justify-center py-2.5 px-2 font-mono text-[13px] font-bold text-[#0e1a16]">{h.hole_number}</div>
              {(['par', 'stroke_index', 'distance_m'] as const).map(field => (
                <div key={field} className="py-1.5 px-2">
                  <input
                    type="number"
                    value={field === 'distance_m' ? (h.distance_m ?? '') : h[field]}
                    onChange={e => updateHole(h.id, field, e.target.value)}
                    className="w-full text-center font-mono text-[13px] text-[#0e1a16] bg-[#f4f1e9] rounded-[8px] py-1.5 outline-none focus:bg-[#d9eedd] transition"
                  />
                </div>
              ))}
              <div className="flex items-center justify-center py-2.5 px-2">
                {h.stroke_index <= 9 ? (
                  <span className="font-mono text-[8px] bg-[#dde7fb] text-[#2a6fdb] px-1.5 py-0.5 rounded-full">Front</span>
                ) : (
                  <span className="font-mono text-[8px] bg-[#d9eedd] text-[#1f8a5b] px-1.5 py-0.5 rounded-full">Back</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#6b7a72] text-center mt-3">
          HCP = Stroke Index (1 = más difícil, {holes.length} = más fácil)
        </p>
      </div>
    </div>
  )
}
