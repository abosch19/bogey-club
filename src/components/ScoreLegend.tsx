// Legend under the scorecard table: score-mark shapes (stroke) or point
// colors (stableford). Shared by /scorecard and the public share view.

import type { ViewMode } from '@/components/ScorecardTable'

export function ScoreLegend({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
      {viewMode === 'stroke' ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-[1.5px] border-[#0e1a16] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border border-[#0e1a16]" />
            </div>
            <span className="text-[10px] text-[#6b7a72]">Eagle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-[1.5px] border-[#0e1a16]" />
            <span className="text-[10px] text-[#6b7a72]">Birdie</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#6b7a72]">Par</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] border-[1.5px] border-[#0e1a16]" />
            <span className="text-[10px] text-[#6b7a72]">Bogey</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] border-[1.5px] border-[#0e1a16] flex items-center justify-center">
              <div className="w-2 h-2 rounded-[1px] border border-[#0e1a16]" />
            </div>
            <span className="text-[10px] text-[#6b7a72]">Doble+</span>
          </div>
        </>
      ) : viewMode === 'stableford' ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#dde7fb]" />
            <span className="text-[10px] text-[#6b7a72]">3-4 pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#d9eedd]" />
            <span className="text-[10px] text-[#6b7a72]">2 pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#f6e6c4]" />
            <span className="text-[10px] text-[#6b7a72]">1 pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-[#fadcd6]" />
            <span className="text-[10px] text-[#6b7a72]">0 pts</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
