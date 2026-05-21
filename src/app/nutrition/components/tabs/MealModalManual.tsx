'use client'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import MacroDonuts from '../MacroDonuts'
import type { MealIngredient } from '@/hooks/useDailyMeals'

export interface ManualSaveData {
  meal_name:   string
  ingredients: MealIngredient[]
  actual_kcal: number
  actual_prot: number
  actual_gluc: number
  actual_lip:  number
}

interface Props {
  initialName?:        string
  initialKcal?:        number
  initialProt?:        number
  initialGluc?:        number
  initialLip?:         number
  initialIngredients?: MealIngredient[]
  onSave: (data: ManualSaveData) => Promise<void>
}

type MacroKey = 'kcal' | 'prot' | 'gluc' | 'lip'

const STEPPERS: Array<{ key: MacroKey; label: string; step: number; color: string }> = [
  { key: 'kcal', label: 'Kcal',    step: 10, color: '#00c8e0' },
  { key: 'prot', label: 'Prot (g)', step: 1,  color: '#3B82F6' },
  { key: 'gluc', label: 'Gluc (g)', step: 1,  color: '#F97316' },
  { key: 'lip',  label: 'Lip (g)',  step: 1,  color: '#8B5CF6' },
]

const inp: CSSProperties = { background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }

export default function MealModalManual({ initialName = '', initialKcal = 0, initialProt = 0, initialGluc = 0, initialLip = 0, initialIngredients = [], onSave }: Props) {
  const [name,        setName]        = useState(initialName)
  const [macros,      setMacros]      = useState<Record<MacroKey, number>>({ kcal: initialKcal, prot: initialProt, gluc: initialGluc, lip: initialLip })
  const [ingredients, setIngredients] = useState<MealIngredient[]>(initialIngredients)
  const [saving,      setSaving]      = useState(false)

  function step(key: MacroKey, delta: number) {
    setMacros(m => ({ ...m, [key]: Math.max(0, m[key] + delta) }))
  }
  function addIng() { setIngredients(p => [...p, { name: '', qty: '', unit: 'g' }]) }
  function updIng(i: number, f: keyof MealIngredient, v: string) {
    setIngredients(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave({ meal_name: name.trim(), ingredients, actual_kcal: macros.kcal, actual_prot: macros.prot, actual_gluc: macros.gluc, actual_lip: macros.lip }) }
    finally { setSaving(false) }
  }

  const hasMacros = macros.kcal > 0 || macros.prot > 0 || macros.gluc > 0 || macros.lip > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du repas"
        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }} />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Ingredients</span>
          <button onClick={addIng} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>+ Ajouter</button>
        </div>
        {ingredients.map((ing, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 52px 24px', gap: 6, marginBottom: 6 }}>
            <input value={ing.name} onChange={e => updIng(i, 'name', e.target.value)} placeholder="Nom"  style={inp} />
            <input value={ing.qty}  onChange={e => updIng(i, 'qty',  e.target.value)} placeholder="Qte"  style={{ ...inp, textAlign: 'right' }} />
            <input value={ing.unit} onChange={e => updIng(i, 'unit', e.target.value)} placeholder="Unit" style={inp} />
            <button onClick={() => setIngredients(p => p.filter((_, idx) => idx !== i))}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {STEPPERS.map(({ key, label, step: s, color }) => (
          <div key={key} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => step(key, -s)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'none', color, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>-</button>
              <span style={{ flex: 1, textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 14, color }}>{macros[key]}</span>
              <button onClick={() => step(key, s)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'none', color, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {hasMacros && <MacroDonuts kcal={macros.kcal} prot={macros.prot} gluc={macros.gluc} lip={macros.lip} />}

      <button onClick={() => void handleSave()} disabled={saving || !name.trim()}
        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: name.trim() ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'var(--border)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: name.trim() ? 'pointer' : 'default', fontFamily: 'Syne,sans-serif' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  )
}
