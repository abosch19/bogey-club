import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TabBar } from '@/components/ui/tab-bar'
import { formatHandicap, handicapIndex } from '@/lib/golf'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function WHSPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, handicap_index')
    .eq('id', user.id)
    .single()

  // Fetch last 20 differentials
  const { data: differentials } = await supabase
    .from('whs_differentials')
    .select('*')
    .eq('profile_id', user.id)
    .order('played_at', { ascending: false })
    .limit(20)

  const diffs = differentials ?? []
  const sortedByDiff = [...diffs].sort((a, b) => a.differential - b.differential)

  // Determine how many count (progressive table)
  const n = diffs.length
  let countingCount = 0
  if (n >= 20) countingCount = 8
  else if (n >= 19) countingCount = 7
  else if (n >= 17) countingCount = 6
  else if (n >= 15) countingCount = 5
  else if (n >= 12) countingCount = 4
  else if (n >= 9) countingCount = 3
  else if (n >= 6) countingCount = 2
  else if (n >= 4) countingCount = 1

  const countingIds = new Set(sortedByDiff.slice(0, countingCount).map((d) => d.id))
  const allDiffValues = diffs.map((d) => d.differential)
  const computedIndex = n >= 4 ? handicapIndex(allDiffValues) : null

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <Link href="/carnet" className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center">
            <ChevronLeft size={18} color="#0e1a16" />
          </Link>
          <h1 className="text-[#0e1a16] text-[17px] font-bold">Índice WHS</h1>
        </div>

        <div className="px-[14px] space-y-3">
          {/* Big index card */}
          <div className="rounded-[22px] p-5 overflow-hidden relative" style={{ backgroundColor: '#0e1a16' }}>
            <div className="relative">
              <p className="text-[#6b7a72] text-[11px] font-mono uppercase tracking-wider mb-2">Tu índice WHS</p>
              <p className="text-white font-black leading-none mb-2" style={{ fontSize: 84 }}>
                {formatHandicap(profile?.handicap_index ?? computedIndex)}
              </p>
              <p className="text-[#6b7a72] text-[12px]">
                {n >= 4
                  ? `${countingCount} mejores de ${n} rondas registradas`
                  : `Necesitas ${4 - n} ronda${4 - n !== 1 ? 's' : ''} más para calcular tu índice`}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-[#dde7fb] rounded-[16px] p-4 border border-[#2a6fdb]/20">
            <p className="text-[#2a6fdb] text-[12px] font-semibold mb-1">Cómo funciona el WHS</p>
            <p className="text-[#2a6fdb]/80 text-[12px] leading-relaxed">
              Diferencial = (113 ÷ Slope) × (Score − Course Rating).
              Se usan las <strong>{countingCount || '?'} mejores</strong> de las últimas {Math.min(n, 20)} rondas.
              Las rondas que cuentan aparecen marcadas en verde.
            </p>
          </div>

          {/* Differentials list */}
          {diffs.length > 0 ? (
            <div className="bg-white rounded-[22px] border border-[#e5e0d4] overflow-hidden">
              <div className="px-4 py-3 bg-[#f4f1e9] border-b border-[#e5e0d4] flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">
                  Diferenciales ({n})
                </span>
                {countingCount > 0 && (
                  <span className="text-[11px] text-[#1f8a5b] font-semibold">
                    {countingCount} cuentan
                  </span>
                )}
              </div>
              <div className="divide-y divide-[#f4f1e9]">
                {diffs.map((d) => {
                  const counting = countingIds.has(d.id)
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ backgroundColor: counting ? '#f0faf4' : undefined }}
                    >
                      {counting && (
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: '#1f8a5b' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#0e1a16] text-[13px] font-semibold">{formatDate(d.played_at)}</p>
                        <p className="text-[#6b7a72] text-[11px]">
                          Score {d.adjusted_gross_score} · CR {d.course_rating} · Slope {d.slope}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p
                          className="text-[16px] font-bold"
                          style={{ color: counting ? '#1f8a5b' : '#0e1a16' }}
                        >
                          {d.differential.toFixed(1)}
                        </p>
                        {counting && (
                          <span className="px-2 py-0.5 bg-[#d9eedd] text-[#1f8a5b] text-[10px] font-bold rounded-full uppercase">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[22px] p-8 border border-[#e5e0d4] text-center">
              <p className="text-[#6b7a72] text-[14px]">Sin diferenciales todavía</p>
              <p className="text-[#6b7a72] text-[12px] mt-1">
                Firma y guarda rondas para calcular tu índice WHS
              </p>
            </div>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  )
}
