// Share button for the scorecard: renders the round as a PNG (front and back
// nines stacked per player) and hands it to the native share sheet, where
// WhatsApp is one tap away. Falls back to downloading the image on browsers
// without file sharing (desktop).

import { useState } from 'react'
import { renderScorecardImage, type ShareHole, type SharePlayer } from '@/lib/scorecard-image'

type ShareScorecardButtonProps = {
  courseName: string
  dateLabel: string
  holesLabel: string
  groups: ShareHole[][]
  players: SharePlayer[]
  getScore: (playerId: string, holeNumber: number) => number | null
}

export function ShareScorecardButton({
  courseName,
  dateLabel,
  holesLabel,
  groups,
  players,
  getScore,
}: ShareScorecardButtonProps) {
  const [busy, setBusy] = useState(false)

  const hasScores = players.some(p => groups.some(g => g.some(h => getScore(p.id, h.hole_number) != null)))
  if (!hasScores) return null

  async function handleShare() {
    setBusy(true)
    try {
      const blob = await renderScorecardImage({ courseName, dateLabel, holesLabel, groups, players, getScore })
      // iOS shows the filename as the share-sheet header (it ignores `title`),
      // so make it readable: "Tarjeta Golf Barcelona - Masía 06-06-2026.png".
      const safeCourse = courseName.replace(/[\\/:*?"<>|]/g, '').trim()
      const file = new File([blob], `Tarjeta ${safeCourse} ${dateLabel.replaceAll('/', '-')}.png`, {
        type: 'image/png',
      })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Tarjeta · ${courseName}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      // User closing the share sheet is not an error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        alert('No se pudo generar la imagen de la tarjeta')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      aria-label="Compartir tarjeta"
      className="w-8 h-8 rounded-full bg-[#f4f1e9] border border-[#e5e0d4] flex items-center justify-center active:scale-95 transition disabled:opacity-50"
    >
      {busy ? (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#6b7a72] border-t-transparent animate-spin" />
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v12M12 3l-4 4M12 3l4 4"
            stroke="#6b7a72"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"
            stroke="#6b7a72"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
