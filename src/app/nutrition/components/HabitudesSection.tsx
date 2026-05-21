'use client'
import { useState, useRef, useEffect } from 'react'
import type { NutritionHabit, HabitIngredient } from '@/hooks/useNutritionHabits'

// ── Shared styles ─────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-card2)',
  color: 'var(--text)', fontSize: 12, fontFamily: 'DM Sans,sans-serif',
  outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-dim)', marginBottom: 4, display: 'block',
}

// ── Helpers ────────────────────────────────────────────────────────
function sumIngredients(ings: HabitIngredient[]) {
  return ings.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories ?? 0),
      protein_g: acc.protein_g + (ing.protein_g ?? 0),
      carbs_g: acc.carbs_g + (ing.carbs_g ?? 0),
      fat_g: acc.fat_g + (ing.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
}

// ── Toast ─────────────────────────────────────────────────────────
function Toast({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(6,182,212,0.95)', color: '#fff', padding: '10px 20px',
      borderRadius: 10, fontSize: 13, fontFamily: 'Syne,sans-serif', fontWeight: 700,
      zIndex: 9999, transition: 'opacity 0.3s', opacity: visible ? 1 : 0,
      pointerEvents: 'none',
    }}>
      Fonctionnalite a venir
    </div>
  )
}

// ── Regular meal create modal ─────────────────────────────────────
interface RegularMealFormIng {
  name: string
  quantity_g: string
  calories: string
  protein_g: string
  carbs_g: string
  fat_g: string
}

function RegularMealCreateModal({
  onSave,
  onClose,
}: {
  onSave: (h: Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [ings, setIngs] = useState<RegularMealFormIng[]>([])
  const [saving, setSaving] = useState(false)

  function addIng() {
    setIngs(prev => [...prev, { name: '', quantity_g: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }])
  }

  function removeIng(i: number) {
    setIngs(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateIng(i: number, field: keyof RegularMealFormIng, value: string) {
    setIngs(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  // Real-time totals
  const totals = ings.reduce(
    (acc, ing) => ({
      calories:  acc.calories  + (parseFloat(ing.calories)  || 0),
      protein_g: acc.protein_g + (parseFloat(ing.protein_g) || 0),
      carbs_g:   acc.carbs_g   + (parseFloat(ing.carbs_g)   || 0),
      fat_g:     acc.fat_g     + (parseFloat(ing.fat_g)      || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const ingredients: HabitIngredient[] = ings
      .filter(ing => ing.name.trim())
      .map(ing => ({
        name:       ing.name.trim(),
        quantity_g: ing.quantity_g ? parseFloat(ing.quantity_g) : null,
        calories:   ing.calories   ? parseFloat(ing.calories)   : null,
        protein_g:  ing.protein_g  ? parseFloat(ing.protein_g)  : null,
        carbs_g:    ing.carbs_g    ? parseFloat(ing.carbs_g)    : null,
        fat_g:      ing.fat_g      ? parseFloat(ing.fat_g)      : null,
      }))

    await onSave({
      habit_type: 'regular_meal',
      name: name.trim(),
      ingredients: ingredients.length ? ingredients : null,
      total_calories: Math.round(totals.calories) || null,
      total_carbs_g:  totals.carbs_g   > 0 ? parseFloat(totals.carbs_g.toFixed(2))   : null,
      total_protein_g: totals.protein_g > 0 ? parseFloat(totals.protein_g.toFixed(2)) : null,
    })
    setSaving(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: 16, padding: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Ajouter un repas regulier
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>x</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nom */}
          <div>
            <label style={labelStyle}>Nom du repas *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Mon petit-dejeuner type"
              style={inputStyle}
            />
          </div>

          {/* Ingredients */}
          <div>
            <label style={labelStyle}>Ingredients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Header row */}
              {ings.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 60px 60px 60px 60px 28px',
                  gap: 4, marginBottom: 2,
                }}>
                  {['Ingredient', 'Qte (g)', 'Kcal', 'Prot', 'Gluc', 'Lip', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 9, color: 'var(--text-dim)', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
              {ings.map((ing, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 60px 60px 60px 60px 28px',
                  gap: 4, alignItems: 'center',
                }}>
                  <input value={ing.name} onChange={e => updateIng(i, 'name', e.target.value)}
                    placeholder="Nom" style={inputStyle} />
                  {(['quantity_g', 'calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map(field => (
                    <input key={field} type="number" value={ing[field]}
                      onChange={e => updateIng(i, field, e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, textAlign: 'center', padding: '6px 4px' }} />
                  ))}
                  <button onClick={() => removeIng(i)} style={{
                    width: 28, height: 36, borderRadius: 7,
                    border: '1px solid rgba(239,68,68,0.35)', background: 'transparent',
                    color: '#ef4444', cursor: 'pointer', fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>x</button>
                </div>
              ))}
              <button onClick={addIng} style={{
                padding: '8px', borderRadius: 8, border: '1px dashed var(--border)',
                background: 'transparent', color: 'var(--text-dim)', fontSize: 11,
                cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
              }}>+ Ajouter un ingredient</button>
            </div>
          </div>

          {/* Real-time totals */}
          {ings.length > 0 && (
            <div style={{
              background: 'var(--bg-card2)', borderRadius: 10,
              padding: '12px 14px', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.05em' }}>
                Totaux calcules
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { label: 'Kcal',    value: Math.round(totals.calories),          unit: '' },
                  { label: 'Prot',    value: totals.protein_g.toFixed(1),           unit: 'g' },
                  { label: 'Glucides',value: totals.carbs_g.toFixed(1),             unit: 'g' },
                  { label: 'Lipides', value: totals.fat_g.toFixed(1),              unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>
                      {value}{unit}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
            }}>Annuler</button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !name.trim()}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: name.trim() ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'var(--border)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
                fontFamily: 'Syne,sans-serif',
              }}
            >{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Regular meal card ──────────────────────────────────────────────
function RegularMealCard({
  habit,
  onDelete,
}: {
  habit: NutritionHabit
  onDelete: (id: string) => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)

  function handleUtiliser() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2500)
  }

  const macroSummary = [
    habit.total_calories  != null ? `${habit.total_calories} kcal`           : null,
    habit.total_protein_g != null ? `Prot. ${habit.total_protein_g}g`         : null,
    habit.total_carbs_g   != null ? `Gluc. ${habit.total_carbs_g}g`           : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <Toast visible={toastVisible} />
      <div style={{
        background: 'var(--bg-card2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Meal icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(6,182,212,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', lineHeight: 1.3 }}>
              {habit.name}
            </div>
            {macroSummary && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                {macroSummary}
              </div>
            )}
            {habit.ingredients && habit.ingredients.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, opacity: 0.7 }}>
                {habit.ingredients.length} ingredient{habit.ingredients.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={handleUtiliser}
              style={{
                padding: '5px 11px', borderRadius: 7,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-dim)', fontSize: 11,
                cursor: 'pointer', fontFamily: 'Syne,sans-serif', fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >Utiliser</button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: 30, height: 30, borderRadius: 7,
                border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'rgba(239,68,68,0.07)', borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Supprimer ce repas ?</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => void onDelete(habit.id)}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none',
                  background: '#ef4444', color: '#fff',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne,sans-serif',
                }}
              >Oui</button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '4px 12px', borderRadius: 6,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
                }}
              >Non</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Training fuel inline-edit table ───────────────────────────────
type FuelField = 'name' | 'quantity_g' | 'carbs_g' | 'protein_g' | 'calories'

interface EditCell {
  id: string
  field: FuelField
  value: string
}

function TrainingFuelSection({
  habits,
  onAdd,
  onUpdate,
  onDelete,
}: {
  habits: NutritionHabit[]
  onAdd: (h: Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onUpdate: (id: string, patch: Partial<Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editCell, setEditCell] = useState<EditCell | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus()
  }, [editCell])

  function getCellValue(habit: NutritionHabit, field: FuelField): string {
    if (field === 'name') return habit.name
    const ing = habit.ingredients?.[0]
    if (!ing) {
      if (field === 'calories')   return habit.total_calories  != null ? String(habit.total_calories)  : ''
      if (field === 'carbs_g')    return habit.total_carbs_g   != null ? String(habit.total_carbs_g)   : ''
      if (field === 'protein_g')  return habit.total_protein_g != null ? String(habit.total_protein_g) : ''
      return ''
    }
    switch (field) {
      case 'quantity_g': return ing.quantity_g != null ? String(ing.quantity_g) : ''
      case 'calories':   return ing.calories   != null ? String(ing.calories)   : ''
      case 'carbs_g':    return ing.carbs_g    != null ? String(ing.carbs_g)    : ''
      case 'protein_g':  return ing.protein_g  != null ? String(ing.protein_g)  : ''
      default: return ''
    }
  }

  async function commitEdit(id: string, field: FuelField, value: string) {
    if (field === 'name') {
      await onUpdate(id, { name: value.trim() || 'Produit' })
    } else {
      const num = value.trim() ? parseFloat(value) : null
      const habit = habits.find(h => h.id === id)
      if (!habit) return
      const existingIng = habit.ingredients?.[0] ?? {
        name: '', quantity_g: null, calories: null, protein_g: null, carbs_g: null, fat_g: null,
      }
      const updatedIng: HabitIngredient = { ...existingIng, [field]: num }
      const totals = sumIngredients([updatedIng])
      await onUpdate(id, {
        ingredients: [updatedIng],
        total_calories: Math.round(totals.calories) || null,
        total_carbs_g: totals.carbs_g > 0 ? parseFloat(totals.carbs_g.toFixed(2)) : null,
        total_protein_g: totals.protein_g > 0 ? parseFloat(totals.protein_g.toFixed(2)) : null,
      })
    }
    setEditCell(null)
  }

  async function handleAddRow() {
    if (!newName.trim()) return
    await onAdd({
      habit_type: 'training_fuel',
      name: newName.trim(),
      ingredients: null,
      total_calories: null,
      total_carbs_g: null,
      total_protein_g: null,
    })
    setNewName('')
    setAdding(false)
  }

  const COLS: { field: FuelField; label: string; width: string | number; numeric?: boolean }[] = [
    { field: 'name',       label: 'Produit',     width: '1fr'  },
    { field: 'quantity_g', label: 'Qte (g)',      width: 72,    numeric: true },
    { field: 'carbs_g',    label: 'Glucides (g)', width: 90,    numeric: true },
    { field: 'protein_g',  label: 'Proteines (g)',width: 96,    numeric: true },
    { field: 'calories',   label: 'Kcal',         width: 64,    numeric: true },
  ]

  const gridTemplate = `${COLS.map(c => typeof c.width === 'number' ? `${c.width}px` : c.width).join(' ')} 36px`

  const cellBase: React.CSSProperties = {
    padding: '8px 10px', fontSize: 12, color: 'var(--text)',
    cursor: 'pointer', userSelect: 'none',
  }

  return (
    <div>
      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridTemplate, gap: 0,
        borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 2,
      }}>
        {COLS.map(c => (
          <div key={c.field} style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-dim)',
            padding: '0 10px', textAlign: c.numeric ? 'center' : 'left',
          }}>{c.label}</div>
        ))}
        <div />
      </div>

      {/* Rows */}
      {habits.length === 0 && !adding && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '16px 10px', textAlign: 'center' }}>
          Aucun produit — ajoutez votre premier produit ci-dessous
        </div>
      )}

      {habits.map(habit => (
        <div key={habit.id} style={{
          display: 'grid', gridTemplateColumns: gridTemplate, gap: 0,
          borderBottom: '1px solid var(--border)',
          background: 'transparent',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {COLS.map(c => {
            const isEditing = editCell?.id === habit.id && editCell?.field === c.field
            const displayValue = getCellValue(habit, c.field)
            return (
              <div
                key={c.field}
                style={{ ...cellBase, textAlign: c.numeric ? 'center' : 'left', position: 'relative' }}
                onClick={() => {
                  if (!isEditing) setEditCell({ id: habit.id, field: c.field, value: displayValue })
                }}
              >
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type={c.numeric ? 'number' : 'text'}
                    defaultValue={editCell?.value ?? ''}
                    onBlur={e => void commitEdit(habit.id, c.field, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') void commitEdit(habit.id, c.field, (e.target as HTMLInputElement).value)
                      if (e.key === 'Escape') setEditCell(null)
                    }}
                    style={{
                      width: '100%', padding: '4px 6px', borderRadius: 6,
                      border: '1px solid #06B6D4', background: 'var(--bg-card)',
                      color: 'var(--text)', fontSize: 12,
                      outline: 'none', boxSizing: 'border-box',
                      textAlign: c.numeric ? 'center' : 'left',
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span style={{ color: displayValue ? 'var(--text)' : 'var(--text-dim)' }}>
                    {displayValue || '—'}
                  </span>
                )}
              </div>
            )
          })}

          {/* Delete */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={() => void onDelete(habit.id)}
              style={{
                width: 26, height: 26, borderRadius: 6,
                border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Add row */}
      {adding ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleAddRow()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="Nom du produit"
            style={{ ...inputStyle, flex: 1, maxWidth: 260 }}
          />
          <button
            onClick={() => void handleAddRow()}
            disabled={!newName.trim()}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: newName.trim() ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'var(--border)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: newName.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'Syne,sans-serif',
            }}
          >Ajouter</button>
          <button
            onClick={() => { setAdding(false); setNewName('') }}
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
            }}
          >Annuler</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 8,
            border: '1px dashed var(--border)', background: 'transparent',
            color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
            fontFamily: 'DM Sans,sans-serif',
          }}
        >+ Ajouter un produit</button>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────
export default function HabitudesSection({
  habits,
  loading,
  onAdd,
  onUpdate,
  onDelete,
}: {
  habits: NutritionHabit[]
  loading: boolean
  onAdd: (h: Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onUpdate: (id: string, patch: Partial<Omit<NutritionHabit, 'id' | 'user_id' | 'created_at'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [creatingMeal, setCreatingMeal] = useState(false)

  const regularMeals = habits.filter(h => h.habit_type === 'regular_meal')
  const fuelProducts  = habits.filter(h => h.habit_type === 'training_fuel')

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    borderRadius: 16,
    border: '1px solid var(--border)',
    padding: 20,
    marginBottom: 16,
  }

  const subTitleStyle: React.CSSProperties = {
    fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700,
    color: 'var(--text)', margin: 0,
  }

  return (
    <div style={cardStyle}>
      {/* Section title */}
      <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text)' }}>
        Mes habitudes
      </h2>

      {loading ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
          Chargement...
        </div>
      ) : (
        <>
          {/* ── Repas reguliers ─────────────────────────── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={subTitleStyle}>Repas reguliers</h3>
              <button
                onClick={() => setCreatingMeal(true)}
                style={{
                  padding: '6px 13px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
                  fontFamily: 'Syne,sans-serif', fontWeight: 600,
                }}
              >+ Ajouter</button>
            </div>

            {regularMeals.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '12px 0', textAlign: 'center' }}>
                Aucun repas regulier — ajoutez votre premier repas ci-dessus
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {regularMeals.map(h => (
                  <RegularMealCard key={h.id} habit={h} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 24 }} />

          {/* ── Nutrition a l'effort ──────────────────── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={subTitleStyle}>Nutrition a l&apos;effort</h3>
            </div>
            <TrainingFuelSection
              habits={fuelProducts}
              onAdd={onAdd}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        </>
      )}

      {/* Create modal */}
      {creatingMeal && (
        <RegularMealCreateModal
          onSave={async data => { await onAdd(data); setCreatingMeal(false) }}
          onClose={() => setCreatingMeal(false)}
        />
      )}
    </div>
  )
}
