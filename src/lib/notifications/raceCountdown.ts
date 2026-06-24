// ══════════════════════════════════════════════════════════════════
// Générateur de notifications « compte à rebours compétition ».
// Tourne côté client à l'ouverture de l'app : insère des jalons one-shot
// J-7 / J-3 / J-1 / Jour J pour chaque course planifiée à venir.
// Aucune dépendance backend / cron — idempotent via dedup_key (createOnce).
// ══════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import { createNotificationOnce } from './create'

interface RaceLite { id: string; name: string; sport: string; date: string }

const SPORT_FR: Record<string, string> = {
  run: 'running', running: 'running', trail: 'trail', trail_run: 'trail',
  bike: 'vélo', cycling: 'vélo', swim: 'natation', rowing: 'aviron',
  hyrox: 'Hyrox', triathlon: 'triathlon', gym: 'muscu',
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00'); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

const MILESTONES: Record<number, { key: string; when: string }> = {
  7: { key: 'j7', when: 'dans 7 jours' },
  3: { key: 'j3', when: 'dans 3 jours' },
  1: { key: 'j1', when: 'demain' },
  0: { key: 'j0', when: "aujourd'hui" },
}

export async function generateRaceCountdowns(
  sb: SupabaseClient, userId: string, races: RaceLite[],
): Promise<void> {
  for (const r of races) {
    const d = daysUntil(r.date)
    const m = MILESTONES[d]
    if (!m) continue
    const sport = SPORT_FR[r.sport] ?? r.sport
    const title = d === 0 ? `Jour J — ${r.name}` : `${r.name} · ${m.when}`
    const body = d === 0
      ? `C'est le grand jour pour ta compétition ${sport}. Échauffe-toi bien, gère ton allure, profite.`
      : `Ta compétition ${sport} approche (${m.when}). Pense à ton affûtage, ta logistique et ta nutrition d'avant-course.`
    await createNotificationOnce(sb, userId, {
      type: 'race_countdown', title, body, link: '/calendar',
      dedupKey: `race:${r.id}:${m.key}`,
    })
  }
}
