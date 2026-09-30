'use client'
// ══════════════════════════════════════════════════════════════════
// Animation d'entrée AUTOMATIQUE des fenêtres / feuilles / menus.
//
// Règle produit : rien ne doit jamais « apparaître d'un coup ». Plutôt que
// d'animer ~300 composants à la main, on observe le DOM : tout nouvel élément
// `position: fixed` (fenêtre, feuille, voile…) ou portant un rôle dialog / menu
// reçoit une entrée animée, sauf s'il s'anime déjà lui-même (transition ou
// animation en ligne) ou s'il porte `data-no-motion`.
//
//  • Voile plein écran : fondu ; son premier enfant (le panneau) glisse depuis
//    le bas (feuille du bas) ou arrive en fondu + léger zoom (fenêtre centrée).
//  • Petit élément fixe (toast, bulle, menu) : fondu + léger décalage.
//  • Utilise les propriétés individuelles `translate` / `scale` : elles se
//    composent avec un `transform` existant (pas de panneau mal centré).
// Sortie non gérée ici (le démontage est immédiat côté React).
// ══════════════════════════════════════════════════════════════════

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const seen = new WeakSet<Element>()
const ROLES = new Set(['dialog', 'alertdialog', 'menu', 'listbox', 'tooltip'])

function selfAnimated(el: HTMLElement): boolean {
  const st = el.style
  return !!(st.transition || st.animation || el.hasAttribute('data-no-motion'))
}

function animate(el: HTMLElement, frames: Keyframe[], ms: number): void {
  try { el.animate(frames, { duration: ms, easing: EASE, fill: 'backwards' }) } catch { /* WAAPI indisponible */ }
}

function enter(el: HTMLElement): void {
  if (seen.has(el)) return
  seen.add(el)
  if (selfAnimated(el) || !el.isConnected) return
  const cs = getComputedStyle(el)
  if (cs.pointerEvents === 'none' || cs.display === 'none' || cs.visibility === 'hidden') return
  if (cs.animationName && cs.animationName !== 'none') return
  if (cs.transitionDuration && cs.transitionDuration.split(',').some(d => parseFloat(d) > 0)) return

  const r = el.getBoundingClientRect()
  const vw = window.innerWidth, vh = window.innerHeight
  const isVeil = cs.position === 'fixed' && r.width >= vw * 0.9 && r.height >= vh * 0.85
  if (isVeil) {
    animate(el, [{ opacity: 0 }, { opacity: 1 }], 260)
    const panel = el.firstElementChild as HTMLElement | null
    if (panel && !selfAnimated(panel) && getComputedStyle(panel).position !== 'fixed') {
      const fromBottom = cs.alignItems === 'flex-end' || cs.alignItems === 'end'
      if (fromBottom) animate(panel, [{ translate: '0 100%' }, { translate: '0 0' }], 460)
      else animate(panel, [{ opacity: 0, scale: '0.95', translate: '0 14px' }, { opacity: 1, scale: '1', translate: '0 0' }], 340)
    }
    return
  }
  // Petit élément : fondu + décalage depuis le bord le plus proche.
  const fromTop = r.top < vh / 2
  animate(el, [
    { opacity: 0, scale: '0.96', translate: `0 ${fromTop ? -10 : 10}px` },
    { opacity: 1, scale: '1', translate: '0 0' },
  ], 280)
}

function consider(node: Node): void {
  if (!(node instanceof HTMLElement)) return
  const role = node.getAttribute('role')
  if (node.style.position === 'fixed' || (role && ROLES.has(role))) {
    // Synchrone (micro-tâche, avant la peinture) : pas d'image sans animation.
    // Les effets de layout du composant ont déjà posé leur éventuel mouvement propre.
    enter(node)
  }
}

let installed = false

/** À appeler une fois (ClientShell). No-op côté serveur ou si « réduire les animations ». */
export function installOverlayMotion(): () => void {
  if (installed || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return () => {}
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}
  installed = true
  const mo = new MutationObserver(muts => {
    for (const m of muts) m.addedNodes.forEach(consider)
  })
  mo.observe(document.body, { childList: true, subtree: true })
  return () => { mo.disconnect(); installed = false }
}
