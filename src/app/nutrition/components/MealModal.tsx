'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import MealModalManual, { type ManualSaveData } from './tabs/MealModalManual'
import MealModalTemplates, { type LocalTemplate } from './tabs/MealModalTemplates'
import MealModalPhotoAI, { type PhotoMacroResult } from './tabs/MealModalPhotoAI'
import type { MealSlotKey, MealIngredient } from '@/hooks/useDailyMeals'
import { SLOT_LABELS } from '@/hooks/useDailyMeals'

type Tab = 'manual' | 'templates' | 'photo'

interface Props {
  slot:        MealSlotKey
  onSave:      (data: ManualSaveData) => Promise<void>
  onClose:     () => void
  initialData?: Partial<ManualSaveData>
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'manual',    label: 'Manuel' },
  { key: 'templates', label: 'Repas types' },
  { key: 'photo',     label: 'Photo IA' },
]

export default function MealModal({ slot, onSave, onClose, initialData }: Props) {
  const [tab,        setTab]        = useState<Tab>('manual')
  const [visible,    setVisible]    = useState(false)
  const [seed,       setSeed]       = useState<Partial<ManualSaveData> | undefined>(initialData)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 240)
  }

  function handleSelectTemplate(t: LocalTemplate) {
    setSeed({
      meal_name:   t.nom,
      actual_kcal: t.kcal      ?? 0,
      actual_prot: t.proteines ?? 0,
      actual_gluc: t.glucides  ?? 0,
      actual_lip:  t.lipides   ?? 0,
      ingredients: [] as MealIngredient[],
    })
    setTab('manual')
  }

  function handlePhotoAdjust(r: PhotoMacroResult) {
    setSeed({ actual_kcal: r.kcal, actual_prot: r.prot, actual_gluc: r.gluc, actual_lip: r.lip })
    setTab('manual')
  }

  async function handlePhotoUse(r: PhotoMacroResult) {
    await onSave({ meal_name: 'Repas photo', ingredients: [], actual_kcal: r.kcal, actual_prot: r.prot, actual_gluc: r.gluc, actual_lip: r.lip })
    close()
  }

  if (typeof document === 'undefined' || !document.body) return null

  return createPortal(
    <div ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) close() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'opacity 0.22s ease', opacity: visible ? 1 : 0 }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 560,
        padding: '20px 20px 32px',
        maxHeight: '92vh', overflowY: 'auto',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(100%) scale(0.97)',
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
      }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne,sans-serif' }}>
            {SLOT_LABELS[slot]}
          </span>
          <button onClick={close}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '2px 6px' }}>
            ×
          </button>
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card2)', borderRadius: 10, padding: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', fontFamily: 'Syne,sans-serif', fontWeight: tab === t.key ? 700 : 400, fontSize: 12,
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-dim)',
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'manual' && (
          <MealModalManual
            key={JSON.stringify(seed)}
            initialName={seed?.meal_name}
            initialKcal={seed?.actual_kcal}
            initialProt={seed?.actual_prot}
            initialGluc={seed?.actual_gluc}
            initialLip={seed?.actual_lip}
            initialIngredients={seed?.ingredients}
            onSave={async d => { await onSave(d); close() }} />
        )}
        {tab === 'templates' && (
          <MealModalTemplates slot={slot} onSelect={handleSelectTemplate} />
        )}
        {tab === 'photo' && (
          <MealModalPhotoAI onUse={handlePhotoUse} onAdjust={handlePhotoAdjust} />
        )}
      </div>
    </div>,
    document.body,
  )
}
