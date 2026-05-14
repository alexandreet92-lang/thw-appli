'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

// ─── Levels ──────────────────────────────────────────────────────────────────
const LEVELS = [
  { label: 'Alien', score: 10, color: '#00FF87', pct: '>99%'   },
  { label: 'Élite', score: 9,  color: '#00C8E0', pct: 'Top 1%' },
  { label: 'AHN',   score: 8,  color: '#5B6FFF', pct: 'Top 5%' },
  { label: 'TBA',   score: 7,  color: '#FFD700', pct: 'Top 15%'},
  { label: 'BA',    score: 6,  color: '#FF9500', pct: 'Top 30%'},
  { label: 'Ama',   score: 5,  color: '#D1D5DB', pct: 'Top 50%'},
] as const
type LevelEntry = typeof LEVELS[number]

// 7-level table (adds Débutant below Amateur) — used in BenchmarkModal
const BENCH_LEVELS = [
  { label: 'Alien',    score: '10',  color: '#00FF87' },
  { label: 'Élite',   score: '9',   color: '#00C8E0' },
  { label: 'AHN',     score: '8',   color: '#5B6FFF' },
  { label: 'TBA',     score: '7',   color: '#FFD700' },
  { label: 'BA',      score: '6',   color: '#FF9500' },
  { label: 'Amateur', score: '5',   color: '#D1D5DB' },
  { label: 'Débutant',score: '0–4', color: '#EF4444' },
] as const

// Score where higher raw value = better (0–10)
function scoreH(v: number, b: readonly [number,number,number,number,number,number]): number {
  if (!v || v <= 0) return 0
  const [a, e, ahn, tba, ba, am] = b
  if (v >= a)   return 10
  if (v >= e)   return 9 + (v - e)   / (a   - e)
  if (v >= ahn) return 8 + (v - ahn) / (e   - ahn)
  if (v >= tba) return 7 + (v - tba) / (ahn - tba)
  if (v >= ba)  return 6 + (v - ba)  / (tba - ba)
  if (v >= am)  return 5 + (v - am)  / (ba  - am)
  return Math.max(0, 5 * v / am)
}

// Score where lower raw value = better (0–10)
function scoreL(v: number, b: readonly [number,number,number,number,number,number]): number {
  if (!v || v <= 0) return 0
  const [a, e, ahn, tba, ba, am] = b
  if (v <= a)   return 10
  if (v <= e)   return 9 + (e   - v) / (e   - a)
  if (v <= ahn) return 8 + (ahn - v) / (ahn - e)
  if (v <= tba) return 7 + (tba - v) / (tba - ahn)
  if (v <= ba)  return 6 + (ba  - v) / (ba  - tba)
  if (v <= am)  return 5 + (am  - v) / (am  - ba)
  return Math.max(0, 5 * am / v)
}

function levelOf(s: number): LevelEntry {
  return LEVELS.find(l => s >= l.score) ?? LEVELS[LEVELS.length - 1]
}

function avgScore(scores: number[]): number {
  const valid = scores.filter(s => s > 0)
  if (!valid.length) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

// ─── Axis types ───────────────────────────────────────────────────────────────
interface AxisDef {
  key: string
  label: string
  unit: string
  description: string
  benchH: readonly [number,number,number,number,number,number]
  benchF: readonly [number,number,number,number,number,number]
  lowerBetter: boolean
  inputLabel?: string
  placeholder?: string
}

interface AxisData {
  key: string
  label: string
  unit: string
  description: string
  score: number
  rawValue: number
}

// ─── Benchmark definitions ────────────────────────────────────────────────────

// CYCLING (H / F)
// Order = radar position: [0]=top, [1]=upper-right, [2]=lower-right, [3]=lower-left, [4]=upper-left
const CYCLING_AXES: AxisDef[] = [
  {
    key: 'ftp_wkg',
    label: 'Puissance (W/kg)',
    unit: 'W/kg',
    description: 'Puissance seuil fonctionnel (FTP) normalisée au poids corporel',
    benchH: [6.5, 5.5, 4.7, 4.0, 3.5, 3.0],
    benchF: [5.5, 4.8, 4.2, 3.6, 3.0, 2.5],
    lowerBetter: false,
    inputLabel: 'FTP (W/kg)',
    placeholder: 'ex: 3.8',
  },
  {
    key: 'end4h_wkg',
    label: 'Endurance',
    unit: 'W/kg',
    description: 'Puissance normalisée tenue sur 3–4 heures — capacité aérobie longue',
    benchH: [4.5, 4.0, 3.5, 3.0, 2.5, 2.0],
    benchF: [3.8, 3.4, 3.0, 2.7, 2.2, 1.8],
    lowerBetter: false,
    inputLabel: 'Endurance longue (W/kg)',
    placeholder: 'ex: 2.8',
  },
  {
    key: 'sprint5s_wkg',
    label: 'Résistance Z4',
    unit: 'W/kg',
    description: 'Puissance soutenue en zone 4 — résistance à l\'effort intense prolongé',
    benchH: [20, 18, 16, 14, 12, 10],
    benchF: [17, 15, 13, 11, 9, 8],
    lowerBetter: false,
    inputLabel: 'Résistance Z4 (W/kg)',
    placeholder: 'ex: 12.5',
  },
  {
    key: 'exp30s_wkg',
    label: 'Grimpeur',
    unit: 'W/kg',
    description: 'Puissance normalisée en montée — ratio puissance/poids sur effort grimpant',
    benchH: [14, 12, 10, 9, 8, 6.5],
    benchF: [12, 10, 8.5, 7.5, 6.5, 5.5],
    lowerBetter: false,
    inputLabel: 'Grimpeur (W/kg)',
    placeholder: 'ex: 9.0',
  },
  {
    key: 'pma_wkg',
    label: 'Sprint / PMA',
    unit: 'W/kg',
    description: 'Puissance maximale aérobie / sprint — pic VO2max et capacité explosive',
    benchH: [8.0, 7.0, 6.2, 5.5, 4.8, 4.0],
    benchF: [7.0, 6.2, 5.5, 4.8, 4.2, 3.5],
    lowerBetter: false,
    inputLabel: 'PMA / Sprint (W/kg)',
    placeholder: 'ex: 5.2',
  },
]

// RUNNING (H / F)
// Order: [0]=top, [1]=upper-right, [2]=lower-right, [3]=lower-left, [4]=upper-left
const RUNNING_AXES: AxisDef[] = [
  {
    key: 'vma',
    label: 'VMA',
    unit: 'km/h',
    description: 'Vitesse Maximale Aérobie — vitesse au VO2max',
    benchH: [24, 21, 18, 16, 14, 11],
    benchF: [21, 18.5, 16, 14, 12, 9],
    lowerBetter: false,
    inputLabel: 'VMA (km/h)',
    placeholder: 'ex: 17.0',
  },
  {
    key: 'eco_fc150',
    label: 'Économie de course',
    unit: 's/km',
    description: 'Allure de course à FC 150 bpm — efficience et économie d\'oxygène',
    benchH: [200, 225, 250, 280, 320, 380],
    benchF: [225, 250, 280, 310, 350, 420],
    lowerBetter: true,
    inputLabel: 'Allure à FC150 (s/km)',
    placeholder: 'ex: 260 (= 4:20/km)',
  },
  {
    key: 'pace_10k',
    label: '10km',
    unit: 's',
    description: 'Temps total sur 10 km — vitesse seuil lactique en compétition',
    benchH: [1620, 1800, 2040, 2280, 2640, 3300],
    benchF: [1800, 2040, 2280, 2580, 3000, 3720],
    lowerBetter: true,
    inputLabel: 'Temps 10km (secondes)',
    placeholder: 'ex: 2400 (= 40:00)',
  },
  {
    key: 'end_marathon_pct',
    label: 'Endurance marathon',
    unit: '%',
    description: 'Pourcentage de VMA maintenu sur marathon — endurance aérobie fondamentale',
    benchH: [85, 80, 74, 68, 61, 52],
    benchF: [85, 80, 74, 68, 61, 52],
    lowerBetter: false,
    inputLabel: 'Endurance marathon (% VMA)',
    placeholder: 'ex: 72',
  },
  {
    key: 'recup_fc',
    label: 'Récupération FC',
    unit: 'bpm',
    description: 'Chute de fréquence cardiaque en 1 minute après effort maximal',
    benchH: [40, 35, 30, 25, 20, 14],
    benchF: [38, 33, 28, 23, 18, 12],
    lowerBetter: false,
    inputLabel: 'Récupération FC (bpm en 1min)',
    placeholder: 'ex: 28',
  },
]

// HYROX — 5-axis overview (H / F solo open)
// Order: [0]=top, [1]=upper-right, [2]=lower-right, [3]=lower-left, [4]=upper-left
const HYROX_MAIN_AXES: AxisDef[] = [
  {
    key: 'run_compromised',
    label: 'Run compromised',
    unit: 's',
    description: 'Run total compromis (8 × 1km intercalés) — capacité à courir sous fatigue',
    benchH: [1680, 1920, 2160, 2400, 2760, 3120],
    benchF: [1920, 2220, 2520, 2880, 3300, 3840],
    lowerBetter: true,
    inputLabel: 'Run total (secondes)',
    placeholder: 'ex: 2400 (= 40:00)',
  },
  {
    key: 'force_sleds',
    label: 'Force (Sleds)',
    unit: 's',
    description: 'Sled Push 50m PRO — force explosive des membres inférieurs sous charge lourde',
    benchH: [150, 180, 225, 270, 330, 420],
    benchF: [165, 195, 240, 290, 345, 450],
    lowerBetter: true,
    inputLabel: 'Sled Push 50m (secondes)',
    placeholder: 'ex: 240 (= 4:00)',
  },
  {
    key: 'endurance_wod',
    label: 'Endurance fonctionnelle',
    unit: 's',
    description: 'Farmers Carry 200m PRO — endurance fonctionnelle et force de préhension',
    benchH: [90, 105, 130, 165, 210, 270],
    benchF: [110, 125, 155, 190, 240, 300],
    lowerBetter: true,
    inputLabel: 'Farmers Carry 200m (secondes)',
    placeholder: 'ex: 150',
  },
  {
    key: 'explosivite_bbj',
    label: 'Explosivité (BBJ)',
    unit: 's',
    description: 'Burpee Broad Jump 80m — explosivité + capacité cardio en condition de course',
    benchH: [105, 125, 150, 180, 220, 270],
    benchF: [120, 142, 168, 200, 245, 310],
    lowerBetter: true,
    inputLabel: 'Burpee BBJ 80m (secondes)',
    placeholder: 'ex: 150',
  },
  {
    key: 'cardio_skierg_row',
    label: 'Cardio (SkiErg+Row)',
    unit: 's',
    description: 'SkiErg 1000m — cardio haut du corps, représentatif du cardio global Hyrox',
    benchH: [180, 200, 225, 255, 290, 345],
    benchF: [210, 235, 260, 290, 330, 390],
    lowerBetter: true,
    inputLabel: 'SkiErg 1000m (secondes)',
    placeholder: 'ex: 220',
  },
]

// HYROX — 9-station detail axes
const HYROX_STATION_AXES: AxisDef[] = [
  {
    key: 'skierg',
    label: 'SkiErg',
    unit: 's',
    description: 'SkiErg 1000m',
    benchH: [180, 210, 245, 280, 320, 380],
    benchF: [200, 235, 275, 315, 360, 430],
    lowerBetter: true,
    inputLabel: 'SkiErg 1000m (s)',
    placeholder: 'ex: 250',
  },
  {
    key: 'sled_push',
    label: 'Sled Push',
    unit: 's',
    description: 'Sled Push — poussée de traîneau',
    benchH: [85, 105, 130, 160, 195, 245],
    benchF: [95, 120, 150, 185, 225, 280],
    lowerBetter: true,
    inputLabel: 'Sled Push (s)',
    placeholder: 'ex: 150',
  },
  {
    key: 'sled_pull',
    label: 'Sled Pull',
    unit: 's',
    description: 'Sled Pull — tirage de traîneau',
    benchH: [95, 115, 145, 180, 220, 275],
    benchF: [110, 135, 168, 208, 255, 315],
    lowerBetter: true,
    inputLabel: 'Sled Pull (s)',
    placeholder: 'ex: 160',
  },
  {
    key: 'burpee_bj',
    label: 'Burpee BJ',
    unit: 's',
    description: 'Burpee Broad Jump 80m — explosivité + cardio',
    benchH: [72, 88, 108, 132, 162, 200],
    benchF: [82, 100, 124, 152, 186, 230],
    lowerBetter: true,
    inputLabel: 'Burpee BJ 80m (s)',
    placeholder: 'ex: 120',
  },
  {
    key: 'row_erg',
    label: 'Row Erg',
    unit: 's',
    description: 'Rowing Ergomètre 1000m — puissance aérobie dos/jambes',
    benchH: [180, 210, 248, 290, 335, 395],
    benchF: [205, 240, 283, 330, 382, 450],
    lowerBetter: true,
    inputLabel: 'Row Erg 1000m (s)',
    placeholder: 'ex: 260',
  },
  {
    key: 'farmers',
    label: 'Farmers',
    unit: 's',
    description: 'Farmers Carry 200m — force de préhension + stabilité',
    benchH: [55, 70, 88, 110, 138, 175],
    benchF: [62, 80, 100, 125, 157, 200],
    lowerBetter: true,
    inputLabel: 'Farmers Carry 200m (s)',
    placeholder: 'ex: 100',
  },
  {
    key: 'sandbag',
    label: 'Sandbag',
    unit: 's',
    description: 'Sandbag Lunges 100m — force des jambes + portage',
    benchH: [85, 108, 135, 165, 200, 248],
    benchF: [98, 124, 155, 190, 230, 285],
    lowerBetter: true,
    inputLabel: 'Sandbag Lunges 100m (s)',
    placeholder: 'ex: 150',
  },
  {
    key: 'wall_ball',
    label: 'Wall Ball',
    unit: 's',
    description: 'Wall Ball 100 reps — puissance + coordination + endurance',
    benchH: [130, 160, 195, 235, 280, 340],
    benchF: [150, 185, 225, 270, 320, 390],
    lowerBetter: true,
    inputLabel: 'Wall Ball 100 (s)',
    placeholder: 'ex: 200',
  },
  {
    key: 'run_1km_avg',
    label: 'Run 1km',
    unit: 's',
    description: 'Allure moyenne des runs intercalés (1 km × 8)',
    benchH: [195, 220, 252, 285, 322, 372],
    benchF: [222, 252, 288, 326, 368, 426],
    lowerBetter: true,
    inputLabel: 'Run 1km moyen (s)',
    placeholder: 'ex: 280',
  },
]

// TRIATHLON — benchmarks par format (H / F)
type TriFormat = 'M' | '703' | 'full'

const TRIATHLON_AXES: Record<TriFormat, AxisDef[]> = {
  M: [
    {
      key: 'swim_pace_M',
      label: 'Natation',
      unit: 's/100m',
      description: 'Allure natation Triathlon M (750m) — efficience technique + VO2 eau',
      benchH: [68, 76, 86, 98, 114, 134],
      benchF: [74, 83, 95, 108, 126, 148],
      lowerBetter: true,
      inputLabel: 'Allure natation (s/100m)',
      placeholder: 'ex: 95',
    },
    {
      key: 'bike_wkg_M',
      label: 'Vélo',
      unit: 'W/kg',
      description: 'Puissance normalisée sur le segment vélo Triathlon M (20 km)',
      benchH: [4.6, 4.1, 3.6, 3.2, 2.8, 2.4],
      benchF: [3.9, 3.5, 3.1, 2.7, 2.3, 2.0],
      lowerBetter: false,
      inputLabel: 'Puissance vélo (W/kg)',
      placeholder: 'ex: 3.2',
    },
    {
      key: 'run_pace_M',
      label: 'Course',
      unit: 's/km',
      description: 'Allure de course Triathlon M (5 km) — capacité à runner compromis',
      benchH: [204, 228, 258, 291, 330, 384],
      benchF: [228, 258, 291, 330, 375, 432],
      lowerBetter: true,
      inputLabel: 'Allure course (s/km)',
      placeholder: 'ex: 270',
    },
    {
      key: 'transitions_M',
      label: 'Transitions',
      unit: 's',
      description: 'Temps T1+T2 cumulé — efficience changement de discipline',
      benchH: [42, 52, 66, 84, 108, 142],
      benchF: [45, 56, 72, 92, 118, 154],
      lowerBetter: true,
      inputLabel: 'T1+T2 total (s)',
      placeholder: 'ex: 80',
    },
  ],
  '703': [
    {
      key: 'swim_pace_703',
      label: 'Natation',
      unit: 's/100m',
      description: 'Allure natation 70.3 (1900m) — endurance aérobie en eau',
      benchH: [72, 80, 90, 103, 118, 138],
      benchF: [80, 90, 102, 116, 132, 155],
      lowerBetter: true,
      inputLabel: 'Allure natation (s/100m)',
      placeholder: 'ex: 100',
    },
    {
      key: 'bike_wkg_703',
      label: 'Vélo',
      unit: 'W/kg',
      description: 'Puissance normalisée sur le segment vélo 70.3 (90 km)',
      benchH: [4.2, 3.8, 3.4, 3.0, 2.6, 2.2],
      benchF: [3.6, 3.2, 2.9, 2.5, 2.2, 1.9],
      lowerBetter: false,
      inputLabel: 'Puissance vélo (W/kg)',
      placeholder: 'ex: 3.0',
    },
    {
      key: 'run_pace_703',
      label: 'Course',
      unit: 's/km',
      description: 'Allure semi-marathon 70.3 (21 km) — endurance spécifique triathlon',
      benchH: [216, 244, 276, 312, 354, 414],
      benchF: [244, 276, 312, 354, 402, 468],
      lowerBetter: true,
      inputLabel: 'Allure course (s/km)',
      placeholder: 'ex: 300',
    },
    {
      key: 'transitions_703',
      label: 'Transitions',
      unit: 's',
      description: 'Temps T1+T2 cumulé 70.3',
      benchH: [52, 65, 82, 104, 132, 170],
      benchF: [58, 72, 92, 116, 148, 190],
      lowerBetter: true,
      inputLabel: 'T1+T2 total (s)',
      placeholder: 'ex: 100',
    },
  ],
  full: [
    {
      key: 'swim_pace_full',
      label: 'Natation',
      unit: 's/100m',
      description: 'Allure natation Ironman (3800m) — economie de nage et aérobie',
      benchH: [76, 85, 96, 110, 126, 148],
      benchF: [85, 96, 108, 123, 140, 165],
      lowerBetter: true,
      inputLabel: 'Allure natation (s/100m)',
      placeholder: 'ex: 105',
    },
    {
      key: 'bike_wkg_full',
      label: 'Vélo',
      unit: 'W/kg',
      description: 'Puissance normalisée Ironman (180 km) — gestion énergétique longue durée',
      benchH: [3.8, 3.4, 3.0, 2.7, 2.3, 1.9],
      benchF: [3.2, 2.9, 2.5, 2.2, 1.9, 1.6],
      lowerBetter: false,
      inputLabel: 'Puissance vélo (W/kg)',
      placeholder: 'ex: 2.7',
    },
    {
      key: 'run_pace_full',
      label: 'Course',
      unit: 's/km',
      description: 'Allure marathon Ironman (42 km) — endurance extrême',
      benchH: [240, 274, 312, 354, 402, 468],
      benchF: [274, 312, 354, 402, 456, 528],
      lowerBetter: true,
      inputLabel: 'Allure course (s/km)',
      placeholder: 'ex: 330',
    },
    {
      key: 'transitions_full',
      label: 'Transitions',
      unit: 's',
      description: 'Temps T1+T2 cumulé Ironman',
      benchH: [62, 78, 98, 124, 158, 200],
      benchF: [68, 86, 108, 136, 174, 220],
      lowerBetter: true,
      inputLabel: 'T1+T2 total (s)',
      placeholder: 'ex: 120',
    },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function computeAxisData(def: AxisDef, rawValue: number, gender: 'M' | 'F'): AxisData {
  const bench = gender === 'M' ? def.benchH : def.benchF
  const score = rawValue > 0
    ? (def.lowerBetter ? scoreL(rawValue, bench) : scoreH(rawValue, bench))
    : 0
  return {
    key: def.key,
    label: def.label,
    unit: def.unit,
    description: def.description,
    score,
    rawValue,
  }
}

// Format raw value for display (auto-detect time if unit contains 's')
function formatRaw(value: number, unit: string): string {
  if (value <= 0) return '—'
  if (unit === 's/km') {
    const m = Math.floor(value / 60)
    const s = Math.round(value % 60)
    return `${m}:${String(s).padStart(2, '0')}/km`
  }
  if (unit === 's/100m') {
    const m = Math.floor(value / 60)
    const s = Math.round(value % 60)
    return `${m}:${String(s).padStart(2, '0')}/100m`
  }
  if (unit === 's') {
    const h = Math.floor(value / 3600)
    const m = Math.floor((value % 3600) / 60)
    const s = Math.round(value % 60)
    if (h > 0) return `${h}h${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}`
    return `${m}'${String(s).padStart(2,'0')}`
  }
  return `${value % 1 === 0 ? value : value.toFixed(2)} ${unit}`
}

// ─── RadarSVG ─────────────────────────────────────────────────────────────────
const SVG_W = 300, SVG_H = 260, CX = 150, CY = 128, MAX_R = 92

function polarPts(scores: number[], r = MAX_R): string {
  const n = scores.length
  return scores.map((s, i) => {
    const angle = (i * 2 * Math.PI / n) - Math.PI / 2
    const rad = (Math.max(0, Math.min(10, s)) / 10) * r
    return `${CX + rad * Math.cos(angle)},${CY + rad * Math.sin(angle)}`
  }).join(' ')
}

interface TooltipState {
  axis: AxisData
  x: number
  y: number
}

interface RadarSVGProps {
  axes: AxisData[]
  sportColor: string
  onHover: (state: TooltipState | null) => void
}

function RadarSVG({ axes, sportColor, onHover }: RadarSVGProps) {
  const n = axes.length
  if (n < 3) return null
  const scores = axes.map(a => a.score)
  const ringLevels = [5, 6, 7, 8, 9, 10]

  return (
    <svg
      width={SVG_W} height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ overflow: 'visible', display: 'block', margin: '0 auto', maxWidth: '100%' }}
    >
      {/* Axis lines from center */}
      {axes.map((_, i) => {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        return (
          <line key={i}
            x1={CX} y1={CY}
            x2={CX + MAX_R * Math.cos(angle)}
            y2={CY + MAX_R * Math.sin(angle)}
            stroke="rgba(255,255,255,0.08)" strokeWidth={1}
          />
        )
      })}

      {/* Level rings (dashed) */}
      {ringLevels.map(lv => {
        const lvEntry = LEVELS.find(l => l.score === lv)
        const arr = Array(n).fill(lv) as number[]
        return (
          <polygon key={lv}
            points={polarPts(arr)}
            fill="none"
            stroke={lvEntry?.color ?? '#fff'}
            strokeOpacity={lv === 10 ? 0.4 : 0.18}
            strokeWidth={lv === 10 ? 1 : 0.75}
            strokeDasharray={lv === 10 ? undefined : '3 4'}
          />
        )
      })}

      {/* Athlete polygon */}
      <polygon
        points={polarPts(scores)}
        fill={sportColor}
        fillOpacity={0.2}
        stroke={sportColor}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {axes.map((axis, i) => {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        const s = Math.max(0, Math.min(10, axis.score))
        const rad = (s / 10) * MAX_R
        const x = CX + rad * Math.cos(angle)
        const y = CY + rad * Math.sin(angle)
        return (
          <circle key={i} cx={x} cy={y} r={s > 0 ? 4.5 : 3}
            fill={s > 0 ? sportColor : 'rgba(255,255,255,0.15)'}
            stroke={s > 0 ? '#fff' : 'rgba(255,255,255,0.3)'}
            strokeWidth={1.5}
            style={{ cursor: 'pointer' }}
            onMouseEnter={e => onHover({ axis, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => onHover(null)}
          />
        )
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2
        const lr = MAX_R + 20
        const x = CX + lr * Math.cos(angle)
        const y = CY + lr * Math.sin(angle)
        const anchor = Math.abs(Math.cos(angle)) < 0.12
          ? 'middle'
          : Math.cos(angle) < 0 ? 'end' : 'start'
        const dy = Math.sin(angle) < -0.5 ? -2 : Math.sin(angle) > 0.5 ? 12 : 5
        return (
          <text key={i} x={x} y={y + dy}
            textAnchor={anchor}
            fontSize={10} fontFamily="DM Sans, sans-serif" fontWeight={600}
            fill={axis.score > 0 ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.32)'}
          >
            {axis.label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function RadarTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { axis, x, y } = tooltip
  const lv = levelOf(axis.score)
  return createPortal(
    <div style={{
      position: 'fixed',
      left: x + 14,
      top: y - 8,
      zIndex: 9999,
      background: '#1A1F2E',
      border: `1px solid ${lv.color}44`,
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 180,
      pointerEvents: 'none',
      boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${lv.color}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 13, color: '#fff' }}>
          {axis.label}
        </span>
        {axis.score > 0 && (
          <span style={{
            background: lv.color + '22',
            color: lv.color,
            border: `1px solid ${lv.color}55`,
            borderRadius: 6,
            padding: '1px 7px',
            fontSize: 10,
            fontWeight: 700,
          }}>
            {lv.label}
          </span>
        )}
      </div>
      {axis.score > 0 && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
          Valeur : <strong style={{ color: '#fff' }}>{formatRaw(axis.rawValue, axis.unit)}</strong>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
        {axis.description}
      </div>
      {axis.score === 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontStyle: 'italic' }}>
          Non renseigné — cliquez Mettre à jour
        </div>
      )}
    </div>,
    document.body
  )
}

// ─── UpdateModal ──────────────────────────────────────────────────────────────
interface UpdateModalProps {
  sport: string
  title: string
  axisDefs: AxisDef[]
  gender: 'M' | 'F'
  currentValues: Record<string, number>
  onClose: () => void
  onSaved: (values: Record<string, number>) => void
}

function UpdateModal({ sport, title, axisDefs, gender, currentValues, onClose, onSaved }: UpdateModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    axisDefs.forEach(d => {
      const v = currentValues[d.key]
      init[d.key] = v && v > 0 ? String(v) : ''
    })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const rows = axisDefs
        .map(d => ({ user_id: user.id, sport, axis: d.key, raw_value: parseFloat(draft[d.key] ?? '') || 0 }))
        .filter(r => r.raw_value > 0)

      if (rows.length > 0) {
        const { error: dbErr } = await supabase.from('performance_scores').upsert(rows, { onConflict: 'user_id,sport,axis' })
        if (dbErr) throw dbErr
      }

      const newValues: Record<string, number> = {}
      axisDefs.forEach(d => {
        newValues[d.key] = parseFloat(draft[d.key] ?? '') || 0
      })
      onSaved(newValues)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%',
        maxWidth: 520,
        margin: '0 auto',
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              Genre sélectionné : {gender === 'M' ? 'Homme' : 'Femme'} — les benchmarks s&apos;adaptent
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 22, cursor: 'pointer', padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {axisDefs.map(def => (
            <div key={def.key}>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 5, fontWeight: 600 }}>
                {def.inputLabel ?? def.label}
              </label>
              <input
                type="number"
                step="any"
                value={draft[def.key] ?? ''}
                placeholder={def.placeholder ?? ''}
                onChange={e => setDraft(prev => ({ ...prev, [def.key]: e.target.value }))}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--bg-card2, var(--bg))', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '9px 12px',
                  color: 'var(--text)', fontSize: 14,
                  fontFamily: 'DM Mono, monospace',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                {def.description}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#f87171', background: '#2a1515', borderRadius: 8, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', border: 'none',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2, padding: '12px', borderRadius: 10,
              background: saving ? 'rgba(91,111,255,0.4)' : '#5B6FFF',
              border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── BenchmarkModal ───────────────────────────────────────────────────────────

/** Format the value range for a given axis + level index + gender */
function formatBenchRange(def: AxisDef, lvIdx: number, gender: 'M' | 'F'): string {
  const bench = gender === 'M' ? def.benchH : def.benchF
  const [a, e, ahn, tba, ba, am] = bench
  const v = [a, e, ahn, tba, ba, am]

  function fv(n: number): string {
    if (def.unit === 's/km') {
      const m = Math.floor(n / 60), s = Math.round(n % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }
    if (def.unit === 's/100m') {
      const m = Math.floor(n / 60), s = Math.round(n % 60)
      return `${m}:${String(s).padStart(2, '0')}`
    }
    if (def.unit === 's') {
      const h = Math.floor(n / 3600)
      const m = Math.floor((n % 3600) / 60)
      const s = Math.round(n % 60)
      if (h > 0) return `${h}h${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}`
      return `${m}'${String(s).padStart(2, '0')}`
    }
    if (def.unit === '%') return `${n}%`
    return n % 1 === 0 ? String(n) : n.toFixed(1)
  }

  if (!def.lowerBetter) {
    // Higher = better: threshold[0] = alien (highest)
    if (lvIdx === 0) return `≥${fv(v[0])}`
    if (lvIdx === 6) return `<${fv(v[5])}`
    return `${fv(v[lvIdx])}–${fv(v[lvIdx - 1])}`
  } else {
    // Lower = better: threshold[0] = alien (lowest)
    if (lvIdx === 0) return `<${fv(v[0])}`
    if (lvIdx === 6) return `>${fv(v[5])}`
    return `${fv(v[lvIdx - 1])}–${fv(v[lvIdx])}`
  }
}

/** Return the BENCH_LEVELS index (0=Alien … 6=Débutant) for an athlete's raw value on a given axis */
function getAthleteLevel(def: AxisDef, rawValue: number, gender: 'M' | 'F'): number {
  if (rawValue <= 0) return -1
  const bench = gender === 'M' ? def.benchH : def.benchF
  const score = def.lowerBetter ? scoreL(rawValue, bench) : scoreH(rawValue, bench)
  if (score >= 10) return 0
  if (score >= 9)  return 1
  if (score >= 8)  return 2
  if (score >= 7)  return 3
  if (score >= 6)  return 4
  if (score >= 5)  return 5
  if (score > 0)   return 6
  return -1
}

interface BenchmarkModalProps {
  title: string
  sportColor: string
  axisDefs: AxisDef[]
  rawValues: Record<string, number>
  onClose: () => void
}

function BenchmarkModal({ title, sportColor, axisDefs, rawValues, onClose }: BenchmarkModalProps) {
  const [g, setG] = useState<'M' | 'F'>('M')

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9100,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 680, margin: '0 auto',
        background: 'var(--bg-card)',
        borderRadius: '20px 20px 0 0',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              Barème — {title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Niveaux de référence par axe · cellules surlignées = votre niveau actuel
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Gender tabs */}
            <div style={{ display: 'flex', background: 'rgba(128,128,128,0.12)', borderRadius: 8, overflow: 'hidden' }}>
              {(['M', 'F'] as const).map(gi => (
                <button key={gi} onClick={() => setG(gi)} style={{
                  padding: '4px 12px',
                  background: g === gi ? sportColor : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: g === gi ? '#fff' : 'var(--text-dim)',
                  fontSize: 11, fontWeight: 700,
                  transition: 'background 0.15s',
                }}>
                  {gi}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--text-dim)',
              fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}>
              ×
            </button>
          </div>
        </div>

        {/* Scrollable table */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{
                  padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                  color: 'var(--text-dim)', fontSize: 10,
                  position: 'sticky', left: 0, top: 0,
                  background: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap', minWidth: 90, zIndex: 2,
                }}>
                  Niveau
                </th>
                {axisDefs.map(def => (
                  <th key={def.key} style={{
                    padding: '8px 10px', textAlign: 'center', fontWeight: 600,
                    color: 'var(--text-dim)', fontSize: 10,
                    position: 'sticky', top: 0,
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap', minWidth: 100,
                  }}>
                    <div style={{ fontWeight: 700 }}>{def.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.55, fontWeight: 400, marginTop: 1 }}>{def.unit}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BENCH_LEVELS.map((lv, lvIdx) => (
                <tr key={lv.label} style={{ borderBottom: '1px solid rgba(128,128,128,0.08)' }}>
                  {/* Level label cell */}
                  <td style={{
                    padding: '8px 12px',
                    position: 'sticky', left: 0,
                    background: 'var(--bg-card)',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: lv.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: lv.color, fontSize: 11 }}>{lv.label}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-dim)', opacity: 0.55 }}>{lv.score}</span>
                    </div>
                  </td>
                  {/* Value cells */}
                  {axisDefs.map(def => {
                    const athleteLvIdx = getAthleteLevel(def, rawValues[def.key] ?? 0, g)
                    const isMe = athleteLvIdx === lvIdx
                    return (
                      <td key={def.key} style={{
                        padding: '7px 10px', textAlign: 'center',
                        fontFamily: 'DM Mono, monospace',
                        fontSize: 10, whiteSpace: 'nowrap',
                        background: isMe ? `${lv.color}1A` : 'transparent',
                        borderLeft: isMe ? `2px solid ${lv.color}60` : '2px solid transparent',
                        borderRight: isMe ? `2px solid ${lv.color}60` : '2px solid transparent',
                        color: isMe ? lv.color : 'var(--text-mid)',
                        fontWeight: isMe ? 700 : 400,
                      }}>
                        {formatBenchRange(def, lvIdx, g)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── RadarCard ────────────────────────────────────────────────────────────────
interface RadarCardProps {
  dbSport: string
  title: string
  sportColor: string
  axisDefs: AxisDef[]
  defaultValues?: Record<string, number>
  extraControls?: React.ReactNode
  children?: React.ReactNode  // extra content below radar
}

function RadarCard({ dbSport, title, sportColor, axisDefs, defaultValues, extraControls, children }: RadarCardProps) {
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [rawValues, setRawValues] = useState<Record<string, number>>({})
  const [loaded, setLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Capture defaults once at mount — prevents infinite re-fetch if parent re-creates the object
  const defaultsRef = useRef<Record<string, number> | undefined>(defaultValues)

  const loadScores = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('performance_scores')
      .select('axis, raw_value')
      .eq('user_id', user.id)
      .eq('sport', dbSport)
    const fetched: Record<string, number> = {}
    if (data) {
      for (const row of data) {
        fetched[row.axis as string] = Number(row.raw_value)
      }
    }
    // Merge: DB overrides defaults
    setRawValues({ ...(defaultsRef.current ?? {}), ...fetched })
    setLoaded(true)
  }, [dbSport])

  useEffect(() => { void loadScores() }, [loadScores])

  const axes: AxisData[] = axisDefs.map(def =>
    computeAxisData(def, rawValues[def.key] ?? 0, gender)
  )

  const overall = avgScore(axes.map(a => a.score))
  const overallLevel = overall > 0 ? levelOf(overall) : null
  const hasData = axes.some(a => a.score > 0)

  function handleSaved(newValues: Record<string, number>) {
    setRawValues(prev => ({ ...prev, ...newValues }))
    setShowModal(false)
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: '16px 16px 12px',
      border: '1px solid var(--border)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {title}
          </span>
          {overallLevel && (
            <span style={{
              background: overallLevel.color + '22',
              color: overallLevel.color,
              border: `1px solid ${overallLevel.color}55`,
              borderRadius: 8,
              padding: '2px 9px',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'Syne,sans-serif',
            }}>
              {overallLevel.label} · {overall.toFixed(1)}
            </span>
          )}
          {!hasData && loaded && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              Aucune donnée
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {extraControls}
          {/* Gender toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
            {(['M', 'F'] as const).map(g => (
              <button key={g} onClick={() => setGender(g)} style={{
                padding: '4px 11px',
                background: gender === g ? sportColor : 'transparent',
                border: 'none', cursor: 'pointer',
                color: gender === g ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: 11, fontWeight: 700,
                transition: 'background 0.15s',
              }}>
                {g}
              </button>
            ))}
          </div>
          {/* Barème button */}
          <button
            onClick={() => setShowBenchmark(true)}
            style={{
              padding: '5px 12px',
              background: `${sportColor}18`,
              border: `1px solid ${sportColor}44`,
              borderRadius: 8,
              color: sportColor,
              fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Barème
          </button>
          {/* Update button */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '5px 12px',
              background: 'rgba(91,111,255,0.15)',
              border: '1px solid rgba(91,111,255,0.35)',
              borderRadius: 8,
              color: '#8b9aff',
              fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Mettre à jour
          </button>
        </div>
      </div>

      {/* SVG */}
      <RadarSVG axes={axes} sportColor={sportColor} onHover={setTooltip} />

      {/* Level legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 10px',
        justifyContent: 'center', marginTop: 10,
      }}>
        {LEVELS.map(lv => (
          <div key={lv.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: lv.color, opacity: 0.8 }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
              {lv.label} <span style={{ opacity: 0.55 }}>{lv.pct}</span>
            </span>
          </div>
        ))}
      </div>

      {children}

      {/* Tooltip */}
      {tooltip && <RadarTooltip tooltip={tooltip} />}

      {/* Edit modal */}
      {showModal && (
        <UpdateModal
          sport={dbSport}
          title={`Profil ${title}`}
          axisDefs={axisDefs}
          gender={gender}
          currentValues={rawValues}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Barème modal */}
      {showBenchmark && (
        <BenchmarkModal
          title={title}
          sportColor={sportColor}
          axisDefs={axisDefs}
          rawValues={rawValues}
          onClose={() => setShowBenchmark(false)}
        />
      )}
    </div>
  )
}

// ─── CyclingRadar ─────────────────────────────────────────────────────────────
interface ProfileHint {
  ftp?: number
  weight?: number
  vma?: number
  vo2max?: number
  thresholdPace?: string
}

export function CyclingRadar({ profile }: { profile?: ProfileHint }) {
  const defaults: Record<string, number> = {}
  if (profile?.ftp && profile?.weight && profile.weight > 0) {
    defaults['ftp_wkg'] = parseFloat((profile.ftp / profile.weight).toFixed(2))
  }

  return (
    <RadarCard
      dbSport="cycling"
      title="Profil Cyclisme"
      sportColor="#3b82f6"
      axisDefs={CYCLING_AXES}
      defaultValues={defaults}
    />
  )
}

// ─── RunningRadar ─────────────────────────────────────────────────────────────
function paceStringToSec(pace: string): number {
  if (!pace) return 0
  const parts = pace.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  return parts.length === 2 ? parts[0] * 60 + parts[1] : 0
}

export function RunningRadar({ profile }: { profile?: ProfileHint }) {
  const defaults: Record<string, number> = {}
  if (profile?.vma && profile.vma > 0) defaults['vma'] = profile.vma
  if (profile?.vo2max && profile.vo2max > 0) defaults['vo2max'] = profile.vo2max
  if (profile?.thresholdPace) {
    const sec = paceStringToSec(profile.thresholdPace)
    if (sec > 0) defaults['pace_10k'] = sec
  }

  return (
    <RadarCard
      dbSport="running"
      title="Profil Running"
      sportColor="#22c55e"
      axisDefs={RUNNING_AXES}
      defaultValues={defaults}
    />
  )
}

// ─── HyroxRadar ───────────────────────────────────────────────────────────────
export function HyroxRadar() {
  const [view, setView] = useState<'main' | 'stations'>('main')

  const toggle = (
    <button
      onClick={() => setView(v => v === 'main' ? 'stations' : 'main')}
      style={{
        padding: '4px 11px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        color: 'rgba(255,255,255,0.65)',
        fontSize: 11, fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {view === 'main' ? '9 stations →' : '← Vue globale'}
    </button>
  )

  if (view === 'stations') {
    return (
      <RadarCard
        dbSport="hyrox"
        title="Détail Stations Hyrox"
        sportColor="#ef4444"
        axisDefs={HYROX_STATION_AXES}
        extraControls={toggle}
      />
    )
  }

  return (
    <RadarCard
      dbSport="hyrox"
      title="Profil Hyrox"
      sportColor="#ef4444"
      axisDefs={HYROX_MAIN_AXES}
      extraControls={toggle}
    />
  )
}

// ─── TriathlonRadar ───────────────────────────────────────────────────────────
const TRI_FORMAT_LABELS: Record<TriFormat, string> = {
  M: 'M',
  '703': '70.3',
  full: 'Full',
}

export function TriathlonRadar({ profile }: { profile?: ProfileHint }) {
  const [format, setFormat] = useState<TriFormat>('703')

  const defaults: Record<string, number> = {}
  if (profile?.ftp && profile?.weight && profile.weight > 0) {
    const wkg = parseFloat((profile.ftp / profile.weight).toFixed(2))
    defaults[`bike_wkg_${format}`] = wkg
  }

  const formatSelector = (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
      {(Object.keys(TRI_FORMAT_LABELS) as TriFormat[]).map(f => (
        <button key={f} onClick={() => setFormat(f)} style={{
          padding: '4px 10px',
          background: format === f ? '#f59e0b' : 'transparent',
          border: 'none', cursor: 'pointer',
          color: format === f ? '#000' : 'rgba(255,255,255,0.45)',
          fontSize: 11, fontWeight: 700,
          transition: 'background 0.15s',
        }}>
          {TRI_FORMAT_LABELS[f]}
        </button>
      ))}
    </div>
  )

  return (
    <RadarCard
      dbSport={`triathlon_${format}`}
      title={`Profil Triathlon ${TRI_FORMAT_LABELS[format]}`}
      sportColor="#f59e0b"
      axisDefs={TRIATHLON_AXES[format]}
      defaultValues={defaults}
      extraControls={formatSelector}
    />
  )
}
