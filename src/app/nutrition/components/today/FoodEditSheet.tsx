'use client'
// Feuille d'édition d'un aliment (bottom sheet, createPortal sur document.body).
// Nom, Quantité (+unité intégrée à droite), Protéines / Glucides / Lipides.
// kcal recalculées (4/4/9) et affichées en NEUTRE. « Enregistrer » en cyan.
// Champs arrondis 10px, focus cyan + halo --primary-dim. Aucune lib.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MealIngredient } from '@/hooks/useDailyMeals'

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const UNITS = ['g', 'ml', 'portion', 'pièce']

export interface EditableFood {
  name: string
  qty:  string
  unit: string
  kcal: number
  prot: number
  gluc: number
  lip:  number
}

interface Draft { name: string; qty: string; unit: string; prot: string; gluc: string; lip: string }

function toDraft(f: MealIngredient | null): Draft {
  return {
    name: f?.name ?? '', qty: f?.qty ?? '', unit: f?.unit || 'g',
    prot: f?.prot != null ? String(f.prot) : '',
    gluc: f?.gluc != null ? String(f.gluc) : '',
    lip:  f?.lip  != null ? String(f.lip)  : '',
  }
}

export function FoodEditSheet({ food, slotLabel, onClose, onSave }: {
  food: MealIngredient | null
  slotLabel: string
  onClose: () => void
  onSave: (f: EditableFood) => void
}) {
  const [d, setD] = useState<Draft>(() => toDraft(food))
  useEffect(() => { setD(toDraft(food)) }, [food])

  const num = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0)
  const prot = num(d.prot), gluc = num(d.gluc), lip = num(d.lip)
  const kcal = Math.round(prot * 4 + gluc * 4 + lip * 9)
  const canSave = d.name.trim().length > 0

  function save() {
    if (!canSave) return
    onSave({ name: d.name.trim(), qty: d.qty.trim(), unit: d.unit, prot, gluc, lip, kcal })
  }

  const field: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-mid)', background: 'var(--input-bg)', color: 'var(--text)', fontFamily: FB, fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontFamily: FB, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 5px' }

  function macroInput(key: 'prot' | 'gluc' | 'lip', label: string) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={lbl}>{label}</p>
        <div style={{ position: 'relative' }}>
          <input className="fes-input tnum" type="number" inputMode="decimal" value={d[key]}
            onChange={e => setD(p => ({ ...p, [key]: e.target.value }))}
            style={{ ...field, paddingRight: 26, textAlign: 'right' }} />
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', pointerEvents: 'none' }}>g</span>
        </div>
      </div>
    )
  }

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-end' }}>
      <style>{`.fes-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-dim)}`}</style>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '92vh', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{food ? 'Modifier l’aliment' : 'Ajouter un aliment'}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{slotLabel}</p>

          <div>
            <p style={lbl}>Nom</p>
            <input className="fes-input" value={d.name} onChange={e => setD(p => ({ ...p, name: e.target.value }))} placeholder="ex : Poulet rôti" style={field} autoFocus />
          </div>

          <div>
            <p style={lbl}>Quantité</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input className="fes-input tnum" type="number" inputMode="decimal" value={d.qty} onChange={e => setD(p => ({ ...p, qty: e.target.value }))} placeholder="0" style={{ ...field, flex: 1, textAlign: 'right' }} />
              <select className="fes-input" value={d.unit} onChange={e => setD(p => ({ ...p, unit: e.target.value }))} style={{ ...field, width: 96, flexShrink: 0 }}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {macroInput('prot', 'Protéines')}
            {macroInput('gluc', 'Glucides')}
            {macroInput('lip', 'Lipides')}
          </div>

          <p className="tnum" style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{kcal}</span> kcal calculées
          </p>
        </div>

        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
          <button disabled={!canSave} onClick={save}
            style={{ width: '100%', padding: '13px', borderRadius: 'var(--r-sm)', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? 'var(--primary)' : 'var(--bg-card2)', color: canSave ? 'var(--on-primary)' : 'var(--text-dim)', fontFamily: FB, fontSize: 14, fontWeight: 600 }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}