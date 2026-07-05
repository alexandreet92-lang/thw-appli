// ── Recovery — Helpers ────────────────────────────────────────
import type { CheckInRow } from './types'

/**
 * Calcule le score de récupération /100 depuis un check-in.
 * Formule (max raw = 805) :
 *   (10-fatigue)*15 + energy*15 + (10-stress)*15
 *   + motivation*10 + (10-pain)*15 + sleep_quality*15
 */
export function calcRecoveryScore(c: Pick<CheckInRow,
  'fatigue'|'energy'|'stress'|'motivation'|'pain'|'sleep_quality'>
): number {
  const raw =
    (10 - c.fatigue)    * 15 +
    c.energy            * 15 +
    (10 - c.stress)     * 15 +
    c.motivation        * 10 +
    (10 - c.pain)       * 15 +
    c.sleep_quality     * 15
  return Math.min(100, Math.round((raw / 805) * 100))
}

export interface ScoreStatus {
  label: string; labelKey: string; color: string; bg: string; desc: string; descKey: string
}

export function scoreStatus(score: number): ScoreStatus {
  if (score >= 91) return { label:'Excellent', labelKey:'divers.scoreExcellent', color:'#16a34a', bg:'rgba(22,163,74,0.12)',   desc:'Forme optimale. Séance intensive possible.', descKey:'divers.scoreExcellentDesc' }
  if (score >= 81) return { label:'Bon',       labelKey:'divers.scoreGood',      color:'#22c55e', bg:'rgba(34,197,94,0.12)',   desc:'Bonne récupération. Entraîne-toi pleinement.', descKey:'divers.scoreGoodDesc' }
  if (score >= 61) return { label:'Correct',   labelKey:'divers.scoreOk',        color:'#06B6D4', bg:'rgba(6,182,212,0.12)',   desc:'Récupération correcte. Intensité modérée.', descKey:'divers.scoreOkDesc' }
  if (score >= 41) return { label:'Moyen',     labelKey:'divers.scoreAverage',   color:'#f97316', bg:'rgba(249,115,22,0.12)',  desc:'Récupération partielle. Préfère une séance légère.', descKey:'divers.scoreAverageDesc' }
  return              { label:'Faible',    labelKey:'divers.scoreLow',       color:'#ef4444', bg:'rgba(239,68,68,0.12)',   desc:'Corps fatigué. Repos actif recommandé.', descKey:'divers.scoreLowDesc' }
}

export function metricColor(v: number, inverted = false): string {
  const s = inverted ? 11 - v : v
  if (s >= 8) return '#22c55e'
  if (s >= 5) return '#f97316'
  return '#ef4444'
}

/** Formate des heures décimales → "7h30" */
export function fmtHoursDecimal(h?: number | null): string {
  if (!h) return '—'
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm > 0 ? `${hh}h${String(mm).padStart(2,'0')}` : `${hh}h`
}

/** Date du jour en "YYYY-MM-DD" heure locale */
export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export const SPORT_COLORS: Record<string, string> = {
  run:'#22c55e', running:'#22c55e',
  bike:'#3b82f6', cycling:'#3b82f6', ride:'#3b82f6',
  swim:'#06b6d4', swimming:'#06b6d4',
  gym:'#f97316', weighttraining:'#f97316', workout:'#f97316',
  hyrox:'#ef4444',
  rowing:'#14b8a6',
  elliptique:'#a855f7',
}

export function sportColor(s: string): string {
  return SPORT_COLORS[s.toLowerCase()] ?? '#6b7280'
}

export function sportLabel(s: string): string {
  const map: Record<string,string> = {
    run:'Running', running:'Running', ride:'Cyclisme', cycling:'Cyclisme', bike:'Cyclisme',
    swim:'Natation', swimming:'Natation', gym:'Gym', weighttraining:'Gym',
    hyrox:'Hyrox', rowing:'Aviron', elliptique:'Elliptique',
  }
  return map[s.toLowerCase()] ?? s
}

// Clé i18n (namespace divers.*) pour un sport — résolue au site d'affichage via t().
// Repli sur le libellé brut si le sport n'est pas connu (t() renverra alors la valeur telle quelle).
export function sportLabelKey(s: string): string {
  const map: Record<string,string> = {
    run:'divers.sportRunning', running:'divers.sportRunning',
    ride:'divers.sportCycling', cycling:'divers.sportCycling', bike:'divers.sportCycling',
    swim:'divers.sportSwimming', swimming:'divers.sportSwimming',
    gym:'divers.sportGym', weighttraining:'divers.sportGym',
    hyrox:'divers.sportHyrox', rowing:'divers.sportRowing', elliptique:'divers.sportElliptical',
  }
  return map[s.toLowerCase()] ?? s
}
