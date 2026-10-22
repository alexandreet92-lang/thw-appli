import type { RampInfo } from './types'

// Montée en puissance : un domaine d'envoi neuf qui envoie 200 emails dès le
// premier jour finit en spam. Plafond par semaine depuis le premier envoi ;
// l'objectif réglé par l'admin reste le maximum.
export const RAMP_CAPS = [20, 40, 70, 100, 150, 200] as const

export const TZ = 'Europe/Paris'
export const SITE_URL = process.env.PROSPECT_SITE_URL ?? 'https://www.the-hybridway.com'
export const TRACK_BASE = process.env.PROSPECT_TRACK_BASE ?? 'https://thw-appli.vercel.app'
export const LANDING_PATH = '/test-de-forme'

/** Date calendaire (AAAA-MM-JJ) dans le fuseau de Paris. */
export function parisDay(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function rampInfo(rampStart: string | null, target: number, now: Date = new Date()): RampInfo {
  const weeks = RAMP_CAPS.length
  let week = 1
  if (rampStart) {
    const start = new Date(`${rampStart}T00:00:00Z`).getTime()
    const today = new Date(`${parisDay(now)}T00:00:00Z`).getTime()
    week = Math.max(1, Math.floor((today - start) / (7 * 86_400_000)) + 1)
  }
  const cap = RAMP_CAPS[Math.min(week, weeks) - 1]
  return { week: Math.min(week, weeks), weeks, cap, limit: Math.min(target, cap) }
}
