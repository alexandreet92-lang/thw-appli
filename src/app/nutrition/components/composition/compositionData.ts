// Helpers purs pour l'onglet « Composition ». Aucune couleur, aucune dépendance UI.
// Sources réelles : table body_measurements (saisie manuelle). FFMI/IMC nécessitent
// la taille (profile.height_cm) — null si absente → métrique non calculable.

import type { WeightLog } from '@/hooks/useNutrition'

export type WeightMetric = 'weight_kg' | 'fat_mass_percent' | 'muscle_mass_kg' | 'ffmi' | 'bmi'

export const METRIC_UNIT: Record<WeightMetric, string> = {
  weight_kg: 'kg', fat_mass_percent: '%', muscle_mass_kg: 'kg', ffmi: '', bmi: '',
}
export const METRIC_LABEL: Record<WeightMetric, string> = {
  weight_kg: 'Poids', fat_mass_percent: 'Masse grasse', muscle_mass_kg: 'Masse musculaire', ffmi: 'FFMI', bmi: 'IMC',
}

// Valeur d'une mesure pour la métrique (bmi = poids/taille² ; ffmi = masse maigre/taille²).
export function metricValue(l: WeightLog, metric: WeightMetric, heightCm: number | null): number | null {
  if (metric === 'bmi') {
    if (l.weight_kg && heightCm) { const h = heightCm / 100; return +(l.weight_kg / (h * h)).toFixed(1) }
    return null
  }
  if (metric === 'ffmi') {
    if (l.weight_kg && heightCm && l.fat_mass_percent != null) {
      const h = heightCm / 100
      return +((l.weight_kg * (1 - l.fat_mass_percent / 100)) / (h * h)).toFixed(1)
    }
    return null
  }
  if (metric === 'weight_kg')        return l.weight_kg
  if (metric === 'fat_mass_percent') return l.fat_mass_percent
  return l.muscle_mass_kg
}

export interface Pt { t: number; v: number; log: WeightLog }

export function points(logs: WeightLog[], metric: WeightMetric, heightCm: number | null): Pt[] {
  return [...logs]
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    .map(l => ({ t: new Date(l.measured_at).getTime(), v: metricValue(l, metric, heightCm), log: l }))
    .filter((p): p is Pt => p.v != null)
}

// Moyenne mobile (fenêtre 3) — courbe lissée.
export function smooth(vals: number[]): number[] {
  return vals.map((_, i) => {
    const w = [vals[i - 1], vals[i], vals[i + 1]].filter((x): x is number => x != null)
    return +(w.reduce((a, b) => a + b, 0) / w.length).toFixed(2)
  })
}

export interface Stats { current: number; min: number; max: number; delta: number; count: number }

// Actuel = dernière mesure ; min/max/variation sur la fenêtre des `days` derniers jours.
export function windowStats(pts: Pt[], days: number): Stats | null {
  if (!pts.length) return null
  const end = pts[pts.length - 1].t
  const sel = pts.filter(p => p.t >= end - days * 86400000)
  const use = sel.length ? sel : pts.slice(-1)
  const vals = use.map(p => p.v)
  return {
    current: pts[pts.length - 1].v,
    min: Math.min(...vals),
    max: Math.max(...vals),
    delta: +(vals[vals.length - 1] - vals[0]).toFixed(1),
    count: use.length,
  }
}

export interface YearSummary {
  year: number; max: number; min: number; amplitude: number; delta: number; count: number
  pts: { t: number; v: number }[]
}

export function annualSummaries(pts: Pt[]): YearSummary[] {
  const byYear = new Map<number, Pt[]>()
  for (const p of pts) {
    const y = new Date(p.t).getFullYear()
    const arr = byYear.get(y) ?? []
    arr.push(p); byYear.set(y, arr)
  }
  return [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, ps]) => {
    const vals = ps.map(p => p.v)
    return {
      year, count: ps.length,
      max: Math.max(...vals), min: Math.min(...vals),
      amplitude: +(Math.max(...vals) - Math.min(...vals)).toFixed(1),
      delta: +(vals[vals.length - 1] - vals[0]).toFixed(1),
      pts: ps.map(p => ({ t: p.t, v: p.v })),
    }
  })
}
