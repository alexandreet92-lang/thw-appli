'use client'
// ════════════════════════════════════════════════════════════════════
// SnapSheet — feuille du bas « façon Apple Plans » PARTAGÉE par tout le flux
// d'enregistrement (départ, création de parcours, détail, direct, guidage).
//
//  • Plusieurs crans (snaps) exprimés en HAUTEUR DE CONTENU visible sous
//    l'en-tête ('full' = tout le contenu, plafonné à l'écran). La poignée,
//    l'en-tête et le pied (toujours visible, épinglé en bas) sont ajoutés
//    automatiquement : l'appelant ne raisonne que sur son contenu.
//  • Glisser librement vers le haut ET vers le bas depuis la poignée,
//    l'en-tête ou le contenu (quand il est en haut de son défilement) :
//    la feuille suit le doigt, élastique aux extrémités, cran choisi selon
//    la vitesse de lâcher (projection), ressort à l'arrivée.
//  • Le contenu ne défile qu'au cran le plus haut ; tirer vers le bas
//    quand il est en haut replie la feuille (geste iOS).
//  • `heightMV` suit la hauteur visible en continu (boutons flottants qui
//    accompagnent la feuille) ; `onSettle` donne la hauteur CIBLE dès qu'un
//    cran est choisi (recadrage de carte fluide).
//  • Transform uniquement (translateY), prefers-reduced-motion respecté.
//  Couche de PRÉSENTATION pure.
// ════════════════════════════════════════════════════════════════════
import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode, type RefObject,
} from 'react'
import { animate, motion, useMotionValue, useReducedMotion, type MotionValue, type AnimationPlaybackControls } from 'motion/react'
import { haptic } from '@/lib/haptics'

export type SnapPoint = number | 'full'

export interface SnapSheetProps {
  /** Crans, en px de CONTENU visible sous l'en-tête (ordre croissant). */
  snaps: SnapPoint[]
  /** Cran courant (contrôlé). */
  index: number
  onIndexChange: (i: number) => void
  /** Hauteur visible CIBLE (px) à chaque changement de cran / mesure. */
  onSettle?: (visibleH: number) => void
  /** Hauteur visible en continu (suit le doigt). */
  heightMV?: MotionValue<number>
  /** En-tête fixe sous la poignée (zone de saisie). */
  header?: ReactNode
  /** Pied toujours visible, épinglé en bas de la feuille. */
  footer?: ReactNode
  children?: ReactNode
  /** Tirer franchement sous le cran le plus bas ferme la feuille. */
  onDismiss?: () => void
  /** Décalage du bas de la feuille (px) au-dessus du bas de l'écran. */
  bottomOffset?: number
  /** Espace minimal (px) laissé au-dessus de la feuille dépliée (en plus du safe-area). */
  topGap?: number
  /** Marge latérale (feuille flottante). */
  inset?: number
  /** Coins arrondis sur les 4 côtés (feuille flottante). */
  floating?: boolean
  /** Fond (token). */
  surface?: string
  zIndex?: number
  /** Classe du conteneur (positionnement desktop, thème…). */
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  /** Libellé du bouton poignée (bascule de cran). */
  handleLabel?: string
  /** Pas d'animation d'entrée (la feuille apparaît à son cran). */
  noEnter?: boolean
  /** Remet le contenu en haut de son défilement quand on quitte le cran le plus haut. */
  resetScroll?: boolean
  /** Le cran 'full' occupe TOUTE la hauteur disponible (feuille plein écran sous
   *  `topGap`), même si le contenu est plus court. */
  fill?: boolean
  /** Vrai = la feuille glisse hors de l'écran (sortie animée avant démontage). */
  closing?: boolean
}

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 42, mass: 0.9 }

/** Élastique iOS : la résistance augmente avec le dépassement. */
function rubber(over: number, dim: number): number {
  if (over <= 0) return 0
  const c = 0.55
  return (1 - 1 / ((over * c) / Math.max(1, dim) + 1)) * dim
}

/** Hauteur mesurée d'un élément (ResizeObserver). */
export function useElementHeight<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [h, setH] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setH(el.offsetHeight)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return h
}

/** Mesure par ref-callback : suit aussi les éléments montés / démontés
 *  au fil des vues (contrairement à un ref objet lu une seule fois). */
export function useMeasure<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [h, setH] = useState(0)
  const ro = useRef<ResizeObserver | null>(null)
  const cb = useCallback((el: T | null) => {
    ro.current?.disconnect()
    ro.current = null
    if (!el) return
    setH(el.offsetHeight)
    if (typeof ResizeObserver === 'undefined') return
    ro.current = new ResizeObserver(() => setH(el.offsetHeight))
    ro.current.observe(el)
  }, [])
  useEffect(() => () => ro.current?.disconnect(), [])
  return [cb, h]
}

/** Hauteur de la fenêtre (suit les rotations / le clavier). */
export function useViewportHeight(): number {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight))
  useEffect(() => {
    const f = () => setH(window.visualViewport?.height ?? window.innerHeight)
    f()
    window.addEventListener('resize', f)
    window.visualViewport?.addEventListener('resize', f)
    return () => { window.removeEventListener('resize', f); window.visualViewport?.removeEventListener('resize', f) }
  }, [])
  return h
}

/** Safe-area haute réelle (px) — lue via une sonde CSS env(). */
export function useSafeTop(): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none'
    document.body.appendChild(probe)
    setV(probe.offsetHeight)
    probe.remove()
  }, [])
  return v
}

export default function SnapSheet({
  snaps, index, onIndexChange, onSettle, heightMV, header, footer, children, onDismiss,
  bottomOffset = 0, topGap = 56, inset = 0, floating = false, surface = 'var(--surface-card)',
  zIndex = 120, className, style, ariaLabel, handleLabel, noEnter, resetScroll = true, fill = false, closing = false,
}: SnapSheetProps) {
  const reduce = useReducedMotion()
  const vh = useViewportHeight()
  const safeTop = useSafeTop()

  const grabRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const grabH = useElementHeight(grabRef)
  const footH = useElementHeight(footRef)
  const contentH = useElementHeight(innerRef)

  // Hauteur max visible : écran − safe-area − espace haut − décalage bas.
  const maxVisible = Math.max(120, vh - safeTop - topGap - bottomOffset)
  const chrome = grabH + footH
  const bodyH = fill ? maxVisible : Math.min(chrome + contentH, maxVisible)
  const visibles = snaps.map(s => (s === 'full' && fill)
    ? bodyH
    : Math.min(bodyH, chrome + (s === 'full' ? contentH : Math.min(s, contentH))))
  const measured = grabH > 0

  // y = translation de la feuille (0 = cran le plus haut possible = bodyH visible).
  const y = useMotionValue(10000)
  const anim = useRef<AnimationPlaybackControls | null>(null)
  const st = useRef({ bodyH, visibles, index, mounted: false, prevBodyH: bodyH, dragging: false })
  st.current.bodyH = bodyH
  st.current.visibles = visibles
  st.current.index = index

  // Suivi continu de la hauteur visible.
  useEffect(() => {
    if (!heightMV) return
    const push = (v: number) => heightMV.set(Math.max(0, st.current.bodyH - v) + bottomOffset)
    push(y.get())
    return y.on('change', push)
  }, [heightMV, y, bottomOffset])

  const goTo = useCallback((i: number, velocity = 0) => {
    const s = st.current
    const vis = s.visibles[Math.max(0, Math.min(s.visibles.length - 1, i))] ?? 0
    const target = s.bodyH - vis
    anim.current?.stop()
    anim.current = animate(y, target, reduce ? { duration: 0.16 } : { ...SPRING, velocity })
    onSettle?.(vis + bottomOffset)
  }, [y, reduce, onSettle, bottomOffset])

  // Mesure / cran contrôlé → (ré)aligne la feuille.
  const sig = `${bodyH}|${visibles.join(',')}|${index}`
  useLayoutEffect(() => {
    if (!measured) return
    if (!st.current.mounted) {
      st.current.mounted = true
      const vis = visibles[index] ?? 0
      st.current.prevBodyH = bodyH
      if (noEnter || reduce) { y.set(bodyH - vis); onSettle?.(vis + bottomOffset) }
      else { y.set(bodyH + bottomOffset + 24); goTo(index) }
      return
    }
    // Le corps change de hauteur (contenu mesuré) : on garde la hauteur
    // VISIBLE identique avant d'animer vers le cran (aucun saut).
    const dH = bodyH - st.current.prevBodyH
    st.current.prevBodyH = bodyH
    if (dH !== 0) y.set(y.get() + dH)
    if (st.current.dragging || closing) return
    goTo(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, measured])

  // Sortie animée : la feuille glisse sous le bord de l'écran.
  useEffect(() => {
    if (!closing || !measured) return
    anim.current?.stop()
    anim.current = animate(y, st.current.bodyH + bottomOffset + 40, reduce ? { duration: 0.14 } : { ...SPRING, stiffness: 520 })
  }, [closing, measured, y, reduce, bottomOffset])

  // Remet le contenu en haut quand on quitte le cran le plus haut.
  const atTop = index === snaps.length - 1
  useEffect(() => {
    if (!atTop && resetScroll && scrollRef.current && scrollRef.current.scrollTop > 0) {
      scrollRef.current.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    }
  }, [atTop, resetScroll, reduce])

  // ── Geste : tactile (touch*, passive:false) + souris (pointer) ──
  const draggedAt = useRef(0)
  const onIndexRef = useRef(onIndexChange)
  onIndexRef.current = onIndexChange
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    type G = { x0: number; y0: number; sy0: number; mode: 'none' | 'sheet' | 'scroll' | 'ignore'; inScroll: boolean; lastY: number; lastT: number; v: number }
    let g: G | null = null

    const begin = (x: number, yy: number, target: EventTarget | null) => {
      const t = target as HTMLElement | null
      if (t?.closest('[data-sheet-nodrag], input[type="range"], .leaflet-container, textarea')) { g = { x0: x, y0: yy, sy0: 0, mode: 'ignore', inScroll: false, lastY: yy, lastT: performance.now(), v: 0 }; return }
      anim.current?.stop()
      st.current.dragging = true
      g = {
        x0: x, y0: yy, sy0: y.get(), mode: 'none',
        inScroll: !!(t && scrollRef.current && scrollRef.current.contains(t)),
        lastY: yy, lastT: performance.now(), v: 0,
      }
    }
    const clampY = (raw: number) => {
      const s = st.current
      const minY = 0
      const maxY = s.bodyH - (s.visibles[0] ?? 0)
      if (raw < minY) return minY - rubber(minY - raw, s.bodyH * 0.35)
      if (raw > maxY) return onDismissRef.current ? raw : maxY + rubber(raw - maxY, s.bodyH * 0.35)
      return raw
    }
    const move = (x: number, yy: number): boolean => {
      if (!g || g.mode === 'ignore') return false
      const dx = x - g.x0, dy = yy - g.y0
      if (g.mode === 'none') {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return false
        if (Math.abs(dx) > Math.abs(dy)) { g.mode = 'ignore'; return false }
        const s = st.current
        const fully = s.index === s.visibles.length - 1 && Math.abs(y.get()) < 2
        const sc = scrollRef.current
        if (g.inScroll && fully && sc && sc.scrollHeight > sc.clientHeight + 1 && (sc.scrollTop > 0 || dy < 0)) g.mode = 'scroll'
        else g.mode = 'sheet'
      }
      if (g.mode !== 'sheet') return false
      const now = performance.now()
      const dt = Math.max(1, now - g.lastT)
      g.v = ((yy - g.lastY) / dt) * 1000 * 0.6 + g.v * 0.4
      g.lastY = yy; g.lastT = now
      y.set(clampY(g.sy0 + dy))
      return true
    }
    const end = () => {
      st.current.dragging = false
      if (!g) return
      const wasSheet = g.mode === 'sheet'
      const v = g.v
      g = null
      if (!wasSheet) {
        // Un tap a pu interrompre une animation en cours : on termine le cran.
        const s0 = st.current
        const target = s0.bodyH - (s0.visibles[s0.index] ?? 0)
        if (Math.abs(y.get() - target) > 1) goTo(s0.index)
        return
      }
      draggedAt.current = Date.now()
      const s = st.current
      const cur = s.bodyH - y.get()
      const lowest = s.visibles[0] ?? 0
      if (onDismissRef.current && (cur < lowest - 70 || (cur < lowest + 10 && v > 900))) {
        anim.current?.stop()
        anim.current = animate(y, s.bodyH + 40, reduce ? { duration: 0.16 } : { ...SPRING, velocity: v })
        haptic('light')
        window.setTimeout(() => onDismissRef.current?.(), reduce ? 120 : 220)
        return
      }
      const projected = cur - v * 0.18
      let best = 0, bd = Infinity
      s.visibles.forEach((vis, i) => { const d = Math.abs(vis - projected); if (d < bd) { bd = d; best = i } })
      // Lancer franc : au moins un cran dans le sens du geste.
      if (best === s.index && Math.abs(v) > 650) {
        best = Math.max(0, Math.min(s.visibles.length - 1, s.index + (v < 0 ? 1 : -1)))
      }
      if (best !== s.index) { haptic('light'); onIndexRef.current(best) }
      else goTo(best, v)
    }

    const ts = (e: TouchEvent) => { const p = e.touches[0]; if (p && e.touches.length === 1) begin(p.clientX, p.clientY, e.target) }
    const tm = (e: TouchEvent) => { const p = e.touches[0]; if (p && move(p.clientX, p.clientY) && e.cancelable) e.preventDefault() }
    const te = () => end()
    const pd = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      begin(e.clientX, e.clientY, e.target)
      const pm = (ev: PointerEvent) => { if (move(ev.clientX, ev.clientY)) ev.preventDefault() }
      const pu = () => { window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); end() }
      window.addEventListener('pointermove', pm)
      window.addEventListener('pointerup', pu)
    }
    // Un lâcher après glissé ne déclenche pas de clic « fantôme ».
    const click = (e: MouseEvent) => { if (Date.now() - draggedAt.current < 320) { e.stopPropagation(); e.preventDefault() } }

    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', te)
    el.addEventListener('touchcancel', te)
    el.addEventListener('pointerdown', pd)
    el.addEventListener('click', click, true)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te)
      el.removeEventListener('touchcancel', te)
      el.removeEventListener('pointerdown', pd)
      el.removeEventListener('click', click, true)
    }
  }, [y, goTo, reduce])

  const toggle = () => {
    if (Date.now() - draggedAt.current < 320) return
    haptic('light')
    onIndexChange(index < snaps.length - 1 ? index + 1 : 0)
  }

  const radius = 'calc(var(--r-lg) + 8px)'
  return (
    <div className={className} style={{
      position: 'absolute', left: inset, right: inset, bottom: bottomOffset, height: 0, zIndex,
      pointerEvents: 'none', ...style,
    }}>
      <motion.div
        ref={bodyRef}
        role="region"
        aria-label={ariaLabel}
        style={{
          y, position: 'absolute', left: 0, right: 0, bottom: 0, height: bodyH || undefined,
          visibility: measured ? 'visible' : 'hidden',
          background: surface, boxShadow: 'var(--shadow-float)',
          borderTopLeftRadius: radius, borderTopRightRadius: radius,
          borderBottomLeftRadius: floating ? radius : 0, borderBottomRightRadius: floating ? radius : 0,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', pointerEvents: 'auto',
          willChange: 'transform',
        }}
      >
        <div ref={grabRef} style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none' }}>
          <button type="button" onClick={toggle} aria-label={handleLabel ?? ariaLabel}
            aria-expanded={index > 0}
            style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '9px 0 7px', border: 'none', background: 'transparent', cursor: 'grab' }}>
            <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
          </button>
          {header}
        </div>
        <div ref={scrollRef} style={{
          flex: 1, minHeight: 0,
          overflowY: atTop ? 'auto' : 'hidden', overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch' as CSSProperties['WebkitOverflowScrolling'],
          paddingBottom: footH,
        }}>
          <div ref={innerRef}>{children}</div>
        </div>
      </motion.div>
      {/* Pied : toujours visible, même fond, au-dessus du corps. */}
      <motion.div ref={footRef}
        initial={noEnter ? false : { opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0.16 } : { ...SPRING, opacity: { duration: 0.22 } }}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'auto',
          background: footer ? surface : 'transparent',
          borderBottomLeftRadius: floating ? radius : 0, borderBottomRightRadius: floating ? radius : 0,
          visibility: measured ? 'visible' : 'hidden',
        }}>
        {footer}
      </motion.div>
    </div>
  )
}
