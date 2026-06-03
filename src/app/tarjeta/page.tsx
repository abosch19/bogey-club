import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { TabBar } from '@/components/ui/tab-bar'
import { Avatar } from '@/components/ui/avatar'
import { Pill } from '@/components/ui/pill'
import { scoreChipColors } from '@/lib/golf'
import { PLAYERS, ROUND, HOLE_PARS, HOLE_SI } from '@/lib/mock-data'

function ScoreCell({ score, par }: { score: number | null; par: number }) {
  if (score === null) {
    return (
      <td className="text-center px-1 py-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-medium text-[#c5bfb0]">
          —
        </span>
      </td>
    )
  }
  const delta = score - par
  const { bg, text } = scoreChipColors(delta)
  return (
    <td className="text-center px-1 py-2">
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold"
        style={{ backgroundColor: bg, color: text }}
      >
        {score}
      </span>
    </td>
  )
}

export default function TarjetaPage() {
  const frontHoles = HOLE_PARS.slice(0, 9)
  const backHoles = HOLE_PARS.slice(9, 18)

  const getPlayerTotal = (playerId: string, start: number, end: number) => {
    const scores = ROUND.scores[playerId].slice(start, end)
    const valid = scores.filter((s) => s !== null) as number[]
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) : null
  }

  const frontPar = frontHoles.reduce((a, b) => a + b, 0)
  const backPar = backHoles.reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-28">
      <div style={{ paddingTop: 'max(54px, env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          <Link href="/" className="w-8 h-8 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center">
            <ChevronLeft size={18} color="#0e1a16" />
          </Link>
          <div className="flex-1">
            <h1 className="text-[#0e1a16] text-[16px] font-bold leading-tight">{ROUND.course.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[#6b7a72] text-[12px]">{ROUND.date}</span>
              <Pill variant="blue" size="sm">◆ {ROUND.mode.toUpperCase()}</Pill>
            </div>
          </div>
        </div>

        {/* Player avatars */}
        <div className="flex items-center gap-3 px-[14px] mb-4">
          {PLAYERS.map((p, i) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <Avatar name={p.name} color={p.color} size="md" you={i === 0} />
              <span className="text-[11px] font-medium text-[#6b7a72]">{p.name}</span>
            </div>
          ))}
        </div>

        {/* Scorecard - Front 9 */}
        <div className="px-[14px] space-y-3">
          <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            <div className="px-3 py-2 bg-[#f4f1e9] border-b border-[#e5e0d4]">
              <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Ida (Hoyos 1–9)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-[#e5e0d4]">
                    <th className="text-left pl-3 pr-2 py-2 text-[11px] font-semibold text-[#6b7a72] w-20">Jugador</th>
                    {frontHoles.map((_, i) => (
                      <th key={i} className="text-center px-1 py-2 text-[11px] font-semibold text-[#6b7a72] w-8">
                        {i + 1}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 text-[11px] font-bold text-[#0e1a16] w-10">OUT</th>
                  </tr>
                  <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                    <td className="pl-3 pr-2 py-1.5 text-[10px] font-medium text-[#6b7a72]">Par</td>
                    {frontHoles.map((par, i) => (
                      <td key={i} className="text-center px-1 py-1.5 text-[11px] font-medium text-[#6b7a72]">{par}</td>
                    ))}
                    <td className="text-center px-2 py-1.5 text-[11px] font-bold text-[#0e1a16]">{frontPar}</td>
                  </tr>
                  <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                    <td className="pl-3 pr-2 py-1 text-[10px] font-medium text-[#6b7a72]">SI</td>
                    {HOLE_SI.slice(0, 9).map((si, i) => (
                      <td key={i} className="text-center px-1 py-1 text-[10px] text-[#c5bfb0]">{si}</td>
                    ))}
                    <td className="text-center px-2 py-1 text-[10px] text-[#c5bfb0]">—</td>
                  </tr>
                </thead>
                <tbody>
                  {PLAYERS.map((player) => {
                    const frontTotal = getPlayerTotal(player.id, 0, 9)
                    return (
                      <tr key={player.id} className="border-b border-[#f4f1e9] last:border-0">
                        <td className="pl-3 pr-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={player.name} color={player.color} size="sm" />
                            <span className="text-[12px] font-semibold text-[#0e1a16]">{player.name}</span>
                          </div>
                        </td>
                        {ROUND.scores[player.id].slice(0, 9).map((score, i) => (
                          <ScoreCell key={i} score={score} par={frontHoles[i]} />
                        ))}
                        <td className="text-center px-2 py-2">
                          <span className="text-[13px] font-bold text-[#0e1a16]">
                            {frontTotal ?? '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Back 9 */}
          <div className="bg-white rounded-[16px] border border-[#e5e0d4] overflow-hidden">
            <div className="px-3 py-2 bg-[#f4f1e9] border-b border-[#e5e0d4]">
              <span className="text-[11px] font-bold text-[#6b7a72] uppercase tracking-wider">Vuelta (Hoyos 10–18)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-[#e5e0d4]">
                    <th className="text-left pl-3 pr-2 py-2 text-[11px] font-semibold text-[#6b7a72] w-20">Jugador</th>
                    {backHoles.map((_, i) => (
                      <th key={i} className="text-center px-1 py-2 text-[11px] font-semibold text-[#6b7a72] w-8">
                        {i + 10}
                      </th>
                    ))}
                    <th className="text-center px-1 py-2 text-[11px] font-bold text-[#0e1a16] w-8">IN</th>
                    <th className="text-center px-2 py-2 text-[11px] font-bold text-[#0e1a16] w-10">TOT</th>
                  </tr>
                  <tr className="border-b border-[#e5e0d4] bg-[#f9f7f3]">
                    <td className="pl-3 pr-2 py-1.5 text-[10px] font-medium text-[#6b7a72]">Par</td>
                    {backHoles.map((par, i) => (
                      <td key={i} className="text-center px-1 py-1.5 text-[11px] font-medium text-[#6b7a72]">{par}</td>
                    ))}
                    <td className="text-center px-1 py-1.5 text-[11px] font-bold text-[#0e1a16]">{backPar}</td>
                    <td className="text-center px-2 py-1.5 text-[11px] font-bold text-[#0e1a16]">72</td>
                  </tr>
                </thead>
                <tbody>
                  {PLAYERS.map((player) => {
                    const backTotal = getPlayerTotal(player.id, 9, 18)
                    const frontTotal = getPlayerTotal(player.id, 0, 9)
                    const grandTotal = frontTotal !== null && backTotal !== null
                      ? frontTotal + backTotal
                      : (frontTotal ?? backTotal)
                    return (
                      <tr key={player.id} className="border-b border-[#f4f1e9] last:border-0">
                        <td className="pl-3 pr-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={player.name} color={player.color} size="sm" />
                            <span className="text-[12px] font-semibold text-[#0e1a16]">{player.name}</span>
                          </div>
                        </td>
                        {ROUND.scores[player.id].slice(9, 18).map((score, i) => (
                          <ScoreCell key={i} score={score} par={backHoles[i]} />
                        ))}
                        <td className="text-center px-1 py-2">
                          <span className="text-[13px] font-bold text-[#0e1a16]">{backTotal ?? '—'}</span>
                        </td>
                        <td className="text-center px-2 py-2">
                          <span className="text-[13px] font-bold text-[#0e1a16]">{grandTotal ?? '—'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-[14px] mt-4">
          <Link
            href="/hoyo"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-[16px] font-bold text-[15px] text-white"
            style={{ backgroundColor: '#1f8a5b' }}
          >
            <Plus size={18} />
            Anotar hoyo
          </Link>
        </div>
      </div>

      <TabBar />
    </div>
  )
}
