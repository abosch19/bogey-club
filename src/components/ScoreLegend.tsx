// Legend under the scorecard table: score-mark shapes (stroke) or point
// colors (stableford). Shared by /scorecard and the public share view.

import type { ViewMode } from '@/components/ScorecardTable'

export function ScoreLegend({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
      {viewMode === 'stroke' ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-[1.5px] border-ink flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border border-ink" />
            </div>
            <span className="text-[10px] text-mute">Eagle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-[1.5px] border-ink" />
            <span className="text-[10px] text-mute">Birdie</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-mute">Par</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] border-[1.5px] border-ink" />
            <span className="text-[10px] text-mute">Bogey</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] border-[1.5px] border-ink flex items-center justify-center">
              <div className="w-2 h-2 rounded-[1px] border border-ink" />
            </div>
            <span className="text-[10px] text-mute">Doble+</span>
          </div>
        </>
      ) : viewMode === 'stableford' ? (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-blue-light" />
            <span className="text-[10px] text-mute">3-4 pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-accent-light" />
            <span className="text-[10px] text-mute">2 pts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-amber-light" />
            <span className="text-[10px] text-mute">1 pt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-[3px] bg-red-light" />
            <span className="text-[10px] text-mute">0 pts</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
