'use client'
// ══════════════════════════════════════════════════════════════════
// Moteur de builder par GROUPES (circuits) → exercices, partagé Muscu/
// Hyrox. État contrôlé par le parent (sync refs → exercisesToBlocks).
// ══════════════════════════════════════════════════════════════════
import { useState, Fragment } from 'react'
import type { ReactNode } from 'react'
import { IconPlus, IconRefresh, IconDotsVertical, IconTrash, IconSearch, IconArrowNarrowDown } from '@tabler/icons-react'
import { searchExercises } from '../exercises'
import {
  type ExerciseItem, type ExoCircuit, itemFromDef, customItem, genCircuitId, fmtSec,
} from './strength'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePicker } from './ExercisePicker'
import { Stepper } from './ui'
import { CIRCUIT_TYPES, type CircuitType } from '@/app/planning/page'
import { useI18n } from '@/lib/i18n'

// Réglages par défaut selon le type de circuit (mêmes valeurs que le desktop).
const circuitDefaults = (type: string) => ({
  rounds: type === 'tabata' ? 8 : type === 'emom' ? 12 : 3,
  rest:   type === 'tabata' ? 10 : type === 'emom' ? 0 : 90,
})

export function GroupBuilder({ variant, accent, exercises, setExercises, circuits, setCircuits, map, setMap, banner, presets }: {
  variant: 'muscu' | 'hyrox'; accent: string
  exercises: ExerciseItem[]; setExercises: (e: ExerciseItem[]) => void
  circuits: ExoCircuit[]; setCircuits: (c: ExoCircuit[]) => void
  map: Record<string, string>; setMap: (m: Record<string, string>) => void
  banner: ReactNode; presets?: ReactNode
}) {
  const { t: tr } = useI18n()
  const [adding, setAdding] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  // Sélecteur de type de circuit : 'new' = ajout, ou un id de circuit = changement.
  const [typeMenu, setTypeMenu] = useState<string | null>(null)
  const sport = variant === 'hyrox' ? 'hyrox' : 'gym'

  const exosOf = (cid: string) => exercises.filter(e => (map[e.id] ?? 'default') === cid)
  const addItem = (item: ExerciseItem, cid: string) => { setExercises([...exercises, item]); setMap({ ...map, [item.id]: cid }); setAdding(null); setQuery('') }
  const updateExo = (it: ExerciseItem) => setExercises(exercises.map(e => e.id === it.id ? it : e))
  const removeExo = (id: string) => { setExercises(exercises.filter(e => e.id !== id)); const m = { ...map }; delete m[id]; setMap(m) }
  function addCircuit(typeId?: CircuitType) {
    const n = circuits.length + 1
    if (variant === 'hyrox') {
      setCircuits([...circuits, { id: genCircuitId(), name: tr('planning.circuitN', { n }), type: 'circuit', rounds: 1, restBetweenRoundsSec: 0, targetTimeSec: 0 }])
      return
    }
    const t = typeId ?? 'series'
    const ct = CIRCUIT_TYPES.find(c => c.id === t)
    const d = circuitDefaults(t)
    setCircuits([...circuits, { id: genCircuitId(), name: `${ct?.label ?? tr('planning.seriesPlural')} ${n}`, type: t, rounds: d.rounds, restBetweenRoundsSec: d.rest }])
    setTypeMenu(null)
  }
  function changeCircuitType(cid: string, typeId: CircuitType) {
    const d = circuitDefaults(typeId)
    updateCircuit(cid, { type: typeId, rounds: d.rounds, restBetweenRoundsSec: d.rest })
    setTypeMenu(null)
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
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--se-dim)' }}>{tr('planning.target')}</span>
                <input value={fmtSec(c.targetTimeSec ?? 0)} onChange={e => { const m = e.target.value.match(/^(\d+):(\d{1,2})$/); updateCircuit(c.id, { targetTimeSec: m ? (+m[1]) * 60 + (+m[2]) : (parseInt(e.target.value) || 0) }) }}
                  className="se-fr se-tnum" style={{ width: 52, textAlign: 'center', background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 8, padding: '4px 4px', fontSize: 12, color: 'var(--se-text)', outline: 'none' }} />
              </div>
            )}
            {variant !== 'hyrox' && (
              <button type="button" onClick={() => setTypeMenu(typeMenu === c.id ? null : c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, border: `1px solid ${accent}`, background: `${accent}14`, color: accent, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span>{CIRCUIT_TYPES.find(t => t.id === (c.type ?? 'series'))?.icon ?? '▤'}</span>
                {CIRCUIT_TYPES.find(t => t.id === (c.type ?? 'series'))?.label ?? tr('planning.seriesPlural')}
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setMenu(menu === c.id ? null : c.id)} style={{ border: 'none', background: 'transparent', color: 'var(--se-dim)', cursor: 'pointer', display: 'flex', padding: 2 }}><IconDotsVertical size={17} /></button>
              {menu === c.id && (
                <div style={{ position: 'absolute', right: 0, top: 24, zIndex: 5, background: 'var(--se-card)', border: '1px solid var(--se-rule)', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  <button type="button" onClick={() => removeCircuit(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: 'none', background: 'transparent', color: '#ff5f5f', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}><IconTrash size={15} /> {tr('planning.deleteGroup')}</button>
                </div>
              )}
            </div>
          </div>

          {/* Sélecteur de type de circuit (muscu) */}
          {typeMenu === c.id && variant !== 'hyrox' && (
            <CircuitTypeChips current={c.type} accent={accent} onPick={t => changeCircuitType(c.id, t)} />
          )}

          {/* Tours / minutes du circuit (sauf Séries : chaque exo porte ses séries) */}
          {variant !== 'hyrox' && (c.type ?? 'series') !== 'series' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--se-text)', flexShrink: 0 }}>
                {c.type === 'emom' ? tr('planning.duration') : tr('planning.rounds')}
              </span>
              <div style={{ width: 132 }}>
                <Stepper value={String(c.rounds)} unit={c.type === 'emom' ? 'min' : '×'}
                  onChange={v => updateCircuit(c.id, { rounds: Math.max(1, parseInt(v) || 1) })}
                  onDec={() => updateCircuit(c.id, { rounds: Math.max(1, c.rounds - 1) })}
                  onInc={() => updateCircuit(c.id, { rounds: c.rounds + 1 })} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--se-dim)' }}>
                {c.type === 'emom' ? tr('planning.oneExoPerMin') : c.type === 'tabata' ? '20s / 10s' : c.type === 'superset' ? tr('planning.twoExosChained') : tr('planning.chainThenRepeat')}
              </span>
            </div>
          )}

          {/* Exercices du groupe — flèche d'enchaînement si repos court (≤30s) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exosOf(c.id).map((e, i, arr) => {
              const chained = i < arr.length - 1 && (c.type === 'superset' || (c.type === 'circuit' && (e.restSec ?? 0) <= 30))
              return (
                <Fragment key={e.id}>
                  <ExerciseCard variant={variant} item={e} index={i} accent={accent} circuitType={c.type} onChange={updateExo} onRemove={() => removeExo(e.id)} />
                  {chained && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0', color: accent }}>
                      <IconArrowNarrowDown size={22} />
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>

          {/* Panneau d'ajout */}
          {adding === c.id ? (
            variant === 'hyrox' ? (
              <div style={{ marginTop: 10, border: '1px solid var(--se-rule)', borderRadius: 'var(--se-r)', background: 'var(--se-card)', padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <IconSearch size={15} color="var(--se-dim)" />
                  <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('planning.searchOrFreeName')}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--se-text)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                  {results.map(def => (
                    <button key={def.id} type="button" onClick={() => addItem(itemFromDef(def), c.id)}
                      style={{ textAlign: 'left', border: 'none', background: 'transparent', color: 'var(--se-text)', fontSize: 13, padding: '7px 6px', borderRadius: 8, cursor: 'pointer' }}>{def.name}</button>
                  ))}
                  {query.trim() && (
                    <button type="button" onClick={() => addItem(customItem(query.trim(), 'hyrox'), c.id)}
                      style={{ textAlign: 'left', border: '1px dashed var(--se-rule)', background: 'transparent', color: accent, fontSize: 13, fontWeight: 600, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', marginTop: 2 }}>{tr('planning.createQuoted', { q: query.trim() })}</button>
                  )}
                </div>
              </div>
            ) : (
              <ExercisePicker accent={accent}
                onPick={def => addItem(itemFromDef(def), c.id)}
                onCustom={name => { if (name) addItem(customItem(name, 'mixte'), c.id) }} />
            )
          ) : (
            <button type="button" onClick={() => { setAdding(c.id); setQuery('') }} style={addBtn(accent)}>
              <IconPlus size={15} /> {variant === 'hyrox' ? tr('planning.addStationExercise') : tr('planning.addExercise')}
            </button>
          )}
        </div>
      ))}

      {/* Ajouter un circuit — muscu : choix du type ; hyrox : direct */}
      {variant === 'hyrox' ? (
        <button type="button" onClick={() => addCircuit()} style={{ ...addBtn(accent), border: '1px dashed var(--se-rule)', width: '100%', justifyContent: 'center' }}>
          <IconRefresh size={15} /> {tr('planning.addCircuit')}
        </button>
      ) : typeMenu === 'new' ? (
        <div style={{ border: '1px dashed var(--se-rule)', borderRadius: 'var(--se-r)', padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--se-dim)', marginBottom: 8 }}>{tr('planning.circuitType')}</div>
          <CircuitTypeChips current={null} accent={accent} onPick={t => addCircuit(t)} />
          <button type="button" onClick={() => setTypeMenu(null)} style={{ ...addBtn(accent), color: 'var(--se-dim)', marginTop: 4 }}>{tr('planning.cancel')}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setTypeMenu('new')} style={{ ...addBtn(accent), border: '1px dashed var(--se-rule)', width: '100%', justifyContent: 'center' }}>
          <IconRefresh size={15} /> {tr('planning.addCircuit')}
        </button>
      )}
    </div>
  )
}

// Chips de sélection du type de circuit (Séries / Lap / Superset / EMOM / Tabata).
function CircuitTypeChips({ current, accent, onPick }: {
  current: string | null; accent: string; onPick: (t: CircuitType) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '4px 0 10px' }}>
      {CIRCUIT_TYPES.map(ct => {
        const on = (current ?? 'series') === ct.id
        return (
          <button key={ct.id} type="button" onClick={() => onPick(ct.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
              border: on ? `2px solid ${accent}` : '1px solid var(--se-rule)', background: on ? `${accent}14` : 'var(--se-card)' }}>
            <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{ct.icon}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: on ? accent : 'var(--se-text)' }}>{ct.label}</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--se-dim)' }}>{ct.desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

const addBtn = (accent: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '9px 12px',
  border: 'none', background: 'transparent', color: accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
})
