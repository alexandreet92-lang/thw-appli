'use client'

// ══════════════════════════════════════════════════════════════════
// SuiviSection — onglet « Suivi » : bilan de période + tendances reliées
// à l'entraînement. Données réelles uniquement ; modules sans source →
// état « non disponible » (cf. PROMPT_NUTRITION_SUIVI.md).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyLog, NutritionPlanData } from '@/hooks/useNutrition'
import { buildPeriod, periodSummary, adherenceByType } from './suiviData'
import { AdherenceByTypeChart, ProteinGkgChart, HydrationChart } from './SuiviCharts'

interface Props {
  dailyLogs: DailyLog[]
  plan:      NutritionPlanData | null
  weightKg:  number | null
  today:     string
}

const PERIODS = [7, 14, 30] as const

function Card({ title, subtitle, children, full }: { title: string; subtitle?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, padding: 16, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, marginBottom: 10 }}>{subtitle}</div>}
      {!subtitle && <div style={{ height: 10 }} />}
      {children}
    </div>
  )
}

function Unavailable({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, fontFamily: 'DM Sans,sans-serif' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      <span>{text}</span>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: 'DM Sans,sans-serif' }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, fontFamily: 'DM Mono,monospace', color: 'var(--text)', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-mid)', marginTop: 2, fontFamily: 'DM Mono,monospace' }}>{sub}</div>}
    </div>
  )
}

export function SuiviSection({ dailyLogs, plan, weightKg, today }: Props) {
  const [days, setDays] = useState<number>(7)
  const [hydro, setHydro] = useState<Record<string, number>>({})

  const rows = useMemo(() => buildPeriod(dailyLogs, plan, days, today), [dailyLogs, plan, days, today])
  const summary = useMemo(() => periodSummary(rows, weightKg), [rows, weightKg])
  const byType = useMemo(() => adherenceByType(rows), [rows])

  // Hydratation : requête lecture seule sur la table `hydration` (par jour).
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
  const lowReliability = summary.loggedPct < 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sélecteur de période */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setDays(p)} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: days === p ? 'rgba(6,182,212,0.12)' : 'var(--bg-card2)',
            color: days === p ? '#06B6D4' : 'var(--text-dim)', fontWeight: days === p ? 700 : 500,
            fontSize: 12, fontFamily: 'Syne,sans-serif', cursor: 'pointer',
          }}>{p}j</button>
        ))}
      </div>

      {/* Bilan de la période (bandeau) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Tile label="Jours loggés" value={`${summary.daysLogged} / ${summary.totalDays}`} sub={`${summary.loggedPct}%`} />
        <Tile label="Adhérence" value={summary.adherencePct == null ? '—' : `${summary.adherencePct}%`} sub={summary.adherencePct == null ? 'pas de plan' : 'jours vs cible'} />
        <Tile label="Kcal moy." value={summary.avgKcal == null ? '—' : `${summary.avgKcal}`} sub={summary.avgTargetKcal ? `cible ${summary.avgTargetKcal}` : 'consommé'} />
        <Tile label="Protéines" value={summary.avgGkg == null ? '—' : `${summary.avgGkg}`} sub={summary.avgGkg == null ? 'poids manquant' : 'g/kg moy.'} />
      </div>

      {/* SIGNATURE — Glucides vs charge (charge non accessible ici) */}
      <Card title="Glucides consommés vs charge d'entraînement" subtitle="Ton fueling suit-il le travail ?" full>
        <Unavailable text="La charge d'entraînement (TSS / CTL) n'est pas accessible depuis la nutrition (non calculée / pas de hook dédié). Ce module s'activera quand la charge par jour sera exposée. Aucune donnée n'est inventée." />
      </Card>

      {/* Grille 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Card title="Adhérence par type de jour" subtitle="Consommé (plein) vs cible (clair)">
          <AdherenceByTypeChart data={byType} />
        </Card>
        <Card title="Protéines (g/kg)" subtitle="Manges-tu assez de protéines pour ta charge ?">
          <ProteinGkgChart rows={rows} weightKg={weightKg} />
        </Card>
        <Card title="Fueling × récupération" subtitle="Croisement fueling / readiness (J+1)">
          <Unavailable text="La readiness/récupération quotidienne n'est pas encore branchée à une source réelle (table recovery non alimentée). Module masqué tant qu'il n'y a pas assez de jours croisés pour une observation honnête." />
        </Card>
        <Card title="Hydratation" subtitle="Litres loggés par jour">
          <HydrationChart data={hydroSeries} />
        </Card>
        <Card title="Régularité de logging" subtitle={`${summary.daysLogged} / ${summary.totalDays} jours sur la période`}>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-card2)', overflow: 'hidden', marginTop: 4 }}>
            <div style={{ width: `${summary.loggedPct}%`, height: '100%', background: summary.loggedPct >= 70 ? '#22c55e' : summary.loggedPct >= 40 ? '#eab308' : '#ef4444' }} />
          </div>
          {lowReliability && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.4 }}>
              Sous 50 % de jours loggés, les tendances ci-dessus sont peu fiables.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
