'use client'
// Mobile : liste des sports en lignes dans une seule carte (façon Strava) —
// puce icône teintée, nom, sous-texte, valeur à droite, chevron.
import type { ComponentType } from 'react'

export interface SportListItem {
  id: string
  Icon: ComponentType<{ size?: number }>
  label: string
  tagline: string
  accent: string
  soft: string
  right?: string
  rightDim?: boolean
  disabled?: boolean
}

export function SportList({ items, onSelect }: { items: SportListItem[]; onSelect: (id: string) => void }) {
  return (
    <div style={{ background: 'var(--dash-card, var(--bg-card))', borderRadius: 'var(--r-lg)', padding: '4px 16px' }}>
      {items.map((it, i) => (
        <button key={it.id} type="button" disabled={it.disabled} onClick={() => onSelect(it.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', border: 'none', background: 'none',
            borderTop: i ? '1px solid var(--dash-line, var(--border))' : 'none', padding: '12px 0', cursor: it.disabled ? 'default' : 'pointer',
            opacity: it.disabled ? 0.55 : 1, fontFamily: 'inherit' }}>
          <span style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center', flexShrink: 0, background: it.soft, color: it.accent }}>
            <it.Icon size={22} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 16, color: 'var(--text)' }}>{it.label}</b>
            <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.tagline}</span>
          </span>
          {it.right && <span style={{ fontSize: 14, fontWeight: 700, color: it.rightDim ? 'var(--text-dim)' : 'var(--text)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{it.right}</span>}
          {!it.disabled && <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>}
        </button>
      ))}
    </div>
  )
}
