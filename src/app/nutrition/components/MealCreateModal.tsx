'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MealTemplate, MealTiming, Ingredient } from '@/hooks/useNutrition'

type Unit = 'g' | 'ml' | 'piece'

const TIMINGS: { value: MealTiming; label: string }[] = [
  { value: 'pre_training',  label: 'Pre-training'  },
  { value: 'post_training', label: 'Post-training' },
  { value: 'morning',       label: 'Matin'         },
  { value: 'evening',       label: 'Soir'          },
  { value: 'rest',          label: 'Repos'         },
]

interface FormData {
  nom: string
  meal_timing: MealTiming | ''
  kcal: string
  proteines: string
  glucides: string
  lipides: string
  recommended_frequency_per_week: string
  ingredients: { name: string; quantity: string; unit: Unit }[]
}

const EMPTY: FormData = {
  nom: '', meal_timing: '',
  kcal: '', proteines: '', glucides: '', lipides: '',
  recommended_frequency_per_week: '',
  ingredients: [],
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-card2)',
  color: 'var(--text)', fontSize: 12, fontFamily: 'DM Sans,sans-serif',
  outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
  letterSpacing: '0.05em', color: 'var(--text-dim)', marginBottom: 4, display: 'block',
}

export default function MealCreateModal({
  onSave,
  onClose,
}: {
  onSave: (data: Omit<MealTemplate, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  function addIngredient() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', quantity: '', unit: 'g' as Unit }] }))
  }

  function removeIngredient(i: number) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }))
  }

  function updateIngredient(i: number, field: 'name' | 'quantity' | 'unit', value: string) {
    setForm(f => {
      const ings = [...f.ingredients]
      ings[i] = { ...ings[i], [field]: value }
      return { ...f, ingredients: ings }
    })
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.nom.trim()) return
    setSaving(true)
    let photoUrl: string | null = null

    if (photoFile) {
      setUploading(true)
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          const ext = photoFile.name.split('.').pop() ?? 'jpg'
          const path = `${user.id}/${Date.now()}.${ext}`
          const { error } = await sb.storage.from('meal-photos').upload(path, photoFile)
          if (!error) {
            const { data: u } = sb.storage.from('meal-photos').getPublicUrl(path)
            photoUrl = u.publicUrl
          }
        }
      } catch { /* storage not configured */ }
      setUploading(false)
    }

    const ingredients: Ingredient[] = form.ingredients
      .filter(ing => ing.name.trim())
      .map(ing => ({ name: ing.name.trim(), quantity: ing.quantity, unit: ing.unit }))

    await onSave({
      nom: form.nom.trim(),
      type_repas: 'petit_dejeuner',
      description: null,
      actif: true,
      meal_timing: (form.meal_timing || null) as MealTiming | null,
      photo_url: photoUrl,
      kcal: form.kcal ? parseInt(form.kcal) : null,
      proteines: form.proteines ? parseFloat(form.proteines) : null,
      glucides: form.glucides ? parseFloat(form.glucides) : null,
      lipides: form.lipides ? parseFloat(form.lipides) : null,
      ingredients: ingredients.length ? ingredients : null,
      recommended_frequency_per_week: form.recommended_frequency_per_week
        ? parseInt(form.recommended_frequency_per_week) : null,
      is_favorite: false,
      source: 'manual',
    })
    setSaving(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: 16, padding: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Creer un repas
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Nom */}
          <div>
            <label style={labelStyle}>Nom du repas *</label>
            <input value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="ex: Porridge avoine banane" style={inputStyle} />
          </div>

          {/* Timing */}
          <div>
            <label style={labelStyle}>Timing</label>
            <select value={form.meal_timing}
              onChange={e => setForm(f => ({ ...f, meal_timing: e.target.value as MealTiming | '' }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">-- Choisir --</option>
              {TIMINGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Photo */}
          <div>
            <label style={labelStyle}>Photo</label>
            {photoPreview && (
              <img src={photoPreview} alt="" style={{
                width: '100%', height: 140, objectFit: 'cover',
                borderRadius: 8, marginBottom: 8,
              }} />
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange}
              style={{ ...inputStyle, padding: '6px 8px', cursor: 'pointer' }} />
            {uploading && (
              <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0' }}>Envoi en cours...</p>
            )}
          </div>

          {/* Macros grid */}
          <div>
            <label style={labelStyle}>Valeurs nutritionnelles</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {([
                { key: 'kcal' as const,      label: 'Kcal',     ph: '350' },
                { key: 'proteines' as const, label: 'Prot (g)', ph: '20'  },
                { key: 'glucides' as const,  label: 'Gluc (g)', ph: '45'  },
                { key: 'lipides' as const,   label: 'Lip (g)',  ph: '8'   },
              ]).map(({ key, label, ph }) => (
                <div key={key}>
                  <label style={{ ...labelStyle, fontSize: 9 }}>{label}</label>
                  <input type="number" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{ ...inputStyle, textAlign: 'center', padding: '6px 4px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequence recommandee (fois/semaine)</label>
            <input type="number" min="1" max="21"
              value={form.recommended_frequency_per_week}
              onChange={e => setForm(f => ({ ...f, recommended_frequency_per_week: e.target.value }))}
              placeholder="ex: 3"
              style={{ ...inputStyle, maxWidth: 100 }} />
          </div>

          {/* Ingredients */}
          <div>
            <label style={labelStyle}>Ingredients</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.ingredients.map((ing, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 62px 28px', gap: 6, alignItems: 'center' }}>
                  <input value={ing.name}
                    onChange={e => updateIngredient(i, 'name', e.target.value)}
                    placeholder="Nom" style={inputStyle} />
                  <input value={ing.quantity}
                    onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                    placeholder="Qte" style={{ ...inputStyle, textAlign: 'center' }} />
                  <select value={ing.unit}
                    onChange={e => updateIngredient(i, 'unit', e.target.value)}
                    style={{ ...inputStyle, padding: '6px 4px', cursor: 'pointer' }}>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="piece">pcs</option>
                  </select>
                  <button onClick={() => removeIngredient(i)} style={{
                    width: 28, height: 36, borderRadius: 7,
                    border: '1px solid rgba(239,68,68,0.35)', background: 'transparent',
                    color: '#ef4444', cursor: 'pointer', fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              ))}
              <button onClick={addIngredient} style={{
                padding: '8px', borderRadius: 8, border: '1px dashed var(--border)',
                background: 'transparent', color: 'var(--text-dim)', fontSize: 11,
                cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
              }}>+ Ajouter un ingredient</button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-dim)', fontSize: 12, cursor: 'pointer',
            }}>Annuler</button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !form.nom.trim()}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: form.nom.trim() ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'var(--border)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: form.nom.trim() && !saving ? 'pointer' : 'not-allowed',
                fontFamily: 'Syne,sans-serif',
              }}
            >{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
