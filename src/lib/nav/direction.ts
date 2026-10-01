// Sens de la prochaine transition de page (mobile) :
//  • 'push' : on ouvre un détail (tap sur une carte) → la page arrive de la DROITE ;
//  • 'back' : retour (geste / bouton) → la page arrive de la GAUCHE ;
//  • null   : changement d'onglet → simple fondu.
// Lu (et remis à zéro) par PageTransition au changement de route.
export type NavDirection = 'push' | 'back' | null

let next: NavDirection = null

export function setNavDirection(d: NavDirection) { next = d }

export function takeNavDirection(): NavDirection {
  const d = next
  next = null
  return d
}
