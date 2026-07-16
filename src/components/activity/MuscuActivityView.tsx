'use client'

// ══════════════════════════════════════════════════════════════════
// MuscuActivityView — fiche dédiée musculation (sport_type 'gym').
// Remplace le layout générique cardio (Distance/Vitesse/Allure/D+,
// Terrain/Conditions, Courbes à toggles, donuts) qui n'a aucun sens en
// muscu. N'affiche que des données RÉELLES.
//
// ⚠️ Le détail par exercice (séries, charges, 1RM, circuits, drill-down)
// nécessite des données structurées d'exercices qui N'EXISTENT PAS dans
// le schéma / ne sont pas fournies par la sync (cf.
// PROMPT_MUSCU_HYROX_INTERFACE.md). Cette section affiche donc un état
// « non disponible » documenté plutôt que des chiffres inventés.
// ══════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'
import { useSmSn } from '@/hooks/useSmSn'
import { smSnFromRow } from '@/lib/metrics/smSn'
import { useI18n } from '@/lib/i18n'

interface MuscuActivity {
  moving_time_s?: number | null
  avg_hr?:        number | null
  max_hr?:        number | null
  calories?:      number | null
  tss?:           number | null
  avg_temp_c?:    number | null
  difficulty?:    number | null
  notes?:         string | null
  description?:   string | null
  streams?:       { heartrate?: number[] | null } | null
}

interface Props {
  activity:    MuscuActivity
  z2DurationS: number | null
  jauges:      ReactNode   // FeelingDifficultyCard rendu par la page
}

function fmtDur(s: number | null | undefined): string {
  if (s == null || !isFinite(s)) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
const sectionTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9,
  textTransform: 'uppercase', marginBottom: 14, borderBottom: '1px solid var(--border)',
  paddingBottom: 5, fontFamily: 'var(--font-display, inherit)',
}

function KpiTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg)', padding: '10px 12px' }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

export function MuscuActivityView({ activity, z2DurationS, jauges }: Props) {
  const { t } = useI18n()
  const a = activity
  const { benchmarks } = useSmSn()
  const smsn = smSnFromRow({ sport_type: 'gym', moving_time_s: a.moving_time_s ?? null, avg_hr: a.avg_hr ?? null, avg_temp_c: a.avg_temp_c ?? null }, benchmarks)

  const kpis: { label: string; value: string; color?: string }[] = [
    { label: t('activities.duration'),    value: fmtDur(a.moving_time_s) },
    { label: t('activities.hrAvg'),   value: a.avg_hr ? `${Math.round(Number(a.avg_hr))} bpm` : '—', color: '#f97316' },
    { label: t('activities.hrMax'),   value: a.max_hr ? `${Math.round(Number(a.max_hr))} bpm` : '—', color: '#f97316' },
    { label: t('activities.calories'), value: a.calories ? `${Math.round(Number(a.calories))} kcal` : '—' },
    { label: 'SM',       value: String(smsn.sm) },
    { label: t('activities.z2Duration'), value: z2DurationS != null ? fmtDur(z2DurationS) : '—' },
  ]

  const cardio: { label: string; value: string }[] = [
    { label: t('activities.hrMax'),   value: a.max_hr ? `${Math.round(Number(a.max_hr))} bpm` : '—' },
    { label: t('activities.hrAvg'),   value: a.avg_hr ? `${Math.round(Number(a.avg_hr))} bpm` : '—' },
    { label: t('activities.z2Duration'), value: z2DurationS != null ? fmtDur(z2DurationS) : '—' },
  ]
  const seance: { label: string; value: string }[] = [
    { label: t('activities.tempAvg'),  value: a.avg_temp_c != null ? `${Math.round(Number(a.avg_temp_c))} °C` : '—' },
    { label: t('activities.calories'),   value: a.calories ? `${Math.round(Number(a.calories))} kcal` : '—' },
    { label: 'SN',         value: String(smsn.sn) },
    { label: t('activities.difficulty'), value: a.difficulty != null ? `${a.difficulty} / 10` : '—' },
  ]
  const notes = a.notes ?? a.description

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {jauges}

      {/* Hero KPIs muscu (réels) — pas de Distance/Vitesse/Allure/D+ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {kpis.map(k => <KpiTile key={k.label} {...k} />)}
      </div>

      {/* Stats : Cardio + Séance (pas de Terrain/Conditions) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {[{ title: t('activities.cardio'), color: '#EF4444', rows: cardio }, { title: t('activities.session'), color: '#7c3aed', rows: seance }].map(block => (
          <div key={block.title}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.07em', textTransform: 'uppercase', color: block.color, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${block.color}25` }}>{block.title}</div>
            {block.rows.map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* La courbe FC/Température (mêmes toggles que mobile) et le détail par
          exercice sont rendus par la page (ActivityCurves + MuscuSessionPanel). */}

      {notes && (
        <div>
          <div style={sectionTitle}>{t('activities.comment')}</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{notes}</div>
        </div>
      )}
    </div>
  )
}
