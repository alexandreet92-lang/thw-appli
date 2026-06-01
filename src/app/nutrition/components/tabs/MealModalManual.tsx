'use client'
import { useState } from 'react'
import type { MealIngredient } from '@/hooks/useDailyMeals'
import FoodSearch, { type AddedIngredient, type FoodItem, calcMacros } from './FoodSearch'
import IngredientRow from './IngredientRow'
import BarcodeScanner from './BarcodeScanner'

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

function sumMacros(ingredients: AddedIngredient[]) {
  return ingredients.reduce(
    (acc, ing) => {
      const m = calcMacros(ing.food, ing.qty)
      return { kcal: acc.kcal + m.kcal, prot: acc.prot + m.prot, gluc: acc.gluc + m.gluc, lip: acc.lip + m.lip }
    },
    { kcal: 0, prot: 0, gluc: 0, lip: 0 }
  )
}

export default function MealModalManual({ initialName = '', initialKcal = 0, initialProt = 0, initialGluc = 0, initialLip = 0, onSave }: Props) {
  const [ingredients, setIngredients] = useState<AddedIngredient[]>(() => {
    if (initialKcal > 0 || initialProt > 0 || initialGluc > 0 || initialLip > 0) {
      return [{
        food: { id: `prefill-${initialName || 'repas'}`, name: initialName || 'Repas', kcal_100g: initialKcal, prot_100g: initialProt, gluc_100g: initialGluc, lip_100g: initialLip },
        qty: 100,
      }]
    }
    return []
  })
  const [name,         setName]         = useState(initialName)
  const [scannerOpen,  setScannerOpen]  = useState(false)
  const [saving,       setSaving]       = useState(false)

  async function handleBarcodeDetected(barcode: string) {
    setScannerOpen(false)
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json() as { product?: Record<string, unknown>; status?: number }
      if (!data.product || data.status !== 1) return
      const p = data.product
      const n = p.nutriments as Record<string, number> | undefined
      const food: FoodItem = {
        id:        barcode,
        name:      String(p.product_name ?? 'Produit inconnu'),
        brand:     p.brands ? String(p.brands).split(',')[0].trim() : undefined,
        kcal_100g: Math.round(Number(n?.['energy-kcal_100g'] ?? n?.['energy_100g'] ?? 0)),
        prot_100g: Math.round(Number(n?.proteins_100g       ?? 0)),
        gluc_100g: Math.round(Number(n?.carbohydrates_100g  ?? 0)),
        lip_100g:  Math.round(Number(n?.fat_100g            ?? 0)),
        image_url: p.image_small_url ? String(p.image_small_url) : undefined,
      }
      setIngredients(prev => [...prev, { food, qty: 100 }])
    } catch { /* ignore */ }
  }

  async function handleSave() {
    setSaving(true)
    const totals = sumMacros(ingredients)
    const mealIngredients: MealIngredient[] = ingredients.map(ing => ({
      name: ing.food.name,
      qty:  String(ing.qty),
      unit: 'g',
    }))
    try {
      await onSave({
        meal_name:   name.trim() || 'Repas',
        ingredients: mealIngredients,
        actual_kcal: totals.kcal,
        actual_prot: totals.prot,
        actual_gluc: totals.gluc,
        actual_lip:  totals.lip,
      })
    } finally { setSaving(false) }
  }

  const totals   = sumMacros(ingredients)
  const hasItems = ingredients.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FoodSearch
        onAdd={ing => setIngredients(prev => [...prev, ing])}
        onBarcode={() => setScannerOpen(true)}
      />

      {hasItems && (
        <div>
          {ingredients.map((ing, i) => (
            <IngredientRow
              key={i}
              ingredient={ing}
              onRemove={() => setIngredients(prev => prev.filter((_, idx) => idx !== i))}
            />
          ))}
          <div style={{ display: 'flex', gap: 14, padding: '8px 0', fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: '#06B6D4' }}>{totals.kcal} kcal</span>
            <span style={{ color: 'var(--text-dim)' }}>P {totals.prot}g</span>
            <span style={{ color: 'var(--text-dim)' }}>G {totals.gluc}g</span>
            <span style={{ color: 'var(--text-dim)' }}>L {totals.lip}g</span>
          </div>
        </div>
      )}

      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du repas (optionnel)"
        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif' }} />

      <button onClick={() => void handleSave()} disabled={saving || !hasItems}
        style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: hasItems ? 'linear-gradient(90deg,#06B6D4,#3B82F6)' : 'var(--border)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: hasItems ? 'pointer' : 'default', fontFamily: 'Syne,sans-serif' }}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>

      {scannerOpen && (
        <BarcodeScanner
          onDetected={barcode => void handleBarcodeDetected(barcode)}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  )
}
