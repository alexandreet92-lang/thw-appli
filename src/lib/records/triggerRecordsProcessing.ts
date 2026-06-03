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

export async function triggerRecordsProcessing(params: {
  activityId: string
  userId:     string
  sport:      string | null | undefined
}): Promise<void> {
  const { activityId, userId, sport } = params

  // Fast-path : on ne traite que le vélo (Pmax → 6h)
  const s = (sport ?? '').toLowerCase()
  if (s !== 'bike' && s !== 'cycling' && s !== 'cycle' && s !== 'velo') return

  try {
    console.log(`[records-trigger] processing activity ${activityId} for user ${userId}`)
    const sb     = createServiceClient()
    const result = await processBikeActivityRecords(sb, userId, activityId)
    const reason = result.reason ?? 'ok'
    const beats  = result.payload.allTime.length + result.payload.year.length
    console.log(`[records-trigger] done for activity ${activityId} (reason=${reason}, beats=${beats})`)
  } catch (err) {
    console.error(`[records-trigger] failed for activity ${activityId}:`, err)
    // Volontairement avalé — l'import ne doit pas échouer à cause des records
  }
}
