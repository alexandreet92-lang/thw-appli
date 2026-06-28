'use client'
// Feuille « + Exercice » (createPortal, DS neutre) : nom + types de record à suivre
// (cases) + unité par défaut. Persisté en localStorage (gymShared.addCustom).
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ALL_RECORD_TYPES, typeLabel, addCustom, type GymExercise } from './gymShared'

const GYM_DOT = '#8b5cf6' // design-allow-color — teinte sport muscu sanctionnée
const SCRIM = 'rgba(0,0,0,0.72)' // design-allow-color — voile de feuille

export function AddExerciseSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (ex: GymExercise) => void }) {
  const [name, setName] = useState('')
  const [types, setTypes] = useState<string[]>(['1RM'])
  const [closing, setClosing] = useState(false)
  const close = () => { setClosing(true); setTimeout(onClose, 240) }

  const canSave = !!name.trim() && types.length > 0
  function toggle(t: string) { setTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]) }
  function save() {
    if (!canSave) return
    const ordered = ALL_RECORD_TYPES.filter(t => types.includes(t))
    const ex: GymExercise = { name: name.trim(), types: ordered }
    addCustom(ex)
    onAdded(ex)
    close()
  }

  return createPortal(
    <div onClick={close} className="rec-drawer" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: SCRIM, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className={closing ? 'sheet-close' : 'sheet-open'} style={{ width: '100%', maxHeight: 'calc(100dvh - 72px)', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', willChange: 'transform' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-mid)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GYM_DOT }} />Muscu
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Nouvel exercice</h2>
          </div>
          <button onClick={close} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 5px' }}>Nom de l&apos;exercice</p>
          <input className="rec-drawer" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="ex : Hip Thrust"
            style={{ width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '18px 0 8px' }}>Types de record à suivre</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_RECORD_TYPES.map(t => {
              const on = types.includes(t)
              return (
                <button key={t} onClick={() => toggle(t)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: on ? 600 : 500, background: on ? 'var(--primary-dim)' : 'var(--bg-card2)', color: on ? 'var(--primary)' : 'var(--text-dim)' }}>
                  <span style={{ width: 13, height: 13, borderRadius: 4, flexShrink: 0, background: on ? 'var(--primary)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border-mid)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)', fontSize: 10 }}>{on ? '✓' : ''}</span>
                  {typeLabel(t)}
                </button>
              )
            })}
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-dim)', margin: '14px 0 0' }}>
            L&apos;unité par défaut s&apos;adapte au type : charge (kg), répétitions (reps) ou charge ajoutée (+kg).
          </p>
        </div>

        {/* Save */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
          <button onClick={save} disabled={!canSave}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? 'var(--primary)' : 'var(--bg-card2)', color: canSave ? 'var(--on-primary)' : 'var(--text-dim)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600 }}>
            Ajouter l&apos;exercice
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
