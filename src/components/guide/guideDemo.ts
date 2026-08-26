// ══════════════════════════════════════════════════════════════════
// Pont « DÉMO » du guide : le guide demande à une page d'ouvrir un panneau
// d'illustration (non enregistré) pour montrer une UI (ex. le constructeur
// de séance). On garde l'id courant dans un module partagé ET on émet un
// évènement : ainsi une page qui vient d'être ouverte par navigation peut
// lire l'état AU MONTAGE (sinon l'évènement, émis avant que la page écoute,
// serait manqué).
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'

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

// ── Hook générique : bascule d'onglet piloté par le guide ─────────────
// Une page à onglets appelle useGuideTabDemo('perf', key => setTab(key)).
// Quand le guide émet un id « perf:datas », l'onglet « datas » s'active —
// ainsi la flèche peut pointer un élément situé sur n'importe quel onglet.
// Lu AU MONTAGE (page ouverte par navigation) puis sur évènement.
export function useGuideTabDemo(prefix: string, setTab: (key: string) => void): void {
  const ref = useRef(setTab)
  ref.current = setTab
  useEffect(() => {
    const apply = (id: string | null) => {
      if (id && id.startsWith(prefix + ':')) ref.current(id.slice(prefix.length + 1))
    }
    apply(getGuideDemoId())
    const h = (e: Event) => apply((e as CustomEvent<{ id: string | null }>).detail?.id ?? null)
    window.addEventListener(GUIDE_DEMO_EVENT, h)
    return () => window.removeEventListener(GUIDE_DEMO_EVENT, h)
  }, [prefix])
}
