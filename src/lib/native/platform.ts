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

/**
 * Faut-il activer le FLOU « verre » (#7) ? Le fond translucide est toujours là ;
 * seul le backdrop-filter (qui scintillait en WebView dev) est conditionnel.
 * - Web (navigateur) : oui, le flou y est rendu proprement.
 * - Natif : non par défaut (évite le clignotement en dev/Xcode) — l'App Store /
 *   Release l'active via le flag localStorage `thw_glass_blur` = '1'.
 * Override explicite possible dans les deux sens ('1' / '0').
 */
export function shouldGlassBlur(): boolean {
  try {
    const o = localStorage.getItem('thw_glass_blur')
    if (o === '1') return true
    if (o === '0') return false
  } catch { /* ignore */ }
  return !isNativeApp()
}

/** Applique/retire la classe globale qui autorise le flou verre. */
export function applyGlassBlur(): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('thw-glass-blur', shouldGlassBlur())
}

/** URL publique du site web (gestion abonnement/recharge hors app).
 *  On réutilise NEXT_PUBLIC_API_BASE (défini dans le build natif = domaine
 *  Vercel RÉEL) pour éviter un domaine mort : « thw-coaching.vercel.app »
 *  renvoyait 404 (DEPLOYMENT_NOT_FOUND) → tous les liens vers le site cassés. */
export const WEB_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL
  || process.env.NEXT_PUBLIC_API_BASE
  || 'https://thw-appli.vercel.app'

/**
 * Ouvre une page du SITE WEB (paiement/gestion abonnement) hors de l'app.
 * En natif : navigateur système via Capacitor Browser (le paiement Stripe se
 * fait sur le web, jamais in-app). Sur le web : navigation classique.
 * `path` doit commencer par « / ».
 */
export async function openWebsite(path = '/settings/subscription'): Promise<void> {
  const clean = path.startsWith('/') ? path : `/${path}`
  // Règle : quand on ouvre une page du site qui montre les données PERSONNELLES
  // (abonnement, recharge, facturation…), on passe D'ABORD par la connexion, puis
  // on renvoie l'utilisateur sur SA page (il voit ses propres infos). Les pages
  // publiques (/site/*.html : légal, marketing) et /auth lui-même sont exclus.
  const isPersonalAppPage = clean.startsWith('/') && !clean.startsWith('/site/') && !clean.startsWith('/auth')
  const routed = isPersonalAppPage ? `/auth?redirect=${encodeURIComponent(clean)}` : clean
  const native = isNativeApp()
  // Règle App Store : AUCUN prix visible quand la page est ouverte depuis l'app
  // (navigateur in-app). On tague l'URL avec `app=1` → les pages du site masquent
  // tous les montants. Le lien reçu par EMAIL (ouvert hors app) garde les prix.
  const withFlag = native ? `${routed}${routed.includes('?') ? '&' : '?'}app=1` : routed
  const url = `${WEB_APP_URL}${withFlag}`
  if (native) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return
    } catch { /* fallback navigation web ci-dessous */ }
  }
  try { window.open(url, '_blank', 'noopener') } catch { window.location.href = url }
}

/**
 * Ouvre une URL ABSOLUE hors de l'app (ex : URL de portail Stripe renvoyée par
 * l'API). En natif : navigateur système (Capacitor Browser) — on ne navigue
 * jamais la webview vers un domaine externe. Sur le web : nouvel onglet.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return
    } catch { /* fallback navigation web ci-dessous */ }
  }
  try { window.open(url, '_blank', 'noopener') } catch { window.location.href = url }
}
