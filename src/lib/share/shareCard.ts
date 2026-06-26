// ══════════════════════════════════════════════════════════════════
// shareCard — génère une image récap (canvas, sans dépendance externe) et la
// partage via l'API Web Share (avec fichier) si dispo, sinon télécharge le PNG.
// Sert pour : partager une activité solo OU le résumé mensuel.
// ══════════════════════════════════════════════════════════════════

export interface ShareStat { label: string; value: string }
export interface ShareCardOpts {
  title: string
  subtitle: string
  accent: string          // hex (ex '#06B6D4')
  stats: ShareStat[]      // 2 à 6 stats
  brand?: string          // défaut « Hybrid »
  filename?: string
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

export async function shareCard(opts: ShareCardOpts): Promise<void> {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const accent = opts.accent || '#06B6D4'

  // Fond
  ctx.fillStyle = '#0B0B0F'
  ctx.fillRect(0, 0, W, H)
  // Halo accent en haut
  const grad = ctx.createLinearGradient(0, 0, 0, 420)
  grad.addColorStop(0, accent + '55')
  grad.addColorStop(1, '#0B0B0F00')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 420)

  // Barre accent
  ctx.fillStyle = accent
  roundRect(ctx, 80, 150, 70, 14, 7); ctx.fill()

  // Titre
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 64px Inter, system-ui, sans-serif'
  ctx.textBaseline = 'top'
  const title = opts.title.length > 24 ? opts.title.slice(0, 23) + '…' : opts.title
  ctx.fillText(title, 80, 190)
  // Sous-titre
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '500 34px Inter, system-ui, sans-serif'
  ctx.fillText(opts.subtitle, 80, 280)

  // Grille de stats (2 colonnes)
  const stats = opts.stats.slice(0, 6)
  const cols = 2, cellW = (W - 160) / cols, cellH = 150
  const gridTop = 420
  stats.forEach((s, i) => {
    const cx = 80 + (i % cols) * cellW
    const cy = gridTop + Math.floor(i / cols) * cellH
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = '700 26px Inter, system-ui, sans-serif'
    ctx.fillText(s.label.toUpperCase(), cx, cy)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 58px Inter, system-ui, sans-serif'
    ctx.fillText(s.value, cx, cy + 36)
  })

  // Footer marque
  ctx.fillStyle = accent
  ctx.font = '700 40px Inter, system-ui, sans-serif'
  ctx.fillText(opts.brand ?? 'Hybrid', 80, H - 110)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '500 28px Inter, system-ui, sans-serif'
  ctx.fillText('THW Coaching', 80, H - 62)

  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
  if (!blob) return
  const file = new File([blob], opts.filename ?? 'hybrid.png', { type: 'image/png' })

  // Web Share API avec fichier (mobile) → sinon téléchargement.
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: opts.title }); return } catch { /* annulé → fallback */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = file.name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
