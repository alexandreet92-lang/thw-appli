// Calculs dérivés (lecture seule) pour la page Blessures. Aucune donnée inventée.
import type { Injury, Phase } from './types'

const DAY = 86400000
const t = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00' : '')).getTime()

export function daysSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - t(date)) / DAY))
}

export function durationDays(inj: Injury): number {
  const end = inj.resolved_date ? t(inj.resolved_date) : Date.now()
  return Math.max(1, Math.round((end - t(inj.onset_date)) / DAY))
}

const PHASE_PCT: Record<Phase, number> = { aigue: 0.2, recuperation: 0.5, reathletisation: 0.8, resolu: 1 }
export const phasePct = (p: Phase) => PHASE_PCT[p]

export interface Rank { key: string; count: number }
function rank(items: (string | null)[]): Rank[] {
  const m = new Map<string, number>()
  for (const i of items) { if (!i) continue; m.set(i, (m.get(i) ?? 0) + 1) }
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}
export const zonesRanking  = (inj: Injury[]) => rank(inj.map(i => i.zone))
export const sportsRanking = (inj: Injury[]) => rank(inj.map(i => i.activity))

// Récidive : une autre blessure sur la même zone est apparue avant celle-ci.
export function isRecidive(inj: Injury, all: Injury[]): boolean {
  return all.some(o => o.id !== inj.id && o.zone === inj.zone && t(o.onset_date) < t(inj.onset_date))
}

// Disponibilité 12 mois : % des 365 derniers jours sans blessure active.
export function availability12mo(inj: Injury[]): number {
  const start = Date.now() - 365 * DAY
  const injured = new Set<number>()
  for (const i of inj) {
    const a = Math.max(t(i.onset_date), start)
    const b = i.resolved_date ? t(i.resolved_date) : Date.now()
    for (let d = a; d <= b; d += DAY) injured.add(Math.floor(d / DAY))
  }
  return Math.round((1 - injured.size / 365) * 100)
}

export interface Stats12 { count: number; avgDuration: number | null; recidiveRate: number | null; avgReturn: number | null }
export function stats12mo(inj: Injury[]): Stats12 {
  const start = Date.now() - 365 * DAY
  const recent = inj.filter(i => t(i.onset_date) >= start)
  const resolved = recent.filter(i => i.status === 'resolved')
  const avg = (a: number[]) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null
  const recid = recent.filter(i => isRecidive(i, inj)).length
  return {
    count: recent.length,
    avgDuration: avg(recent.map(durationDays)),
    recidiveRate: recent.length ? Math.round((recid / recent.length) * 100) : null,
    avgReturn: avg(resolved.map(durationDays)),
  }
}
