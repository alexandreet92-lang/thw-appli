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
import { buildPeriod, periodSummary, adherenceByType } from './suiviData'
import { AdherenceByTypeChart, ProteinGkgChart, HydrationChart, LoggingGrid } from './SuiviCharts'

interface Props {
  dailyLogs: DailyLog[]
  plan:      NutritionPlanData | null
  weightKg:  number | null
  today:     string
}

const PERIODS = [7, 14, 30] as const
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

function Unavailable({ text }: { text: string }) {
  return <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>{text}</div>
}

export function SuiviSection({ dailyLogs, plan, weightKg, today }: Props) {
  const [days, setDays] = useState<number>(7)
  const [hydro, setHydro] = useState<Record<string, number>>({})

  const rows = useMemo(() => buildPeriod(dailyLogs, plan, days, today), [dailyLogs, plan, days, today])
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-2) 0 var(--space-6)' }}>
      {/* Sélecteur de période (le nom de l'onglet est porté par la nav, pas de titre redondant) */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setDays(p)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 var(--space-1)',
            fontFamily: FB, fontSize: 13, fontWeight: days === p ? 600 : 500,
            color: days === p ? 'var(--text)' : 'var(--text-dim)',
          }}>{p} j</button>
        ))}
      </div>

      {/* Bilan — 4 stats nues */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
        <StatNu label="Jours loggés" value={`${summary.daysLogged}/${summary.totalDays}`} note={`${summary.loggedPct}%`} />
        <StatNu label="Adhérence" value={summary.adherencePct == null ? '—' : `${summary.adherencePct}%`} note={summary.adherencePct == null ? 'pas de plan' : 'jours dans la cible'} />
        <StatNu label="Kcal moy." value={summary.avgKcal == null ? '—' : `${summary.avgKcal}`} note={summary.avgTargetKcal ? `cible ${summary.avgTargetKcal}` : 'consommé'} />
        <StatNu label="Protéines" value={summary.avgGkg == null ? '—' : `${summary.avgGkg}`} note={summary.avgGkg == null ? 'poids manquant' : 'g/kg moy.'} />
      </div>

      {/* Hero — glucides vs charge (charge non accessible : état honnête, pas de boîte) */}
      <div>
        <h2 style={{ fontFamily: FD, fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Glucides consommés vs charge d&apos;entraînement</h2>
        <div style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 'var(--space-1) 0 var(--space-2)' }}>Ton fueling suit-il le travail ?</div>
        <Unavailable text="La charge d'entraînement (TSS) n'est pas encore exposée à la nutrition. Ce module s'activera quand la charge par jour sera disponible — rien n'est estimé en attendant." />
      </div>

      {/* Modules secondaires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        <Mod title="Adhérence par type de jour" subtitle="Consommé (plein) vs cible (clair)">
          <AdherenceByTypeChart data={byType} />
        </Mod>
        <Mod title="Protéines (g/kg)" subtitle="Manges-tu assez de protéines pour ta charge ?">
          <ProteinGkgChart rows={rows} weightKg={weightKg} />
        </Mod>
        <Mod title="Fueling × récupération" subtitle="Croisement fueling / readiness (J+1)">
          <Unavailable text="La readiness quotidienne n'est pas encore branchée à une source réelle. Module masqué tant qu'il n'y a pas de jours croisés à observer." />
        </Mod>
        <Mod title="Hydratation" subtitle="Litres loggés par jour · objectif 2,5 L">
          <HydrationChart data={hydroSeries} />
        </Mod>
        <Mod title="Régularité de logging" subtitle={`${summary.daysLogged} / ${summary.totalDays} jours sur la période`}>
          <LoggingGrid rows={rows} />
          {summary.loggedPct < 50 && (
            <div style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', marginTop: 'var(--space-2)', lineHeight: 1.4 }}>
              Sous 50 % de jours loggés, les tendances ci-dessus sont peu fiables.
            </div>
          )}
        </Mod>
      </div>
    </div>
  )
}
