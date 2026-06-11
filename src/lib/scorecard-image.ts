// Shareable scorecard image rendered on a canvas, in the app's paper-card
// style: each player gets their front and back nine stacked together next to
// the avatar, with per-nine totals and a TOTAL chip (strokes + to par).
// Score notation mirrors <ScoreMark/>: circle = birdie, double circle = eagle
// or better, square = bogey, double square = double bogey or worse.

import { avatarColor, avatarInitials } from '@/components/ui/avatar'

export type ShareHole = { hole_number: number; par: number }
export type SharePlayer = { id: string; name: string; avatar_url: string | null }

export type ScorecardImageOptions = {
  courseName: string
  /** e.g. "10/01/2026" */
  dateLabel: string
  /** e.g. "18 hoyos" */
  holesLabel: string
  /** One row of holes per nine (1 or 2 rows). */
  groups: ShareHole[][]
  players: SharePlayer[]
  getScore: (playerId: string, holeNumber: number) => number | null
}

const INK = '#0e1a16'
const PAPER = '#f4f1e9'
const HAIRLINE = '#efebe1'
const BORDER = '#e5e0d4'
const MUTED = '#6b7a72'
const GREEN = '#1f8a5b'
const OCHRE = '#9b6e1a'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const SCALE = 2
const PAD = 24
const AVATAR_COL = 72
const CELL = 32
const NINE_COL = 42
const CHIP_W = 88
const CHIP_GAP = 12
const ROW_H = 40
const HEADER_H = 92
const BLOCK_PAD = 16
const MARK = 26

function loadAvatar(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve(null), 1500)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  name: string,
  img: HTMLImageElement | null,
) {
  const r = size / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2)
  ctx.clip()
  if (img) {
    // object-fit: cover
    const s = Math.max(size / img.width, size / img.height)
    const w = img.width * s
    const h = img.height * s
    ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h)
  } else {
    ctx.fillStyle = avatarColor(name)
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(size * 0.36)}px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(avatarInitials(name), x + r, y + r + 1)
  }
  ctx.restore()
}

/** Pencil-card notation for one score, centered on (cx, cy). */
function drawMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, strokes: number, delta: number) {
  ctx.fillStyle = INK
  ctx.font = `700 13px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(strokes), cx, cy + 0.5)

  if (delta === 0) return
  const isCircle = delta < 0
  const double = Math.abs(delta) >= 2
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  const shape = (size: number, radius: number) => {
    ctx.beginPath()
    if (isCircle) ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
    else ctx.roundRect(cx - size / 2, cy - size / 2, size, size, radius)
    ctx.stroke()
  }
  shape(MARK, 5)
  if (double) shape(MARK - 7, 2)
}

export async function renderScorecardImage(opts: ScorecardImageOptions): Promise<Blob> {
  const { courseName, dateLabel, holesLabel, groups, players, getScore } = opts
  const cols = Math.max(...groups.map(g => g.length))
  const cellsX = PAD + AVATAR_COL + 14
  const nineX = cellsX + cols * CELL
  const chipX = nineX + NINE_COL + CHIP_GAP
  const width = chipX + CHIP_W + PAD

  const contentH = Math.max(groups.length * ROW_H, 64)
  const blockH = contentH + BLOCK_PAD * 2 + 18 // 18 → room for the name under the avatar
  const footerH = 36
  const height = HEADER_H + players.length * blockH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = width * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.scale(SCALE, SCALE)

  // Paper background + white card
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  const cardH = HEADER_H + players.length * blockH
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(8.5, 8.5, width - 17, cardH - 9, 16)
  ctx.fill()
  ctx.stroke()

  // Header
  ctx.fillStyle = INK
  ctx.font = `900 20px ${SANS}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(courseName, PAD, 44, width - PAD * 2)
  ctx.fillStyle = MUTED
  ctx.font = `700 11px ${MONO}`
  ctx.fillText(`${dateLabel}  ·  ${holesLabel}`.toUpperCase(), PAD, 66)
  ctx.strokeStyle = HAIRLINE
  ctx.beginPath()
  ctx.moveTo(PAD, HEADER_H - 8.5)
  ctx.lineTo(width - PAD, HEADER_H - 8.5)
  ctx.stroke()

  const avatars = await Promise.all(players.map(p => (p.avatar_url ? loadAvatar(p.avatar_url) : Promise.resolve(null))))

  players.forEach((p, pi) => {
    const top = HEADER_H + pi * blockH
    if (pi > 0) {
      ctx.strokeStyle = HAIRLINE
      ctx.beginPath()
      ctx.moveTo(PAD, top + 0.5)
      ctx.lineTo(width - PAD, top + 0.5)
      ctx.stroke()
    }

    const rowsTop = top + BLOCK_PAD + (contentH - groups.length * ROW_H) / 2
    const avatarSize = 44
    const leftH = avatarSize + 6 + 12 // avatar + gap + name
    const leftTop = top + BLOCK_PAD + (contentH + 18 - leftH) / 2
    drawAvatar(ctx, PAD + (AVATAR_COL - avatarSize) / 2, leftTop, avatarSize, p.name, avatars[pi])
    ctx.fillStyle = INK
    ctx.font = `700 11px ${SANS}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const firstName = p.name.split(' ')[0]
    ctx.fillText(firstName, PAD + AVATAR_COL / 2, leftTop + avatarSize + 16, AVATAR_COL)

    let total = 0
    let delta = 0
    let played = 0
    groups.forEach((group, gi) => {
      const cy = rowsTop + gi * ROW_H + ROW_H / 2
      let nine = 0
      group.forEach((h, hi) => {
        const cx = cellsX + hi * CELL + CELL / 2
        const s = getScore(p.id, h.hole_number)
        if (s == null) {
          ctx.fillStyle = '#c4bfb5'
          ctx.font = `700 12px ${MONO}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('·', cx, cy)
          return
        }
        drawMark(ctx, cx, cy, s, s - h.par)
        nine += s
        total += s
        delta += s - h.par
        played++
      })
      // Per-nine total
      ctx.fillStyle = nine > 0 ? INK : '#c4bfb5'
      ctx.font = `900 14px ${MONO}`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(nine > 0 ? String(nine) : '–', nineX + NINE_COL - 6, cy)
    })

    // TOTAL chip spanning the rows
    const chipH = Math.min(contentH, 64)
    const chipY = rowsTop + (groups.length * ROW_H - chipH) / 2
    ctx.fillStyle = PAPER
    ctx.beginPath()
    ctx.roundRect(chipX, chipY, CHIP_W, chipH, 12)
    ctx.fill()
    ctx.textAlign = 'center'
    const chipCx = chipX + CHIP_W / 2
    ctx.fillStyle = MUTED
    ctx.font = `700 8px ${MONO}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('TOTAL', chipCx, chipY + 15)
    if (played > 0) {
      ctx.fillStyle = delta <= 0 ? GREEN : OCHRE
      ctx.font = `900 20px ${MONO}`
      ctx.fillText(delta > 0 ? `+${delta}` : delta === 0 ? 'E' : String(delta), chipCx, chipY + 38)
      ctx.fillStyle = INK
      ctx.font = `700 11px ${MONO}`
      ctx.fillText(`(${total})`, chipCx, chipY + 54)
    } else {
      ctx.fillStyle = '#c4bfb5'
      ctx.font = `900 16px ${MONO}`
      ctx.fillText('–', chipCx, chipY + 40)
    }
  })

  // Footer branding
  ctx.fillStyle = MUTED
  ctx.font = `700 10px ${MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('⛳ BOGGEY CLUB', width / 2, height - 14)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
  })
}
