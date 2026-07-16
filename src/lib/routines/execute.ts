// ══════════════════════════════════════════════════════════════
// Exécution d'une routine : lance le coach « headless » avec le prompt de
// la routine, enregistre l'exécution (routine_runs), met à jour last_run_at,
// puis notifie l'athlète (in-app + push). Partagé entre « Exécuter
// maintenant » et le planificateur horaire.
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { runCoachHeadless } from '@/lib/coach/run-headless'
import { sendPushToUser, previewForBody } from '@/lib/push/send'
import { createNotification } from '@/lib/notifications/create'

export type RoutineRow = {
  id: string
  user_id: string
  name: string
  prompt: string
  model: string
  allow_write: boolean
}

// Ordre de puissance des modèles (pour capper selon l'abonnement).
const MODEL_RANK: Record<string, number> = { hermes: 0, athena: 1, zeus: 2 }
const RANK_MODEL = ['hermes', 'athena', 'zeus']

function capModel(requested: string, tierMax: string): string {
  const r = MODEL_RANK[requested] ?? 1
  const m = MODEL_RANK[tierMax] ?? 0
  return RANK_MODEL[Math.min(r, m)]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any

export async function executeRoutine(sb: Sb, routine: RoutineRow): Promise<{ ok: boolean; runId?: string; error?: string }> {
  const service = sb ?? createServiceClient()

  // Abonnement (tier) → cap du modèle + contexte quota.
  let tier = 'premium'
  let tierMaxModel = 'hermes'
  try {
    const { data: sub } = await service.from('user_subscriptions').select('tier').eq('user_id', routine.user_id).maybeSingle()
    tier = (sub?.tier as string) || 'premium'
    tierMaxModel = tier === 'expert' ? 'zeus' : tier === 'pro' ? 'athena' : 'hermes'
  } catch { /* défauts */ }

  const model = capModel(routine.model || 'athena', tierMaxModel)

  // Trace de l'exécution (running).
  let runId: string | undefined
  try {
    const { data } = await service.from('routine_runs')
      .insert({ routine_id: routine.id, user_id: routine.user_id, status: 'running' })
      .select('id').single()
    runId = (data as { id: string } | null)?.id
  } catch { /* best-effort */ }

  // Exécution du coach.
  const res = await runCoachHeadless({
    userId: routine.user_id,
    prompt: routine.prompt,
    model,
    allowWrite: routine.allow_write,
    tier,
  })

  // Finalisation de la trace + last_run_at.
  const nowIso = new Date().toISOString()
  try {
    if (runId) {
      await service.from('routine_runs').update({
        status: res.error ? 'error' : 'done',
        output: res.text ?? '',
        error: res.error ?? null,
      }).eq('id', runId)
    }
    await service.from('routines').update({ last_run_at: nowIso, updated_at: nowIso }).eq('id', routine.id)
  } catch { /* best-effort */ }

  // Notification (in-app + push). Non filtrée par les préférences catégorielles :
  // une routine est opt-in par nature (l'utilisateur l'a créée).
  try {
    const body = res.error ? 'La routine a rencontré une erreur.' : previewForBody(res.text)
    await createNotification(service, routine.user_id, {
      type: 'routine',
      title: routine.name,
      body,
      link: '/?routines=1',
      dedupKey: runId ? `routine-${runId}` : undefined,
    })
    await sendPushToUser(service, routine.user_id, {
      title: routine.name,
      body,
      url: '/?routines=1',
      tag: `routine-${routine.id}`,
    })
  } catch { /* best-effort */ }

  return { ok: !res.error, runId, error: res.error }
}
