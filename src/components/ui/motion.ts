'use client'
// ══════════════════════════════════════════════════════════════════
// Couche « motion » mobile partagée (façon Strava / Claude iOS).
//  • Courbes et durées communes (ressort iOS cubic-bezier(.32,.72,0,1)).
//  • Entrée des cartes : fondu + montée 8 px, décalée de 50 ms carte après
//    carte, UNIQUEMENT au montage d'un nœud (jamais à un simple re-rendu).
//  • Sens de glissement des sous-onglets (MobileSectionTabs → PageTransition).
// Règles : transform / opacity seulement (60 fps), jamais backdrop-filter,
// prefers-reduced-motion respecté (rien n'est animé).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Ressort iOS (feuilles, push/pop). */
export const IOS_EASE = [0.32, 0.72, 0, 1] as const
export const IOS_EASE_CSS = 'cubic-bezier(0.32, 0.72, 0, 1)'
/** Sortie douce (fondus, montées). */
export const OUT_EASE = [0.22, 1, 0.36, 1] as const
export const OUT_EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** prefers-reduced-motion réactif (false au rendu serveur). */
export function useReducedMotionPref(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduce(m.matches)
    f(); m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return reduce
}

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(max-width: 767px)').matches
}

// ── Décalage en cascade ─────────────────────────────────────────────
// Les nœuds montés dans une même « rafale » (< 220 ms d'écart) reçoivent un
// retard croissant (0, 50, 100… plafonné) ; une nouvelle rafale repart de 0.
let lastMount = -Infinity
let burst = 0
export function nextStaggerDelay(step = 50, max = 8): number {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - lastMount > 220) burst = 0
  lastMount = now
  return Math.min(burst++, max) * step
}

// ── Entrée des cartes (MobileShell) ────────────────────────────────
// Cartes blanches des pages mobiles : DashCard (.dash-card) et toute surface
// peinte en --dash-card / --surface-card en style inline (MCard, cartes
// d'activités…). Les squelettes (.dash-skel, [data-slot=skeleton]) sont exclus :
// ils s'affichent instantanément, c'est le contenu qui « monte ».
const CARD_SELECTOR = [
  '.dash-card',
  '[data-enter]',
  '[style*="background: var(--dash-card"]',
  '[style*="background: var(--surface-card)"]',
].join(',')
const SKIP_SELECTOR = '.dash-skel, [data-slot="skeleton"], .skeleton-shimmer, [data-no-enter], [role="dialog"]'

function tagCard(el: HTMLElement) {
  if (el.classList.contains('thw-enter') || el.dataset.entered === '1') return
  el.dataset.entered = '1'
  if (el.matches(SKIP_SELECTOR)) return
  // Carte imbriquée dans une carte déjà animée : le parent porte l'entrée.
  if (el.parentElement?.closest('.thw-enter, [data-entered="1"]')) return
  el.style.setProperty('--thw-enter-delay', `${nextStaggerDelay()}ms`)
  el.classList.add('thw-enter')
  // Nettoyage après l'animation (aucun effet résiduel, pas de calque permanent).
  const done = () => { el.classList.remove('thw-enter'); el.style.removeProperty('--thw-enter-delay') }
  el.addEventListener('animationend', done, { once: true })
  el.addEventListener('animationcancel', done, { once: true })
}

function scan(node: Node) {
  if (!(node instanceof HTMLElement)) return
  if (node.matches(CARD_SELECTOR)) tagCard(node)
  node.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(tagCard)
}

/**
 * Anime l'apparition des cartes ajoutées dans `rootRef` (mobile uniquement).
 * MutationObserver : ses callbacks passent en micro-tâche, AVANT la peinture —
 * la carte est taguée avant d'être vue (pas de flash). Un nœud déjà vu n'est
 * jamais ré-animé ; un re-rendu React ne recrée pas les nœuds → aucune ré-entrée.
 */
export function useCardEntrance(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled || prefersReducedMotion() || !isMobileViewport()) return
    // Contenu déjà présent au branchement : marqué « vu » sans animation (évite
    // de rejouer une entrée sur une page déjà affichée).
    root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(el => { el.dataset.entered = '1' })
    const mo = new MutationObserver(records => {
      for (const r of records) r.addedNodes.forEach(scan)
    })
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [rootRef, enabled])
}

// ── Sens des sous-onglets ──────────────────────────────────────────
// MobileSectionTabs indique le sens (1 = vers la droite, -1 = vers la gauche)
// avant router.push ; PageTransition le lit une fois au changement de route.
let tabSlide: 1 | -1 | null = null
export function setTabSlide(d: 1 | -1 | null) { tabSlide = d }
export function takeTabSlide(): 1 | -1 | null { const d = tabSlide; tabSlide = null; return d }

/** Ref stable vers la dernière valeur (callbacks de gestes). */
export function useLatest<T>(v: T) {
  const r = useRef(v)
  r.current = v
  return r
}
