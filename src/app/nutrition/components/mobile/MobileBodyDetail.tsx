'use client'
// ══════════════════════════════════════════════════════════════
// Nutrition mobile — détail « Poids & composition ». Période (30 j / 3 mois /
// 1 an) + métrique (poids / masse grasse / muscle), dernière mesure + écart,
// courbe SVG brute (objectif en tirets), liste des mesures, ajout d'une mesure
// (même formulaire MeasureForm + saveWeightLog que l'onglet bureau, dans une
// feuille), indices IMC/FFMI, résumés annuels, balance connectée.
// Calculs : compositionData (mêmes fonctions que CompositionTab).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import type { WeightLog } from '@/hooks/useNutrition'
import { usePushNav } from '@/hooks/usePushNav'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { points, windowStats, annualSummaries, metricValue, METRIC_UNIT, type WeightMetric } from '../composition/compositionData'
import { MeasureForm } from '../composition/MeasureForm'
import { AnnualSheet } from '../composition/AnnualSheet'
import { Card, Head, Tile, Seg, ListCard, ListRow, PrimaryPill, IC, NUM, fmt1 } from './ui'

export interface MobileBodyDetailProps {
  weightLogs: WeightLog[]
  heightCm: number | null
  saveWeightLog: (log: Omit<WeightLog, 'id'>) => Promise<void>
  onGoToPlan: () => void
}

type Metric3 = Extract<WeightMetric, 'weight_kg' | 'fat_mass_percent' | 'muscle_mass_kg'>
const PERIODS: { id: number; key: string }[] = [
  { id: 30, key: 'nutrition.comp.period30d' }, { id: 90, key: 'nutrition.comp.period3m' }, { id: 365, key: 'nutrition.comp.period1y' },
]
const METRICS: { id: Metric3; key: string }[] = [
  { id: 'weight_kg', key: 'nutm.metricWeight' }, { id: 'fat_mass_percent', key: 'nutm.metricFat' }, { id: 'muscle_mass_kg', key: 'nutm.metricMuscle' },
]
const GOAL_KEY = 'thw_goal_weight' // même clé locale que CompositionTab

function readGoal(): number | null {
  try {
    const v = window.localStorage.getItem(GOAL_KEY)
    const n = v ? parseFloat(v) : NaN
    return isNaN(n) ? null : n
  } catch { return null }
}

function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MobileBodyDetail(p: MobileBodyDetailProps) {
  const { t } = useI18n()
  const push = usePushNav()
  const [period, setPeriod] = useState(90)
  const [metric, setMetric] = useState<Metric3>('weight_kg')
  const [showAll, setShowAll] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [year, setYear] = useState<number | null>(null)
  // Formulaire (même état que CompositionTab).
  const [goalWeight, setGoalWeight] = useState<number | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [date, setDate] = useState(isoToday)
  const [weight, setWeight] = useState(''); const [mg, setMg] = useState(''); const [mm, setMm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { const g = readGoal(); if (g != null) { setGoalWeight(g); setGoalInput(String(g)) } }, [])

  const saveGoal = () => {
    const v = parseFloat(goalInput)
    try {
      if (!isNaN(v) && v > 0) { window.localStorage.setItem(GOAL_KEY, String(v)); setGoalWeight(v) }
      else { window.localStorage.removeItem(GOAL_KEY); setGoalWeight(null) }
    } catch { setGoalWeight(!isNaN(v) && v > 0 ? v : null) }
  }
  const saveMeasure = async () => {
    if (saving || (!weight && !mg && !mm)) return
    setSaving(true)
    try {
      await p.saveWeightLog({ measured_at: date, weight_kg: weight ? parseFloat(weight) : null,
        fat_mass_percent: mg ? parseFloat(mg) : null, muscle_mass_kg: mm ? parseFloat(mm) : null, source: 'manual' })
      setWeight(''); setMg(''); setMm('')
      setSheet(false)
    } finally { setSaving(false) }
  }

  const pts = useMemo(() => points(p.weightLogs, metric, p.heightCm), [p.weightLogs, metric, p.heightCm])
  const stats = windowStats(pts, period)
  const summaries = useMemo(() => annualSummaries(pts), [pts])
  const unit = METRIC_UNIT[metric]
  const metricLabel = t(METRICS.find(m => m.id === metric)?.key ?? 'nutm.metricWeight')
  const periodLabel = t(PERIODS.find(x => x.id === period)?.key ?? 'nutrition.comp.period3m')
  const goal = metric === 'weight_kg' ? goalWeight : null
  const end = pts.length ? pts[pts.length - 1].t : 0
  const win = pts.filter(x => x.t >= end - period * 86400000)
  const withUnit = (v: number) => `${fmt1(v)} ${unit}`

  // Mesures : toutes les saisies, la plus récente d'abord.
  const logs = useMemo(() => [...p.weightLogs].sort((a, b) => b.measured_at.localeCompare(a.measured_at)), [p.weightLogs])
  const shown = showAll ? logs : logs.slice(0, 5)
  const hasScale = p.weightLogs.some(l => l.source === 'connected_scale')
  const last = logs[0] ?? null
  const bmi = last && p.heightCm ? metricValue(last, 'bmi', p.heightCm) : null
  const ffmi = last && p.heightCm ? metricValue(last, 'ffmi', p.heightCm) : null

  // Courbe (x = temps réel sur la fenêtre, échelle serrée sur la plage).
  const W = 320, H = 140
  const chart = (() => {
    if (win.length < 2) return null
    const vals = win.map(x => x.v)
    let lo = Math.min(...vals), hi = Math.max(...vals)
    const span = Math.max(0.5, hi - lo)
    const showGoal = goal != null && goal >= lo - span && goal <= hi + span
    if (showGoal && goal != null) { lo = Math.min(lo, goal); hi = Math.max(hi, goal) }
    const pad = Math.max(0.2, (hi - lo) * 0.1)
    const mn = lo - pad, rg = (hi + pad) - mn
    const t0 = win[0].t, ts = (win[win.length - 1].t - t0) || 1
    const X = (tm: number) => 3 + ((tm - t0) / ts) * (W - 6)
    const Y = (v: number) => H - 4 - ((v - mn) / rg) * (H - 8)
    const pl = win.map(x => `${X(x.t).toFixed(1)},${Y(x.v).toFixed(1)}`)
    const lx = X(win[win.length - 1].t), ly = Y(win[win.length - 1].v)
    const lbl = (tm: number) => new Date(tm).toLocaleDateString(currentLocale(), period > 60 ? { month: 'short' } : { day: 'numeric', month: 'short' })
    return { pl, lx, ly, gy: showGoal && goal != null ? Y(goal) : null, labels: [lbl(t0), lbl(t0 + ts / 2), lbl(t0 + ts)] }
  })()

  const fmtDate = (iso: string) => new Date(iso.length > 10 ? iso : iso + 'T12:00:00').toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })

  return <>
    <Seg<number> ariaLabel={t('nutrition.m.body')} value={period} onChange={setPeriod} options={PERIODS.map(x => ({ id: x.id, label: t(x.key) }))} />
    <Seg<Metric3> ariaLabel={t('nutrition.m.body')} value={metric} onChange={setMetric} options={METRICS.map(x => ({ id: x.id, label: t(x.key) }))} />

    <Card>
      <Head icon={IC.scale} title={metricLabel} meta={periodLabel} />
      {stats ? <>
        <p style={{ margin: '0 0 4px', fontSize: 15, color: 'var(--text-mid)' }}>{t('nutrition.m.lastMeasure')}</p>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
          <span style={{ ...NUM, fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {fmt1(stats.current)}<span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 4 }}>{unit}</span>
          </span>
          {stats.count > 1 && Math.abs(stats.delta) >= 0.1 && (
            <span style={{ ...NUM, display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 'var(--r-sm)', background: 'var(--dash-chip, var(--bg-hover))', fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
              {stats.delta > 0 ? '▲' : '▼'} {withUnit(Math.abs(stats.delta))}
            </span>
          )}
        </div>
        <p style={{ ...NUM, margin: '8px 0 0', fontSize: 14, color: 'var(--text-mid)' }}>
          {[t('nutm.minMax', { min: fmt1(stats.min), max: fmt1(stats.max) }), goal != null ? t('nutm.goalShort', { v: fmt1(goal) }) : null].filter(Boolean).join(' · ')}
        </p>
      </> : (
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('nutm.noMeasureMetric')}</p>
      )}
    </Card>

    {chart && (
      <Card>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label={metricLabel}>
          {chart.gy != null && <line x1={0} x2={W} y1={chart.gy} y2={chart.gy} stroke="var(--text-dim)" strokeDasharray="3 3" />}
          <polyline points={chart.pl.join(' ')} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={chart.lx} cy={chart.ly} r={3.5} fill="var(--primary)" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          {chart.labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </Card>
    )}

    {logs.length > 0 && (
      <Card>
        <Head title={t('nutm.measures')} meta={String(logs.length)} small />
        {shown.map((l, i) => {
          const sub = [
            l.fat_mass_percent != null ? `MG ${fmt1(l.fat_mass_percent)} %` : null,
            l.muscle_mass_kg != null ? t('nutm.muscleKg', { v: fmt1(l.muscle_mass_kg) }) : null,
          ].filter(Boolean).join(' · ')
          return (
            <div key={l.id ?? `${l.measured_at}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: i === shown.length - 1 && logs.length <= 5 ? '12px 0 0' : '12px 0', borderTop: '1px solid var(--dash-line, var(--border))' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmtDate(l.measured_at)}</b>
                {sub && <span style={{ ...NUM, display: 'block', marginTop: 1, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
              </span>
              <span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: l.weight_kg != null ? 'var(--text)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                {l.weight_kg != null ? `${fmt1(l.weight_kg)} kg` : '—'}
              </span>
            </div>
          )
        })}
        {logs.length > 5 && (
          <button type="button" onClick={() => setShowAll(v => !v)}
            style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 4, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>
            {showAll ? t('nutm.showLess') : t('nutm.showAll', { n: logs.length })}
          </button>
        )}
      </Card>
    )}

    <PrimaryPill onClick={() => { setDate(isoToday()); setSheet(true) }}>+ {t('nutrition.measure.addTitle')}</PrimaryPill>

    {(bmi != null || ffmi != null) && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Tile label="IMC" value={bmi != null ? fmt1(bmi) : '—'} sub={last ? fmtDate(last.measured_at) : undefined} />
        <Tile label="FFMI" value={ffmi != null ? fmt1(ffmi) : '—'} sub={ffmi == null ? t('nutm.ffmiNeedsFat') : last ? fmtDate(last.measured_at) : undefined} />
      </div>
    )}

    <ListCard>
      <ListRow first title={t('nutrition.measure.goalTitle')} sub={goalWeight != null ? `${fmt1(goalWeight)} kg` : t('nutm.goalNone')} onClick={() => setSheet(true)} />
      {summaries.slice().reverse().map(s => (
        <ListRow key={s.year} title={t('nutm.yearSummary', { year: s.year })} sub={`${metricLabel} · ${t(s.count > 1 ? 'nutm.nMeasures' : 'nutm.oneMeasure', { n: s.count })}`} onClick={() => setYear(s.year)} />
      ))}
      <ListRow title={t('nutm.connectedScale')} sub={hasScale ? t('nutm.scaleSynced') : t('nutm.scaleNone')} onClick={() => push('/connections')} />
    </ListCard>

    <BottomSheet isOpen={sheet} onClose={() => setSheet(false)} title={t('nutm.measureSheet')} icon={IC.scale}>
      {/* .nt-mdetail : titres en police d'interface, comme les autres vues mobiles. */}
      <div className="nt-mdetail"><MeasureForm
        date={date} weight={weight} mg={mg} mm={mm}
        onDate={setDate} onWeight={setWeight} onMg={setMg} onMm={setMm} onSave={() => void saveMeasure()}
        goalInput={goalInput} goalWeight={goalWeight} onGoalInput={setGoalInput} onSaveGoal={saveGoal}
        onGoToPlan={() => { setSheet(false); p.onGoToPlan() }}
      /></div>
    </BottomSheet>

    {year != null && (() => {
      const s = summaries.find(x => x.year === year)
      return s ? <AnnualSheet summary={s} metricLabel={metricLabel} unit={unit ? ` ${unit}` : ''} onClose={() => setYear(null)} /> : null
    })()}
  </>
}
