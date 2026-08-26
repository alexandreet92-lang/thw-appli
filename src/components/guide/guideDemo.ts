// ══════════════════════════════════════════════════════════════════
// Pont « DÉMO » du guide : le guide demande à une page d'ouvrir un panneau
// d'illustration (non enregistré) pour montrer une UI (ex. le constructeur
// de séance). On garde l'id courant dans un module partagé ET on émet un
// évènement : ainsi une page qui vient d'être ouverte par navigation peut
// lire l'état AU MONTAGE (sinon l'évènement, émis avant que la page écoute,
// serait manqué).
// ══════════════════════════════════════════════════════════════════

export const GUIDE_DEMO_EVENT = 'thw:guide-demo'

let _demoId: string | null = null

/** Id de démo courant (null = aucun panneau démo à afficher). */
export function getGuideDemoId(): string | null { return _demoId }

/** Positionne l'id de démo et prévient les pages (id=null → referme). */
export function setGuideDemoId(id: string | null): void {
  _demoId = id
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GUIDE_DEMO_EVENT, { detail: { id } }))
  }
}
