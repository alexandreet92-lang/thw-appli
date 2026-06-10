// ══════════════════════════════════════════════════════════════════
// Progression — config par sport : onglets familles + mapping vers les
// valeurs réelles de `sport_type`, et config de la vue « Général »
// (héros / stats / colonnes) basée sur les colonnes RÉELLES.
// ══════════════════════════════════════════════════════════════════

import { formatPace, formatPaceSwim } from '@/lib/utils/pace'
import { avgRecent, calcDelta, fmtDur, fmtKm, type ProgSession, type Delta } from './helpers'

export interface SportConfig {
  id: string
  label: string
  color: string
  hasData: boolean
  sportTypes: string[]                       // valeurs réelles de sport_type
  families: { id: string; label: string; isGeneral?: boolean }[]
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  running: { id: 'running', label: 'Running', color: '#f97316', hasData: true, sportTypes: ['run'],
    families: [{ id: 'general', label: 'Général', isGeneral: true }, { id: 'vma', label: 'VMA' }, { id: 'seuil', label: 'Seuil' }] },
  cycling: { id: 'cycling', label: 'Cyclisme', color: '#6366f1', hasData: true, sportTypes: ['bike', 'virtual_bike'],
    families: [{ id: 'general', label: 'Général', isGeneral: true }, { id: 'ftp', label: 'FTP/Seuil' }, { id: 'pma', label: 'PMA' }, { id: 'anaerobie', label: 'Anaérobie' }, { id: 'sprints', label: 'Sprints' }] },
  muscu: { id: 'muscu', label: 'Muscu', color: '#7c3aed', hasData: true, sportTypes: ['gym'],
    families: [{ id: 'general', label: 'Général', isGeneral: true }, { id: 'squat', label: 'Squat' }, { id: 'developpe_couche', label: 'DC' }, { id: 'deadlift', label: 'Deadlift' }, { id: 'traction', label: 'Traction' }, { id: 'dips', label: 'Dips' }, { id: 'developpe_militaire', label: 'DM' }, { id: 'front_squat', label: 'Front squat' }] },
  natation: { id: 'natation', label: 'Natation', color: '#0ea5e9', hasData: true, sportTypes: ['swim'],
    families: [{ id: 'general', label: 'Général', isGeneral: true }, { id: 'css', label: 'CSS' }, { id: 'test_400m', label: '400m test' }, { id: 'endurance', label: 'Endurance longue' }] },
  hyrox:  { id: 'hyrox', label: 'Hyrox', color: '#ef4444', hasData: false, sportTypes: ['hyrox'], families: [] },
  aviron: { id: 'aviron', label: 'Aviron', color: '#06b6d4', hasData: false, sportTypes: ['rowing'], families: [] },
  trail:  { id: 'trail', label: 'Trail', color: '#84cc16', hasData: false, sportTypes: ['trail_run'], families: [] },
}

// ── Vue Général : héros + stats secondaires + colonnes liste ──
export interface StatDef { label: string; calc: (s: ProgSession[]) => { value: string; delta: Delta } }
export interface ColDef { label: string; value: (s: ProgSession) => string; color?: string }
export interface GeneralConfig {
  hero: (s: ProgSession[]) => { value: string; label: string; sub?: string }
  trendMetric: keyof ProgSession
  trendInverse: boolean
  chartMetric: keyof ProgSession
  chartInverse: boolean
  secondary: StatDef[]
  columns: ColDef[]
}

const paceKm = (sec: number | null) => sec != null ? `${formatPace(sec / 60)}/km` : '—'
const swim100 = (secKm: number | null) => secKm != null ? `${formatPaceSwim(secKm / 10)}/100m` : '—'
const r1 = (n: number | null) => n != null ? n.toFixed(2) : '—'

export const GENERAL_CONFIGS: Record<string, GeneralConfig> = {
  running: {
    hero: s => ({ value: paceKm(avgRecent(s, 'avg_pace_s_km')), label: 'Allure moyenne récente', sub: `EF ${r1(avgRecent(s, 'ef_value'))}` }),
    trendMetric: 'avg_pace_s_km', trendInverse: true, chartMetric: 'ef_value', chartInverse: false,
    secondary: [
      { label: 'FC moy', calc: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : '—', delta: calcDelta(s, 'avg_hr', true) }) },
      { label: 'EF moy', calc: s => ({ value: r1(avgRecent(s, 'ef_value')), delta: calcDelta(s, 'ef_value') }) },
      { label: 'Distance moy', calc: s => ({ value: fmtKm(avgRecent(s, 'distance_m')), delta: calcDelta(s, 'distance_m') }) },
    ],
    columns: [
      { label: 'Allure', value: s => paceKm(s.avg_pace_s_km), color: '#f97316' },
      { label: 'Distance', value: s => fmtKm(s.distance_m) },
      { label: 'FC', value: s => s.avg_hr ? `${Math.round(s.avg_hr)}` : '—' },
      { label: 'EF', value: s => r1(s.ef_value) },
    ],
  },
  cycling: {
    hero: s => ({ value: avgRecent(s, 'avg_watts') != null ? `${Math.round(avgRecent(s, 'avg_watts') as number)} W` : '—', label: 'Puissance moyenne récente', sub: avgRecent(s, 'avg_speed_ms') != null ? `${(avgRecent(s, 'avg_speed_ms') as number * 3.6).toFixed(1)} km/h` : undefined }),
    trendMetric: 'avg_watts', trendInverse: false, chartMetric: 'avg_watts', chartInverse: false,
    secondary: [
      { label: 'Vitesse moy', calc: s => ({ value: avgRecent(s, 'avg_speed_ms') != null ? `${(avgRecent(s, 'avg_speed_ms') as number * 3.6).toFixed(1)} km/h` : '—', delta: calcDelta(s, 'avg_speed_ms') }) },
      { label: 'Distance moy', calc: s => ({ value: fmtKm(avgRecent(s, 'distance_m')), delta: calcDelta(s, 'distance_m') }) },
      { label: 'Power/HR', calc: s => ({ value: r1(avgRecent(s, 'power_hr_ratio')), delta: calcDelta(s, 'power_hr_ratio') }) },
    ],
    columns: [
      { label: 'Puiss.', value: s => s.avg_watts ? `${Math.round(s.avg_watts)} W` : '—', color: '#6366f1' },
      { label: 'Distance', value: s => fmtKm(s.distance_m) },
      { label: 'Vitesse', value: s => s.avg_speed_ms ? `${(s.avg_speed_ms * 3.6).toFixed(1)}` : '—' },
    ],
  },
  muscu: {
    hero: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : fmtDur(avgRecent(s, 'moving_time_s')), label: avgRecent(s, 'avg_hr') != null ? 'FC moyenne récente' : 'Durée moyenne récente', sub: `Durée ${fmtDur(avgRecent(s, 'moving_time_s'))}` }),
    trendMetric: 'moving_time_s', trendInverse: false, chartMetric: 'avg_hr', chartInverse: false,
    secondary: [
      { label: 'Durée moy', calc: s => ({ value: fmtDur(avgRecent(s, 'moving_time_s')), delta: calcDelta(s, 'moving_time_s') }) },
      { label: 'Calories moy', calc: s => ({ value: avgRecent(s, 'calories') != null ? `${Math.round(avgRecent(s, 'calories') as number)} kcal` : '—', delta: calcDelta(s, 'calories') }) },
      { label: 'FC moy', calc: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : '—', delta: calcDelta(s, 'avg_hr') }) },
    ],
    columns: [
      { label: 'Durée', value: s => fmtDur(s.moving_time_s), color: '#7c3aed' },
      { label: 'FC', value: s => s.avg_hr ? `${Math.round(s.avg_hr)}` : '—' },
      { label: 'Calories', value: s => s.calories ? `${Math.round(s.calories)}` : '—' },
    ],
  },
  natation: {
    hero: s => ({ value: swim100(avgRecent(s, 'avg_pace_s_km')), label: 'Allure moyenne récente', sub: `Distance ${fmtKm(avgRecent(s, 'distance_m'))}` }),
    trendMetric: 'avg_pace_s_km', trendInverse: true, chartMetric: 'avg_pace_s_km', chartInverse: true,
    secondary: [
      { label: 'Distance moy', calc: s => ({ value: fmtKm(avgRecent(s, 'distance_m')), delta: calcDelta(s, 'distance_m') }) },
      { label: 'Durée moy', calc: s => ({ value: fmtDur(avgRecent(s, 'moving_time_s')), delta: calcDelta(s, 'moving_time_s') }) },
      { label: 'FC moy', calc: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : '—', delta: calcDelta(s, 'avg_hr', true) }) },
    ],
    columns: [
      { label: 'Allure', value: s => swim100(s.avg_pace_s_km), color: '#0ea5e9' },
      { label: 'Distance', value: s => fmtKm(s.distance_m) },
      { label: 'Durée', value: s => fmtDur(s.moving_time_s) },
    ],
  },
}
