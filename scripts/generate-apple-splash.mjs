// Genera las apple-touch-startup-image para la PWA en iOS.
// iOS ignora el background_color del manifest: sin estos PNGs la launch
// screen es blanca. Ejecutar con `bun run generate:splash` y commitear
// los PNGs resultantes en public/.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BG = '#f4f1e9'

// Tamaños lógicos (pt) y DPR de los iPhone soportados, en portrait.
// Las media queries de index.html deben casar exactamente con esta lista.
const DEVICES = [
  { w: 375, h: 667, dpr: 2 }, // SE 2/3, 6/7/8
  { w: 414, h: 736, dpr: 3 }, // 6+/7+/8+
  { w: 375, h: 812, dpr: 3 }, // X/XS/11 Pro/12 mini/13 mini
  { w: 414, h: 896, dpr: 2 }, // XR/11
  { w: 414, h: 896, dpr: 3 }, // XS Max/11 Pro Max
  { w: 390, h: 844, dpr: 3 }, // 12/13/14
  { w: 393, h: 852, dpr: 3 }, // 14 Pro/15/16
  { w: 402, h: 874, dpr: 3 }, // 16 Pro
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max/14 Plus
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max/15 Plus/15 Pro Max/16 Plus
  { w: 440, h: 956, dpr: 3 }, // 16 Pro Max
]

// El mismo logo del #splash de index.html (viewBox 0 0 64 64). En el splash
// HTML el centro del logo queda 17 CSS px por encima del centro de pantalla
// (columna de 98px: svg 64 + margen 12 + wordmark 22) — se replica aquí para
// que el logo no salte cuando el HTML sustituye a la launch screen.
const LOGO_OFFSET_Y = -17

function splashSvg(pxW, pxH, dpr) {
  const cx = pxW / 2
  const cy = pxH / 2 + LOGO_OFFSET_Y * dpr
  const s = dpr
  return `<svg width="${pxW}" height="${pxH}" viewBox="0 0 ${pxW} ${pxH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${pxW}" height="${pxH}" fill="${BG}"/>
  <g transform="translate(${cx - 32 * s} ${cy - 32 * s}) scale(${s})">
    <circle cx="32" cy="32" r="30" fill="#9bc9a3"/>
    <path d="M24 16 L24 50" stroke="#0e1a16" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M24 16 Q40 18 40 22 Q40 26 24 28 Z" fill="#0e1a16"/>
    <circle cx="24" cy="50" r="2.6" fill="#0e1a16"/>
  </g>
</svg>`
}

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
await mkdir(outDir, { recursive: true })

for (const { w, h, dpr } of DEVICES) {
  const pxW = w * dpr
  const pxH = h * dpr
  const file = `apple-splash-${pxW}x${pxH}.png`
  await sharp(Buffer.from(splashSvg(pxW, pxH, dpr))).png().toFile(path.join(outDir, file))
  console.log(`${file} (${w}x${h}pt @${dpr}x)`)
}
