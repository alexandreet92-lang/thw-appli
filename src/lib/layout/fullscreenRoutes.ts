// Routes « plein écran » : pas de chrome d'app (sidebar / header / barre d'onglets).
// Utilisé par DesktopShell, MobileShell et MobileTabBar pour les pages d'entrée
// (connexion, onboarding, accès expiré, bienvenue).
//
// /pour-les-coachs en fait partie : c'est la page publique qu'un coach ouvre
// depuis un message privé, sans compte. Lui montrer la barre d'onglets d'une
// app où il n'est pas entré, c'est lui montrer une porte fermée avant de lui
// avoir dit ce qu'il y a derrière.
//
// (À ne pas confondre avec /decouvrir, qui est une page statique servie depuis
// public/ et présente l'app aux ATHLÈTES — seize piliers, essai de 14 jours.
// Elle ne passe pas par le routeur, donc pas par ici.)
export function isFullscreenRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const routes = ['/auth', '/login', '/onboarding', '/access-expired', '/bienvenue', '/c', '/pour-les-coachs']
  return routes.some(r => pathname === r || pathname.startsWith(r + '/'))
}
