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

const MUSCU_TYPES: TypeDef[] = [
  { id: 'strength',   label: 'Strength',          color: '#7c3aed' },
  { id: 'endurance',  label: 'Endurance Strength', color: '#10b981' },
  { id: 'explosivite', label: 'Explosivité',       color: '#f97316' },
  { id: 'pliometrie', label: 'Pliométrie',        color: '#ef4444' },
]
const HYROX_TYPES: TypeDef[] = [
  { id: 'sim',    label: 'Simulation course', color: '#ef4444' },
  { id: 'ergo',   label: 'Spé Ergo',          color: '#06b6d4' },
  { id: 'wb',     label: 'Spé Wall Ball',     color: '#ec4899' },
  { id: 'sled',   label: 'Spé Sled',          color: '#dc2626' },
  { id: 'lunges', label: 'Spé Lunges',        color: '#65a30d' },
]
const CUSTOM_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#ec4899', '#06b6d4', '#eab308']

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback } catch { return fallback }
}
function lsSet(key: string, value: unknown) {
  if (typeof window !== 'undefined') try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export function WorkoutTypeBadges({ activityId, sport }: { activityId: string; sport: 'gym' | 'hyrox' }) {
  const base = sport === 'hyrox' ? HYROX_TYPES : MUSCU_TYPES
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
