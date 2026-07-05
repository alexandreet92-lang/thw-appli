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
  labelKey: string                           // clé i18n (namespace divers.*) — résolue au site d'affichage
  color: string
  hasData: boolean
  sportTypes: string[]                       // valeurs réelles de sport_type
  families: { id: string; label: string; labelKey: string; isGeneral?: boolean }[]
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  running: { id: 'running', label: 'Running', labelKey: 'divers.sportRunning', color: '#f97316', hasData: true, sportTypes: ['run'],
    families: [{ id: 'general', label: 'Général', labelKey: 'divers.familyGeneral', isGeneral: true }, { id: 'vma', label: 'VMA', labelKey: 'divers.familyVma' }, { id: 'seuil', label: 'Seuil', labelKey: 'divers.familySeuil' }] },
  cycling: { id: 'cycling', label: 'Cyclisme', labelKey: 'divers.sportCycling', color: '#6366f1', hasData: true, sportTypes: ['bike', 'virtual_bike'],
    families: [{ id: 'general', label: 'Général', labelKey: 'divers.familyGeneral', isGeneral: true }, { id: 'ftp', label: 'FTP/Seuil', labelKey: 'divers.familyFtpSeuil' }, { id: 'pma', label: 'PMA', labelKey: 'divers.familyPma' }, { id: 'anaerobie', label: 'Anaérobie', labelKey: 'divers.familyAnaerobic' }, { id: 'sprints', label: 'Sprints', labelKey: 'divers.familySprints' }] },
  muscu: { id: 'muscu', label: 'Muscu', labelKey: 'divers.sportMuscu', color: '#7c3aed', hasData: true, sportTypes: ['gym'],
    families: [{ id: 'general', label: 'Général', labelKey: 'divers.familyGeneral', isGeneral: true }, { id: 'squat', label: 'Squat', labelKey: 'divers.familySquat' }, { id: 'developpe_couche', label: 'DC', labelKey: 'divers.familyBench' }, { id: 'deadlift', label: 'Deadlift', labelKey: 'divers.familyDeadlift' }, { id: 'traction', label: 'Traction', labelKey: 'divers.familyPullup' }, { id: 'dips', label: 'Dips', labelKey: 'divers.familyDips' }, { id: 'developpe_militaire', label: 'DM', labelKey: 'divers.familyOhp' }, { id: 'front_squat', label: 'Front squat', labelKey: 'divers.familyFrontSquat' }] },
  natation: { id: 'natation', label: 'Natation', labelKey: 'divers.sportSwimming', color: '#0ea5e9', hasData: true, sportTypes: ['swim'],
    families: [{ id: 'general', label: 'Général', labelKey: 'divers.familyGeneral', isGeneral: true }, { id: 'css', label: 'CSS', labelKey: 'divers.familyCss' }, { id: 'test_400m', label: '400m test', labelKey: 'divers.family400mTest' }, { id: 'endurance', label: 'Endurance longue', labelKey: 'divers.familyLongEndurance' }] },
  hyrox:  { id: 'hyrox', label: 'Hyrox', labelKey: 'divers.sportHyrox', color: '#ef4444', hasData: false, sportTypes: ['hyrox'], families: [] },
  aviron: { id: 'aviron', label: 'Aviron', labelKey: 'divers.sportRowing', color: '#06b6d4', hasData: false, sportTypes: ['rowing'], families: [] },
  trail:  { id: 'trail', label: 'Trail', labelKey: 'divers.sportTrail', color: '#84cc16', hasData: false, sportTypes: ['trail_run'], families: [] },
}

// ── Vue Général : héros + stats secondaires + colonnes liste ──
export interface StatDef { label: string; labelKey: string; calc: (s: ProgSession[]) => { value: string; delta: Delta } }
export interface ColDef { label: string; labelKey: string; value: (s: ProgSession) => string; color?: string }
export interface GeneralConfig {
  hero: (s: ProgSession[]) => { value: string; label: string; labelKey: string; sub?: string }
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
    hero: s => ({ value: paceKm(avgRecent(s, 'avg_pace_s_km')), label: 'Allure moyenne récente', labelKey: 'divers.heroRecentAvgPace', sub: `EF ${r1(avgRecent(s, 'ef_value'))}` }),
    trendMetric: 'avg_pace_s_km', trendInverse: true, chartMetric: 'ef_value', chartInverse: false,
    secondary: [
      { label: 'FC moy', labelKey: 'divers.statAvgHr', calc: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : '—', delta: calcDelta(s, 'avg_hr', true) }) },
      { label: 'EF moy', labelKey: 'divers.statAvgEf', calc: s => ({ value: r1(avgRecent(s, 'ef_value')), delta: calcDelta(s, 'ef_value') }) },
      { label: 'Distance moy', labelKey: 'divers.statAvgDistance', calc: s => ({ value: fmtKm(avgRecent(s, 'distance_m')), delta: calcDelta(s, 'distance_m') }) },
    ],
    columns: [
      { label: 'Allure', labelKey: 'divers.colPace', value: s => paceKm(s.avg_pace_s_km), color: '#f97316' },
      { label: 'Distance', labelKey: 'divers.colDistance', value: s => fmtKm(s.distance_m) },
      { label: 'FC', labelKey: 'divers.colHr', value: s => s.avg_hr ? `${Math.round(s.avg_hr)}` : '—' },
      { label: 'EF', labelKey: 'divers.colEf', value: s => r1(s.ef_value) },
    ],
  },
  cycling: {
    hero: s => ({ value: avgRecent(s, 'avg_watts') != null ? `${Math.round(avgRecent(s, 'avg_watts') as number)} W` : '—', label: 'Puissance moyenne récente', labelKey: 'divers.heroRecentAvgPower', sub: avgRecent(s, 'avg_speed_ms') != null ? `${(avgRecent(s, 'avg_speed_ms') as number * 3.6).toFixed(1)} km/h` : undefined }),
    trendMetric: 'avg_watts', trendInverse: false, chartMetric: 'avg_watts', chartInverse: false,
    secondary: [
      { label: 'Vitesse moy', labelKey: 'divers.statAvgSpeed', calc: s => ({ value: avgRecent(s, 'avg_speed_ms') != null ? `${(avgRecent(s, 'avg_speed_ms') as number * 3.6).toFixed(1)} km/h` : '—', delta: calcDelta(s, 'avg_speed_ms') }) },
      { label: 'Distance moy', labelKey: 'divers.statAvgDistance', calc: s => ({ value: fmtKm(avgRecent(s, 'distance_m')), delta: calcDelta(s, 'distance_m') }) },
      { label: 'Power/HR', labelKey: 'divers.statPowerHr', calc: s => ({ value: r1(avgRecent(s, 'power_hr_ratio')), delta: calcDelta(s, 'power_hr_ratio') }) },
    ],
    columns: [
      { label: 'Puiss.', labelKey: 'divers.colPower', value: s => s.avg_watts ? `${Math.round(s.avg_watts)} W` : '—', color: '#6366f1' },
      { label: 'Distance', labelKey: 'divers.colDistance', value: s => fmtKm(s.distance_m) },
      { label: 'Vitesse', labelKey: 'divers.colSpeed', value: s => s.avg_speed_ms ? `${(s.avg_speed_ms * 3.6).toFixed(1)}` : '—' },
    ],
  },
  muscu: {
    hero: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : fmtDur(avgRecent(s, 'moving_time_s')), label: avgRecent(s, 'avg_hr') != null ? 'FC moyenne récente' : 'Durée moyenne récente', labelKey: avgRecent(s, 'avg_hr') != null ? 'divers.heroRecentAvgHr' : 'divers.heroRecentAvgDuration', sub: `Durée ${fmtDur(avgRecent(s, 'moving_time_s'))}` }),
    trendMetric: 'moving_time_s', trendInverse: false, chartMetric: 'avg_hr', chartInverse: false,
    secondary: [
      { label: 'Durée moy', labelKey: 'divers.statAvgDuration', calc: s => ({ value: fmtDur(avgRecent(s, 'moving_time_s')), delta: calcDelta(s, 'moving_time_s') }) },
      { label: 'Calories moy', labelKey: 'divers.statAvgCalories', calc: s => ({ value: avgRecent(s, 'calories') != null ? `${Math.round(avgRecent(s, 'calories') as number)} kcal` : '—', delta: calcDelta(s, 'calories') }) },
      { label: 'FC moy', labelKey: 'divers.statAvgHr', calc: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : '—', delta: calcDelta(s, 'avg_hr') }) },
    ],
    columns: [
      { label: 'Durée', labelKey: 'divers.colDuration', value: s => fmtDur(s.moving_time_s), color: '#7c3aed' },
      { label: 'FC', labelKey: 'divers.colHr', value: s => s.avg_hr ? `${Math.round(s.avg_hr)}` : '—' },
      { label: 'Calories', labelKey: 'divers.colCalories', value: s => s.calories ? `${Math.round(s.calories)}` : '—' },
    ],
  },
  natation: {
    hero: s => ({ value: swim100(avgRecent(s, 'avg_pace_s_km')), label: 'Allure moyenne récente', labelKey: 'divers.heroRecentAvgPace', sub: `Distance ${fmtKm(avgRecent(s, 'distance_m'))}` }),
    trendMetric: 'avg_pace_s_km', trendInverse: true, chartMetric: 'avg_pace_s_km', chartInverse: true,
    secondary: [
      { label: 'Distance moy', labelKey: 'divers.statAvgDistance', calc: s => ({ value: fmtKm(avgRecent(s, 'distance_m')), delta: calcDelta(s, 'distance_m') }) },
      { label: 'Durée moy', labelKey: 'divers.statAvgDuration', calc: s => ({ value: fmtDur(avgRecent(s, 'moving_time_s')), delta: calcDelta(s, 'moving_time_s') }) },
      { label: 'FC moy', labelKey: 'divers.statAvgHr', calc: s => ({ value: avgRecent(s, 'avg_hr') != null ? `${Math.round(avgRecent(s, 'avg_hr') as number)} bpm` : '—', delta: calcDelta(s, 'avg_hr', true) }) },
    ],
    columns: [
      { label: 'Allure', labelKey: 'divers.colPace', value: s => swim100(s.avg_pace_s_km), color: '#0ea5e9' },
      { label: 'Distance', labelKey: 'divers.colDistance', value: s => fmtKm(s.distance_m) },
      { label: 'Durée', labelKey: 'divers.colDuration', value: s => fmtDur(s.moving_time_s) },
    ],
  },
}
