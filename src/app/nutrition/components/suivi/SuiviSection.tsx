'use client'

// ══════════════════════════════════════════════════════════════════
// SuiviSection — onglet « Suivi » refondu (DESIGN_SYSTEM.md).
// Neutres + accent --primary. Données réelles uniquement ; un module sans
// source affiche un état indisponible honnête (calme, sans grosse boîte).
// Cadrage santé : « manges-tu assez pour ta charge », jamais déficit/restriction.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyLog, NutritionPlanData } from '@/hooks/useNutrition'
import { useDaysTotals } from '@/hooks/useDaysTotals'
import { buildPeriod, periodSummary, adherenceByType, periodDates } from './suiviData'
import { KcalTrendChart, AdherenceByTypeChart, ProteinGkgChart, HydrationChart, LoggingGrid } from './SuiviCharts'
import { DayMealsSheet } from './DayMealsSheet'
import { useI18n } from '@/lib/i18n'

interface Props {
  dailyLogs: DailyLog[]
  plan:      NutritionPlanData | null
  weightKg:  number | null
  today:     string
}

const PERIODS = [1, 7, 14, 30] as const
const FD = 'var(--font-display)', FB = 'var(--font-body)'

function StatNu({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
      <div className="tnum" style={{ fontFamily: FB, fontSize: 26, fontWeight: 600, color: 'var(--text)', marginTop: 'var(--space-1)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-mid)', marginTop: 'var(--space-1)' }}>{note}</div>
    </div>
  )
}

function Mod({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
      <div style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 'var(--space-1) 0 var(--space-3)' }}>{subtitle}</div>
      {children}
    </div>
  )
}

export function SuiviSection({ dailyLogs, plan, weightKg, today }: Props) {
  const { t } = useI18n()
  const [days, setDays] = useState<number>(7)
  const [hydro, setHydro] = useState<Record<string, number>>({})
  const [dayOpen, setDayOpen] = useState<string | null>(null)

  // Totaux réels du journal alimentaire (nutrition_meal_logs) agrégés par jour.
  const dates = useMemo(() => periodDates(days, today), [days, today])
  const realTotals = useDaysTotals(dates)

  const rows = useMemo(() => buildPeriod(dailyLogs, plan, days, today, realTotals), [dailyLogs, plan, days, today, realTotals])
  const summary = useMemo(() => periodSummary(rows, weightKg), [rows, weightKg])
  const byType = useMemo(() => adherenceByType(rows), [rows])

  useEffect(() => {
    let cancel = false
    const supabase = createClient()
    const since = rows[0]?.date
    if (!since) return
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('hydration').select('date,liters').eq('user_id', user.id).gte('date', since).lte('date', today)
      if (cancel) return
      const map: Record<string, number> = {}
      for (const r of (data ?? []) as { date: string; liters: number }[]) map[r.date] = r.liters ?? 0
      setHydro(map)
    })()
    return () => { cancel = true }
  }, [rows, today])

  const hydroSeries = rows.map(r => ({ date: r.date, liters: hydro[r.date] ?? 0 }))

  const hasPlan = !!plan

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-2) 0 var(--space-6)' }}>
      {/* Intro courte : à quoi sert cet onglet (le user trouvait la page obscure). */}
      <div>
        <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t('nutrition.suivi.title')}</h2>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 0', lineHeight: 1.5 }}>
          {t('nutrition.suivi.intro')}
        </p>
      </div>

      {/* Sélecteur de période */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setDays(p)} style={{
            border: 'none', background: days === p ? 'var(--bg-card2)' : 'transparent', cursor: 'pointer',
            borderRadius: 999, padding: '5px 14px',
            fontFamily: FB, fontSize: 13, fontWeight: days === p ? 600 : 500,
            color: days === p ? 'var(--text)' : 'var(--text-dim)',
          }}>{p === 1 ? t('nutrition.tab.today') : t('nutrition.suivi.daysN', { n: p })}</button>
        ))}
      </div>

      {/* Bilan — 4 stats nues, grille responsive (2 col mobile, 4 desktop) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 'var(--space-5) var(--space-4)' }} className="suivi-stats">
        <style>{`@media(min-width:560px){.suivi-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important}}`}</style>
        <StatNu label={t('nutrition.suivi.statDaysLogged')} value={`${summary.daysLogged}/${summary.totalDays}`} note={`${summary.loggedPct}%`} />
        <StatNu label={t('nutrition.suivi.statAdherence')} value={summary.adherencePct == null ? '—' : `${summary.adherencePct}%`} note={summary.adherencePct == null ? t('nutrition.suivi.noPlan') : t('nutrition.suivi.inTargetDays')} />
        <StatNu label={t('nutrition.suivi.statAvgKcal')} value={summary.avgKcal == null ? '—' : `${summary.avgKcal}`} note={summary.avgTargetKcal ? t('nutrition.suivi.targetN', { n: summary.avgTargetKcal }) : t('nutrition.suivi.perLoggedDay')} />
        <StatNu label={t('nutrition.macro.proteins')} value={summary.avgGkg == null ? '—' : `${summary.avgGkg}`} note={summary.avgGkg == null ? t('nutrition.suivi.weightMissing') : t('nutrition.suivi.gkgAvg')} />
      </div>

      {/* Hero — calories par jour (consommé vs cible) : le module le plus clair */}
      <Mod title={t('nutrition.suivi.caloriesPerDay')} subtitle={hasPlan ? t('nutrition.suivi.calSubPlan') : t('nutrition.suivi.calSub')}>
        <KcalTrendChart rows={rows} onSelectDay={setDayOpen} />
      </Mod>

      {/* Modules secondaires — uniquement ce qui a une vraie source de données */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        {hasPlan && (
          <Mod title={t('nutrition.suivi.adherenceByType')} subtitle={t('nutrition.suivi.adherenceSub')}>
            <AdherenceByTypeChart data={byType} />
          </Mod>
        )}
        <Mod title={t('nutrition.suivi.proteinGkg')} subtitle={t('nutrition.suivi.proteinSub')}>
          <ProteinGkgChart rows={rows} weightKg={weightKg} />
        </Mod>
        <Mod title={t('nutrition.today.hydration')} subtitle={t('nutrition.suivi.hydrationSub')}>
          <HydrationChart data={hydroSeries} />
        </Mod>
        <Mod title={t('nutrition.suivi.loggingTitle')} subtitle={t('nutrition.suivi.loggingSub', { a: summary.daysLogged, b: summary.totalDays })}>
          <LoggingGrid rows={rows} />
          {summary.loggedPct < 50 && (
            <div style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', marginTop: 'var(--space-2)', lineHeight: 1.4 }}>
              {t('nutrition.suivi.lowLoggingWarn')}
            </div>
          )}
        </Mod>
      </div>

      {dayOpen && <DayMealsSheet date={dayOpen} onClose={() => setDayOpen(null)} />}
    </div>
  )
}
