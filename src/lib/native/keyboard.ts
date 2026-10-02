'use client'
// ══════════════════════════════════════════════════════════════════════════
// Clavier logiciel — composeurs « COLLÉS » au clavier (façon Claude / iMessage).
//
// UNE SEULE source de vérité, jamais deux compensations en même temps :
//
//  • App iOS (Capacitor + @capacitor/keyboard) — source « native » :
//    le plugin retire la gestion clavier propre au WKWebView (plus d'auto-scroll
//    de la page, plus de contentInset). Le mode de redimensionnement est décidé
//    à CHAQUE ouverture du clavier :
//      – champ situé dans un conteneur `[data-kb-glue]` (ex. composeur IA) →
//        resize 'none' : le webview garde sa taille, le contenu de la surface
//        collée remonte d'exactement `keyboardHeight` (keyboardWillShow,
//        AVANT l'animation) avec la même courbe/durée qu'iOS → zéro bande, zéro
//        décalage, le composeur monte et redescend en même temps que le clavier.
//      – tout autre champ → resize 'native' (défaut de capacitor.config.ts) :
//        le webview est raccourci au-dessus du clavier, comportement générique
//        pour le reste de l'app (formulaires, feuilles…).
//    `visualViewport` est IGNORÉ dans ce mode.
//
//  • Web (Safari iOS, PWA, Android) — source « web » : visualViewport.
//    Le contenu de la surface collée occupe exactement le viewport visible
//    (offsetTop → offsetTop + height) : que le navigateur ait redimensionné
//    le layout (interactive-widget) ou recouvert la page, le bas de la surface
//    tombe pile sur le haut du clavier.
//
// Si le plugin natif n'est pas encore installé côté Xcode (`npx cap sync ios`
// pas lancé), on retombe automatiquement sur la source « web ».
// ══════════════════════════════════════════════════════════════════════════
import { useEffect, useSyncExternalStore } from 'react'
import { isIOS, isNativeApp } from './platform'

/** Attribut à poser sur le conteneur d'un composeur qui doit coller au clavier. */
export const KB_GLUE_ATTR = 'data-kb-glue'
/** Courbe / durée de l'animation du clavier iOS (UIKeyboardAnimationCurve 7 ≈). */
export const KB_EASE = 'cubic-bezier(0.17, 0.59, 0.4, 0.77)'
export const KB_DURATION_MS = 250

export type KeyboardSource = 'native' | 'web'

export interface KeyboardGlue {
  /** Clavier ouvert ET la surface collée doit compenser (sinon : rien à faire). */
  open: boolean
  /** Hauteur du clavier (px CSS) — 0 si fermé. */
  height: number
  /** Source active (jamais les deux à la fois). */
  source: KeyboardSource
  /** true → animer avec KB_EASE / KB_DURATION_MS (événements AVANT l'animation). */
  animated: boolean
  /**
   * Boîte d'une surface plein écran `position: fixed` (px CSS) : `top`/`height`
   * = boîte de la surface ; `padBottom` = padding bas à lui appliquer pour que
   * son CONTENU s'arrête pile au haut du clavier. La surface elle-même descend
   * SOUS le clavier (son fond — jamais le fond noir du webview ni la page en
   * dessous — apparaît dans les coins arrondis du clavier iOS).
   * `null` quand le clavier est fermé.
   */
  frame: { top: number; height: number; padBottom: number } | null
}

// ── État partagé (store externe) ─────────────────────────────────────────
interface Snap {
  source: KeyboardSource
  /** Natif : hauteur clavier annoncée par le plugin. */
  nativeHeight: number
  /** Natif : le champ focalisé est dans un `[data-kb-glue]` (resize 'none'). */
  nativeGlued: boolean
  /** Natif : hauteur du webview clavier FERMÉ (capturée avant chaque ouverture). */
  nativeBase: number
  /** Web : visualViewport. */
  vvTop: number
  vvHeight: number
  /** Web : hauteur du layout viewport (innerHeight) au même instant. */
  vvLayout: number
  webKb: number
}

const CLOSED: Snap = { source: 'web', nativeHeight: 0, nativeGlued: false, nativeBase: 0, vvTop: 0, vvHeight: 0, vvLayout: 0, webKb: 0 }
let snap: Snap = CLOSED
const listeners = new Set<() => void>()

function set(patch: Partial<Snap>): void {
  const next = { ...snap, ...patch }
  const k = Object.keys(next) as (keyof Snap)[]
  if (k.every(key => next[key] === snap[key])) return
  snap = next
  listeners.forEach(l => l())
}
function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
const getSnap = (): Snap => snap
const getServerSnap = (): Snap => CLOSED

function isEditable(el: Element | null): boolean {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement) return !el.readOnly
  if (el instanceof HTMLInputElement) {
    return !el.readOnly && !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color', 'image', 'hidden'].includes(el.type)
  }
  return el instanceof HTMLElement && el.isContentEditable
}
function isGlued(el: Element | null): boolean {
  return !!el && !!el.closest(`[${KB_GLUE_ATTR}]`)
}

// ── Source WEB : visualViewport ──────────────────────────────────────────
let webStarted = false
let webStop: (() => void) | null = null
function startWeb(): void {
  if (webStarted || typeof window === 'undefined') return
  const vv = window.visualViewport
  if (!vv) return
  webStarted = true
  // Hauteur de référence « clavier fermé » : la plus grande hauteur observée
  // sans champ focalisé (si le navigateur redimensionne le layout à l'ouverture,
  // innerHeight rétrécit aussi → on ne peut pas le comparer à vv.height seul).
  let base = Math.max(window.innerHeight, vv.height)
  const update = () => {
    if (snap.source !== 'web') return
    const focused = isEditable(document.activeElement)
    if (!focused) base = Math.max(window.innerHeight, vv.height)
    const hidden = Math.round(base - vv.height)
    const kb = focused && hidden > 120 ? hidden : 0 // seuil : barres Safari ≈ 50–80 px
    set({
      webKb: kb,
      vvTop: kb ? Math.max(0, Math.round(vv.offsetTop)) : 0,
      vvHeight: kb ? Math.round(vv.height) : 0,
      vvLayout: kb ? Math.round(window.innerHeight) : 0,
    })
  }
  const onOrient = () => { base = 0; window.setTimeout(() => { base = Math.max(window.innerHeight, vv.height); update() }, 350) }
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  window.addEventListener('focusin', update)
  window.addEventListener('focusout', update)
  window.addEventListener('orientationchange', onOrient)
  update()
  webStop = () => {
    vv.removeEventListener('resize', update)
    vv.removeEventListener('scroll', update)
    window.removeEventListener('focusin', update)
    window.removeEventListener('focusout', update)
    window.removeEventListener('orientationchange', onOrient)
    webStarted = false
  }
}

// ── Source NATIVE : @capacitor/keyboard ──────────────────────────────────
type KeyboardModule = typeof import('@capacitor/keyboard')
let nativeStarted = false

function nativePluginAvailable(): boolean {
  // iOS uniquement : sur Android le système redimensionne déjà la fenêtre
  // (adjustResize) → compenser en plus ferait double emploi ; la source web
  // (visualViewport) y renvoie 0 et le layout suit tout seul.
  if (!isNativeApp() || !isIOS()) return false
  try {
    const cap = (globalThis as { Capacitor?: { isPluginAvailable?: (n: string) => boolean } }).Capacitor
    return cap?.isPluginAvailable?.('Keyboard') ?? false
  } catch { return false }
}

async function startNative(): Promise<void> {
  if (nativeStarted) return
  nativeStarted = true
  let mod: KeyboardModule
  try { mod = await import('@capacitor/keyboard') } catch { nativeStarted = false; return }
  const { Keyboard, KeyboardResize, KeyboardStyle } = mod

  // Mode courant côté natif (capacitor.config.ts → 'native' par défaut).
  let mode: 'native' | 'none' = 'native'
  try { mode = (await Keyboard.getResizeMode()).mode === KeyboardResize.None ? 'none' : 'native' } catch { /* défaut */ }
  const setMode = (m: 'native' | 'none') => {
    if (m === mode) return
    mode = m
    void Keyboard.setResizeMode({ mode: m === 'none' ? KeyboardResize.None : KeyboardResize.Native }).catch(() => {})
  }

  // Barre d'accessoires (‹ › OK) : masquée pour les composeurs collés (façon
  // Claude), conservée ailleurs (le pavé numérique n'a pas d'autre bouton « OK »).
  let accessoryVisible: boolean | null = null
  const setAccessory = (visible: boolean) => {
    if (visible === accessoryVisible) return
    accessoryVisible = visible
    void Keyboard.setAccessoryBarVisible({ isVisible: visible }).catch(() => {})
  }
  const onIntent = (e: Event) => {
    const t = e.target instanceof Element ? e.target : null
    if (!t) return
    if (isGlued(t)) setAccessory(false)
    else if (isEditable(t)) setAccessory(true)
  }
  document.addEventListener('pointerdown', onIntent, true)
  document.addEventListener('focusin', onIntent, true)
  setAccessory(true)

  // Style du clavier = thème de l'APP (clair/sombre), pas celui de l'appareil.
  const syncStyle = () => {
    const dark = document.documentElement.classList.contains('dark')
    void Keyboard.setStyle({ style: dark ? KeyboardStyle.Dark : KeyboardStyle.Light }).catch(() => {})
  }
  syncStyle()
  new MutationObserver(syncStyle).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  // À partir d'ici la source web est coupée : jamais deux compensations.
  webStop?.()
  set({ source: 'native', webKb: 0, vvTop: 0, vvHeight: 0, vvLayout: 0 })

  const onShow = (h: number) => {
    const glued = isGlued(document.activeElement)
    // Le redimensionnement natif est appliqué ≈ durée d'animation + 0,2 s après
    // keyboardWillShow → on a le temps de choisir le mode. On ne repasse jamais
    // de 'native' à 'none' clavier ouvert (le webview serait resté raccourci).
    if (glued && !(mode === 'native' && snap.nativeHeight > 0 && !snap.nativeGlued)) setMode('none')
    else if (!glued) setMode('native')
    // Hauteur de référence prise clavier FERMÉ (avant tout redimensionnement) :
    // la surface collée reçoit une hauteur absolue (base − clavier), juste même
    // si WebKit réduisait quand même le layout → jamais de double compensation.
    const nativeBase = snap.nativeHeight > 0 && snap.nativeBase > 0
      ? snap.nativeBase
      : Math.max(window.innerHeight, document.documentElement.clientHeight)
    set({ nativeHeight: Math.max(0, Math.round(h)), nativeGlued: mode === 'none', nativeBase })
  }
  await Keyboard.addListener('keyboardWillShow', info => onShow(info.keyboardHeight))
  await Keyboard.addListener('keyboardDidShow', info => { if (info.keyboardHeight !== snap.nativeHeight) onShow(info.keyboardHeight) })
  await Keyboard.addListener('keyboardWillHide', () => set({ nativeHeight: 0 }))
  await Keyboard.addListener('keyboardDidHide', () => set({ nativeHeight: 0 }))
}

let initDone = false
/** Démarre l'écoute du clavier (idempotent). Appelée par useKeyboardGlue ;
 *  peut aussi être appelée tôt (shell de l'app) pour régler style/accessoires. */
export function initKeyboard(): void {
  if (initDone || typeof window === 'undefined') return
  initDone = true
  startWeb()
  if (nativePluginAvailable()) void startNative()
}

function toGlue(s: Snap, enabled: boolean): KeyboardGlue {
  if (s.source === 'native') {
    const open = enabled && s.nativeGlued && s.nativeHeight > 0
    return {
      open, height: s.nativeHeight, source: 'native', animated: true,
      frame: open ? { top: 0, height: s.nativeBase, padBottom: s.nativeHeight } : null,
    }
  }
  const open = enabled && s.webKb > 0
  // Surface ancrée en haut du viewport VISIBLE, prolongée jusqu'au bas du layout
  // (sous le clavier si le navigateur le superpose) ; le padding bas = part
  // masquée → 0 si le navigateur a déjà redimensionné le layout.
  const height = Math.max(s.vvHeight, s.vvLayout - s.vvTop)
  return {
    open, height: s.webKb, source: 'web', animated: false,
    frame: open ? { top: s.vvTop, height, padBottom: Math.max(0, height - s.vvHeight) } : null,
  }
}

/**
 * Hook des composeurs collés au clavier. `enabled` = la surface est visible.
 * Poser `data-kb-glue` sur le conteneur du champ (cf. KB_GLUE_ATTR), puis :
 *  – appliquer `frame` (top/height/paddingBottom) à la surface `position: fixed`
 *    plein écran en colonne flex, composeur en dernier enfant (transition
 *    `keyboardTransition(['padding-bottom'], glue)`) ;
 *  – retirer le padding safe-area bas quand `open`.
 */
export function useKeyboardGlue(enabled: boolean): KeyboardGlue {
  useEffect(() => { initKeyboard() }, [])
  const s = useSyncExternalStore(subscribe, getSnap, getServerSnap)
  return toGlue(s, enabled)
}

/** Transition CSS à appliquer aux propriétés qui suivent le clavier. */
export function keyboardTransition(props: string[], glue: KeyboardGlue): string {
  const d = glue.animated ? KB_DURATION_MS : 0
  return props.map(p => `${p} ${d}ms ${KB_EASE}`).join(', ')
}
