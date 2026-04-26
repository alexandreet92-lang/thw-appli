import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Sport } from './types/index'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const SPORT_EMOJI: Record<Sport, string> = {
  running:   '🏃',
  cycling:   '🚴',
  swim:      '🏊',
  triathlon: '🏅',
  hyrox:     '🏋️',
  rowing:    '🚣',
  gym:       '💪',
}

export const SPORT_LABEL: Record<Sport, string> = {
  running:   'Running',
  cycling:   'Vélo',
  swim:      'Natation',
  triathlon: 'Triathlon',
  hyrox:     'Hyrox',
  rowing:    'Rameur',
  gym:       'Musculation',
}

/**
 * Converts a duration in minutes to a human-readable "Xh YY" format.
 * Examples: 90 → "1h30"  |  45 → "45min"  |  400 → "6h40"  |  60 → "1h"
 */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes)
  if (m <= 0) return '0min'
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}min`
  if (rem === 0) return `${h}h`
  return `${h}h${String(rem).padStart(2, '0')}`
}

export function formatTime(date?: Date): string {
  const d = date ?? new Date()
  return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function getTSBColor(tsb: number): string {
  if (tsb > 5)   return 'text-brand'
  if (tsb > -10) return 'text-[#ffb340]'
  if (tsb > -25) return 'text-[#ff5f5f]'
  return 'text-red-600'
}

export function getReadinessLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Bonne forme'
  if (score >= 50) return 'Moyen'
  if (score >= 35) return 'Fatigué'
  return 'Repos conseillé'
}
