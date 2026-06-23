'use client'
// Feuille « Modifier le record » Muscu (createPortal, DS neutre). Sélecteur de type
// (segmented) + champ Valeur adaptatif (kg / reps / +kg). Bouton var(--primary).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Segmented } from '@/components/ui/Segmented'
import { unitKind, typeLabel, upsertGym, type GymRec } from './gymShared'

const GYM_DOT = '#8b5cf6' // design-allow-color — teinte sport muscu sanctionnée
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de feuille

export function GymEditSheet({ exercise, types, initialType, getBest, onClose, onSaved }: {
  exercise: string
  types: string[]
  initialType: string
  getBest: (type: string) => GymRec | null
  onClose: () => void
  onSaved: (rec: GymRec) => void
}) {
  const [type, setType] = useState(initialType)
  const cur = getBest(type)
  const [value, setValue] = useState(cur?.performance ?? '')
  const [date, setDate] = useState(cur?.achieved_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const close = () => { setClosing(true); setTimeout(onClose, 240) }

  // À chaque changement de type, recharger la valeur courante du type sélectionné.
  function pickType(t: string) {
    setType(t)
    const b = getBest(t)
    setValue(b?.performance ?? '')
    setDate(b?.achieved_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  }

  const kind = unitKind(type)
  const unitTxt = kind === 'reps' ? 'reps' : kind === 'addkg' ? '+kg' : 'kg'
  const fieldLabel = kind === 'reps' ? 'Nombre de répétitions' : kind === 'addkg' ? 'Charge ajoutée' : 'Charge'
  const canSave = !!value.trim() && Number(value) > 0

  async function save() {
    setSaving(true)
    const rec = await upsertGym({ id: cur?.id ?? null, name: exercise, type, value: value.trim(), dateISO: date })
    setSaving(false)
    if (rec) { onSaved(rec); close() }
  }

  return createPortal(
    <div onClick={close} className="rec-drawer" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: SCRIM, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'} style={{ width: '100%', maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', willChange: 'transform' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GYM_DOT }} />Muscu
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 8, background: 'var(--bg-card2)', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-mid)' }}>{exercise}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Modifier le record</h2>
          </div>
          <button onClick={close} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 8px' }}>Type de record</p>
          <Segmented size="sm" ariaLabel="Type" value={type} onChange={pickType} options={types.map(t => ({ id: t, label: typeLabel(t) }))} />

          <div style={{ marginTop: 18 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 5px' }}>{fieldLabel}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative', maxWidth: 220 }}>
              <input className="rec-drawer" type="number" value={value} onChange={e => setValue(e.target.value)} autoFocus placeholder="0"
                style={{ width: '100%', padding: '11px 48px 11px 12px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
              <span style={{ position: 'absolute', right: 12, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', pointerEvents: 'none' }}>{unitTxt}</span>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 5px' }}>Date</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rec-drawer"
              style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        {/* Save */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => void save()} disabled={!canSave || saving}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: canSave && !saving ? 'pointer' : 'not-allowed', background: canSave && !saving ? 'var(--primary)' : 'var(--bg-card2)', color: canSave && !saving ? 'var(--on-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer ce record'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
