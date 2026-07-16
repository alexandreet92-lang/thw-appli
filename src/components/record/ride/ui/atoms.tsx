'use client'
// Atomes présentationnels partagés (mobile + desktop). Couleurs = tokens
// uniquement. Chiffres en tabular-nums pour éviter le tremblement.
import type { CSSProperties, ReactNode } from 'react'

export const NUM: CSSProperties = { fontFamily: 'var(--font-body)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }

export function Lbl({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontSize: 10, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 800 }}>
      {children}
    </span>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '11px 13px', ...style }}>
      {children}
    </div>
  )
}

/** Tuile métrique : libellé + valeur + unité optionnelle. `accent` = couleur token. */
export function Metric({ label, value, unit, accent, size = 29 }: {
  label: string; value: string | number; unit?: string; accent?: string; size?: number
}) {
  return (
    <Card>
      <Lbl>{label}</Lbl>
      <div style={{ ...NUM, fontSize: size, marginTop: 3, color: accent ?? 'var(--text)' }}>
        {value}{unit && <small style={{ fontSize: size * 0.4, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 2 }}>{unit}</small>}
      </div>
    </Card>
  )
}
