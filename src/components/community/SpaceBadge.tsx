'use client'
// ══════════════════════════════════════════════════════════════════════════
// Identité visuelle SOBRE d'un espace (Design System : zéro emoji décoratif).
// Pastille monogramme (1re lettre du nom, Inter) + éventuel point de couleur
// SPORT sanctionné (support minimal, ~point 7px — DESIGN_SYSTEM.md §2.1).
// ══════════════════════════════════════════════════════════════════════════
import type { CommunitySport } from '@/types/community'

const FB = 'var(--font-body)'

// Couleurs sport sanctionnées (tokens, jamais de hex en dur).
const SPORT_COLOR: Record<CommunitySport, string> = {
  running: 'var(--sport-run)',
  cycling: 'var(--sport-bike)',
  hyrox: 'var(--sport-hyrox)',
  gym: 'var(--sport-gym)',
}

export function sportColor(sport: CommunitySport | null): string | null {
  return sport ? SPORT_COLOR[sport] : null
}

function monogram(name: string): string {
  const c = name.trim()
  return (c[0] ?? '?').toUpperCase()
}

export function SpaceBadge({
  space, size = 44, active = false, radius,
}: {
  space: { name: string; sport: CommunitySport | null }
  size?: number
  active?: boolean
  radius?: string
}) {
  const col = sportColor(space.sport)
  const dot = Math.max(7, Math.round(size * 0.2))
  return (
    <span aria-hidden style={{
      position: 'relative', width: size, height: size, flexShrink: 0,
      borderRadius: radius ?? 'var(--r-md)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)',
      color: active ? 'var(--primary)' : 'var(--text-mid)',
      fontFamily: FB, fontWeight: 600, fontSize: Math.round(size * 0.4), lineHeight: 1,
    }}>
      {monogram(space.name)}
      {col && (
        <span style={{
          position: 'absolute', bottom: -1, right: -1, width: dot, height: dot,
          borderRadius: '50%', background: col, boxShadow: '0 0 0 2px var(--bg-card2)',
        }} />
      )}
    </span>
  )
}
