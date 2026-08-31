'use client'

// Onboarding de présentation (slides « Welcome to Hybrid ») DÉSACTIVÉ à la
// demande : on n'affiche plus le carrousel d'intro après création de compte.
// Le layout rend toujours ce composant, mais il ne montre plus rien.
//
// Pour réactiver un jour : restaurer la logique localStorage
// (onboarding_global_done / onboarding_completed) + le rendu de <GlobalOnboarding/>
// (voir historique git de ce fichier).
export default function GlobalOnboardingWrapper() {
  return null
}
