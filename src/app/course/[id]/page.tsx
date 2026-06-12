import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'

type Hole = { _id: Id<'holes'>; hole_number: number; par: number; stroke_index: number; distance_m: number | null }
type CourseData = NonNullable<FunctionReturnType<typeof api.courses.get>>

export default function EditCampoPage() {
  const { id } = useParams()
  const course = useQuery(api.courses.get, { courseId: id as Id<'courses'> })

  if (!course)
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )

  return <CourseEditor key={course._id} course={course} />
}

function CourseEditor({ course }: { course: CourseData }) {
  const navigate = useNavigate()
  const [holes, setHoles] = useState<Hole[]>(() =>
    course.holes.map((h: any) => ({
      _id: h._id,
      hole_number: h.hole_number,
      par: h.par,
      stroke_index: h.stroke_index,
      distance_m: h.distance_m ?? null,
    })),
  )
  const [courseName, setCourseName] = useState(course.name ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const editCourse = useMutation(api.courses.edit)

  function updateHole(holeId: Id<'holes'>, field: keyof Hole, value: string) {
    setHoles(prev =>
      prev.map(h =>
        h._id === holeId
          ? { ...h, [field]: field === 'distance_m' ? parseInt(value) || null : parseInt(value) || h[field] }
          : h,
      ),
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await editCourse({
        courseId: course._id,
        name: courseName,
        holes: holes.map(h => ({ holeId: h._id, par: h.par, stroke_index: h.stroke_index, distance_m: h.distance_m })),
      })
      setSaving(false)
      setMsg('Guardado correctamente.')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setSaving(false)
      setMsg('Error al guardar.')
    }
  }

  return (
    <div className="min-h-screen bg-paper pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-ink font-semibold text-[13px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#0e1a16"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atrás
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-full font-bold text-[13px] text-white disabled:opacity-60"
            style={{ backgroundColor: '#1f8a5b' }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {/* Course name */}
        <div className="bg-white rounded-btn border border-rule p-4 mb-3">
          <label htmlFor="course-name" className="font-mono text-[9px] text-mute uppercase tracking-wide block mb-2">
            Nombre del campo
          </label>
          <input
            id="course-name"
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            className="w-full text-[16px] font-bold text-ink bg-transparent outline-none border-b border-rule pb-1"
          />
        </div>

        {msg && <p className="text-[13px] text-accent bg-accent-light rounded-[10px] px-4 py-2.5 mb-3">{msg}</p>}

        {/* Holes table */}
        <div className="bg-white rounded-btn border border-rule overflow-hidden">
          <div className="grid grid-cols-5 gap-0 border-b border-rule-soft bg-paper">
            {['Hoyo', 'Par', 'HCP (SI)', 'Dist (m)', 'Zona'].map(h => (
              <div key={h} className="font-mono text-[9px] text-mute uppercase tracking-wide py-2.5 px-2 text-center">
                {h === 'Zona' ? '' : h}
              </div>
            ))}
          </div>
          {holes.map((h, i) => (
            <div key={h._id} className={`grid grid-cols-5 gap-0 ${i > 0 ? 'border-t border-rule-soft' : ''}`}>
              <div className="flex items-center justify-center py-2.5 px-2 font-mono text-[13px] font-bold text-ink">
                {h.hole_number}
              </div>
              {(['par', 'stroke_index', 'distance_m'] as const).map(field => (
                <div key={field} className="py-1.5 px-2">
                  <input
                    type="number"
                    aria-label={`${field === 'par' ? 'Par' : field === 'stroke_index' ? 'Stroke index' : 'Distancia en metros'} del hoyo ${h.hole_number}`}
                    value={field === 'distance_m' ? (h.distance_m ?? '') : h[field]}
                    onChange={e => updateHole(h._id, field, e.target.value)}
                    className="w-full text-center font-mono text-[13px] text-ink bg-paper rounded-[8px] py-1.5 outline-none focus:bg-accent-light transition"
                  />
                </div>
              ))}
              <div className="flex items-center justify-center py-2.5 px-2">
                {h.stroke_index <= 9 ? (
                  <span className="font-mono text-[8px] bg-blue-light text-blue px-1.5 py-0.5 rounded-full">Front</span>
                ) : (
                  <span className="font-mono text-[8px] bg-accent-light text-accent px-1.5 py-0.5 rounded-full">
                    Back
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-mute text-center mt-3">
          HCP = Stroke Index (1 = más difícil, {holes.length} = más fácil)
        </p>
      </div>
    </div>
  )
}
