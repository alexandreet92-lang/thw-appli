// ══════════════════════════════════════════════════════════════════════════
// Digest proactif au coach (Brique 2).
// Réutilise le roster serveur pour produire une synthèse courte et actionnable :
// « X athlètes à surveiller cette semaine » (blessés, inactifs, fatigue) +
// courses proches. Envoyée via le canal de notif en place (cloche + push).
//   • hebdo (lundi) : toujours envoyée si le coach a des athlètes ;
//   • quotidien (option COACH_DIGEST_DAILY) : seulement s'il y a des priorités.
// ══════════════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RosterAthlete } from '@/lib/coach/roster'
import { getRosterForCoach } from '@/lib/coach/rosterServer'
import { notifyUser } from '@/lib/notifications/dispatch'

const RACE_WINDOW_DAYS = 14

// Formate une liste de noms : « Léa, Tom, Max +2 ».
function names(list: RosterAthlete[], max = 3): string {
  const shown = list.slice(0, max).map(a => a.name)
  const extra = list.length - shown.length
  return shown.join(', ') + (extra > 0 ? ` +${extra}` : '')
}

export interface CoachDigest {
  priorityCount: number
  title: string
  body: string
}

/** Construit le digest depuis un roster. Renvoie null si aucun athlète. */
export function buildCoachDigest(roster: RosterAthlete[], mode: 'weekly' | 'daily'): CoachDigest | null {
  if (roster.length === 0) return null

  const injured = roster.filter(a => a.status === 'injured')
  const inactive = roster.filter(a => a.status === 'inactive')
  const warn = roster.filter(a => a.status === 'warn')
  const priority = injured.length + inactive.length + warn.length

  const races = roster
    .filter(a => a.race && a.race.days <= RACE_WINDOW_DAYS)
    .sort((a, b) => (a.race!.days - b.race!.days))
  const raceLine = races.length
    ? ` · 🏁 ${races.slice(0, 2).map(a => `${a.race!.name} J-${a.race!.days} (${a.name})`).join(', ')}`
    : ''

  // Mode quotidien : on n'envoie que s'il y a des priorités (pas de spam).
  if (mode === 'daily' && priority === 0) return null

  if (priority === 0) {
    // Hebdo calme.
    return {
      priorityCount: 0,
      title: 'Semaine au vert 💚',
      body: `Tes ${roster.length} athlète${roster.length > 1 ? 's sont' : ' est'} au vert${raceLine || '.'}`.slice(0, 300),
    }
  }

  const parts: string[] = []
  if (injured.length) parts.push(`🩹 ${names(injured)} (blessé${injured.length > 1 ? 's' : ''})`)
  if (inactive.length) parts.push(`😴 ${names(inactive)} (inactif${inactive.length > 1 ? 's' : ''})`)
  if (warn.length) parts.push(`⚠️ ${names(warn)} (fatigue)`)

  const s = priority > 1 ? 's' : ''
  return {
    priorityCount: priority,
    title: mode === 'weekly'
      ? `${priority} athlète${s} à surveiller cette semaine`
      : `${priority} athlète${s} à surveiller`,
    body: (parts.join(' · ') + raceLine).slice(0, 300),
  }
}

export interface DigestRunResult { coaches: number; sent: number }

/** Envoie le digest à tous les coachs ayant au moins un athlète accepté. */
export async function sendCoachDigests(sb: SupabaseClient, mode: 'weekly' | 'daily'): Promise<DigestRunResult> {
  const { data: links } = await sb.from('coach_athlete').select('coach_id').eq('status', 'accepted')
  const coachIds = Array.from(new Set(((links ?? []) as { coach_id: string }[]).map(l => l.coach_id))).filter(Boolean)

  const today = new Date().toISOString().slice(0, 10)
  const monday = (() => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d.toISOString().slice(0, 10) })()

  let sent = 0
  for (const coachId of coachIds) {
    try {
      const roster = await getRosterForCoach(sb, coachId)
      const digest = buildCoachDigest(roster, mode)
      if (!digest) continue
      await notifyUser(coachId, 'coach_in.digest', {
        title: digest.title,
        body: digest.body,
        url: '/coach/athletes',
        dedupKey: mode === 'weekly' ? `coach-digest-w-${monday}` : `coach-digest-d-${today}`,
        once: mode === 'weekly', // hebdo : une seule fois par semaine
      })
      sent++
    } catch (err) {
      console.error(`[coach-digest] failed for coach ${coachId}:`, err)
    }
  }
  return { coaches: coachIds.length, sent }
}
