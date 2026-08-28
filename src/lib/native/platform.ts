'use client'
// ══════════════════════════════════════════════════════════════════════════
// Détection de la plateforme native (app iOS Capacitor) + règle d'affichage
// des prix.
//
// RÈGLE APP STORE : sur l'app native, on N'AFFICHE AUCUN prix ni parcours
// d'achat in-app. Le paiement se fait par Stripe, HORS de l'application (site
// web). Afficher des tarifs ou un bouton « acheter » dans l'app iOS viole les
// règles App Store (3.1.1 / 3.1.3) — donc `hidePricing()` masque tout ça.
//
// Deux signaux :
//  • NEXT_PUBLIC_API_BASE : défini UNIQUEMENT dans le build Capacitor → marqueur
//    « build natif », stable côté SSR ET client (pas de flash de prix).
//  • Capacitor.isNativePlatform() : vérif runtime (au cas où le build serait
//    partagé). Renvoie false sur le web / en SSR.
// ══════════════════════════════════════════════════════════════════════════

// Marqueur de build explicite, posé UNIQUEMENT par scripts/build-cap.mjs.
// (NEXT_PUBLIC_API_BASE seul ne suffit pas : il pourrait être défini côté
//  Vercel ; ce drapeau-ci n'est vrai que dans le build natif Capacitor.)
const NATIVE_BUILD = process.env.NEXT_PUBLIC_NATIVE_APP === '1'

/** true si on tourne dans l'app native (iOS/Android) empaquetée par Capacitor. */
export function isNativeApp(): boolean {
  if (NATIVE_BUILD) return true
  try {
    // Import paresseux : évite tout souci d'évaluation côté serveur.
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    return cap?.isNativePlatform?.() ?? false
  } catch { return false }
}

/** true si la plateforme native est iOS précisément. */
export function isIOS(): boolean {
  try {
    const cap = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor
    return cap?.getPlatform?.() === 'ios'
  } catch { return false }
}

/**
 * true → NE PAS afficher de prix ni de bouton d'achat (app native).
 * Le web (base API vide) montre toujours les prix normalement.
 */
export function hidePricing(): boolean {
  return isNativeApp()
}
