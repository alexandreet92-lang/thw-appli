// ══════════════════════════════════════════════════════════════════════════
// Worker d'auto-analyse (Brique 1).
// Traite les activités marquées `ai_analysis_status = 'pending'` : assemble le
// contexte, appelle le LLM, stocke le résultat. Appelé par le cron
// /api/ai/auto-analyze-run.
//
// Gestion du coût / quota : on traite au plus `limit` activités par run
// (env AI_AUTO_ANALYZE_BATCH, défaut 5). Si l'appel LLM échoue (quota API
// atteint, erreur réseau…), on marque l'activité 'error' et on continue — pas
// de crash. Les 'pending' restants seront repris au prochain passage du cron
// (= file d'attente naturelle).
// ══════════════════════════════════════════════════════════════════════════
import { createServiceClient } from '@/lib/supabase/server'
import { assembleAnalysisContext } from '@/lib/ai/assembleAnalysisContext'
import { runTrainingAnalysis, type AnalysisDetail } from '@/lib/ai/analyzeTraining'

export interface AutoAnalyzeRunResult {
  picked: number
  done: number
  skipped: number
  errored: number
}

const VALID_DETAIL = new Set<AnalysisDetail>(['minimum', 'advanced', 'specialist'])

export async function processPendingAutoAnalyses(limit?: number): Promise<AutoAnalyzeRunResult> {
  const batch = limit ?? (Number(process.env.AI_AUTO_ANALYZE_BATCH ?? '5') || 5)
  const sb = createServiceClient()
  const res: AutoAnalyzeRunResult = { picked: 0, done: 0, skipped: 0, errored: 0 }

  const { data: pending } = await sb
    .from('activities')
    .select('id,user_id,sport_type')
    .eq('ai_analysis_status', 'pending')
    .order('started_at', { ascending: false })
    .limit(batch)

  const rows = (pending ?? []) as { id: string; user_id: string; sport_type: string | null }[]
  res.picked = rows.length

  for (const row of rows) {
    try {
      // Respecte le réglage utilisateur (peut avoir changé depuis l'enqueue).
      const { data: prof } = await sb
        .from('profiles')
        .select('ai_auto_analyze, ai_analysis_detail')
        .eq('id', row.user_id)
        .maybeSingle()
      const p = prof as { ai_auto_analyze?: boolean; ai_analysis_detail?: string } | null
      if (p && p.ai_auto_analyze === false) {
        await sb.from('activities').update({ ai_analysis_status: 'skipped' }).eq('id', row.id)
        res.skipped++
        continue
      }
      const detail = (VALID_DETAIL.has(p?.ai_analysis_detail as AnalysisDetail) ? p!.ai_analysis_detail : 'advanced') as AnalysisDetail

      const payload = await assembleAnalysisContext(sb, row.user_id, row.id, detail)
      if (!payload) {
        await sb.from('activities').update({ ai_analysis_status: 'skipped' }).eq('id', row.id)
        res.skipped++
        continue
      }

      const report = await runTrainingAnalysis(payload)
      await sb.from('activities').update({
        ai_analysis: report,
        ai_analysis_status: 'done',
        ai_analysis_at: new Date().toISOString(),
      }).eq('id', row.id)
      res.done++
    } catch (err) {
      console.error(`[auto-analyze] failed for ${row.id}:`, err)
      try { await sb.from('activities').update({ ai_analysis_status: 'error' }).eq('id', row.id) } catch { /* best-effort */ }
      res.errored++
    }
  }

  return res
}
