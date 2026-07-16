'use client'

// ══════════════════════════════════════════════════════════════════
// MuscuSessionPanel — point d'entrée muscu de la fiche activité.
//  • Si une séance in-app (workout_sessions) est appariée à l'activité Strava
//    → on affiche le détail enregistré (exos / séries / volume), FUSIONNÉ avec
//    la FC déjà portée par l'activité. Lecture seule (vient de l'enregistreur).
//  • Sinon → saisie manuelle (MuscuExerciseLog, cas « non enregistré »).
// ══════════════════════════════════════════════════════════════════

import { useLinkedWorkoutSession, type LinkedWorkout } from '@/lib/activity/workoutFusion'
import { MuscuExerciseLog } from './MuscuExerciseLog'
import { useI18n } from '@/lib/i18n'
import type { WorkoutExercise, CompletedSet } from '@/types/workout'

const GYM = 'var(--sport-gym)'

interface ActivityLike { id: string; sport_type: string; started_at: string; provider_id?: unknown }

function fmtDur(s: number | null): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}
/** Durée courte : « 45s », « 1:30 » ou « 2min ». */
function fmtSecShort(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return r ? `${m}:${String(r).padStart(2, '0')}` : `${m}min`
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  )
}

/** Détail d'un exercice : « 4×6 · 20 kg · récup 60s ». Si des séries RÉELLES
 *  existent (completed_sets), on affiche ce qui a été fait — par ex. « 2 · 3 · 2 »
 *  quand les reps varient d'un tour à l'autre — plutôt que le plan initial. */
function ExoRow({ e, restLabel, done }: { e: WorkoutExercise; restLabel: string; done?: CompletedSet[] }) {
  const hasTime = (e.durationSec ?? 0) > 0
  let main = ''
  let weight: string | null = null
  if (done && done.length && !hasTime) {
    const reps = done.map(s => s.reps)
    const sameReps = reps.every(r => r === reps[0])
    main = sameReps ? `${done.length}×${reps[0]}` : reps.join(' · ')
    const ws = done.map(s => s.weightKg).filter(w => w > 0)
    if (ws.length) {
      const mn = Math.min(...ws), mx = Math.max(...ws)
      weight = mn === mx ? `${mx} kg` : `${mn}–${mx} kg`
    }
  } else {
    main = hasTime
      ? `${e.sets || 1}×${fmtSecShort(e.durationSec as number)}`
      : (e.sets && e.reps ? `${e.sets}×${e.reps}` : e.reps ? `${e.reps}` : '')
    weight = e.weightKg ? `${e.weightKg} kg` : null
  }
  // Récup réelle si captée (peut varier d'une série à l'autre), sinon le plan.
  let rest: string | null = null
  const realRests = (done ?? []).map(s => s.restSec).filter((v): v is number => v != null && v > 0)
  if (realRests.length) {
    const mn = Math.min(...realRests), mx = Math.max(...realRests)
    rest = mn === mx ? `${restLabel} ${fmtSecShort(mx)}` : `${restLabel} ${fmtSecShort(mn)}–${fmtSecShort(mx)}`
  } else if (e.restSec) {
    rest = `${restLabel} ${fmtSecShort(e.restSec)}`
  }
  const detail = [main || null, weight, rest].filter(Boolean).join(' · ')
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--text)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</span>
      {detail && <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>{detail}</span>}
    </div>
  )
}

function SessionCard({ s }: { s: LinkedWorkout }) {
  const { t } = useI18n()
  const groups = s.exercises_detail ?? []
  // Un exercice est soit « plat » (série simple), soit un groupe (circuit/EMOM/…)
  // porteur de circuitExercises. Le compteur reflète les vrais exercices.
  const flat = (e: WorkoutExercise): WorkoutExercise[] =>
    e.circuitExercises && e.circuitExercises.length
      ? e.circuitExercises
      : (e.supersetPartner ? [e, e.supersetPartner] : [e])
  const nbExos = groups.reduce((n, e) => n + flat(e).length, 0)
  const restLabel = t('activities.restLabel')
  const vol = s.total_volume_kg != null ? Math.round(Number(s.total_volume_kg)) : null
  // Séries réellement faites, indexées par exercice (triées par n° de tour).
  const doneByExo = new Map<string, CompletedSet[]>()
  for (const cs of s.completed_sets ?? []) {
    const arr = doneByExo.get(cs.exerciseId) ?? []
    arr.push(cs); doneByExo.set(cs.exerciseId, arr)
  }
  doneByExo.forEach(arr => arr.sort((a, b) => a.setIndex - b.setIndex))

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: 16, margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: GYM, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t('activities.recordedSession')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('activities.mergedWithHr')}</span>
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: nbExos ? 14 : 0 }}>
        <Stat label={t('activities.exercises')} value={nbExos || '—'} />
        <Stat label={t('activities.sets')} value={s.sets_completed ?? '—'} />
        <Stat label={t('activities.volume')} value={vol != null ? `${vol} kg` : '—'} />
        <Stat label={t('activities.duration')} value={fmtDur(s.duration_seconds)} />
      </div>

      {nbExos > 0 && (
        <div>
          {groups.map((g, i) => {
            const nested = g.circuitExercises && g.circuitExercises.length ? g.circuitExercises : null
            const rounds = g.circuitRounds ?? g.emomMinutes ?? g.tabataRounds
            if (nested) {
              // Groupe (circuit / Lap / EMOM / Tabata) : en-tête + exos imbriqués.
              const meta = [
                rounds ? `${rounds} ${t('activities.laps').toLowerCase()}` : null,
                g.circuitRestSec ? `${restLabel} ${fmtSecShort(g.circuitRestSec)}` : null,
              ].filter(Boolean).join(' · ')
              return (
                <div key={g.id ?? i} style={{ borderTop: '1px solid var(--border)', padding: '10px 0 4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: GYM }}>{g.name}</span>
                    {meta && <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>{meta}</span>}
                  </div>
                  <div style={{ paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
                    {nested.map((x, j) => <ExoRow key={x.id ?? j} e={x} restLabel={restLabel} done={doneByExo.get(x.id)} />)}
                  </div>
                </div>
              )
            }
            // Exercice plat (série simple) + éventuel partenaire de superset.
            const rows = g.supersetPartner ? [g, g.supersetPartner] : [g]
            return (
              <div key={g.id ?? i} style={{ borderTop: '1px solid var(--border)' }}>
                {rows.map((x, j) => <ExoRow key={x.id ?? j} e={x} restLabel={restLabel} done={doneByExo.get(x.id)} />)}
              </div>
            )
          })}
        </div>
      )}

      {(s.rpe != null || s.comment) && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          {s.rpe != null ? `RPE ${s.rpe}/10` : ''}{s.rpe != null && s.comment ? ' · ' : ''}{s.comment ?? ''}
        </div>
      )}
    </div>
  )
}

export function MuscuSessionPanel({ activity }: { activity: ActivityLike }) {
  const { session, loaded } = useLinkedWorkoutSession(activity)
  if (!loaded) return null
  return session ? <SessionCard s={session} /> : <MuscuExerciseLog activityId={activity.id} />
}
