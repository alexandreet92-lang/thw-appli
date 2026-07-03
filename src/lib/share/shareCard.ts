// ══════════════════════════════════════════════════════════════════
// shareCard — génère une image récap (canvas, sans dépendance externe) et la
// partage via l'API Web Share (avec fichier) si dispo, sinon télécharge le PNG.
// Sert pour : partager une activité solo, un résumé (semaine/mois), une page de
// récap. Toujours estampillé du logo THW (shuriken). Option fond transparent
// (PNG alpha) pour se fondre dans une story Instagram/Strava.
// ══════════════════════════════════════════════════════════════════

export interface ShareStat { label: string; value: string }
export interface ShareCardOpts {
  title: string
  subtitle: string
  accent: string                 // hex (ex '#06B6D4')
  stats: ShareStat[]             // 2 à 6 stats
  brand?: string                 // défaut « THW Coaching »
  filename?: string
  transparent?: boolean          // true → fond transparent (overlay story)
  logoSrc?: string               // défaut '/logos/logo_app.png' (shuriken)
  trace?: Array<[number, number]> // tracé GPS optionnel [lat,lng] → dessiné
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

/** Dessine un tracé GPS [lat,lng] normalisé dans une boîte, façon Strava. */
function drawTrace(ctx: CanvasRenderingContext2D, trace: Array<[number, number]>, box: { x: number; y: number; w: number; h: number }, color: string, alpha: number) {
  if (trace.length < 2) return
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const [la, ln] of trace) { minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la); minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln) }
  const spanLat = maxLat - minLat || 1e-6, spanLng = maxLng - minLng || 1e-6
  const midLat = (minLat + maxLat) / 2
  const aspect = (spanLng * Math.cos((midLat * Math.PI) / 180)) / spanLat
  let dw = box.w, dh = box.h
  if (aspect > box.w / box.h) dh = box.w / aspect; else dw = box.h * aspect
  const ox = box.x + (box.w - dw) / 2, oy = box.y + (box.h - dh) / 2
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 10
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  ctx.beginPath()
  trace.forEach(([la, ln], i) => {
    const px = ox + ((ln - minLng) / spanLng) * dw
    const py = oy + (1 - (la - minLat) / spanLat) * dh
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.restore()
}

export async function shareCard(opts: ShareCardOpts): Promise<void> {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const accent = opts.accent || '#06B6D4'
  const transparent = !!opts.transparent

  // ── Fond ──
  if (!transparent) {
    ctx.fillStyle = '#0B0B0F'
    ctx.fillRect(0, 0, W, H)
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, accent + '66')
    grad.addColorStop(0.5, '#0B0B0F00')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // ── Tracé GPS (si fourni) ──
  if (opts.trace && opts.trace.length > 1) {
    drawTrace(ctx, opts.trace, { x: 120, y: 300, w: W - 240, h: 520 }, transparent ? '#FFFFFF' : accent, transparent ? 0.9 : 0.18)
  }

  // Sur fond transparent : ombres pour rester lisible sur n'importe quel décor.
  const withShadow = (fn: () => void) => {
    if (transparent) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 2 }
    fn()
    if (transparent) ctx.restore()
  }

  // ── Logo shuriken + marque ──
  const logo = await loadImg(opts.logoSrc ?? '/logos/logo_app.png')
  const logoSz = 96
  if (logo) withShadow(() => ctx.drawImage(logo, 80, 74, logoSz, logoSz))
  withShadow(() => {
    ctx.fillStyle = '#FFFFFF'
    ctx.textBaseline = 'middle'
    ctx.font = '800 40px Inter, system-ui, sans-serif'
    ctx.fillText(opts.brand ?? 'THW Coaching', 80 + logoSz + 22, 74 + logoSz / 2 - 12)
    ctx.fillStyle = accent
    ctx.font = '700 26px Inter, system-ui, sans-serif'
    ctx.fillText('HYBRID TRAINING', 80 + logoSz + 22, 74 + logoSz / 2 + 22)
  })

  // ── Barre accent + titre ──
  ctx.textBaseline = 'top'
  withShadow(() => { ctx.fillStyle = accent; roundRect(ctx, 80, 236, 70, 14, 7); ctx.fill() })
  withShadow(() => {
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '800 66px Inter, system-ui, sans-serif'
    const title = opts.title.length > 26 ? opts.title.slice(0, 25) + '…' : opts.title
    ctx.fillText(title, 80, 274)
    ctx.fillStyle = transparent ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)'
    ctx.font = '500 34px Inter, system-ui, sans-serif'
    ctx.fillText(opts.subtitle, 80, 366)
  })

  // ── Grille de stats (2 colonnes) ──
  const stats = opts.stats.slice(0, 6)
  const cols = 2, cellW = (W - 160) / cols, cellH = 165
  const gridTop = 470
  stats.forEach((s, i) => {
    const cx = 80 + (i % cols) * cellW
    const cy = gridTop + Math.floor(i / cols) * cellH
    withShadow(() => {
      ctx.fillStyle = transparent ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)'
      ctx.font = '700 26px Inter, system-ui, sans-serif'
      ctx.fillText(s.label.toUpperCase(), cx, cy)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '800 62px Inter, system-ui, sans-serif'
      ctx.fillText(s.value, cx, cy + 38)
    })
  })

  // ── Footer ──
  withShadow(() => {
    ctx.fillStyle = accent
    ctx.font = '700 34px Inter, system-ui, sans-serif'
    ctx.fillText('thw-coaching.app', 80, H - 84)
  })

  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const file = new File([blob], opts.filename ?? 'thw.png', { type: 'image/png' })

  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: opts.title }); return } catch { /* annulé → fallback */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = file.name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
