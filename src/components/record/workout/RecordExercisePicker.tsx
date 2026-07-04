'use client'
// ══════════════════════════════════════════════════════════════════
// Sélecteur d'exercices de l'enregistreur (muscu) — réutilise EXACTEMENT le
// même picker browsable que Session / Planning (groupes → familles → variantes,
// FAMILLES_MUSCU). Convertit l'exercice choisi en WorkoutExercise. Les tokens
// --se-* sont fournis inline → suit le thème jour/nuit de l'app.
// ══════════════════════════════════════════════════════════════════
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { ExercisePicker } from '@/components/planning/mobile/ExercisePicker'
import type { ExoDefinition } from '@/components/planning/exercises'
import type { WorkoutExercise } from '@/types/workout'

const seVars = {
  position: 'fixed', inset: 0, zIndex: 10010, background: 'var(--bg-card)',
  display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)',
  paddingTop: 'env(safe-area-inset-top)',
  ['--se-card']: 'var(--bg-card)', ['--se-card2']: 'var(--bg-card2)',
  ['--se-text']: 'var(--text)', ['--se-dim']: 'var(--text-dim)',
  ['--se-rule']: 'var(--border)', ['--se-r']: '12px',
} as React.CSSProperties

function defToWorkout(def: ExoDefinition): WorkoutExercise {
  return { id: `${def.id}_${Date.now()}`, name: def.name, mode: 'series', sets: def.defaultSets, reps: def.defaultReps, weightKg: 0, restSec: def.defaultRestSec }
}

export default function RecordExercisePicker({ accent, onAdd, onClose }: {
  accent: string; onAdd: (e: WorkoutExercise) => void; onClose: () => void
}) {
  const { t } = useI18n()
  return createPortal(
    <div style={seVars}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t('record.pickerAddExercise')}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 24px' }}>
        <ExercisePicker accent={accent}
          onPick={def => { onAdd(defToWorkout(def)); onClose() }}
          onCustom={name => { if (name) { onAdd({ id: `custom_${Date.now()}`, name, mode: 'series', sets: 3, reps: 10, weightKg: 0, restSec: 90 }); onClose() } }} />
      </div>
    </div>,
    document.body,
  )
}
