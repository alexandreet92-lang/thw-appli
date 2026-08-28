'use client'
// Édition de la séance PENDANT qu'on la fait (la séance est mise en pause par
// l'appelant). On peut ajouter / supprimer n'importe quel exercice, ajouter un
// circuit et y glisser des exos, ajuster le nombre de tours. Chaque changement
// reconstruit la timeline du moteur (SET_BLOCKS) sans perdre la position courante.
import { useState } from 'react'
import { IconPlus, IconTrash, IconMinus, IconLayoutGrid, IconChevronLeft } from '@tabler/icons-react'
import type { WorkoutExercise } from '@/types/workout'
import { useI18n } from '@/lib/i18n'
import ExerciseSearch from '../workout/ExerciseSearch'

interface Props {
  blocks: WorkoutExercise[]
  currentBlockIdx: number
  isDark: boolean
  onChange: (blocks: WorkoutExercise[]) => void
  onClose: () => void
}
type TFn = (key: string, vars?: Record<string, string | number>) => string
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
const uid = () => `x_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

function metaText(ex: WorkoutExercise, t: TFn): string {
  if (ex.durationSec && ex.durationSec > 0) return `${ex.durationSec}s`
  return `${ex.reps} ${t('w3a.reps')}${ex.weightKg > 0 ? ` · ${ex.weightKg} kg` : ` · ${t('w3a.bodyweight_abbr')}`}`
}

// Cible du picker : ajout d'un bloc séries à la fin, ou d'un exo dans un circuit.
type PickTarget = { kind: 'block' } | { kind: 'circuit'; blockIdx: number }

export default function SessionEditSheet({ blocks, currentBlockIdx, isDark, onChange, onClose }: Props) {
  const { t } = useI18n()
  const [pick, setPick] = useState<PickTarget | null>(null)

  const commit = (next: WorkoutExercise[]) => onChange(next)

  const removeBlock = (i: number) => commit(blocks.filter((_, k) => k !== i))
  const addSeries = (ex: WorkoutExercise) => commit([...blocks, { ...ex, mode: 'series', id: uid() }])
  const addCircuit = () =>
    commit([...blocks, { id: uid(), name: t('w3a.circuit'), mode: 'circuit', sets: 1, reps: 0, weightKg: 0, restSec: 0, circuitRounds: 3, circuitRestSec: 60, circuitExercises: [] }])
  const addToCircuit = (blockIdx: number, ex: WorkoutExercise) =>
    commit(blocks.map((b, k) => k !== blockIdx ? b : { ...b, circuitExercises: [...(b.circuitExercises ?? []), { ...ex, id: uid() }] }))
  const removeFromCircuit = (blockIdx: number, exoIdx: number) =>
    commit(blocks.map((b, k) => k !== blockIdx ? b : { ...b, circuitExercises: (b.circuitExercises ?? []).filter((_, j) => j !== exoIdx) }))
  const bumpRounds = (i: number, d: number) =>
    commit(blocks.map((b, k) => {
      if (k !== i) return b
      return b.mode === 'circuit'
        ? { ...b, circuitRounds: Math.max(1, (b.circuitRounds ?? 1) + d) }
        : { ...b, sets: Math.max(1, b.sets + d) }
    }))

  const onPicked = (ex: WorkoutExercise) => {
    if (!pick) return
    if (pick.kind === 'block') addSeries(ex)
    else addToCircuit(pick.blockIdx, ex)
  }

  const roundsOf = (b: WorkoutExercise) => Math.max(1, b.mode === 'circuit' ? b.circuitRounds ?? 1 : b.sets)

  const stepBtn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }
  const addBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontSize: 14 }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>
      {/* En-tête */}
      <div style={{ flexShrink: 0, padding: 'calc(env(safe-area-inset-top) + 12px) 18px 12px' }}>
        <button onClick={onClose} aria-label={t('w3a.back')} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', display: 'grid', placeItems: 'center', marginBottom: 10 }}><IconChevronLeft size={18} /></button>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>{t('w4a.edit_paused')}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 0' }}>{t('w4a.edit_title')}</h1>
      </div>

      {/* Liste des blocs */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 12px' }}>
        {blocks.map((b, i) => {
          const isCircuit = b.mode === 'circuit'
          const exos = isCircuit ? b.circuitExercises ?? [] : [b]
          const current = i === currentBlockIdx
          return (
            <div key={b.id} style={{ background: 'var(--bg-card)', border: `1px solid ${current ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 18, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 800 }}>
                  {isCircuit && <IconLayoutGrid size={15} />}{isCircuit ? `${t('w3a.circuit')}` : cap(b.name)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => bumpRounds(i, -1)} aria-label="-" style={stepBtn}><IconMinus size={14} /></button>
                  <span style={{ minWidth: 60, textAlign: 'center', fontSize: 12, color: 'var(--text-mid)', fontWeight: 800 }}>{roundsOf(b)} {roundsOf(b) > 1 ? t('w3a.tours_plural') : t('w3a.tour_singular')}</span>
                  <button onClick={() => bumpRounds(i, 1)} aria-label="+" style={stepBtn}><IconPlus size={14} /></button>
                  <button onClick={() => removeBlock(i)} aria-label={t('w4a.edit_remove')} style={{ ...stepBtn, color: 'var(--danger)' }}><IconTrash size={15} /></button>
                </div>
              </div>

              {exos.map((e, j) => (
                <div key={e.id || j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: j < exos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{cap(e.name)}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 700 }}>{metaText(e, t)}</span>
                  {isCircuit && (
                    <button onClick={() => removeFromCircuit(i, j)} aria-label={t('w4a.edit_remove')} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-mid)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><IconTrash size={14} /></button>
                  )}
                </div>
              ))}
              {isCircuit && exos.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '2px 0 8px' }}>{t('w4a.edit_empty_circuit')}</p>
              )}
              {isCircuit && (
                <button onClick={() => setPick({ kind: 'circuit', blockIdx: i })} style={{ ...addBtn, width: '100%', height: 40, marginTop: 8, background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--text)', fontSize: 13 }}>
                  <IconPlus size={16} /> {t('w4a.edit_add_to_circuit')}
                </button>
              )}
            </div>
          )
        })}
        {blocks.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', margin: '28px 0' }}>{t('w4a.edit_empty')}</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <button onClick={() => setPick({ kind: 'block' })} style={{ ...addBtn, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text)' }}>
            <IconPlus size={17} /> {t('w4a.edit_add_exo')}
          </button>
          <button onClick={addCircuit} style={{ ...addBtn, background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text)' }}>
            <IconLayoutGrid size={17} /> {t('w4a.edit_add_circuit')}
          </button>
        </div>
      </div>

      {/* Pied : terminer (reste en pause côté appelant) */}
      <div style={{ flexShrink: 0, padding: '10px 20px calc(env(safe-area-inset-bottom) + 18px)', borderTop: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ width: '100%', height: 52, border: 'none', borderRadius: 15, cursor: 'pointer', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 800 }}>
          {t('w4a.edit_done')}
        </button>
      </div>

      {pick && <ExerciseSearch sport="gym" isDark={isDark} onAdd={onPicked} onClose={() => setPick(null)} />}
    </div>
  )
}
