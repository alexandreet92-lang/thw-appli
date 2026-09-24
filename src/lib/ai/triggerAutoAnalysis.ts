// ══════════════════════════════════════════════════════════════════════════
// Enqueue de l'auto-analyse (Brique 1).
// Appelé à la fin de chaque import d'activité (via triggerRecordsProcessing).
// RÔLE : marquer l'activité `pending` — RIEN de coûteux ici (pas d'appel LLM
// dans le chemin critique du webhook/sync). Le cron /api/ai/auto-analyze-run
// fait ensuite le vrai travail. Non-bloquant, ne lève jamais.
//
// Garde-fous :
//   • env AI_AUTO_ANALYZE=1 requis (kill-switch global, contrôle du coût) ;
//   • profiles.ai_auto_analyze doit être true pour l'utilisateur ;
//   • uniquement les sports d'endurance (avec streams exploitables) ;
//   • idempotent : on ne re-enqueue pas une activité déjà done/pending.
// ══════════════════════════════════════════════════════════════════════════
import { createServiceClient } from '@/lib/supabase/server'

const ENDURANCE = /run|cours|bike|cycl|velo|vélo|swim|nat|row|aviron|trail|hik|marche|walk/i

export async function triggerAutoAnalysis(params: {
  activityId: string
  userId: string
  sport: string | null | undefined
}): Promise<void> {
  try {
    if (process.env.AI_AUTO_ANALYZE !== '1') return
    if (!ENDURANCE.test(params.sport ?? '')) return

    const sb = createServiceClient()

    const { data: prof } = await sb.from('profiles').select('ai_auto_analyze').eq('id', params.userId).maybeSingle()
    if (prof && (prof as { ai_auto_analyze?: boolean }).ai_auto_analyze === false) return

    const { data: act } = await sb.from('activities').select('ai_analysis_status').eq('id', params.activityId).maybeSingle()
    const status = (act as { ai_analysis_status?: string | null } | null)?.ai_analysis_status
    if (status === 'done' || status === 'pending') return

    await sb.from('activities').update({ ai_analysis_status: 'pending' }).eq('id', params.activityId)
    console.log(`[auto-analyze] enqueued activity ${params.activityId}`)
  } catch (err) {
    // Volontairement avalé — l'import ne doit jamais échouer à cause de l'auto-analyse.
    console.error(`[auto-analyze] enqueue failed for ${params.activityId}:`, err)
  }
}
