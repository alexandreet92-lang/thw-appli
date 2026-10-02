'use client'
// ══════════════════════════════════════════════════════════════
// Consentement IA (RGPD + App Store 5.1.2(i)) — source unique.
//
// Avant le tout premier envoi au coach IA, l'utilisateur autorise UNE FOIS
// le traitement de ses messages + du contexte d'entraînement utile par notre
// partenaire d'IA (formulation neutre, sans nom de fournisseur).
//
// Persistance :
//  · localStorage 'thw_ai_consent_v1' ('1' accepté / '0' retiré) — lecture
//    synchrone, partagée avec les Réglages IA ;
//  · métadonnées du compte Supabase (`user_metadata.ai_consent_at`), que
//    l'app écrit déjà (langue, prénom…) → l'accord suit l'utilisateur sur
//    tous ses appareils. Aucune modification de schéma.
// Retrait (Réglages) : '0' en local + `ai_consent_at: null` sur le compte.
// ══════════════════════════════════════════════════════════════

import { getCurrentUser } from '@/lib/auth/currentUser'

const KEY = 'thw_ai_consent_v1'
/** Événement émis quand le consentement change (UI à resynchroniser). */
export const AI_CONSENT_EVENT = 'thw:ai-consent-changed'

/** Accord local (synchrone). Côté serveur : on ne bloque rien. */
export function hasAIConsent(): boolean {
  if (typeof window === 'undefined') return true
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

/** Retrait explicite (≠ jamais demandé) : on ne re-sollicite pas d'office. */
export function aiConsentWithdrawn(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(KEY) === '0' } catch { return false }
}

function writeLocal(ok: boolean) {
  try { localStorage.setItem(KEY, ok ? '1' : '0') } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(AI_CONSENT_EVENT, { detail: ok })) } catch { /* ignore */ }
}

/** Enregistre le choix en local ET sur le compte (best-effort, non bloquant). */
export function setAIConsent(ok: boolean): void {
  if (typeof window === 'undefined') return
  writeLocal(ok)
  void (async () => {
    try {
      const user = await getCurrentUser()
      if (!user) return
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().auth.updateUser({ data: { ai_consent_at: ok ? new Date().toISOString() : null } })
    } catch { /* hors ligne : le local suffit, resynchronisé au prochain accord */ }
  })()
}

/**
 * Rapatrie l'accord donné sur un autre appareil (métadonnées du compte).
 * Renvoie l'état final connu. À appeler au montage du panneau IA.
 */
export async function syncAIConsentFromAccount(): Promise<boolean> {
  if (typeof window === 'undefined') return true
  if (hasAIConsent()) return true
  try {
    const user = await getCurrentUser()
    const at = (user?.user_metadata as Record<string, unknown> | undefined)?.ai_consent_at
    if (typeof at === 'string' && at) { writeLocal(true); return true }
  } catch { /* ignore */ }
  return hasAIConsent()
}
