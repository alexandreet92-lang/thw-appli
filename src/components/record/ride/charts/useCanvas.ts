'use client'
// Helpers canvas partagés. Gère le devicePixelRatio (sinon flou Retina) et lit
// les tokens CSS. IMPORTANT : getPropertyValue ne résout PAS les indirections
// var() — les tokens lus ici (--ride-*, --zone-N) sont donc CONCRETS dans
// globals.css, jamais des alias var(--autre).

/** Valeur concrète d'un token CSS (couleur), lue sur :root. */
export function readVar(name: string): string {
  if (typeof window === 'undefined') return '#000'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000'
}

export interface CanvasCtx { ctx: CanvasRenderingContext2D; w: number; h: number }

/** Prépare le contexte 2D à la bonne résolution ; null si le canvas est masqué. */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasCtx | null {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w: rect.width, h: rect.height }
}
