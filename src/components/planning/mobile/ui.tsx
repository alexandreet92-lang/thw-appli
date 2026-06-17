'use client'
// Primitives UI « éditorial clair » partagées par le SessionEditor mobile.
// Aucune couleur hex : tout via var(--se-*) ou la prop `accent` reçue.
import type { ReactNode } from 'react'

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--se-card)', border: '1px solid var(--se-rule)',
      borderRadius: 'var(--se-r)', padding: 16, ...style,
    }}>{children}</div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="se-fr" style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: 'var(--se-text)' }}>
      {children}
    </h3>
  )
}

export function FieldLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, minHeight: 16 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--se-dim)' }}>{children}</span>
      {right}
    </div>
  )
}

/** Toggle segmenté 2 valeurs (Watts/Zone, Allure/%VMA, Distance/Temps…). */
export function Segmented<T extends string>({ value, options, onChange, accent }: {
  value: T; options: { key: T; label: string }[]; onChange: (v: T) => void; accent: string
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 999, background: 'var(--se-card2)', border: '1px solid var(--se-rule)' }}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)} style={{
            border: 'none', cursor: 'pointer', borderRadius: 999, padding: '5px 13px',
            fontSize: 11.5, fontWeight: on ? 700 : 600,
            background: on ? 'var(--se-card)' : 'transparent',
            color: on ? accent : 'var(--se-dim)',
            boxShadow: on ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
            transition: 'color .15s',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/** Stepper − valeur + (saisie libre au centre). */
export function Stepper({ value, onChange, onDec, onInc, unit, placeholder, big }: {
  value: string; onChange: (v: string) => void; onDec: () => void; onInc: () => void
  unit?: string; placeholder?: string; big?: boolean
}) {
  const btn: React.CSSProperties = {
    width: 38, flexShrink: 0, border: '1px solid var(--se-rule)', background: 'var(--se-card)',
    color: 'var(--se-text)', fontSize: 19, lineHeight: 1, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none', padding: 0,
  }
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', height: big ? 46 : 40 }}>
      <button type="button" onClick={onDec} style={{ ...btn, borderRadius: '10px 0 0 10px', borderRight: 'none' }}>−</button>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', borderTop: '1px solid var(--se-rule)', borderBottom: '1px solid var(--se-rule)', background: 'var(--se-card)' }}>
        <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} inputMode="numeric"
          className="se-fr se-tnum"
          style={{ width: '100%', minWidth: 0, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: 'var(--se-text)', fontSize: big ? 20 : 16, fontWeight: 600, padding: unit ? '0 24px 0 6px' : '0 6px' }} />
        {unit && <span style={{ position: 'absolute', right: 8, fontSize: 10, color: 'var(--se-dim)', pointerEvents: 'none' }}>{unit}</span>}
      </div>
      <button type="button" onClick={onInc} style={{ ...btn, borderRadius: '0 10px 10px 0', borderLeft: 'none' }}>+</button>
    </div>
  )
}
