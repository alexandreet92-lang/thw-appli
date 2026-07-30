// ══════════════════════════════════════════════════════════════
// Propriétaire de l'espace coach — pour l'instant, un seul compte a accès au
// mode coach (le bouton de bascule Athlète ⇄ Coach n'apparaît que pour lui).
// À élargir plus tard (ex. abonnement coach) en changeant cette seule règle.
// ══════════════════════════════════════════════════════════════
export const COACH_OWNER_ID = '0436958c-d40c-4111-bef9-835ee15aac53'

export function isCoachOwner(userId: string | null | undefined): boolean {
  return !!userId && userId === COACH_OWNER_ID
}
