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

const GYM = 'var(--sport-gym)'

interface ActivityLike { id: string; sport_type: string; started_at: string; provider_id?: unknown }

function fmtDur(s: number | null): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function SessionCard({ s }: { s: LinkedWorkout }) {
  const { t } = useI18n()
  const exos = s.exercises_detail ?? []
  const nbExos = exos.length
  const vol = s.total_volume_kg != null ? Math.round(Number(s.total_volume_kg)) : null

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
          {exos.map((e, i) => (
            <div key={e.id ?? i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{e.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {[e.sets && e.reps ? `${e.sets}×${e.reps}` : null, e.weightKg ? `${e.weightKg} kg` : null].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
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
