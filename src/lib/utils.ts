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
// Durée « Xh YY » — toujours heures + minutes, zéro décimale (0h30, 1h40, 3h00, 0h00).
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  return `${h}h${String(m % 60).padStart(2, '0')}`
}

/** Variante prenant des heures (1.5 → 1h30). */
export function formatHours(hours: number): string {
  return formatDuration(hours * 60)
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

/**
 * Sanitize a filename for Supabase Storage paths.
 * Removes accents, replaces spaces and special chars with underscores.
 * Returns the safe name to use in the storage path (keep original for display).
 */
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')             // strip all combining marks (accents)
    .replace(/[^a-zA-Z0-9.\-_]/g, '_') // spaces & special chars → _
    .replace(/_+/g, '_')                // collapse consecutive underscores
}
