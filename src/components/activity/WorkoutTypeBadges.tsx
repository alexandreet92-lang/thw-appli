'use client'

// ══════════════════════════════════════════════════════════════════
// WorkoutTypeBadges — badges de type d'entraînement (muscu / hyrox).
// Multi-sélection MANUELLE + création de types custom.
// Persistance : localStorage (aucune table dédiée n'existe — la
// détection automatique nécessiterait les données exos/segments qui
// ne sont pas disponibles, cf. PROMPT_MUSCU_HYROX_INTERFACE.md).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActivityExtras } from '@/lib/activity/extras'
import { useI18n } from '@/lib/i18n'
import { useIsMobile, amChip, AmSheet, AM_INPUT, AM_LABEL, PillButton } from './ActivityMobileKit'

interface TypeDef { id: string; label: string; color: string }

// Palette zonale réutilisée : EF (vert) → seuil (bleu) → intensité (orange/rouge).
const C = { ef: '#10b981', sl1: '#22c55e', sl2: '#3b82f6', hard: '#f97316', max: '#ef4444', tech: '#06b6d4', extra: '#ec4899', strength: '#7c3aed', lime: '#65a30d', red2: '#dc2626' }

const MUSCU_TYPES: TypeDef[] = [
  { id: 'push',      label: 'Push',              color: C.sl2 },
  { id: 'pull',      label: 'Pull',              color: C.tech },
  { id: 'legs',      label: 'Legs',              color: C.extra },
  { id: 'strength',  label: 'Strength',          color: C.strength },
  { id: 'endurance', label: 'Strength endurance', color: C.ef },
  { id: 'explosivite', label: 'Explosivité',     color: C.hard },
]
const BIKE_TYPES: TypeDef[] = [
  { id: 'ef',     label: 'EF',      color: C.ef },
  { id: 'sl1',    label: 'SL1',     color: C.sl1 },
  { id: 'sl2',    label: 'SL2',     color: C.sl2 },
  { id: 'pma',    label: 'PMA',     color: C.hard },
  { id: 'mixte',  label: 'Mixte',   color: C.extra },
  { id: 'sprints', label: 'Sprints', color: C.max },
]
const RUN_TYPES: TypeDef[] = [
  { id: 'ef',     label: 'EF',          color: C.ef },
  { id: 'sl1',    label: 'SL1',         color: C.sl1 },
  { id: 'sl2',    label: 'SL2',         color: C.sl2 },
  { id: 'vma',    label: 'VMA',         color: C.hard },
  { id: 'sprints', label: 'Sprints',    color: C.max },
  { id: 'hills',  label: 'Hills',       color: C.strength },
  { id: 'strides', label: 'VMA Strides', color: C.extra },
]
const TRAIL_TYPES: TypeDef[] = [
  { id: 'ef',     label: 'EF',       color: C.ef },
  { id: 'sl1',    label: 'SL1',      color: C.sl1 },
  { id: 'sl2',    label: 'SL2',      color: C.sl2 },
  { id: 'vma',    label: 'VMA',      color: C.hard },
  { id: 'hills',  label: 'Côtes',    color: C.strength },
  { id: 'descente', label: 'Descente', color: C.extra },
]
const SWIM_TYPES: TypeDef[] = [
  { id: 'ef',     label: 'EF',        color: C.ef },
  { id: 'sl1',    label: 'SL1',       color: C.sl1 },
  { id: 'sl2',    label: 'SL2',       color: C.sl2 },
  { id: 'vma',    label: 'VMA',       color: C.hard },
  { id: 'technique', label: 'Technique', color: C.tech },
  { id: 'sprints', label: 'Sprints',  color: C.max },
]
const ROWING_TYPES: TypeDef[] = [
  { id: 'ef',     label: 'EF',        color: C.ef },
  { id: 'sl1',    label: 'SL1',       color: C.sl1 },
  { id: 'sl2',    label: 'SL2',       color: C.sl2 },
  { id: 'pma',    label: 'PMA',       color: C.hard },
  { id: 'sprints', label: 'Sprints',  color: C.max },
  { id: 'technique', label: 'Technique', color: C.tech },
]
const HYROX_TYPES: TypeDef[] = [
  { id: 'sim',    label: 'Simulation course', color: C.max },
  { id: 'ergo',   label: 'Spé Ergo',          color: C.tech },
  { id: 'wb',     label: 'Spé Wall Ball',     color: C.extra },
  { id: 'sled',   label: 'Spé Sled',          color: C.red2 },
  { id: 'lunges', label: 'Spé Lunges',        color: C.lime },
]
const TYPES_BY_SPORT: Record<string, TypeDef[]> = {
  gym: MUSCU_TYPES, hyrox: HYROX_TYPES,
  bike: BIKE_TYPES, virtual_bike: BIKE_TYPES,
  run: RUN_TYPES, trail_run: TRAIL_TYPES,
  swim: SWIM_TYPES, rowing: ROWING_TYPES,
}
const CUSTOM_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#ec4899', '#06b6d4', '#eab308']

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback } catch { return fallback }
}
function lsSet(key: string, value: unknown) {
  if (typeof window !== 'undefined') try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export function WorkoutTypeBadges({ activityId, sport }: { activityId: string; sport: string }) {
  const { t } = useI18n()
  const base = TYPES_BY_SPORT[sport] ?? MUSCU_TYPES
  const customKey = `workout-custom-types-${sport}`

  // Sélection persistée en base (activity_extras.workout_types) → multi-appareils
  // + lisible sur les cartes. Les types custom restent en localStorage (défs locales).
  const { extras, save } = useActivityExtras(activityId)
  const selected = extras.workout_types ?? []
  const [customTypes, setCustomTypes] = useState<TypeDef[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState(CUSTOM_COLORS[0])
  const mob = useIsMobile()

  useEffect(() => {
    setCustomTypes(lsGet<TypeDef[]>(customKey, []))
  }, [customKey])

  const all = [...base, ...customTypes]

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]
    void save({ workout_types: next })
  }
  function createCustom() {
    const name = draftName.trim()
    if (!name) return
    const def: TypeDef = { id: `custom-${Date.now()}`, label: name, color: draftColor }
    const next = [...customTypes, def]
    setCustomTypes(next); lsSet(customKey, next)
    setModalOpen(false); setDraftName(''); setDraftColor(CUSTOM_COLORS[0])
  }

  // Mobile : puces pilules (actif = pilule sombre) + feuille du bas pour créer un type.
  if (mob) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {all.map(ty => {
          const active = selected.includes(ty.id)
          return (
            <button key={ty.id} onClick={() => toggle(ty.id)} aria-pressed={active} style={amChip(active)}>
              {ty.label}
            </button>
          )
        })}
        <button onClick={() => setModalOpen(true)} style={{ ...amChip(false), color: 'var(--primary)' }}>{t('activities.addBadge')}</button>
        <AmSheet open={modalOpen} onClose={() => setModalOpen(false)} title={t('activities.newWorkoutType')}
          leftLabel={t('activities.cancel')} rightLabel={t('activities.create')} onRight={createCustom} rightDisabled={!draftName.trim()}>
          <label style={{ ...AM_LABEL, display: 'block', margin: '4px 4px 6px' }}>{t('activities.name')}</label>
          <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={t('activities.workoutTypePlaceholder')} style={AM_INPUT} />
          <label style={{ ...AM_LABEL, display: 'block', margin: '8px 4px 2px' }}>{t('activities.color')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {CUSTOM_COLORS.map(c => (
              <button key={c} onClick={() => setDraftColor(c)} aria-label={c} aria-pressed={draftColor === c}
                style={{ width: 44, height: 44, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', background: c, boxShadow: draftColor === c ? '0 0 0 3px var(--surface-card), 0 0 0 5px var(--text)' : 'none' }} />
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.45, margin: '0 4px 4px' }}>{t('activities.customTypesHint')}</p>
          <PillButton onClick={createCustom} disabled={!draftName.trim()}>{t('activities.create')}</PillButton>
        </AmSheet>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {all.map(t => {
        const active = selected.includes(t.id)
        return (
          <button key={t.id} onClick={() => toggle(t.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 'var(--r-sm)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
            background: active ? 'var(--text)' : 'transparent',
            color: active ? 'var(--bg)' : 'var(--text-mid)', transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        )
      })}
      <button onClick={() => setModalOpen(true)} style={{
        padding: '6px 13px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        fontFamily: 'var(--font-body)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)',
      }}>{t('activities.addBadge')}</button>

      {modalOpen && createPortal(
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', borderRadius: 'var(--r-md)', padding: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 14px' }}>{t('activities.newWorkoutType')}</h3>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>{t('activities.name')}</label>
            <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder={t('activities.workoutTypePlaceholder')}
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>{t('activities.color')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {CUSTOM_COLORS.map(c => (
                <button key={c} onClick={() => setDraftColor(c)} aria-label={c} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: draftColor === c ? '2px solid var(--text)' : '2px solid transparent',
                }} />
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--text-dim)', lineHeight: 1.4, margin: '0 0 16px' }}>
              {t('activities.customTypesHint')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('activities.cancel')}</button>
              <button onClick={createCustom} style={{ flex: 1, padding: '9px', borderRadius: 'var(--r-sm)', border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t('activities.create')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// Résout des ids de type d'entraînement → libellés + couleur (pour les cartes).
export function workoutTypeDefs(sport: string, ids: string[]): { id: string; label: string; color: string }[] {
  const base = TYPES_BY_SPORT[sport] ?? MUSCU_TYPES
  return ids.map(id => base.find(t => t.id === id) ?? { id, label: id, color: '#8a8a82' })
}
