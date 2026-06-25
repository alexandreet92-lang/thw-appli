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
  const base = TYPES_BY_SPORT[sport] ?? MUSCU_TYPES
  const selKey = `workout-types-${activityId}`
  const customKey = `workout-custom-types-${sport}`

  const [selected, setSelected] = useState<string[]>([])
  const [customTypes, setCustomTypes] = useState<TypeDef[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftColor, setDraftColor] = useState(CUSTOM_COLORS[0])

  useEffect(() => {
    setSelected(lsGet<string[]>(selKey, []))
    setCustomTypes(lsGet<TypeDef[]>(customKey, []))
  }, [selKey, customKey])

  const all = [...base, ...customTypes]

  function toggle(id: string) {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      lsSet(selKey, next)
      return next
    })
  }
  function createCustom() {
    const name = draftName.trim()
    if (!name) return
    const def: TypeDef = { id: `custom-${Date.now()}`, label: name, color: draftColor }
    const next = [...customTypes, def]
    setCustomTypes(next); lsSet(customKey, next)
    setModalOpen(false); setDraftName(''); setDraftColor(CUSTOM_COLORS[0])
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {all.map(t => {
        const active = selected.includes(t.id)
        return (
          <button key={t.id} onClick={() => toggle(t.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999,
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans,sans-serif',
            border: `1px solid ${active ? t.color : 'var(--border)'}`,
            background: active ? `${t.color}1a` : 'var(--bg-card2)',
            color: active ? t.color : 'var(--text-dim)', transition: 'all 0.15s',
          }}>
            {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />}
            {t.label}
          </button>
        )
      })}
      <button onClick={() => setModalOpen(true)} style={{
        padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600,
        fontFamily: 'DM Sans,sans-serif', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)',
      }}>+ Ajouter</button>

      {modalOpen && createPortal(
        <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card)', borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 14px' }}>Nouveau type d&apos;entraînement</h3>
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Nom</label>
            <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Ex : Spé endurance"
              style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans,sans-serif', marginBottom: 14, boxSizing: 'border-box' }} />
            <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>Couleur</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {CUSTOM_COLORS.map(c => (
                <button key={c} onClick={() => setDraftColor(c)} aria-label={c} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: draftColor === c ? '2px solid var(--text)' : '2px solid transparent',
                }} />
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--text-dim)', lineHeight: 1.4, margin: '0 0 16px' }}>
              Les types personnalisés s&apos;appliquent manuellement. Pas de détection automatique.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Annuler</button>
              <button onClick={createCustom} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>Créer</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
