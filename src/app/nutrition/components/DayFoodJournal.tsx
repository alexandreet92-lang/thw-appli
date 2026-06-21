'use client'

// ══════════════════════════════════════════════════════════════════
// DayFoodJournal — journal alimentaire du jour (6 créneaux).
//   • Repas rempli  → MealCard : toujours déplié, NON repliable.
//   • Repas vide    → MealEmpty : compact.
// Ajout d'un aliment : Photo IA (/api/analyze-meal-photo, + note/10 & avis),
// Recherche (FoodSearchSheet), Manuel (FoodEditSheet). Édition fine d'un aliment :
// FoodEditSheet (bottom sheet createPortal). Les aliments + leurs macros sont stockés
// dans la colonne jsonb `ingredients` (aucune migration) ; l'agrégat du créneau est
// recalculé à chaque écriture. Photo : upload réel bucket `meal-photos`.
// ══════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react'
import {
  SLOT_KEYS, SLOT_LABELS,
  type MealSlotKey, type DailyMealEntry, type MealIngredient,
} from '@/hooks/useDailyMeals'
import { PhotoMealEditor } from './today/PhotoMealEditor'
import { FoodEditSheet, type EditableFood } from './today/FoodEditSheet'
import { MealCard } from './today/MealCard'
import { MealEmpty } from './today/MealEmpty'
import { AiMealSheet } from './today/AiMealSheet'
import { foodsOf, uploadPhoto } from './today/mealJournalUtils'

interface Props {
  entries:     DailyMealEntry[]
  loading:     boolean
  saveEntry:   (slot: MealSlotKey, patch: Partial<Omit<DailyMealEntry, 'id' | 'plan_id' | 'date' | 'meal_slot'>>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  /** Conservé pour compat (scroll depuis le Bilan) — les cartes sont toujours dépliées. */
  expandSignal?: number
}

export function DayFoodJournal({ entries, loading, saveEntry, deleteEntry }: Props) {
  const [editing, setEditing]   = useState<{ slot: MealSlotKey; index: number | null } | null>(null)
  const [aiFor, setAiFor] = useState<MealSlotKey | null>(null)
  const [photoFor, setPhotoFor] = useState<{ slot: MealSlotKey; file: File } | null>(null)
  const [meta, setMeta] = useState<Partial<Record<MealSlotKey, { score: number | null; advice: string | null }>>>({})
  const [isMobile, setIsMobile] = useState(false)
  const pendingSlot = useRef<MealSlotKey | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const entryFor = (slot: MealSlotKey) => entries.find(e => e.meal_slot === slot)

  async function commit(slot: MealSlotKey, foods: EditableFood[], photoUrl?: string | null) {
    const entry = entryFor(slot)
    if (!foods.length) { if (entry?.id) await deleteEntry(entry.id); return }
    const t = foods.reduce((a, f) => ({ kcal: a.kcal + f.kcal, prot: a.prot + f.prot, gluc: a.gluc + f.gluc, lip: a.lip + f.lip }), { kcal: 0, prot: 0, gluc: 0, lip: 0 })
    const ingredients: MealIngredient[] = foods.map(f => ({ name: f.name, qty: f.qty, unit: f.unit, kcal: f.kcal, prot: f.prot, gluc: f.gluc, lip: f.lip }))
    await saveEntry(slot, {
      meal_name: foods.map(f => f.name).join(', '),
      actual_kcal: Math.round(t.kcal), actual_prot: Math.round(t.prot), actual_gluc: Math.round(t.gluc), actual_lip: Math.round(t.lip),
      ingredients, source: 'manual', validated: true,
      photo_url: photoUrl !== undefined ? photoUrl : (entry?.photo_url ?? null),
    })
  }

  function saveFood(food: EditableFood) {
    if (!editing) return
    const { slot, index } = editing
    const foods = foodsOf(entryFor(slot))
    const next = index == null ? [...foods, food] : foods.map((f, i) => i === index ? food : f)
    setEditing(null)
    void commit(slot, next)
  }

  function deleteFood(slot: MealSlotKey, index: number) {
    const next = foodsOf(entryFor(slot)).filter((_, i) => i !== index)
    void commit(slot, next)
  }

  function onPhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (f && pendingSlot.current) setPhotoFor({ slot: pendingSlot.current, file: f })
  }
  function triggerPhoto(slot: MealSlotKey) {
    pendingSlot.current = slot
    ;(isMobile ? cameraRef : galleryRef).current?.click()
  }

  if (loading && !entries.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {SLOT_KEYS.map(k => <div key={k} style={{ height: 64, borderRadius: 'var(--r-md)', background: 'var(--bg-card2)', animation: 'pulse 1.4s ease-in-out infinite' }} />)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPhotoInput} style={{ display: 'none' }} />
      <input ref={galleryRef} type="file" accept="image/*" onChange={onPhotoInput} style={{ display: 'none' }} />

      {SLOT_KEYS.map(slot => {
        const entry = entryFor(slot)
        const foods = foodsOf(entry)
        const m = meta[slot]
        return foods.length ? (
          <MealCard
            key={slot}
            slotLabel={SLOT_LABELS[slot]}
            foods={foods}
            photoUrl={entry?.photo_url ?? null}
            score={m?.score ?? null}
            advice={m?.advice ?? null}
            onTapFood={i => setEditing({ slot, index: i })}
            onDeleteFood={i => deleteFood(slot, i)}
            onPhoto={() => triggerPhoto(slot)}
            onAddSearch={() => setAiFor(slot)}
            onAddManual={() => setEditing({ slot, index: null })}
            onClear={() => { if (entry?.id) void deleteEntry(entry.id) }}
          />
        ) : (
          <MealEmpty
            key={slot}
            slotLabel={SLOT_LABELS[slot]}
            onPhoto={() => triggerPhoto(slot)}
            onSearch={() => setAiFor(slot)}
            onAdd={() => setEditing({ slot, index: null })}
          />
        )
      })}

      {editing && (
        <FoodEditSheet
          food={editing.index != null ? foodsOf(entryFor(editing.slot))[editing.index] ?? null : null}
          slotLabel={SLOT_LABELS[editing.slot]}
          onClose={() => setEditing(null)}
          onSave={saveFood}
        />
      )}

      {aiFor && (
        <AiMealSheet
          slotLabel={SLOT_LABELS[aiFor]}
          onClose={() => setAiFor(null)}
          onConfirm={food => { const s = aiFor; setAiFor(null); void commit(s, [...foodsOf(entryFor(s)), food]) }}
        />
      )}

      {photoFor && (
        <PhotoMealEditor
          file={photoFor.file}
          onCancel={() => setPhotoFor(null)}
          onConfirm={async r => {
            const slot = photoFor.slot, file = photoFor.file
            setPhotoFor(null)
            setMeta(prev => ({ ...prev, [slot]: { score: r.score, advice: r.advice } }))
            const url = await uploadPhoto(file)
            const newFoods: EditableFood[] = r.items.map(it => ({ name: it.name, qty: it.qty, unit: it.unit, kcal: it.kcal, prot: it.prot, gluc: it.gluc, lip: it.lip }))
            await commit(slot, [...foodsOf(entryFor(slot)), ...newFoods], url)
          }}
        />
      )}
    </div>
  )
}