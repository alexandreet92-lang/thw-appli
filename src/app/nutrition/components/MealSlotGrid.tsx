'use client'
import { useState, useEffect } from 'react'
import type { ReactElement, CSSProperties } from 'react'
import { useDailyMeals, SLOT_KEYS, SLOT_LABELS, type MealSlotKey, type DailyMealEntry } from '@/hooks/useDailyMeals'
import MealModal from './MealModal'
import type { ManualSaveData } from './tabs/MealModalManual'
import type { ToastType } from '@/hooks/useToast'

// ── SVG Icons ─────────────────────────────────────────────────────
const SLOT_ICONS: Record<MealSlotKey, ReactElement> = {
  breakfast: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  morning_snack: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M12 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  lunch: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  afternoon_snack: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><line x1="6" y1="2" x2="6" y2="4" /><line x1="10" y1="2" x2="10" y2="4" /><line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  ),
  dinner: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  ),
  evening_snack: (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
}

// ── Daily summary bar ─────────────────────────────────────────────
function DailySummaryBar({ kcal, prot, gluc, lip }: { kcal: number; prot: number; gluc: number; lip: number }) {
  const items = [
    { label: 'Kcal',   val: kcal, color: '#00c8e0', unit: '' },
    { label: 'Prot',   val: prot, color: '#3B82F6', unit: 'g' },
    { label: 'Gluc',   val: gluc, color: '#F97316', unit: 'g' },
    { label: 'Lip',    val: lip,  color: '#8B5CF6', unit: 'g' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16, background: 'var(--bg-card2)', borderRadius: 12, padding: '10px 12px' }}>
      {items.map(it => (
        <div key={it.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: it.color, fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>
            {it.val}<span style={{ fontSize: 10 }}>{it.unit}</span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif', marginTop: 2 }}>{it.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Slot card ─────────────────────────────────────────────────────
function SlotCard({ slot, entry, onAdd, onEdit }: {
  slot:   MealSlotKey
  entry:  DailyMealEntry | undefined
  onAdd:  () => void
  onEdit: (e: DailyMealEntry) => void
}) {
  const base: CSSProperties = { borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card2)', padding: '14px 12px', minHeight: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'border-color 0.15s' }

  if (!entry) {
    return (
      <div style={base} onClick={onAdd}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#00c8e0')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
        <div style={{ color: 'var(--text-dim)', opacity: 0.6 }}>{SLOT_ICONS[slot]}</div>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif', textAlign: 'center' }}>
          {SLOT_LABELS[slot]}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 20, lineHeight: 1 }}>+</div>
      </div>
    )
  }

  return (
    <div style={{ ...base, alignItems: 'flex-start', justifyContent: 'flex-start', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>
          {SLOT_LABELS[slot]}
        </span>
        <button onClick={() => onEdit(entry)}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
      {entry.meal_name && (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
          {entry.meal_name}
        </span>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {entry.actual_kcal != null && <span style={{ fontSize: 10, color: '#00c8e0', fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>{entry.actual_kcal} kcal</span>}
        {entry.actual_prot != null && <span style={{ fontSize: 10, color: '#3B82F6', fontFamily: 'DM Mono,monospace' }}>P {entry.actual_prot}g</span>}
        {entry.actual_gluc != null && <span style={{ fontSize: 10, color: '#F97316', fontFamily: 'DM Mono,monospace' }}>G {entry.actual_gluc}g</span>}
        {entry.actual_lip  != null && <span style={{ fontSize: 10, color: '#8B5CF6', fontFamily: 'DM Mono,monospace' }}>L {entry.actual_lip}g</span>}
      </div>
      <button onClick={onAdd}
        style={{ marginTop: 6, alignSelf: 'flex-end', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer' }}>
        + Ajouter
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export interface MealSavedData { meal_name: string; actual_kcal: number; actual_prot: number }

interface Props {
  date:       string
  onSaved?:   (data: MealSavedData) => void
  showToast?: (msg: string, type?: ToastType) => void
}

export default function MealSlotGrid({ date, onSaved, showToast }: Props) {
  const { entries, totals, saveEntry } = useDailyMeals(date)
  const [modal,    setModal]    = useState<{ slot: MealSlotKey; initData?: Partial<ManualSaveData> } | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const bySlot = Object.fromEntries(
    SLOT_KEYS.map(s => [s, entries.find(e => e.meal_slot === s)]),
  ) as Record<MealSlotKey, DailyMealEntry | undefined>

  const hasAny = entries.length > 0

  async function handleSave(slot: MealSlotKey, data: ManualSaveData) {
    try {
      await saveEntry(slot, {
        meal_name:   data.meal_name,
        ingredients: data.ingredients,
        actual_kcal: data.actual_kcal,
        actual_prot: data.actual_prot,
        actual_gluc: data.actual_gluc,
        actual_lip:  data.actual_lip,
        source:      'manual',
      })
      showToast?.('Repas enregistre', 'success')
      onSaved?.({ meal_name: data.meal_name, actual_kcal: data.actual_kcal, actual_prot: data.actual_prot })
    } catch {
      showToast?.('Erreur lors de l\'enregistrement', 'error')
    }
  }

  return (
    <div>
      {hasAny && <DailySummaryBar kcal={totals.kcal} prot={totals.prot} gluc={totals.gluc} lip={totals.lip} />}

      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 10 }}>
        {SLOT_KEYS.map(slot => (
          <SlotCard key={slot} slot={slot} entry={bySlot[slot]}
            onAdd={() => setModal({ slot })}
            onEdit={e => setModal({ slot, initData: { meal_name: e.meal_name ?? undefined, actual_kcal: e.actual_kcal ?? 0, actual_prot: e.actual_prot ?? 0, actual_gluc: e.actual_gluc ?? 0, actual_lip: e.actual_lip ?? 0, ingredients: (e.ingredients as ManualSaveData['ingredients']) ?? [] } })} />
        ))}
      </div>

      {modal && (
        <MealModal
          slot={modal.slot}
          initialData={modal.initData}
          onSave={data => handleSave(modal.slot, data)}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}
