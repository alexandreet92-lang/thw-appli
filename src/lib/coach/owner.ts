// ══════════════════════════════════════════════════════════════
// Accès à l'espace coach. Trois voies :
//   • propriétaire (compte fondateur) ;
//   • abonnement coach payant (profiles.coach_subscribed, posé par le webhook) ;
//   • essai coach de 14 jours (profiles.coach_trial_started_at), NON automatique.
// Après 14 j sans pack, l'accès coach est perdu (pas de mode gratuit coach).
// ══════════════════════════════════════════════════════════════
export const COACH_OWNER_ID = '0436958c-d40c-4111-bef9-835ee15aac53'
export const COACH_TRIAL_DAYS = 14

export function isCoachOwner(userId: string | null | undefined): boolean {
  return !!userId && userId === COACH_OWNER_ID
}

export interface CoachAccessState {
  access: boolean          // peut utiliser l'espace coach
  paid: boolean            // abonnement coach actif
  isTrial: boolean         // en essai coach en cours
  trialDaysLeft: number    // jours restants d'essai (0 si terminé/non démarré)
  everStarted: boolean     // a déjà démarré un essai coach
  expired: boolean         // essai démarré, terminé, et pas d'abonnement
}

function trialDaysLeftFrom(startedIso: string | null): number {
  if (!startedIso) return 0
  const started = new Date(startedIso).getTime()
  if (isNaN(started)) return 0
  const elapsed = (Date.now() - started) / 86400000
  return Math.max(0, Math.ceil(COACH_TRIAL_DAYS - elapsed))
}

/** État complet de l'accès coach de l'utilisateur courant. */
export async function getCoachAccessState(): Promise<CoachAccessState> {
  const empty: CoachAccessState = { access: false, paid: false, isTrial: false, trialDaysLeft: 0, everStarted: false, expired: false }
  const { createClient } = await import('@/lib/supabase/client')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return empty
  if (isCoachOwner(user.id)) return { access: true, paid: true, isTrial: false, trialDaysLeft: 0, everStarted: true, expired: false }
  try {
    const { data } = await sb.from('profiles').select('coach_subscribed, coach_trial_started_at').eq('id', user.id).maybeSingle()
    const paid = !!(data as { coach_subscribed?: boolean } | null)?.coach_subscribed
    const startedIso = (data as { coach_trial_started_at?: string | null } | null)?.coach_trial_started_at ?? null
    const everStarted = !!startedIso
    const trialDaysLeft = trialDaysLeftFrom(startedIso)
    const isTrial = !paid && trialDaysLeft > 0
    const expired = !paid && everStarted && trialDaysLeft === 0
    return { access: paid || isTrial, paid, isTrial, trialDaysLeft, everStarted, expired }
  } catch { return empty }
}

/** Vrai si l'utilisateur peut utiliser l'espace coach (owner / payant / essai actif). */
export async function hasCoachAccess(): Promise<boolean> {
  return (await getCoachAccessState()).access
}

/** Démarre l'essai coach de 14 jours (une seule fois). Renvoie l'état résultant.
 *  Lève si l'écriture échoue (RLS/réseau) : l'appelant ne doit PAS naviguer vers
 *  /coach si l'essai n'a pas réellement démarré, sinon le middleware le renverrait
 *  aussitôt vers /coach/subscription (boucle silencieuse). */
export async function startCoachTrial(): Promise<CoachAccessState> {
  const { createClient } = await import('@/lib/supabase/client')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Non connecté')
  const { data } = await sb.from('profiles').select('coach_trial_started_at').eq('id', user.id).maybeSingle()
  const already = (data as { coach_trial_started_at?: string | null } | null)?.coach_trial_started_at
  if (!already) {
    const { error } = await sb.from('profiles').update({ coach_trial_started_at: new Date().toISOString() }).eq('id', user.id)
    if (error) throw new Error(error.message)
  }
  return getCoachAccessState()
}
