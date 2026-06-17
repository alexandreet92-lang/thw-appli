'use client'
// Carte de segment de course (éditorial) : en-tête coloré (discipline +
// volume) + corps. Plus primitives SegInput / CalcField / TransitionCard.
import type { ReactNode } from 'react'
import { IconArrowRight } from '@tabler/icons-react'

export function SegmentCard({ color, label, volume, children }: {
  color: string; label: string; volume?: string; children: ReactNode
}) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <span className="ed-fr" style={{ fontSize: 16, fontWeight: 600, color }}>{label}</span>
        {volume && <span className="ed-tnum" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim)' }}>{volume}</span>}
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

export function TransitionCard({ label, from, to, value, onChange }: {
  label: string; from: string; to: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card2)', border: '1px dashed var(--border)', borderRadius: 12, padding: '10px 14px' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="ed-fr" style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
        <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {from} <IconArrowRight size={11} /> {to}
        </p>
      </div>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="02:00"
        className="ed-tnum" style={{ width: 74, textAlign: 'center', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 6px', fontSize: 13, color: 'var(--text)', outline: 'none' }} />
    </div>
  )
}

export function SegInput({ label, value, onChange, placeholder, type }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <p style={fLbl}>{label}</p>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="ed-tnum" style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px', fontSize: 13.5, color: 'var(--text)', outline: 'none' }} />
    </div>
  )
}

export function CalcField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={fLbl}>{label}</span>
        <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', border: '1px dashed var(--border-mid)', borderRadius: 5, padding: '1px 5px' }}>calc</span>
      </div>
      <div className="ed-tnum" style={{ background: 'var(--bg-card2)', border: '1px dashed var(--border-mid)', borderRadius: 9, padding: '9px 11px', fontSize: 13.5, fontWeight: 600, color: value === '—' ? 'var(--text-dim)' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

const fLbl: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 4px' }

export const ROW2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
export const ROW3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }
