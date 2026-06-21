'use client'

// Onglet « Composition » refondu (DESIGN_SYSTEM.md). Neutres + accent --primary ;
// période = niveau de zoom du graphe (pas un filtre qui tronque). Ton factuel,
// aucun cadrage de restriction. Mesures réelles uniquement (saisie manuelle).

import { useEffect, useState } from 'react'
import type { WeightLog } from '@/hooks/useNutrition'
import { points, windowStats, annualSummaries, METRIC_UNIT, METRIC_LABEL, type WeightMetric } from './compositionData'
import { WeightGraph } from './WeightGraph'
import { AnnualSheet } from './AnnualSheet'
import { MeasureForm } from './MeasureForm'

const FB = 'var(--font-body)'
const PERIODS: [string, number][] = [['30 j', 30], ['3 mois', 90], ['1 an', 365]]
const METRICS: { key: WeightMetric; needsHeight?: boolean; dim?: boolean }[] = [
  { key: 'weight_kg' }, { key: 'fat_mass_percent' }, { key: 'muscle_mass_kg' },
  { key: 'ffmi', needsHeight: true }, { key: 'bmi', needsHeight: true, dim: true },
]

interface Props {
  weightLogs:   WeightLog[]
  heightCm:     number | null
  saveWeightLog:(log: Omit<WeightLog, 'id'>) => Promise<void>
  onGoToPlan:   () => void
  isDesktop:    boolean
}

export function CompositionTab(p: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [period, setPeriod] = useState(90)
  const [metric, setMetric] = useState<WeightMetric>('weight_kg')
  const [goalWeight, setGoalWeight] = useState<number | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState(''); const [mg, setMg] = useState(''); const [mm, setMm] = useState('')
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    const v = typeof window !== 'undefined' ? window.localStorage.getItem('thw_goal_weight') : null
    if (v) { setGoalWeight(parseFloat(v)); setGoalInput(v) }
  }, [])

  const saveGoal = () => {
    const v = parseFloat(goalInput)
    if (!isNaN(v) && v > 0) { window.localStorage.setItem('thw_goal_weight', String(v)); setGoalWeight(v) }
    else { window.localStorage.removeItem('thw_goal_weight'); setGoalWeight(null) }
  }
  const saveMeasure = async () => {
    if (!weight && !mg && !mm) return
    await p.saveWeightLog({ measured_at: date, weight_kg: weight ? parseFloat(weight) : null,
      fat_mass_percent: mg ? parseFloat(mg) : null, muscle_mass_kg: mm ? parseFloat(mm) : null, source: 'manual' })
    setWeight(''); setMg(''); setMm('')
  }

  const pts = points(p.weightLogs, metric, p.heightCm)
  const stats = windowStats(pts, period)
  const summaries = annualSummaries(pts)
  const unit = METRIC_UNIT[metric]
  const goal = metric === 'weight_kg' ? goalWeight : null
  const openYear = summaries.find(s => s.year === year) ?? null

  const stat = (label: string, value: string) => (
    <div style={{ minWidth: 0, background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)' }}>
      <div style={{ fontFamily: FB, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div className="tnum" style={{ fontFamily: FB, fontSize: 19, fontWeight: 600, color: 'var(--text)', marginTop: 'var(--space-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-2) 0 var(--space-6)' }}>
      {/* Pas de titre redondant : la nav indique déjà l'onglet. On démarre sur la
          bannière balance + les bascules de métrique. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)' }}>Aucune balance connectée — la saisie ci-dessous remplit le suivi.</span>
        <a href="/connections" style={{ fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Connecter une balance →</a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Période = zoom + métriques */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {PERIODS.map(([lbl, d]) => (
              <button key={d} onClick={() => setPeriod(d)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                fontFamily: FB, fontSize: 13, fontWeight: period === d ? 600 : 500, color: period === d ? 'var(--text)' : 'var(--text-dim)' }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {METRICS.map(({ key, needsHeight, dim }) => {
              const disabled = needsHeight && p.heightCm == null
              const active = metric === key
              return (
                <button key={key} disabled={disabled} onClick={() => setMetric(key)} title={disabled ? 'Renseigne ta taille dans le profil' : undefined}
                  style={{ border: 'none', background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0,
                    fontFamily: FB, fontSize: 13, fontWeight: active ? 600 : dim ? 400 : 500,
                    opacity: disabled ? 0.4 : 1, color: active ? 'var(--text)' : dim ? 'var(--text-dim)' : 'var(--text-mid)' }}>
                  {METRIC_LABEL[key]}
                </button>
              )
            })}
          </div>

          {/* Stats — grille responsive (2 col mobile, 4 desktop), jamais alarmiste */}
          <div className="comp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 'var(--space-2)' }}>
            <style>{`@media(min-width:560px){.comp-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important}}`}</style>
            {stat('Actuel', stats ? `${stats.current}${unit}` : '—')}
            {stat('Variation', stats ? `${stats.delta > 0 ? '+' : ''}${stats.delta}${unit}` : '—')}
            {stat('Min', stats ? `${stats.min}${unit}` : '—')}
            {stat('Max', stats ? `${stats.max}${unit}` : '—')}
          </div>

          {/* Graphe dans une carte (floating) pour ne pas être collé aux bords */}
          <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
            <WeightGraph pts={pts} unit={unit} goal={goal} periodDays={period} isDesktop={p.isDesktop} />
          </div>

          {/* Résumés annuels — chaque année ouvre une feuille coulissante */}
          {summaries.length > 0 && (
            <div>
              <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', marginBottom: 'var(--space-3)' }}>Résumés annuels</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                {summaries.map(s => (
                  <button key={s.year} onClick={() => setYear(s.year)} style={{ border: '1px solid var(--border)', background: 'var(--bg-card2)', cursor: 'pointer',
                    borderRadius: 999, padding: '9px 20px', fontFamily: FB, fontSize: 14, fontWeight: 600, color: 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 7 }}>
                    {s.year}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <MeasureForm
          date={date} weight={weight} mg={mg} mm={mm}
          onDate={setDate} onWeight={setWeight} onMg={setMg} onMm={setMm} onSave={() => void saveMeasure()}
          goalInput={goalInput} goalWeight={goalWeight} onGoalInput={setGoalInput} onSaveGoal={saveGoal} onGoToPlan={p.onGoToPlan}
        />
      </div>

      {openYear && <AnnualSheet summary={openYear} metricLabel={METRIC_LABEL[metric]} unit={unit} onClose={() => setYear(null)} />}
    </div>
  )
}
