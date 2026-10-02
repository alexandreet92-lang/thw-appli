'use client'
// Feuille « Modifier les benchmarks » — sort le formulaire de la page (createPortal).
// Champs arrondis, unité intégrée à droite, focus var(--primary) + halo --primary-dim.
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { Sheet, primaryBtn } from '@/app/injuries/components/Sheet'
import { MBlock, MRow, SoftInput, PillButton } from '@/app/injuries/components/mobileUi'

const FB = 'var(--font-body)'
export interface BenchField { key: string; label: string; unit?: string | null; placeholder?: string }

function Input({ value, unit, placeholder, onChange }: { value: string; unit?: string | null; placeholder?: string; onChange: (v: string) => void }) {
  const [foc, setFoc] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input value={value} placeholder={placeholder ?? ''} onChange={e => onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{
          width: '100%', background: 'var(--input-bg)', borderRadius: 'var(--r-sm)', padding: '9px 44px 9px 11px',
          fontFamily: FB, fontSize: 13, color: 'var(--text)', outline: 'none',
          border: `1px solid ${foc ? 'var(--primary)' : 'var(--border-mid)'}`,
          boxShadow: foc ? '0 0 0 3px var(--primary-dim)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
        }} />
      {unit && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', pointerEvents: 'none' }}>{unit}</span>}
    </div>
  )
}

export function BenchmarkSheet({ title, fields, values, onChange, onSave, saving, onClose }: {
  title: string; fields: BenchField[]; values: Record<string, string>
  onChange: (key: string, val: string) => void; onSave: () => void; saving: boolean; onClose: () => void
}) {
  const { t } = useI18n()
  // Mobile : liste groupée « libellé | champ doux + unité », pilule Enregistrer.
  const mobile = (
    <MBlock style={{ padding: '4px 16px' }}>
      {fields.map((f, i) => (
        <MRow key={f.key} first={i === 0}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{f.label}</span>
          <SoftInput width={138} align="right" value={values[f.key] ?? ''} unit={f.unit} placeholder={f.placeholder ?? '—'} ariaLabel={f.label} onChange={v => onChange(f.key, v)} />
        </MRow>
      ))}
    </MBlock>
  )
  return (
    <Sheet title={t('performance.benchmarksTitle', { sport: title })} onClose={onClose} mobile={mobile}
      mobileFooter={<PillButton onClick={onSave} disabled={saving}>{saving ? t('performance.saving') : t('performance.save')}</PillButton>}
      footer={<button onClick={onSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? t('performance.saving') : t('performance.save')}</button>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3) var(--space-3)' }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 'var(--space-1)' }}>{f.label}</label>
            <Input value={values[f.key] ?? ''} unit={f.unit} placeholder={f.placeholder} onChange={v => onChange(f.key, v)} />
          </div>
        ))}
      </div>
    </Sheet>
  )
}
