'use client'
// ══════════════════════════════════════════════════════════════════════════
// Rendus SVG bruts (zéro lib) pour une activité partagée : tracé (depuis la
// polyline encodée) + profil altimétrique (depuis un tableau d'altitudes).
// ══════════════════════════════════════════════════════════════════════════
import { polylineToSvgPath } from '@/lib/profile/activityShowcase'

export function RouteSvg({ polyline, vw = 340, vh = 150, height }: { polyline?: string | null; vw?: number; vh?: number; height?: number }) {
  const d = polylineToSvgPath(polyline ?? null, vw, vh, 8)
  if (!d) return null
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }}>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function ElevationSvg({ elevation, vw = 340, vh = 60, height }: { elevation?: number[] | null; vw?: number; vh?: number; height?: number }) {
  if (!elevation || elevation.length < 2) return null
  const min = Math.min(...elevation), max = Math.max(...elevation)
  const range = max - min || 1
  const n = elevation.length
  const pts = elevation.map((e, i) => [(i / (n - 1)) * vw, vh - ((e - min) / range) * (vh - 4) - 2] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${vw} ${vh} L 0 ${vh} Z`
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill="var(--primary-dim)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}
