// ══════════════════════════════════════════════════════════════
// Propriétaire de l'espace coach — pour l'instant, un seul compte a accès au
// mode coach (le bouton de bascule Athlète ⇄ Coach n'apparaît que pour lui).
// À élargir plus tard (ex. abonnement coach) en changeant cette seule règle.
// ══════════════════════════════════════════════════════════════
export const COACH_OWNER_ID = '0436958c-d40c-4111-bef9-835ee15aac53'

export function isCoachOwner(userId: string | null | undefined): boolean {
  return !!userId && userId === COACH_OWNER_ID
}

// Accès à l'agent IA « Coach » (visible partout, ouvrable seulement avec un
// abonnement coach). Le propriétaire l'a d'office ; sinon on lit le flag
// profiles.coach_subscribed. Lecture best-effort (false si non connecté / erreur).
export async function hasCoachAccess(): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/client')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  if (isCoachOwner(user.id)) return true
  try {
    const { data } = await sb.from('profiles').select('coach_subscribed').eq('id', user.id).maybeSingle()
    return !!(data as { coach_subscribed?: boolean } | null)?.coach_subscribed
  } catch { return false }
}
