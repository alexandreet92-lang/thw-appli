export type RaceLevel = 'secondary' | 'important' | 'main' | 'gty'
export type RaceSport = 'run' | 'bike' | 'swim' | 'hyrox' | 'triathlon' | 'rowing'

export interface Race {
  id: string; name: string; sport: RaceSport; date: string; level: RaceLevel
  goal?: string; status?: 'upcoming' | 'completed'
  distance?: string; goalTime?: string; notes?: string
  performanceData?: Record<string, unknown>
  nutritionStrategy?: NutritionItem[]
  // Legacy fields kept for existing code
  runDistance?: string; triDistance?: string
  validated?: boolean; validationData?: Record<string, unknown>
}

export interface RaceStage {
  id: string; name: string
  startDate: string; endDate: string
  description?: string
  dailyProgram: { date: string; content: string }[]
}

export interface NutritionItem {
  id: string; name: string; type: string; glucidesG: number; timeMin: number
}

export const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]
export const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const DAY_NAMES   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']

export const RACE_CFG: Record<RaceLevel, { label: string; color: string; bg: string; border: string }> = {
  secondary: { label:'Secondaire', color:'#22c55e', bg:'rgba(34,197,94,0.14)',  border:'#22c55e' },
  important: { label:'Important',  color:'#f97316', bg:'rgba(249,115,22,0.14)', border:'#f97316' },
  main:      { label:'Principal',  color:'#ef4444', bg:'rgba(239,68,68,0.14)',  border:'#ef4444' },
  gty:       { label:'GTY',        color:'#fff',    bg:'#111827',               border:'#374151' },
}

export const SPORT_LABEL: Record<RaceSport, string> = {
  run:'Course à pied', bike:'Cyclisme', swim:'Natation',
  hyrox:'Hyrox', triathlon:'Triathlon', rowing:'Aviron',
}
export const SPORT_COLOR: Record<RaceSport, string> = {
  run:'#22c55e', bike:'#3b82f6', swim:'#38bdf8',
  hyrox:'#ef4444', triathlon:'#a855f7', rowing:'#14b8a6',
}
export const SPORT_BG: Record<RaceSport, string> = {
  run:'rgba(34,197,94,0.12)', bike:'rgba(59,130,246,0.12)', swim:'rgba(56,189,248,0.12)',
  hyrox:'rgba(239,68,68,0.12)', triathlon:'rgba(168,85,247,0.12)', rowing:'rgba(20,184,166,0.12)',
}

export function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
export function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
export function getFirstDayISO(y: number, m: number) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 7 : d // 1=Mon…7=Sun
}
export function parseTimeSec(t: string): number {
  const p = t.trim().split(':').map(Number)
  if (p.length === 3) return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0)
  if (p.length === 2) return (p[0]||0)*60 + (p[1]||0)
  return 0
}
export function fmtMinSec(s: number): string {
  if (!s || !isFinite(s)) return '—'
  return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`
}
