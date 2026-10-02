// Routes où la barre d'onglets flottante (TabCapsule) est affichée sur mobile.
// Source unique partagée par MobileTabBar (affiche la barre) et MobileShell
// (réserve l'espace en bas de page pour que la barre ne cache jamais le
// dernier contenu). Les masquages dynamiques (clavier, sur-page ouverte) ne
// sont volontairement pas pris en compte : l'espace réservé reste stable
// (aucun saut de mise en page à l'ouverture d'une feuille).
import { isFullscreenRoute } from '@/lib/layout/fullscreenRoutes'

export function tabBarShownOn(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Lancer une activité : compteur / carte immersifs.
  if (pathname === '/record') return false
  // Pages d'entrée (connexion, onboarding…) : aucun chrome.
  if (isFullscreenRoute(pathname)) return false
  // Espace coach : barre dédiée partout ailleurs.
  if (pathname.startsWith('/coach')) return true
  // /competences (header dédié), /topup (lien email), /profile (réglages plein écran).
  if (pathname.startsWith('/competences') || pathname.startsWith('/topup') || pathname === '/profile') return false
  return true
}
