'use client'
// ══════════════════════════════════════════════════════════════════════════
// WorkoutEditor — édition COMPLÈTE de la séance muscu / hyrox PENDANT le direct.
// Feuille du bas (style record/workout kit) : réordonner (glisser ou flèches),
// ajouter / retirer un tour (round, mappé sur le vrai champ du mode via
// getRounds/withRounds), dupliquer, supprimer, ajouter un exercice (sélecteur
// existant) ou un circuit (groupe à remplir), ajouter / retirer des exercices
// d'un circuit. Travaille sur un brouillon ; applique tout au « Enregistrer »
// pour que le parent réconcilie les séries déjà faites et recale la position.
// ══════════════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import type { WorkoutExercise } from '@/types/workout'
import { getRounds, withRounds } from '@/types/workout'
import { useI18n } from '@/lib/i18n'
import { haptic } from '@/lib/haptics'
import { RkSheet, RkCta, RkIco, RK_ICON } from '../kit/RecordKit'
import ExerciseSearch from './ExerciseSearch'
import RecordExercisePicker from './RecordExercisePicker'

interface Props {
  open: boolean
  sport: 'gym' | 'hyrox'
  exercises: WorkoutExercise[]
  accent: string
  isDark: boolean
  onClose: () => void
  onApply: (next: WorkoutExercise[]) => void
}

// Identifiants uniques (jamais de collision, même en duplication en rafale).
let UID = 0
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(UID++).toString(36)}`

function cloneBlock(ex: WorkoutExercise): WorkoutExercise {
  const copy: WorkoutExercise = { ...ex, id: uid('dup') }
  if (ex.circuitExercises) copy.circuitExercises = ex.circuitExercises.map(c => ({ ...c, id: uid('dup') }))
  if (ex.supersetPartner) copy.supersetPartner = { ...ex.supersetPartner, id: uid('dup') }
  return copy
}

function newCircuit(name: string): WorkoutExercise {
  return {
    id: uid('circuit'), name, mode: 'circuit', sets: 1, reps: 0, weightKg: 0,
    restSec: 60, circuitRounds: 3, circuitRestSec: 60, circuitExercises: [],
  }
}

export default function WorkoutEditor({ open, sport, exercises, accent, isDark, onClose, onApply }: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<WorkoutExercise[]>(exercises)
  // Cible d'ajout : 'top' = nouveau bloc ; sinon id du circuit à remplir.
  const [addingInto, setAddingInto] = useState<'top' | string | null>(null)
  // Circuits dépliés (affichage des sous-exercices).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const liveRef = useRef(draft)
  liveRef.current = draft

  const modeLabel = (ex: WorkoutExercise) =>
    ex.mode === 'series' ? t('record.editorModeSeries')
      : ex.mode === 'circuit' ? 'Circuit'
        : ex.mode === 'superset' ? 'Superset'
          : ex.mode === 'emom' ? 'EMOM' : 'Tabata'

  const toursLabel = (ex: WorkoutExercise) => {
    const n = getRounds(ex)
    if (ex.mode === 'emom') return t('record.editorMinCount', { n })
    if (ex.mode === 'series') return t('record.editorSeriesCount', { n })
    return t('record.editorToursCount', { n })
  }

  const summary = (ex: WorkoutExercise) => {
    if (ex.mode === 'circuit') {
      const n = ex.circuitExercises?.length ?? 0
      return `${n} ${t(n === 1 ? 'record.editorExoSingular' : 'record.editorExoPlural')}`
    }
    if (ex.mode === 'superset') return `A · B${ex.supersetPartner ? ` — ${ex.supersetPartner.name}` : ''}`
    if (ex.mode === 'tabata') return `${ex.tabataWorkSec ?? 20}s / ${ex.tabataRestSec ?? 10}s`
    return `×${ex.reps}${ex.weightKg > 0 ? ` · ${ex.weightKg} kg` : ''}`
  }

  // ── Opérations sur le brouillon ──────────────────────────────────────────
  const setRounds = (id: string, delta: 1 | -1) => {
    haptic('light')
    setDraft(d => d.map(ex => ex.id === id ? withRounds(ex, getRounds(ex) + delta) : ex))
  }
  const duplicate = (id: string) => {
    haptic('medium')
    setDraft(d => {
      const i = d.findIndex(e => e.id === id)
      if (i < 0) return d
      const next = [...d]
      next.splice(i + 1, 0, cloneBlock(d[i]))
      return next
    })
  }
  const remove = (id: string) => {
    haptic('medium')
    setDraft(d => d.filter(e => e.id !== id))
  }
  const move = (id: string, dir: -1 | 1) => {
    setDraft(d => {
      const i = d.findIndex(e => e.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= d.length) return d
      haptic('light')
      const next = [...d];[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  const removeSub = (circuitId: string, subId: string) => {
    haptic('light')
    setDraft(d => d.map(ex => ex.id === circuitId
      ? { ...ex, circuitExercises: (ex.circuitExercises ?? []).filter(c => c.id !== subId) }
      : ex))
  }

  const addExercise = (ex: WorkoutExercise) => {
    const target = addingInto
    setAddingInto(null)
    if (target == null) return
    if (target === 'top') { setDraft(d => [...d, ex]); return }
    // Dans un circuit : on range le mouvement comme sous-exercice (série plate).
    const sub: WorkoutExercise = { ...ex, mode: 'series' }
    setDraft(d => d.map(c => c.id === target
      ? { ...c, circuitExercises: [...(c.circuitExercises ?? []), sub] }
      : c))
    setExpanded(e => ({ ...e, [target]: true }))
  }

  const addCircuit = () => {
    haptic('light')
    const c = newCircuit(t('record.editorNewCircuit'))
    setDraft(d => [...d, c])
    setExpanded(e => ({ ...e, [c.id]: true }))
  }

  const save = () => { haptic('success'); onApply(liveRef.current); onClose() }

  return (
    <>
      <RkSheet open={open && addingInto == null} onClose={onClose} title={t('record.editorTitle')}
        sub={t('record.editorDragHint')} isDark={isDark} zIndex={10060} surface="page" full
        footer={
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <RkCta variant="dark" onClick={() => { haptic('light'); setAddingInto('top') }} style={{ flex: 1 }}>
                <RkIco d={RK_ICON.plus} size={17} /> {t('record.editorAddExercise')}
              </RkCta>
              <RkCta variant="dark" onClick={addCircuit} style={{ flex: 1 }}>
                <RkIco d={RK_ICON.layers} size={17} /> {t('record.editorAddCircuit')}
              </RkCta>
            </div>
            <RkCta variant="primary" onClick={save}>{t('record.editorSave')}</RkCta>
          </>
        }>
        {draft.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-mid)', textAlign: 'center', padding: '24px 8px' }}>
            {t('record.workoutEmptySession')}
          </p>
        )}
        <Reorder.Group axis="y" values={draft} onReorder={setDraft} as="div"
          style={{ listStyle: 'none', margin: 0, padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {draft.map((ex, i) => (
            <BlockItem
              key={ex.id} ex={ex} index={i} total={draft.length} accent={accent}
              expanded={!!expanded[ex.id]}
              onToggle={() => setExpanded(e => ({ ...e, [ex.id]: !e[ex.id] }))}
              modeLabel={modeLabel(ex)} toursLabel={toursLabel(ex)} summary={summary(ex)}
              onRounds={d => setRounds(ex.id, d)}
              onDuplicate={() => duplicate(ex.id)}
              onDelete={() => remove(ex.id)}
              onMoveUp={() => move(ex.id, -1)}
              onMoveDown={() => move(ex.id, 1)}
              onAddInto={() => { haptic('light'); setAddingInto(ex.id) }}
              onRemoveSub={subId => removeSub(ex.id, subId)}
              t={t}
            />
          ))}
        </Reorder.Group>
      </RkSheet>

      {addingInto != null && (sport === 'gym'
        ? <RecordExercisePicker accent={accent} zIndex={10120} onAdd={addExercise} onClose={() => setAddingInto(null)} />
        : <ExerciseSearch sport={sport} isDark={isDark} zIndex={10120} onAdd={addExercise} onClose={() => setAddingInto(null)} />)}
    </>
  )
}

// ── Ligne d'un bloc (glissable) ───────────────────────────────────────────────
interface ItemProps {
  ex: WorkoutExercise
  index: number
  total: number
  accent: string
  expanded: boolean
  onToggle: () => void
  modeLabel: string
  toursLabel: string
  summary: string
  onRounds: (delta: 1 | -1) => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddInto: () => void
  onRemoveSub: (subId: string) => void
  t: (k: string, v?: Record<string, string | number>) => string
}

function BlockItem({
  ex, index, total, accent, expanded, onToggle, modeLabel, toursLabel, summary,
  onRounds, onDuplicate, onDelete, onMoveUp, onMoveDown, onAddInto, onRemoveSub, t,
}: ItemProps) {
  const controls = useDragControls()
  const rounds = getRounds(ex)
  const isCircuit = ex.mode === 'circuit'
  const stepBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)',
    border: '1px solid var(--border)', color: 'var(--text)', fontSize: 18, lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <Reorder.Item value={ex} dragListener={false} dragControls={controls} as="div"
      style={{
        listStyle: 'none', background: 'var(--bg-card2)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', padding: '10px 12px',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Poignée de glissement */}
        <button type="button" aria-label={t('record.editorDragHandle')}
          onPointerDown={e => { haptic('light'); controls.start(e) }}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'grab', padding: '4px 2px', touchAction: 'none', display: 'flex', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <circle cx="5" cy="4" r="1.3" /><circle cx="11" cy="4" r="1.3" />
            <circle cx="5" cy="8" r="1.3" /><circle cx="11" cy="8" r="1.3" />
            <circle cx="5" cy="12" r="1.3" /><circle cx="11" cy="12" r="1.3" />
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }} onClick={isCircuit ? onToggle : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: accent, background: `color-mix(in srgb, ${accent} 15%, transparent)`, padding: '2px 6px', borderRadius: 'var(--r-sm)', flexShrink: 0 }}>{modeLabel}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{index + 1}. {ex.name}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-mid)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toursLabel} · {summary}
          </p>
        </div>

        {/* Flèches (accessibilité clavier / fallback au glisser) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button type="button" aria-label={t('record.settingsMoveUp')} disabled={index === 0} onClick={onMoveUp}
            style={{ background: 'none', border: 'none', color: 'var(--text-mid)', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, padding: 0, lineHeight: 1, fontSize: 13 }}>▲</button>
          <button type="button" aria-label={t('record.settingsMoveDown')} disabled={index === total - 1} onClick={onMoveDown}
            style={{ background: 'none', border: 'none', color: 'var(--text-mid)', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1, padding: 0, lineHeight: 1, fontSize: 13 }}>▼</button>
        </div>
      </div>

      {/* Contrôles : tours · dupliquer · supprimer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-pill)', padding: '3px 4px' }}>
          <button type="button" aria-label={t('record.editorRemoveTour')} disabled={rounds <= 1} onClick={() => onRounds(-1)} style={{ ...stepBtn, opacity: rounds <= 1 ? 0.4 : 1, cursor: rounds <= 1 ? 'default' : 'pointer' }}>−</button>
          <span style={{ minWidth: 54, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{toursLabel}</span>
          <button type="button" aria-label={t('record.editorAddTour')} disabled={rounds >= 30} onClick={() => onRounds(1)} style={{ ...stepBtn, opacity: rounds >= 30 ? 0.4 : 1, cursor: rounds >= 30 ? 'default' : 'pointer' }}>+</button>
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" aria-label={t('record.editorDuplicate')} title={t('record.editorDuplicate')} onClick={onDuplicate}
          style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-mid)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RkIco d={RK_ICON.copy} size={15} />
        </button>
        <button type="button" aria-label={t('record.editorDelete')} title={t('record.editorDelete')} onClick={onDelete}
          style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RkIco d={RK_ICON.trash} size={15} />
        </button>
      </div>

      {/* Sous-exercices d'un circuit (dépliable) */}
      {isCircuit && expanded && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          {(ex.circuitExercises ?? []).length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 8px', textAlign: 'center' }}>{t('record.editorEmptyCircuit')}</p>
          )}
          {(ex.circuitExercises ?? []).map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-dim)', flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-mid)' }}>×{sub.reps}{sub.weightKg > 0 ? ` · ${sub.weightKg}kg` : ''}</span>
              <button type="button" aria-label={t('record.editorRemove')} onClick={() => onRemoveSub(sub.id)}
                style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RkIco d={RK_ICON.close} size={13} sw={2.2} />
              </button>
            </div>
          ))}
          <button type="button" onClick={onAddInto}
            style={{ width: '100%', marginTop: 4, padding: '9px', borderRadius: 'var(--r-sm)', border: '1px dashed var(--border-mid)', background: 'transparent', color: accent, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RkIco d={RK_ICON.plus} size={15} /> {t('record.editorAddToCircuit')}
          </button>
        </div>
      )}
    </Reorder.Item>
  )
}
