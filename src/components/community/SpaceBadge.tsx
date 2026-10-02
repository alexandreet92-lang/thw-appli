'use client'
// ══════════════════════════════════════════════════════════════════════════
// Identité visuelle d'un espace, façon Discord — SOBRE (Design System).
// 1) Logo image (icon_url) si présent → pastille ronde/arrondie.
// 2) Sinon repli sur un MONOGRAMME (1re lettre, Inter extra-gras, blanc) sur une
//    teinte stable dérivée du slug (maquette validée mock8 c1).
// ══════════════════════════════════════════════════════════════════════════

import { toneFor } from './kit'

const FB = 'var(--font-body)'

// Logos officiels des espaces (fichiers dans public/community/). Repli sur le
// monogramme si l'espace n'en a pas. Un icon_url en base (uploadé par le
// propriétaire) reste prioritaire sur ces logos.
// NB : dossier hors « /community » (qui est aussi une route App Router et
// masquerait les fichiers statiques de même préfixe).
const OFFICIAL_LOGOS: Record<string, string> = {
  'thw-communaute': '/space-logos/thw-communaute.png',
  running: '/space-logos/running.png',
  trail: '/space-logos/trail.png',
  cycling: '/space-logos/cycling.png',
  hyrox: '/space-logos/hyrox.png',
  gym: '/space-logos/gym.png',
  triathlon: '/space-logos/triathlon.png',
}

function monogram(name: string): string {
  const c = name.trim()
  return (c[0] ?? '?').toUpperCase()
}

export function SpaceBadge({
  space, size = 44, active = false, radius,
}: {
  space: { name: string; iconUrl?: string | null; slug?: string }
  size?: number
  active?: boolean
  radius?: string
}) {
  const r = radius ?? 'var(--r-md)'
  const src = space.iconUrl ?? (space.slug ? OFFICIAL_LOGOS[space.slug] : undefined)
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={space.name} style={{
        width: size, height: size, flexShrink: 0, borderRadius: r, objectFit: 'cover',
        background: 'var(--surface-neutral)',
        outline: active ? '2px solid var(--primary)' : 'none', outlineOffset: 1,
      }} />
    )
  }
  return (
    <span aria-hidden style={{
      width: size, height: size, flexShrink: 0, borderRadius: r,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: toneFor(space.slug ?? space.name),
      color: 'var(--on-primary)',
      fontFamily: FB, fontWeight: 800, fontSize: Math.round(size * 0.42), lineHeight: 1,
      outline: active ? '2px solid var(--primary)' : 'none', outlineOffset: 1,
    }}>
      {monogram(space.name)}
    </span>
  )
}
