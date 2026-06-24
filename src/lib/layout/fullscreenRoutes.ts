// Routes « plein écran » : pas de chrome d'app (sidebar / header / barre d'onglets).
// Utilisé par DesktopShell, MobileShell et MobileTabBar pour les pages d'entrée
// (connexion, onboarding, accès expiré, bienvenue).
export function isFullscreenRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const routes = ['/auth', '/login', '/onboarding', '/access-expired', '/bienvenue']
  return routes.some(r => pathname === r || pathname.startsWith(r + '/'))
}
