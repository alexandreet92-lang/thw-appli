// ══════════════════════════════════════════════════════════════
// triggerRecordsProcessing — helper non bloquant appelé à la fin
// de CHAQUE pipeline d'import d'activité (webhook, sync, etc.).
//
// Règle d'or : un échec de traitement des records ne doit JAMAIS
// faire échouer l'import de l'activité. Try/catch englobant,
// erreurs loguées mais jamais propagées.
// ══════════════════════════════════════════════════════════════

import { createServiceClient }       from '@/lib/supabase/server'
import { processBikeActivityRecords } from './processBikeActivity'
import { processPaceActivityRecords, paceSportOf } from './processPaceActivity'

export async function triggerRecordsProcessing(params: {
  activityId: string
  userId:     string
  sport:      string | null | undefined
}): Promise<void> {
  const { activityId, userId, sport } = params
  const s = (sport ?? '').toLowerCase()
  const isBike = s === 'bike' || s === 'cycling' || s === 'cycle' || s === 'velo'
  const paceSport = paceSportOf(sport)   // run / swim / rowing
  if (!isBike && !paceSport) return       // autres sports : pas de records auto

  try {
    console.log(`[records-trigger] processing activity ${activityId} for user ${userId} (sport=${s})`)
    const sb = createServiceClient()
    if (isBike) {
      const result = await processBikeActivityRecords(sb, userId, activityId)
      const beats = result.payload.allTime.length + result.payload.year.length
      console.log(`[records-trigger] bike done ${activityId} (reason=${result.reason ?? 'ok'}, beats=${beats})`)
    } else {
      const result = await processPaceActivityRecords(sb, userId, activityId)
      const beats = result.payload.allTime.length + result.payload.year.length
      console.log(`[records-trigger] pace done ${activityId} (reason=${result.reason ?? 'ok'}, beats=${beats})`)
    }
  } catch (err) {
    console.error(`[records-trigger] failed for activity ${activityId}:`, err)
    // Volontairement avalé — l'import ne doit pas échouer à cause des records
  }
}
