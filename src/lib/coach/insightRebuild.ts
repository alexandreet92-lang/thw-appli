// ══════════════════════════════════════════════════════════════════════════
// Coach cockpit — régénération des synthèses IA de tous les athlètes suivis.
// Appelé par le cron nuit (après pmc-rebuild, pour partir d'une charge à jour).
// Génère UNE fois par athlète (même s'il a plusieurs coachs) et écrit sur tous
// ses liens coach↔athlète.
// ══════════════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { getRosterForCoach } from '@/lib/coach/rosterServer'
import { generateAthleteInsight, storeAthleteInsight } from '@/lib/coach/athleteInsight'

export interface InsightRebuildResult { coaches: number; athletes: number; generated: number; skipped: number; errors: number }

export async function rebuildAllAthleteInsights(sbArg?: SupabaseClient): Promise<InsightRebuildResult> {
  const sb = sbArg ?? createServiceClient()
  const { data: links } = await sb.from('coach_athlete').select('coach_id').eq('status', 'accepted')
  const coachIds = Array.from(new Set(((links ?? []) as { coach_id: string }[]).map(l => l.coach_id))).filter(Boolean)

  const done = new Set<string>()   // athlete_ids déjà traités ce run
  let athletes = 0, generated = 0, skipped = 0, errors = 0

  for (const coachId of coachIds) {
    let roster
    try { roster = await getRosterForCoach(sb, coachId) } catch { errors++; continue }
    for (const athlete of roster) {
      if (done.has(athlete.id)) continue
      done.add(athlete.id)
      athletes++
      try {
        const insight = await generateAthleteInsight(sb, athlete)
        if (!insight) { skipped++; continue }
        await storeAthleteInsight(sb, athlete.id, insight)
        generated++
      } catch (err) {
        errors++
        console.error(`[insight-rebuild] échec athlète ${athlete.id}:`, err)
      }
    }
  }
  return { coaches: coachIds.length, athletes, generated, skipped, errors }
}
