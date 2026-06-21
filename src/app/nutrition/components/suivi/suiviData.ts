// ══════════════════════════════════════════════════════════════════
// suiviData — agrégations lecture seule pour l'onglet « Suivi ».
// Sources réelles : journal alimentaire (nutrition_meal_logs, agrégé par jour)
// + plan + poids profil. Fallback sur nutrition_daily_logs (ancien format) si
// aucun repas loggé ce jour-là. Aucune donnée inventée.
// ══════════════════════════════════════════════════════════════════

import type { DailyLog, NutritionPlanData } from '@/hooks/useNutrition'

export type DayType = 'low' | 'mid' | 'hard'

export interface DayTotals { kcal: number; prot: number; gluc: number; lip: number }

export interface DayRow {
  date:        string
  logged:      boolean
  kcal:        number
  prot:        number
  gluc:        number
  lip:         number
  type:        DayType | null
  targetKcal:  number | null
  targetProt:  number | null
  targetGluc:  number | null
  targetLip:   number | null
}

function isoDaysAgo(today: string, back: number): string {
  const d = new Date(today + 'T00:00:00')
  d.setDate(d.getDate() - back)
  return d.toISOString().split('T')[0]
}

// Liste des dates de la période (ancienne → récente), partagée avec useDaysTotals.
export function periodDates(days: number, today: string): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(isoDaysAgo(today, i))
  return out
}

export function buildPeriod(
  logs: DailyLog[], plan: NutritionPlanData | null, days: number, today: string,
  realTotals?: Record<string, DayTotals>,
): DayRow[] {
  const byDate = new Map(logs.map(l => [l.date, l]))
  const rows: DayRow[] = []
  for (const date of periodDates(days, today)) {
    const real = realTotals?.[date]
    const log = byDate.get(date)
    const planDay = plan?.jours?.find(j => j.date === date) ?? null
    const type = planDay?.type_jour ?? null
    const tKcal = type && plan ? plan[`calories_${type}`] ?? null : null
    const tMacro = type && plan ? plan[`macros_${type}`] ?? null : null
    // Priorité au journal alimentaire réel (nutrition_meal_logs) ; sinon ancien daily_log.
    const useReal = real && real.kcal > 0
    const kcal = useReal ? real!.kcal : (log?.kcal_consommees ?? 0)
    const prot = useReal ? real!.prot : (log?.proteines ?? 0)
    const gluc = useReal ? real!.gluc : (log?.glucides ?? 0)
    const lip  = useReal ? real!.lip  : (log?.lipides ?? 0)
    rows.push({
      date,
      logged: kcal > 0,
      kcal, prot, gluc, lip,
      type,
      targetKcal: tKcal,
      targetProt: tMacro?.proteines ?? null,
      targetGluc: tMacro?.glucides ?? null,
      targetLip:  tMacro?.lipides ?? null,
    })
  }
  return rows
}

export interface PeriodSummary {
  daysLogged:    number
  totalDays:     number
  loggedPct:     number
  adherencePct:  number | null    // % de jours loggés-avec-cible dans ±15 %
  avgKcal:       number | null
  avgTargetKcal: number | null
  avgGkg:        number | null     // protéines moyennes en g/kg
}

export function periodSummary(rows: DayRow[], weightKg: number | null): PeriodSummary {
  const logged = rows.filter(r => r.logged)
  const withTarget = logged.filter(r => r.targetKcal != null && r.targetKcal > 0)
  const inTarget = withTarget.filter(r => Math.abs(r.kcal - (r.targetKcal as number)) / (r.targetKcal as number) <= 0.15)
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const avgGkg = weightKg && weightKg > 0 && logged.length
    ? +(logged.reduce((s, r) => s + r.prot, 0) / logged.length / weightKg).toFixed(2)
    : null
  return {
    daysLogged:    logged.length,
    totalDays:     rows.length,
    loggedPct:     rows.length ? Math.round((logged.length / rows.length) * 100) : 0,
    adherencePct:  withTarget.length ? Math.round((inTarget.length / withTarget.length) * 100) : null,
    avgKcal:       avg(logged.map(r => r.kcal)),
    avgTargetKcal: avg(withTarget.map(r => r.targetKcal as number)),
    avgGkg,
  }
}

export interface TypeAdherence {
  type: DayType
  consumedKcal: number | null
  targetKcal:   number | null
  days:         number
}

export function adherenceByType(rows: DayRow[]): TypeAdherence[] {
  const types: DayType[] = ['low', 'mid', 'hard']
  return types.map(type => {
    const sel = rows.filter(r => r.logged && r.type === type && r.targetKcal != null)
    if (!sel.length) return { type, consumedKcal: null, targetKcal: null, days: 0 }
    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
    return {
      type,
      consumedKcal: avg(sel.map(r => r.kcal)),
      targetKcal:   avg(sel.map(r => r.targetKcal as number)),
      days:         sel.length,
    }
  })
}
