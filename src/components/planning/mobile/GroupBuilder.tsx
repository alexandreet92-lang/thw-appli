'use client'
// ══════════════════════════════════════════════════════════════════
// Moteur de builder par GROUPES (circuits) → exercices, partagé Muscu/
// Hyrox. État contrôlé par le parent (sync refs → exercisesToBlocks).
// ══════════════════════════════════════════════════════════════════
import { useState } from 'react'
import type { ReactNode } from 'react'
import { IconPlus, IconRefresh, IconDotsVertical, IconTrash, IconSearch } from '@tabler/icons-react'
import { searchExercises } from '../exercises'
import {
  type ExerciseItem, type ExoCircuit, itemFromDef, customItem, genCircuitId, fmtSec,
} from './strength'
import { ExerciseCard } from './ExerciseCard'

export function GroupBuilder({ variant, accent, exercises, setExercises, circuits, setCircuits, map, setMap, banner, presets }: {
  variant: 'muscu' | 'hyrox'; accent: string
  exercises: ExerciseItem[]; setExercises: (e: ExerciseItem[]) => void
  circuits: ExoCircuit[]; setCircuits: (c: ExoCircuit[]) => void
  map: Record<string, string>; setMap: (m: Record<string, string>) => void
  banner: ReactNode; presets?: ReactNode
}) {
  const [adding, setAdding] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const sport = variant === 'hyrox' ? 'hyrox' : 'gym'

  const exosOf = (cid: string) => exercises.filter(e => (map[e.id] ?? 'default') === cid)
  const addItem = (item: ExerciseItem, cid: string) => { setExercises([...exercises, item]); setMap({ ...map, [item.id]: cid }); setAdding(null); setQuery('') }
  const updateExo = (it: ExerciseItem) => setExercises(exercises.map(e => e.id === it.id ? it : e))
  const removeExo = (id: string) => { setExercises(exercises.filter(e => e.id !== id)); const m = { ...map }; delete m[id]; setMap(m) }
  function addCircuit() {
    const n = circuits.length + 1
    setCircuits([...circuits, variant === 'hyrox'
      ? { id: genCircuitId(), name: `Circuit ${n}`, type: 'circuit', rounds: 1, restBetweenRoundsSec: 0, targetTimeSec: 0 }
      : { id: genCircuitId(), name: `Séries ${n}`, type: 'series', rounds: 3, restBetweenRoundsSec: 90 }])
  }
  function removeCircuit(cid: string) {
    const ids = exosOf(cid).map(e => e.id)
    setExercises(exercises.filter(e => !ids.includes(e.id)))
    const m = { ...map }; ids.forEach(id => delete m[id]); setMap(m)
    setCircuits(circuits.filter(c => c.id !== cid))
    setMenu(null)
  }
  const updateCircuit = (cid: string, patch: Partial<ExoCircuit>) => setCircuits(circuits.map(c => c.id === cid ? { ...c, ...patch } : c))

  const results = searchExercises(query, variant === 'hyrox' ? 'hyrox' : undefined).slice(0, 8)

  return (
    <div>
      {presets}
      {banner}

      {circuits.map(c => (
        <div key={c.id} style={{ border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', padding: 12, marginBottom: 14, background: 'var(--se-card2)' }}>
          {/* En-tête de groupe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input value={c.name} onChange={e => updateCircuit(c.id, { name: e.target.value })}
              className="se-fr" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: 'var(--se-text)' }} />
            {variant === 'hyrox' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--se-dim)' }}>Cible</span>
                <input value={fmtSec(c.targetTimeSec ?? 0)} onChange={e => { const m = e.target.value.match(/^(\d+):(\d{1,2})$/); updateCircuit(c.id, { targetTimeSec: m ? (+m[1]) * 60 + (+m[2]) : (parseInt(e.target.value) || 0) }) }}
                  className="se-fr se-tnum" style={{ width: 52, textAlign: 'center', background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 8, padding: '4px 4px', fontSize: 12, color: 'var(--se-text)', outline: 'none' }} />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setMenu(menu === c.id ? null : c.id)} style={{ border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}><IconDotsVertical size={17} /></button>
              {menu === c.id && (
                <div style={{ position: 'absolute', right: 0, top: 24, zIndex: 5, background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  <button type="button" onClick={() => removeCircuit(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: 'none', background: 'transparent', color: '#ff5f5f', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}><IconTrash size={15} /> Supprimer le groupe</button>
                </div>
              )}
            </div>
          </div>

          {/* Exercices du groupe */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exosOf(c.id).map((e, i) => (
              <ExerciseCard key={e.id} variant={variant} item={e} index={i} accent={accent} onChange={updateExo} onRemove={() => removeExo(e.id)} />
            ))}
          </div>

          {/* Panneau d'ajout */}
          {adding === c.id ? (
            <div style={{ marginTop: 10, border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', background: 'var(--se-card)', padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <IconSearch size={15} color="var(--se-dim)" />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher ou nom libre…"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--se-text)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                {results.map(def => (
                  <button key={def.id} type="button" onClick={() => addItem(itemFromDef(def), c.id)}
                    style={{ textAlign: 'left', border: 'none', background: 'transparent', color: 'var(--se-text)', fontSize: 13, padding: '7px 6px', borderRadius: 8, cursor: 'pointer' }}>{def.name}</button>
                ))}
                {query.trim() && (
                  <button type="button" onClick={() => addItem(customItem(query.trim(), variant === 'hyrox' ? 'hyrox' : 'mixte'), c.id)}
                    style={{ textAlign: 'left', border: '1px dashed var(--se-rule)', background: 'transparent', color: accent, fontSize: 13, fontWeight: 600, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', marginTop: 2 }}>+ Créer « {query.trim()} »</button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setAdding(c.id); setQuery('') }} style={addBtn(accent)}>
              <IconPlus size={15} /> {variant === 'hyrox' ? 'Ajouter une station / exercice' : 'Ajouter un exercice'}
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addCircuit} style={{ ...addBtn(accent), border: '1px dashed var(--se-rule)', width: '100%', justifyContent: 'center' }}>
        <IconRefresh size={15} /> Ajouter un circuit
      </button>
    </div>
  )
}

const addBtn = (accent: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '9px 12px',
  border: 'none', background: 'transparent', color: accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
})
