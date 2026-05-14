'use client'
import React from 'react'

// ─── 7-Level system ───────────────────────────────────────────────────────────
export const TEST_LEVELS = [
  { label: 'Alien',    score: 10, color: '#00FF87' },
  { label: 'Élite',   score: 9,  color: '#00C8E0' },
  { label: 'AHN',     score: 8,  color: '#5B6FFF' },
  { label: 'TBA',     score: 7,  color: '#FFD700' },
  { label: 'BA',      score: 6,  color: '#FF9500' },
  { label: 'Amateur', score: 5,  color: '#D1D5DB' },
  { label: 'Débutant',score: 3,  color: '#EF4444' },
] as const
export type TestLevel = typeof TEST_LEVELS[number]

// ─── Scoring functions ────────────────────────────────────────────────────────
// thresholds: [alien, elite, ahn, tba, ba, amateur] — 6 boundaries, higher = better
export function scoreH(v: number, t: readonly [number,number,number,number,number,number]): number {
  if (!v || v <= 0) return 0
  const [a, e, ahn, tba, ba, am] = t
  if (v >= a)   return 10
  if (v >= e)   return 9 + (v - e)   / (a   - e)
  if (v >= ahn) return 8 + (v - ahn) / (e   - ahn)
  if (v >= tba) return 7 + (v - tba) / (ahn - tba)
  if (v >= ba)  return 6 + (v - ba)  / (tba - ba)
  if (v >= am)  return 5 + (v - am)  / (ba  - am)
  return Math.max(0, 4 * v / am)
}

// thresholds: [alien, elite, ahn, tba, ba, amateur] — lower = better
export function scoreL(v: number, t: readonly [number,number,number,number,number,number]): number {
  if (!v || v <= 0) return 0
  const [a, e, ahn, tba, ba, am] = t
  if (v <= a)   return 10
  if (v <= e)   return 9 + (e   - v) / (e   - a)
  if (v <= ahn) return 8 + (ahn - v) / (ahn - e)
  if (v <= tba) return 7 + (tba - v) / (tba - ahn)
  if (v <= ba)  return 6 + (ba  - v) / (ba  - tba)
  if (v <= am)  return 5 + (am  - v) / (am  - ba)
  return Math.max(0, 4 * am / v)
}

export function levelFromScore(s: number): TestLevel {
  if (s >= 10) return TEST_LEVELS[0]
  if (s >= 9)  return TEST_LEVELS[1]
  if (s >= 8)  return TEST_LEVELS[2]
  if (s >= 7)  return TEST_LEVELS[3]
  if (s >= 6)  return TEST_LEVELS[4]
  if (s >= 5)  return TEST_LEVELS[5]
  return TEST_LEVELS[6]
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LevelRow {
  label: string
  score: number
  color: string
  hDisplay: string
  fDisplay: string
}

export interface SimpleBench {
  type: 'simple'
  lowerBetter: boolean
  unit: string
  valueKey: string          // which vals[key] to use
  thresholdsH: readonly [number,number,number,number,number,number]
  thresholdsF: readonly [number,number,number,number,number,number]
  rows: LevelRow[]
  annotation: string
}

export interface SubBench {
  key: string
  label: string
  lowerBetter: boolean
  unit: string
  thresholdsH: readonly [number,number,number,number,number,number]
  thresholdsF: readonly [number,number,number,number,number,number]
  rows: LevelRow[]
  annotation: string
}

export interface CompoundBench {
  type: 'compound'
  annotation: string
  subBenchs: SubBench[]
  computeOverall: (subScores: Record<string, number>) => number
}

export type TestBench = SimpleBench | CompoundBench

export interface SubScoreResult {
  key: string
  label: string
  rawValue: number
  score: number
  level: TestLevel
}

export interface TestScoreResult {
  overall: number
  level: TestLevel
  subScores?: SubScoreResult[]
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
function parseMmSs(s: string): number {
  if (!s) return 0
  const parts = s.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  return parts.length === 2 ? parts[0] * 60 + (parts[1] ?? 0) : parts[0] * 60
}

function fmtSec(s: number): string {
  if (s <= 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}'`
  return `${m}:${String(sec).padStart(2,'0')}`
}

// ─── Benchmark rows helpers ───────────────────────────────────────────────────
function rows7(
  labels: [string,string,string,string,string,string,string],
  hVals: [string,string,string,string,string,string,string],
  fVals: [string,string,string,string,string,string,string],
): LevelRow[] {
  return TEST_LEVELS.map((lv, i) => ({
    label: lv.label, score: lv.score, color: lv.color,
    hDisplay: hVals[i], fDisplay: fVals[i],
  }))
  // suppress 'labels' unused — used for documentation only
  void labels
}

// ─── BENCHMARK DATA ───────────────────────────────────────────────────────────
export const TEST_BENCHMARKS: Record<string, TestBench> = {

  // ── HYROX ────────────────────────────────────────────────────────────────

  'run-compromised': {
    type: 'simple',
    lowerBetter: true,
    unit: 's',
    valueKey: 'run_time_sec',
    thresholdsH: [1680, 1920, 2160, 2400, 2760, 3120],
    thresholdsF: [1920, 2220, 2520, 2880, 3300, 3840],
    annotation: "Temps cumulé de vos 8 km de running lors d'une course Hyrox. Mesuré sous fatigue après chaque station. C'est l'indicateur le plus représentatif de votre endurance spécifique Hyrox.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['< 28:00','28-32\'','32-36\'','36-40\'','40-46\'','46-52\'',' > 52\''],
      ['< 32:00','32-37\'','37-42\'','42-48\'','48-55\'','55-64\'','> 64\''],
    ),
  },

  'hyrox-endurance-wod': {
    type: 'simple',
    lowerBetter: true,
    unit: 's',
    valueKey: 'wod_time_sec',
    thresholdsH: [720,  900,  1140, 1440, 1800, 2400],
    thresholdsF: [960,  1200, 1500, 1860, 2280, 3000],
    annotation: "5 rounds à compléter le plus vite possible. Pas de repos imposé entre les exercices ni entre les rounds. Mesure votre capacité à enchaîner des mouvements fonctionnels sous fatigue — très représentatif de la deuxième moitié d'un Hyrox.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['< 12:00','12-15\'','15-19\'','19-24\'','24-30\'','30-40\'','> 40\''],
      ['< 16:00','16-20\'','20-25\'','25-31\'','31-38\'','38-50\'','> 50\''],
    ),
  },

  'hyrox-force': {
    type: 'compound',
    annotation: "Score de force globale : moyenne du Deadlift, Squat et Bench Press. Le Bench intègre la force maximale (1RM) et l'endurance de force (répétitions au poids du corps). Ces mouvements sont directement corrélés aux stations sled, sandbag et wall ball en Hyrox.",
    subBenchs: [
      {
        key: 'dl_ratio',
        label: 'Deadlift 1RM',
        lowerBetter: false,
        unit: '× PDC',
        thresholdsH: [3.5, 3.0, 2.5, 2.0, 1.7, 1.3],
        thresholdsF: [2.8, 2.4, 2.0, 1.7, 1.4, 1.1],
        annotation: "1 répétition maximum au soulevé de terre. Exprimé en ratio par rapport à votre poids de corps. Ex : 100 kg soulevés pour 80 kg de poids = ratio 1.25×. Sled push et sled pull y sont directement corrélés.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['> 3.5×','3.0-3.5×','2.5-3.0×','2.0-2.5×','1.7-2.0×','1.3-1.7×','< 1.3×'],
          ['> 2.8×','2.4-2.8×','2.0-2.4×','1.7-2.0×','1.4-1.7×','1.1-1.4×','< 1.1×'],
        ),
      },
      {
        key: 'sq_ratio',
        label: 'Squat 1RM',
        lowerBetter: false,
        unit: '× PDC',
        thresholdsH: [3.0, 2.5, 2.1, 1.7, 1.4, 1.1],
        thresholdsF: [2.5, 2.1, 1.7, 1.4, 1.1, 0.8],
        annotation: "1 répétition maximum au squat barre. Corrélé directement au sled push, sandbag lunges et wall balls en Hyrox.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['> 3.0×','2.5-3.0×','2.1-2.5×','1.7-2.1×','1.4-1.7×','1.1-1.4×','< 1.1×'],
          ['> 2.5×','2.1-2.5×','1.7-2.1×','1.4-1.7×','1.1-1.4×','0.8-1.1×','< 0.8×'],
        ),
      },
      {
        key: 'bench_1rm_ratio',
        label: 'Bench 1RM',
        lowerBetter: false,
        unit: '× PDC',
        thresholdsH: [2.0, 1.7, 1.4, 1.2, 1.0, 0.7],
        thresholdsF: [1.5, 1.3, 1.0, 0.8, 0.6, 0.4],
        annotation: "1 répétition maximum au développé couché. Indicateur de force maximale du haut du corps.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['> 2.0×','1.7-2.0×','1.4-1.7×','1.2-1.4×','1.0-1.2×','0.7-1.0×','< 0.7×'],
          ['> 1.5×','1.3-1.5×','1.0-1.3×','0.8-1.0×','0.6-0.8×','0.4-0.6×','< 0.4×'],
        ),
      },
      {
        key: 'bench_reps',
        label: 'Bench reps PDC',
        lowerBetter: false,
        unit: 'reps',
        thresholdsH: [40, 30, 22, 15, 10, 5],
        thresholdsF: [25, 18, 12,  8,  5, 2],
        annotation: "Nombre de répétitions au développé couché au poids du corps. Mesure l'endurance de force du haut du corps — directement lié aux pompes et aux mouvements de poussée en Hyrox.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['> 40','30-40','22-30','15-22','10-15','5-10','< 5'],
          ['> 25','18-25','12-18','8-12','5-8','2-5','< 2'],
        ),
      },
    ],
    computeOverall: (sub) => {
      const bench = [sub['bench_1rm_ratio'], sub['bench_reps']].filter(v => v !== undefined && v > 0)
      const benchScore = bench.length ? bench.reduce((a, b) => a + b, 0) / bench.length : 0
      const main = [sub['dl_ratio'], sub['sq_ratio']].filter(v => v !== undefined && v > 0)
      const all = [...main, ...(benchScore > 0 ? [benchScore] : [])]
      return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0
    },
  },

  'hyrox-explosivite': {
    type: 'compound',
    annotation: "Score d'explosivité : moyenne du saut avant, triple saut et sprint 20 m. Ces trois exercices mesurent la puissance explosive des membres inférieurs sous différents angles — directement liés aux burpee broad jumps en Hyrox.",
    subBenchs: [
      {
        key: 'saut_avant_m',
        label: 'Saut avant',
        lowerBetter: false,
        unit: 'm',
        thresholdsH: [3.20, 2.90, 2.60, 2.30, 2.00, 1.65],
        thresholdsF: [2.70, 2.40, 2.15, 1.90, 1.65, 1.35],
        annotation: "Saut pieds joints vers l'avant, distance mesurée du bout des pieds au point d'atterrissage le plus proche. Directement lié à la puissance des burpee broad jumps en Hyrox.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['> 3m20','2m90-3m20','2m60-2m90','2m30-2m60','2m00-2m30','1m65-2m00','< 1m65'],
          ['> 2m70','2m40-2m70','2m15-2m40','1m90-2m15','1m65-1m90','1m35-1m65','< 1m35'],
        ),
      },
      {
        key: 'triple_saut_m',
        label: 'Triple saut',
        lowerBetter: false,
        unit: 'm',
        thresholdsH: [9.00, 8.00, 7.00, 6.10, 5.20, 4.20],
        thresholdsF: [7.50, 6.60, 5.80, 5.00, 4.30, 3.50],
        annotation: "3 sauts enchaînés sans pause ni repositionnement. Mesure la puissance répétée et la capacité à maintenir l'explosivité sur des efforts successifs.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['> 9m00','8-9m','7-8m','6m10-7m','5m20-6m10','4m20-5m20','< 4m20'],
          ['> 7m50','6m60-7m50','5m80-6m60','5-5m80','4m30-5m','3m50-4m30','< 3m50'],
        ),
      },
      {
        key: 'sprint20m_s',
        label: 'Sprint 20 m',
        lowerBetter: true,
        unit: 's',
        thresholdsH: [2.60, 2.85, 3.10, 3.40, 3.75, 4.20],
        thresholdsF: [2.90, 3.15, 3.45, 3.80, 4.20, 4.70],
        annotation: "Sprint lancé sur 20 mètres. Mesure la vitesse maximale et la capacité d'accélération.",
        rows: rows7(
          ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
          ['< 2.60s','2.60-2.85s','2.85-3.10s','3.10-3.40s','3.40-3.75s','3.75-4.20s','> 4.20s'],
          ['< 2.90s','2.90-3.15s','3.15-3.45s','3.45-3.80s','3.80-4.20s','4.20-4.70s','> 4.70s'],
        ),
      },
    ],
    computeOverall: (sub) => {
      const vals = Object.values(sub).filter(v => v > 0)
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    },
  },

  // ── CYCLING ──────────────────────────────────────────────────────────────

  'cp20': {
    type: 'simple',
    lowerBetter: false,
    unit: 'W/kg',
    valueKey: 'ftp_wkg',
    thresholdsH: [6.4, 5.5, 4.5, 3.8, 3.2, 2.5],
    thresholdsF: [5.8, 5.0, 4.0, 3.3, 2.8, 2.2],
    annotation: "Le FTP (Functional Threshold Power) est la puissance maximale que vous pouvez maintenir pendant 1 heure. Exprimé en W/kg pour comparer des athlètes de morphologies différentes. C'est l'indicateur principal en cyclisme.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 6.4','5.5-6.4','4.5-5.5','3.8-4.5','3.2-3.8','2.5-3.2','< 2.5'],
      ['> 5.8','5.0-5.8','4.0-5.0','3.3-4.0','2.8-3.3','2.2-2.8','< 2.2'],
    ),
  },

  'vo2max-cycling': {
    type: 'simple',
    lowerBetter: false,
    unit: 'W/kg',
    valueKey: 'pma_wkg',
    thresholdsH: [22, 18, 14, 11, 9, 7],
    thresholdsF: [17, 14, 11,  9, 7, 5],
    annotation: "La PMA est la puissance maximale développée sur un effort de 5 à 8 minutes. Le sprint 5 secondes mesure la puissance neuromusculaire pure (pic anaérobie). Ces deux valeurs caractérisent votre profil explosif.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 22','18-22','14-18','11-14','9-11','7-9','< 7'],
      ['> 17','14-17','11-14','9-11','7-9','5-7','< 5'],
    ),
  },

  'endurance-cycling': {
    type: 'simple',
    lowerBetter: false,
    unit: '%',
    valueKey: 'endurance_pct',
    thresholdsH: [88, 82, 75, 68, 60, 50],
    thresholdsF: [88, 82, 75, 68, 60, 50],
    annotation: "Mesure votre capacité à maintenir une puissance élevée sur une longue durée. Calculé automatiquement depuis vos sorties de 3h+ enregistrées dans l'app. Plus ce ratio est élevé, meilleur est votre profil endurance.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 88%','82-88%','75-82%','68-75%','60-68%','50-60%','< 50%'],
      ['> 88%','82-88%','75-82%','68-75%','60-68%','50-60%','< 50%'],
    ),
  },

  'cycling-z4': {
    type: 'simple',
    lowerBetter: false,
    unit: 'min',
    valueKey: 'z4_duration_min',
    thresholdsH: [70, 55, 40, 30, 20, 12],
    thresholdsF: [70, 55, 40, 30, 20, 12],
    annotation: "Durée maximale que vous pouvez tenir à Z4 (95-105% de votre FTP) en un seul effort continu. Mesure votre capacité à soutenir un effort au seuil — déterminant pour les courses et les sorties exigeantes.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 70 min','55-70 min','40-55 min','30-40 min','20-30 min','12-20 min','< 12 min'],
      ['> 70 min','55-70 min','40-55 min','30-40 min','20-30 min','12-20 min','< 12 min'],
    ),
  },

  'cycling-grimpeur': {
    type: 'simple',
    lowerBetter: false,
    unit: 'W/kg',
    valueKey: 'climb_wkg',
    thresholdsH: [6.2, 5.3, 4.3, 3.6, 3.0, 2.3],
    thresholdsF: [5.5, 4.7, 3.8, 3.2, 2.6, 2.0],
    annotation: "Puissance moyenne rapportée au poids sur un effort de montée de 20 à 40 minutes. C'est l'indicateur clé pour les cyclistes qui font des courses avec du dénivelé. Calculé automatiquement depuis vos meilleures montées.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 6.2','5.3-6.2','4.3-5.3','3.6-4.3','3.0-3.6','2.3-3.0','< 2.3'],
      ['> 5.5','4.7-5.5','3.8-4.7','3.2-3.8','2.6-3.2','2.0-2.6','< 2.0'],
    ),
  },

  // ── RUNNING ──────────────────────────────────────────────────────────────

  'vma': {
    type: 'simple',
    lowerBetter: false,
    unit: 'km/h',
    valueKey: 'vma_kmh',
    thresholdsH: [24, 21, 18, 16, 14, 11],
    thresholdsF: [21, 18.5, 16, 14, 12, 9],
    annotation: "La VMA est la vitesse à laquelle votre consommation d'oxygène atteint son maximum (VO2max). C'est le plafond de vitesse de votre moteur aérobie. Calculée depuis votre meilleur test ou record 3000m.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 24','21-24','18-21','16-18','14-16','11-14','< 11'],
      ['> 21','18.5-21','16-18.5','14-16','12-14','9-12','< 9'],
    ),
  },

  'running-endurance-pct': {
    type: 'simple',
    lowerBetter: false,
    unit: '%',
    valueKey: 'endurance_pct',
    thresholdsH: [85, 80, 74, 68, 61, 52],
    thresholdsF: [85, 80, 74, 68, 61, 52],
    annotation: "Mesure votre efficacité aérobie : plus vous pouvez courir le marathon près de votre VMA, meilleur est votre profil endurance. Un bon marathonien court à 80%+ de sa VMA sur 42 km.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 85%','80-85%','74-80%','68-74%','61-68%','52-61%','< 52%'],
      ['> 85%','80-85%','74-80%','68-74%','61-68%','52-61%','< 52%'],
    ),
  },

  'running-10km': {
    type: 'simple',
    lowerBetter: true,
    unit: 's',
    valueKey: 'time_10km_sec',
    thresholdsH: [1620, 1800, 2040, 2280, 2640, 3300],
    thresholdsF: [1800, 2040, 2280, 2580, 3000, 3720],
    annotation: "Le 10 km est la distance de référence pour mesurer votre résistance à allure seuil. Il combine vitesse et endurance sur une durée exigeante. Référence mondiale : 26:24 (H) / 29:01 (F).",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['< 27:00','27-30\'','30-34\'','34-38\'','38-44\'','44-55\'','> 55\''],
      ['< 30:00','30-34\'','34-38\'','38-43\'','43-50\'','50-62\'','> 62\''],
    ),
  },

  'running-economie-fc': {
    type: 'simple',
    lowerBetter: true,
    unit: 's/km',
    valueKey: 'pace_fc150_sec',
    thresholdsH: [200, 225, 250, 280, 320, 380],
    thresholdsF: [225, 250, 280, 310, 350, 420],
    annotation: "Mesure votre efficacité de course : quelle allure pouvez-vous tenir à une FC modérée (150 bpm). Plus cette allure est rapide, plus votre technique et votre économie de mouvement sont efficaces. Calculé automatiquement depuis vos sorties avec capteur FC.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['< 3:20/km','3:20-3:45','3:45-4:10','4:10-4:40','4:40-5:20','5:20-6:20','> 6:20'],
      ['< 3:45/km','3:45-4:10','4:10-4:40','4:40-5:10','5:10-5:50','5:50-7:00','> 7:00'],
    ),
  },

  'running-recup-fc': {
    type: 'simple',
    lowerBetter: false,
    unit: 'bpm',
    valueKey: 'fc_drop_bpm',
    thresholdsH: [40, 35, 30, 25, 20, 14],
    thresholdsF: [38, 33, 28, 23, 18, 12],
    annotation: "La récupération cardiaque est l'un des meilleurs indicateurs de condition physique générale. Plus votre FC baisse vite après un effort intense, plus votre système cardiovasculaire est entraîné. Calculé automatiquement depuis vos activités avec FC.",
    rows: rows7(
      ['Alien','Élite','AHN','TBA','BA','Amateur','Débutant'],
      ['> 40 bpm','35-40','30-35','25-30','20-25','14-20','< 14'],
      ['> 38 bpm','33-38','28-33','23-28','18-23','12-18','< 12'],
    ),
  },
}

// ─── computeTestScoreResult ────────────────────────────────────────────────────
export function computeTestScoreResult(
  testId: string,
  vals: Record<string, string>,
  gender: 'M' | 'F',
): TestScoreResult | null {
  const bench = TEST_BENCHMARKS[testId]
  if (!bench) return null

  const g = gender === 'F' ? 'F' : 'M'

  if (bench.type === 'simple') {
    const rawStr = vals[bench.valueKey] ?? ''
    let raw = parseFloat(rawStr)

    // Handle mm:ss input for time fields
    if (isNaN(raw) && rawStr.includes(':')) {
      raw = parseMmSs(rawStr)
    }
    if (!raw || raw <= 0) return null

    const t = g === 'F' ? bench.thresholdsF : bench.thresholdsH
    const s = bench.lowerBetter ? scoreL(raw, t) : scoreH(raw, t)
    return { overall: s, level: levelFromScore(s) }
  }

  if (bench.type === 'compound') {
    const subScores: SubScoreResult[] = []
    const subMap: Record<string, number> = {}

    for (const sub of bench.subBenchs) {
      const rawStr = vals[sub.key] ?? ''
      let raw = parseFloat(rawStr)
      if (isNaN(raw) && rawStr.includes(':')) raw = parseMmSs(rawStr)
      if (!raw || raw <= 0) continue

      const t = g === 'F' ? sub.thresholdsF : sub.thresholdsH
      const s = sub.lowerBetter ? scoreL(raw, t) : scoreH(raw, t)
      subMap[sub.key] = s
      subScores.push({ key: sub.key, label: sub.label, rawValue: raw, score: s, level: levelFromScore(s) })
    }

    if (subScores.length === 0) return null

    const overall = bench.computeOverall(subMap)
    return { overall, level: levelFromScore(overall), subScores }
  }

  return null
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────────
export function ScoreBadge({ score, level, size = 'md' }: { score: number; level: TestLevel; size?: 'sm' | 'md' | 'lg' }) {
  const fontSize = size === 'lg' ? 18 : size === 'sm' ? 10 : 13
  const pad = size === 'lg' ? '8px 16px' : size === 'sm' ? '2px 8px' : '4px 12px'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: size === 'sm' ? 4 : 6,
      background: level.color + '1a',
      border: `1px solid ${level.color}55`,
      borderRadius: 10,
      padding: pad,
      color: level.color,
      fontFamily: 'Syne, sans-serif',
      fontWeight: 700,
      fontSize,
      whiteSpace: 'nowrap' as const,
    }}>
      <span>{level.label}</span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: fontSize - 1, opacity: 0.9 }}>
        {score.toFixed(1)}
      </span>
    </span>
  )
}

// ─── LevelTable ───────────────────────────────────────────────────────────────
interface LevelTableProps {
  testId: string
  gender: 'M' | 'F'
  currentScore: number | null
  accentColor: string
}

export function LevelTable({ testId, gender, currentScore, accentColor }: LevelTableProps) {
  const bench = TEST_BENCHMARKS[testId]
  if (!bench) return null

  const currentLevel = currentScore !== null ? levelFromScore(currentScore) : null

  if (bench.type === 'compound') {
    // For compound: show individual sub-benchmark tables stacked
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {bench.subBenchs.map(sub => (
          <div key={sub.key}>
            <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              {sub.label}
            </div>
            <BenchmarkTable rows={sub.rows} gender={gender} currentLevelLabel={null} accentColor={accentColor} />
            <p style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: '6px 0 0', lineHeight: 1.5 }}>{sub.annotation}</p>
          </div>
        ))}
        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
          ℹ️ {bench.annotation}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <BenchmarkTable rows={bench.rows} gender={gender} currentLevelLabel={currentLevel?.label ?? null} accentColor={accentColor} />
      <p style={{ fontSize: 10.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-card2)', border: '1px solid var(--border)' }}>
        ℹ️ {bench.annotation}
      </p>
    </div>
  )
}

function BenchmarkTable({ rows, gender, currentLevelLabel, accentColor }: {
  rows: LevelRow[]
  gender: 'M' | 'F'
  currentLevelLabel: string | null
  accentColor: string
}) {
  return (
    <div style={{ overflowX: 'auto' as const, borderRadius: 10, border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 11.5 }}>
        <thead>
          <tr style={{ background: 'var(--bg-card2)' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left' as const, color: 'var(--text-dim)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const }}>Niveau</th>
            <th style={{ padding: '7px 10px', textAlign: 'center' as const, color: 'var(--text-dim)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Score</th>
            <th style={{ padding: '7px 10px', textAlign: 'center' as const, color: gender === 'M' ? accentColor : 'var(--text-dim)', fontWeight: gender === 'M' ? 700 : 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const }}>
              Homme {gender === 'M' && '▲'}
            </th>
            <th style={{ padding: '7px 10px', textAlign: 'center' as const, color: gender === 'F' ? '#f472b6' : 'var(--text-dim)', fontWeight: gender === 'F' ? 700 : 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const }}>
              Femme {gender === 'F' && '▲'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isHighlighted = currentLevelLabel === row.label
            return (
              <tr
                key={row.label}
                style={{
                  background: isHighlighted ? row.color + '18' : i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card2)',
                  borderLeft: isHighlighted ? `3px solid ${row.color}` : '3px solid transparent',
                  transition: 'background 0.2s',
                }}
              >
                <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' as const }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: isHighlighted ? 700 : 500, color: isHighlighted ? row.color : 'var(--text)' }}>
                      {row.label}
                    </span>
                    {isHighlighted && (
                      <span style={{ fontSize: 9, background: row.color + '22', color: row.color, border: `1px solid ${row.color}44`, borderRadius: 5, padding: '1px 5px', fontWeight: 700 }}>
                        Vous
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'center' as const, fontFamily: 'DM Mono, monospace', color: isHighlighted ? row.color : 'var(--text-dim)', fontWeight: isHighlighted ? 700 : 400 }}>
                  {row.score === 3 ? '0-4' : row.score}
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'center' as const, fontFamily: 'DM Mono, monospace', color: gender === 'M' ? (isHighlighted ? row.color : 'var(--text)') : 'var(--text-dim)', fontWeight: gender === 'M' && isHighlighted ? 700 : 400 }}>
                  {row.hDisplay}
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'center' as const, fontFamily: 'DM Mono, monospace', color: gender === 'F' ? (isHighlighted ? row.color : 'var(--text)') : 'var(--text-dim)', fontWeight: gender === 'F' && isHighlighted ? 700 : 400 }}>
                  {row.fDisplay}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── TestScoreDisplay ─────────────────────────────────────────────────────────
export function TestScoreDisplay({ result, accentColor }: { result: TestScoreResult; accentColor: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 13,
      background: result.level.color + '0d',
      border: `1px solid ${result.level.color}33`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: result.subScores?.length ? 10 : 0 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 5 }}>
            Score calculé
          </div>
          <ScoreBadge score={result.overall} level={result.level} size="lg" />
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2 }}>Percentile</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: result.level.color, fontWeight: 700 }}>
            {result.level.label === 'Alien' ? '>99%' :
             result.level.label === 'Élite' ? 'Top 1%' :
             result.level.label === 'AHN' ? 'Top 5%' :
             result.level.label === 'TBA' ? 'Top 15%' :
             result.level.label === 'BA' ? 'Top 30%' :
             result.level.label === 'Amateur' ? 'Top 50%' : 'Débutant'}
          </div>
        </div>
      </div>

      {result.subScores && result.subScores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {result.subScores.map(sub => (
            <div key={sub.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 8, background: 'var(--bg-card2)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 500 }}>{sub.label}</span>
              <ScoreBadge score={sub.score} level={sub.level} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── useAthleteGender (loads from Supabase) ───────────────────────────────────
// Exported for use in TestProtocolPanel
export { parseMmSs, fmtSec }
