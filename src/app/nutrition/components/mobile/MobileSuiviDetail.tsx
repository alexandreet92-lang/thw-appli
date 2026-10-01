'use client'
// ══════════════════════════════════════════════════════════════
// Nutrition mobile — détail « Suivi ». Période (aujourd'hui / 7 / 14 / 30 j),
// 4 tuiles (jours loggés, adhérence, kcal moyennes, protéines g/kg), calories
// par jour (SVG brut, tiret = cible ; un tap ouvre les repas du jour via la
// même feuille que l'onglet bureau), adhérence par type de jour si plan,
// hydratation si des données existent. Calculs : suiviData (mêmes fonctions
// que SuiviSection) — aucune donnée inventée.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { resolvePlanningUid } from '@/lib/planning/scope'
import type { DailyLog, NutritionPlanData } from '@/hooks/useNutrition'
import { useDaysTotals } from '@/hooks/useDaysTotals'
import { Metric, MiniBars } from '@/components/dashboard/primitives'
import { buildPeriod, periodSummary, adherenceByType, periodDates, type DayRow } from '../suivi/suiviData'
import { DayMealsSheet } from '../suivi/DayMealsSheet'
import { CHARGE_COLOR } from '../plan/planFormat'
import { Card, Head, Tile, Seg, Dot, IC, NUM, fmtInt, fmtL, dayLabel } from './ui'

export interface MobileSuiviDetailProps {
  dailyLogs: DailyLog[]
  plan: NutritionPlanData | null
  weightKg: number | null
  today: string
}

const PERIODS = [1, 7, 14, 30] as const
type Period = typeof PERIODS[number]
const HYDRO_GOAL = 2.5 // L — même objectif que la carte Hydratation et SuiviSection.

/** Litres d'hydratation par jour sur la période (même requête que SuiviSection). */
function useHydrationRange(since: string | undefined, until: string): Record<string, number> {
  const [map, setMap] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!since) return
    let cancel = false
    void (async () => {
      const sb = createClient()
      const uid = await resolvePlanningUid(sb)
      if (!uid || cancel) return
      const { data } = await sb.from('hydration').select('date,liters').eq('user_id', uid).gte('date', since).lte('date', until)
      if (cancel) return
      const m: Record<string, number> = {}
      for (const r of (data ?? []) as { date: string; liters: number | null }[]) m[r.date] = r.liters ?? 0
      setMap(m)
    })()
    return () => { cancel = true }
  }, [since, until])
  return map
}

function KcalChart({ rows, onSelect }: { rows: DayRow[]; onSelect: (d: string) => void }) {
  const W = 320, H = 130, TOP = 10
  const n = rows.length || 1
  const maxV = Math.max(1, ...rows.map(r => Math.max(r.kcal, r.targetKcal ?? 0))) * 1.08
  const colW = W / n
  const bw = Math.min(30, colW * 0.66)
  const y = (v: number) => H - (v / maxV) * (H - TOP)
  // Tirets de cible : un segment par suite de jours de même cible (continu si cible constante).
  const segs: { x1: number; x2: number; v: number }[] = []
  rows.forEach((r, i) => {
    if (r.targetKcal == null || r.targetKcal <= 0) return
    const last = segs[segs.length - 1]
    if (last && last.v === r.targetKcal && Math.abs(last.x2 - i * colW) < 0.01) last.x2 = (i + 1) * colW
    else segs.push({ x1: i * colW, x2: (i + 1) * colW, v: r.targetKcal })
  })
  const lastIdx = rows.length - 1
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 4}`} style={{ display: 'block', overflow: 'visible' }}>
      {rows.map((r, i) => {
        const cx = i * colW + colW / 2
        const h = r.logged ? Math.max(6, H - y(r.kcal)) : 3
        const fill = i === lastIdx && r.logged ? 'var(--primary)' : r.logged ? 'var(--dash-bar, var(--border-mid))' : 'var(--bg-hover)'
        return (
          <g key={r.date} onClick={() => onSelect(r.date)} style={{ cursor: 'pointer' }}>
            <title>{`${dayLabel(r.date)} · ${r.logged ? `${fmtInt(r.kcal)} kcal` : '—'}`}</title>
            <rect x={i * colW} y={0} width={colW} height={H + 4} fill="transparent" />
            <rect x={cx - bw / 2} y={H - h} width={bw} height={h} rx={Math.min(5, bw / 3)} fill={fill} />
          </g>
        )
      })}
      {segs.map((s, k) => (
        <line key={k} x1={s.x1 + 2} x2={s.x2 - 2} y1={y(s.v)} y2={y(s.v)} stroke="var(--text)" strokeOpacity={0.5} strokeDasharray="4 4" pointerEvents="none" />
      ))}
    </svg>
  )
}

export function MobileSuiviDetail({ dailyLogs, plan, weightKg, today }: MobileSuiviDetailProps) {
  const { t } = useI18n()
  const [days, setDays] = useState<Period>(7)
  const [dayOpen, setDayOpen] = useState<string | null>(null)

  const dates = useMemo(() => periodDates(days, today), [days, today])
  const realTotals = useDaysTotals(dates)
  const rows = useMemo(() => buildPeriod(dailyLogs, plan, days, today, realTotals), [dailyLogs, plan, days, today, realTotals])
  const sm = useMemo(() => periodSummary(rows, weightKg), [rows, weightKg])
  const byType = useMemo(() => adherenceByType(rows), [rows])
  const hydro = useHydrationRange(rows[0]?.date, today)

  // Cible protéines en g/kg : moyenne des cibles des jours loggés avec plan ÷ poids.
  const protTargets = rows.filter(r => r.logged && r.targetProt != null && r.targetProt > 0).map(r => r.targetProt as number)
  const protTargetGkg = weightKg && weightKg > 0 && protTargets.length
    ? protTargets.reduce((a, b) => a + b, 0) / protTargets.length / weightKg : null
  const fmtG = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })

  const hydroVals = rows.map(r => hydro[r.date] ?? 0)
  const hydroDays = hydroVals.filter(v => v > 0)
  const hydroAvg = hydroDays.length ? hydroDays.reduce((a, b) => a + b, 0) / hydroDays.length : null
  const hydroBars = hydroVals.slice(-7)

  const xLabels = rows.length <= 7
    ? rows.map(r => new Date(r.date + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'short' }).replace('.', ''))
    : [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]].map(r => new Date(r.date + 'T12:00:00').toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }))

  return <>
    <Seg<Period> ariaLabel={t('nutrition.m.suivi')} value={days} onChange={setDays}
      options={PERIODS.map(p => ({ id: p, label: p === 1 ? t('nutrition.tab.today') : t('nutrition.suivi.daysN', { n: p }) }))} />

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <Tile label={t('nutrition.suivi.statDaysLogged')} value={`${sm.daysLogged} / ${sm.totalDays}`} />
      <Tile label={t('nutrition.suivi.statAdherence')} value={sm.adherencePct == null ? '—' : `${sm.adherencePct} %`}
        sub={sm.adherencePct == null ? t('nutrition.suivi.noPlan') : t('nutrition.suivi.inTargetDays')} />
      <Tile label={t('nutrition.suivi.statAvgKcal')} value={sm.avgKcal == null ? '—' : fmtInt(sm.avgKcal)}
        sub={sm.avgTargetKcal ? t('nutrition.suivi.targetN', { n: fmtInt(sm.avgTargetKcal) }) : t('nutrition.suivi.perLoggedDay')} />
      <Tile label={t('nutrition.macro.proteins')} value={sm.avgGkg == null ? '—' : `${fmtG(sm.avgGkg)} g/kg`}
        sub={!weightKg ? t('nutrition.suivi.weightMissing') : protTargetGkg != null ? t('nutrition.suivi.targetN', { n: fmtG(protTargetGkg) }) : t('nutrition.suivi.gkgAvg')} />
    </div>
    {sm.totalDays > 1 && sm.loggedPct < 50 && (
      <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('nutrition.suivi.lowLoggingWarn')}</p>
    )}

    <Card>
      <Head icon={IC.trend} title={t('nutrition.suivi.caloriesPerDay')} meta={plan ? t('nutm.dashTarget') : undefined} />
      <KcalChart rows={rows} onSelect={setDayOpen} />
      <div style={{ display: 'flex', justifyContent: rows.length <= 7 ? 'space-around' : 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
        {xLabels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{t('nutrition.suivi.calSub')}</p>
    </Card>

    {plan && byType.some(b => b.days > 0) && (
      <Card>
        <Head title={t('nutrition.suivi.adherenceByType')} small />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {byType.map(b => (
            <div key={b.type} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                <Dot color={CHARGE_COLOR[b.type]} />{t(`nutrition.m.typeShort.${b.type}`)}
              </div>
              <div style={{ ...NUM, marginTop: 2, fontSize: 24, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{b.consumedKcal != null ? fmtInt(b.consumedKcal) : '—'}</div>
              <div style={{ ...NUM, fontSize: 12, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.targetKcal != null ? t('nutrition.suivi.targetN', { n: fmtInt(b.targetKcal) }) : '—'}
              </div>
            </div>
          ))}
        </div>
      </Card>
    )}

    {hydroAvg != null && (
      <Card>
        <Head icon={IC.water} title={t('nutrition.today.hydration')} />
        <Metric label={t('nutm.average')} value={fmtL(hydroAvg)} unit={t('nutm.litersPerDay')}
          sub={t('nutm.hydroGoal', { v: fmtL(HYDRO_GOAL) })}
          right={hydroBars.length > 1 ? <MiniBars values={hydroBars} highlight={hydroBars.length - 1} /> : undefined} />
      </Card>
    )}

    {dayOpen && <DayMealsSheet date={dayOpen} onClose={() => setDayOpen(null)} />}
  </>
}
