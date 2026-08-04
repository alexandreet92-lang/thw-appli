'use client'
// ══════════════════════════════════════════════════════════════════════════
// Identité visuelle d'un espace, façon Discord — SOBRE (Design System).
// 1) Logo image (icon_url) si présent → pastille ronde/arrondie.
// 2) Sinon repli sur un MONOGRAMME propre (1re lettre, Inter) sur surface neutre.
// Aucun emoji décoratif, aucun point de couleur (retiré : jugé trop chargé).
// ══════════════════════════════════════════════════════════════════════════

const FB = 'var(--font-body)'

function monogram(name: string): string {
  const c = name.trim()
  return (c[0] ?? '?').toUpperCase()
}

export function SpaceBadge({
  space, size = 44, active = false, radius,
}: {
  space: { name: string; iconUrl?: string | null }
  size?: number
  active?: boolean
  radius?: string
}) {
  const r = radius ?? 'var(--r-md)'
  if (space.iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={space.iconUrl} alt={space.name} style={{
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
      background: active ? 'var(--primary-dim)' : 'var(--surface-neutral)',
      color: active ? 'var(--primary)' : 'var(--text-mid)',
      fontFamily: FB, fontWeight: 600, fontSize: Math.round(size * 0.42), lineHeight: 1,
    }}>
      {monogram(space.name)}
    </span>
  )
}
