// Share button for the scorecard: opens a bottom sheet with two options —
// share the round as a PNG (front and back nines stacked per player, WhatsApp
// one tap away via the native share sheet) or share a public link to the
// read-only view at /s/:roundId that anyone can open without an account.

import { useState } from 'react'
import { Drawer } from 'vaul'
import { renderScorecardImage, type ShareHole, type SharePlayer } from '@/lib/scorecard-image'

type ShareScorecardButtonProps = {
  roundId: string
  courseName: string
  dateLabel: string
  holesLabel: string
  groups: ShareHole[][]
  players: SharePlayer[]
  getScore: (playerId: string, holeNumber: number) => number | null
}

export function ShareScorecardButton({
  roundId,
  courseName,
  dateLabel,
  holesLabel,
  groups,
  players,
  getScore,
}: ShareScorecardButtonProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasScores = players.some(p => groups.some(g => g.some(h => getScore(p.id, h.hole_number) != null)))
  if (!hasScores) return null

  async function shareImage() {
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
        setOpen(false)
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        setOpen(false)
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

  async function shareLink() {
    // Public read-only view — works without iniciar sesión.
    const url = `${window.location.origin}/s/${roundId}`
    try {
      if (navigator.share) {
        await navigator.share({ url, title: `Tarjeta · ${courseName}` })
        setOpen(false)
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
          setOpen(false)
        }, 1200)
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        alert('No se pudo compartir el enlace')
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compartir tarjeta"
        className="w-8 h-8 rounded-full bg-[#f4f1e9] border border-[#e5e0d4] flex items-center justify-center active:scale-95 transition"
      >
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
      </button>

      {/* Share options bottom sheet (Vaul) */}
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }} />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-[28px] p-5 pb-10 outline-none">
            <div className="w-10 h-1 rounded-full bg-[#e5e0d4] mx-auto mb-4" />
            <Drawer.Title className="text-[18px] font-black text-[#0e1a16] mb-1">Compartir tarjeta</Drawer.Title>
            <Drawer.Description className="text-[12px] text-[#6b7a72] mb-4">
              {courseName} · {dateLabel}
            </Drawer.Description>
            <div className="space-y-2">
              <button
                type="button"
                onClick={shareImage}
                disabled={busy}
                className="w-full flex items-center gap-3 bg-[#f4f1e9] rounded-[16px] px-4 py-3.5 border border-[#e5e0d4] text-left active:scale-[0.98] transition disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center flex-shrink-0">
                  {busy ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#6b7a72] border-t-transparent animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#6b7a72" strokeWidth="1.8" />
                      <circle cx="9" cy="9" r="1.8" fill="#6b7a72" />
                      <path
                        d="M21 15l-4.5-4.5L7 20"
                        stroke="#6b7a72"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#0e1a16]">Imagen</p>
                  <p className="text-[11px] text-[#6b7a72]">La tarjeta como foto, lista para WhatsApp</p>
                </div>
              </button>
              <button
                type="button"
                onClick={shareLink}
                className="w-full flex items-center gap-3 bg-[#f4f1e9] rounded-[16px] px-4 py-3.5 border border-[#e5e0d4] text-left active:scale-[0.98] transition"
              >
                <div className="w-9 h-9 rounded-full bg-white border border-[#e5e0d4] flex items-center justify-center flex-shrink-0">
                  {copied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="#1f8a5b"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M10 14a5 5 0 0 0 7.07 0l3.18-3.18a5 5 0 0 0-7.07-7.07L11.5 5.4"
                        stroke="#6b7a72"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M14 10a5 5 0 0 0-7.07 0l-3.18 3.18a5 5 0 0 0 7.07 7.07l1.68-1.65"
                        stroke="#6b7a72"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-bold text-[14px] text-[#0e1a16]">{copied ? 'Enlace copiado' : 'Enlace'}</p>
                  <p className="text-[11px] text-[#6b7a72]">Link público — se ve sin tener cuenta</p>
                </div>
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}
