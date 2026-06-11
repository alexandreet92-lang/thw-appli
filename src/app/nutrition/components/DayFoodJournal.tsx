'use client'

// ══════════════════════════════════════════════════════════════════
// DayFoodJournal — journal alimentaire du jour.
// 6 créneaux dépliables. Chaque créneau se logge via 3 méthodes :
//   Photo IA  (/api/analyze-meal-photo)
//   Recherche (bibliothèque foods + OpenFoodFacts)
//   Manuel
// Les macros sont calculées et accumulées par créneau, puis remontées
// au Bilan du jour via le hook useDailyMeals (porté par le parent).
// ══════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  SLOT_KEYS, SLOT_LABELS,
  type MealSlotKey, type DailyMealEntry, type MealIngredient,
} from '@/hooks/useDailyMeals'
import type { FoodItem } from '@/lib/food-search'
import { MealMacros } from './today/MealMacros'
import { PhotoMealEditor } from './today/PhotoMealEditor'

const FoodSearchSheet = dynamic(
  () => import('@/components/nutrition/FoodSearchSheet').then(m => ({ default: m.FoodSearchSheet })),
  { ssr: false },
)
// NB : le backend "Plats" (DishPickerSheet / dish-catalogue / seed-dishes) est
// conservé mais n'est plus utilisé ici (méthode Plats retirée de l'entrée repas).

const CYAN = '#06B6D4'

interface MacroAdd {
  name: string
  kcal: number
  prot: number
  gluc: number
  lip:  number
  ingredient?: MealIngredient
  photo_url?:  string | null
  source:      string
  replace?:    boolean
}

interface Props {
  entries:     DailyMealEntry[]
  loading:     boolean
  saveEntry:   (slot: MealSlotKey, patch: Partial<Omit<DailyMealEntry, 'id' | 'plan_id' | 'date' | 'meal_slot'>>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  /** Quand cette valeur change (> 0), déplie le 1er créneau sans aliment. */
  expandSignal?: number
}

export function DayFoodJournal({ entries, loading, saveEntry, deleteEntry, expandSignal = 0 }: Props) {
  const [expanded, setExpanded] = useState<MealSlotKey | null>(null)
  const [method, setMethod]     = useState<'photo' | 'search' | 'manual' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Déclenchement externe : déplie le 1er créneau vide (raccourci Bilan) ──
  useEffect(() => {
    if (!expandSignal) return
    const target = SLOT_KEYS.find(k => {
      const e = entries.find(x => x.meal_slot === k)
      return !e || (e.actual_kcal ?? 0) === 0
    }) ?? SLOT_KEYS[0]
    setExpanded(target)
    setMethod(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandSignal])

  // Photo IA : éditeur dédié (analyse réelle /api/analyze-meal-photo + rectification)
  const [photoFor, setPhotoFor] = useState<{ slot: MealSlotKey; file: File } | null>(null)
  const pendingSlot = useRef<MealSlotKey | null>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Manuel state
  const [mName, setMName] = useState('')
  const [mKcal, setMKcal] = useState('')
  const [mProt, setMProt] = useState('')
  const [mGluc, setMGluc] = useState('')
  const [mLip,  setMLip]  = useState('')

  const [saving, setSaving] = useState(false)

  function entryFor(slot: MealSlotKey) {
    return entries.find(e => e.meal_slot === slot)
  }

  function resetAddState() {
    setMethod(null)
    setMName(''); setMKcal(''); setMProt(''); setMGluc(''); setMLip('')
  }

  function openSlot(slot: MealSlotKey) {
    if (expanded === slot) { setExpanded(null); resetAddState(); return }
    setExpanded(slot)
    resetAddState()
  }

  // ── Accumulation dans un créneau ──────────────────────────────────
  async function addToSlot(slot: MealSlotKey, add: MacroAdd) {
    const cur = entryFor(slot)
    const base = add.replace || !cur
      ? { kcal: 0, prot: 0, gluc: 0, lip: 0, name: '', ingredients: [] as MealIngredient[] }
      : {
          kcal: cur.actual_kcal ?? 0, prot: cur.actual_prot ?? 0,
          gluc: cur.actual_gluc ?? 0, lip:  cur.actual_lip  ?? 0,
          name: cur.meal_name ?? '', ingredients: cur.ingredients ?? [],
        }
    const ingredients = add.ingredient ? [...base.ingredients, add.ingredient] : base.ingredients
    setSaving(true)
    try {
      await saveEntry(slot, {
        meal_name:   base.name ? `${base.name}, ${add.name}` : add.name,
        actual_kcal: Math.round(base.kcal + add.kcal),
        actual_prot: Math.round(base.prot + add.prot),
        actual_gluc: Math.round(base.gluc + add.gluc),
        actual_lip:  Math.round(base.lip  + add.lip),
        ingredients: ingredients.length ? ingredients : null,
        photo_url:   add.photo_url ?? cur?.photo_url ?? null,
        source:      add.source,
        validated:   true,
      })
      resetAddState()
    } finally { setSaving(false) }
  }

  // ── Photo IA : ouvre l'éditeur dédié avec le fichier choisi ───────
  function onPhotoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (f && pendingSlot.current) setPhotoFor({ slot: pendingSlot.current, file: f })
  }

  // ── Manuel ─────────────────────────────────────────────────────────
  async function saveManual(slot: MealSlotKey) {
    if (!mName.trim() && !mKcal) return
    await addToSlot(slot, {
      name: mName.trim() || 'Repas',
      kcal: parseFloat(mKcal) || 0, prot: parseFloat(mProt) || 0,
      gluc: parseFloat(mGluc) || 0, lip:  parseFloat(mLip)  || 0,
      source: 'manual', replace: false,
    })
  }

  // ── Recherche ────────────────────────────────────────────────────
  async function addSearchFood(slot: MealSlotKey, food: FoodItem, grams: number) {
    const r = grams / 100
    const n = food.nutriments
    await addToSlot(slot, {
      name: food.product_name + (grams !== 100 ? ` (${grams}g)` : ''),
      kcal: Math.round(n['energy-kcal_100g'] * r),
      prot: +(n.proteins_100g * r).toFixed(1),
      gluc: +(n.carbohydrates_100g * r).toFixed(1),
      lip:  +(n.fat_100g * r).toFixed(1),
      ingredient: { name: food.product_name, qty: String(grams), unit: 'g' },
      source: 'library', replace: false,
    })
  }

  // ── Styles ─────────────────────────────────────────────────────────
  const methodBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 6px', borderRadius: 10, cursor: 'pointer', minHeight: 56,
    border: `1px solid ${active ? `${CYAN}55` : 'var(--border)'}`,
    background: active ? `${CYAN}14` : 'var(--bg-card2)',
    color: active ? CYAN : 'var(--text-mid)',
    fontFamily: 'DM Sans,sans-serif', fontSize: 11, fontWeight: 600,
  })
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--input-bg)', color: 'var(--text)', fontSize: 13,
    fontFamily: 'DM Sans,sans-serif', outline: 'none', boxSizing: 'border-box',
  }

  if (loading && !entries.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOT_KEYS.map(k => (
          <div key={k} style={{ height: 56, borderRadius: 12, background: 'var(--bg-card2)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {SLOT_KEYS.map(slot => {
        const entry  = entryFor(slot)
        const isOpen = expanded === slot
        const hasFood = !!entry && (entry.actual_kcal ?? 0) > 0
        return (
          <div key={slot} style={{
            borderRadius: 12, border: `1px solid ${isOpen ? `${CYAN}40` : 'var(--border)'}`,
            background: hasFood ? 'rgba(6,182,212,0.04)' : 'var(--bg-card2)', overflow: 'hidden',
          }}>
            {/* ── Header ── */}
            <button
              onClick={() => openSlot(slot)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              {entry?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.photo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                  {SLOT_LABELS[slot]}
                </div>
                {hasFood ? (
                  <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry?.meal_name}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Aucun aliment</div>
                )}
              </div>
              {hasFood && (
                <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', color: CYAN, fontWeight: 700, flexShrink: 0 }}>
                  {entry?.actual_kcal} kcal
                </span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* ── Expanded ── */}
            {isOpen && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                {/* Donut kcal + jauges macros du repas (0 si vide) */}
                <div style={{ padding: '14px 0' }}>
                  <MealMacros kcal={entry?.actual_kcal ?? 0} prot={entry?.actual_prot ?? 0} gluc={entry?.actual_gluc ?? 0} lip={entry?.actual_lip ?? 0} />
                </div>
                {hasFood && entry && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button
                      onClick={() => entry.id && void deleteEntry(entry.id)}
                      style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                    >
                      Vider
                    </button>
                  </div>
                )}

                {/* Choix de méthode */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {/* Inputs fichier/caméra toujours montés : Photo IA déclenche
                      directement le sélecteur (desktop) ou la caméra (mobile). */}
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPhotoInput} style={{ display: 'none' }} />
                  <input ref={galleryRef} type="file" accept="image/*" onChange={onPhotoInput} style={{ display: 'none' }} />
                  <button style={methodBtn(false)} onClick={() => { setMethod(null); pendingSlot.current = slot; (isMobile ? cameraRef : galleryRef).current?.click() }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Photo IA
                  </button>
                  <button style={methodBtn(method === 'search')} onClick={() => setMethod('search')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    Recherche
                  </button>
                  <button style={methodBtn(method === 'manual')} onClick={() => setMethod('manual')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Manuel
                  </button>
                </div>

                {/* ── Méthode Recherche ── */}
                {method === 'search' && (
                  <FoodSearchSheet
                    onClose={() => setMethod(null)}
                    onSelect={(food, grams) => { void addSearchFood(slot, food, grams) }}
                  />
                )}

                {/* ── Méthode Manuel ── */}
                {method === 'manual' && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input value={mName} onChange={e => setMName(e.target.value)} placeholder="Nom de l'aliment / repas" style={inputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {([['Kcal', mKcal, setMKcal], ['Prot', mProt, setMProt], ['Gluc', mGluc, setMGluc], ['Lip', mLip, setMLip]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                        <div key={lbl}>
                          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 3 }}>{lbl}</div>
                          <input type="number" value={val} onChange={e => set(e.target.value)} style={{ ...inputStyle, padding: '6px 8px', fontFamily: 'DM Mono,monospace', textAlign: 'center' }} />
                        </div>
                      ))}
                    </div>
                    <button disabled={saving} onClick={() => void saveManual(slot)} style={{ padding: '10px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${CYAN},#5b6fff)`, color: '#fff', fontWeight: 700, fontSize: 12, cursor: saving ? 'default' : 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
                      {saving ? 'Ajout…' : 'Ajouter au repas'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {photoFor && (
        <PhotoMealEditor
          file={photoFor.file}
          onCancel={() => setPhotoFor(null)}
          onConfirm={r => {
            const slot = photoFor.slot
            setPhotoFor(null)
            void addToSlot(slot, { name: r.meal_name, kcal: r.kcal, prot: r.prot, gluc: r.gluc, lip: r.lip, source: 'photo_ai', replace: false })
          }}
        />
      )}
    </div>
  )
}
