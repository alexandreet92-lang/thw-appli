'use client'
// ══════════════════════════════════════════════════════════════════
// Barre d'onglets « capsule » façon Strava / iOS.
//  • Une seule pilule-indicateur derrière l'onglet actif, qui GLISSE d'un
//    onglet à l'autre (ressort doux).
//  • Appui : la pilule devient une grande bulle de verre, plus haute que la
//    barre, et le contenu de l'onglet grossit. Doigt posé puis glissé : la bulle
//    suit le doigt d'onglet en onglet (vibration légère à chaque changement).
//  • Relâché sur un onglet : la bulle y glisse, PUIS l'action se déclenche
//    (ouvrir les sous-pages, changer de page…).
// Mesures prises sur Strava : barre 62 pt, pilule inscrite à 4 pt, bulle +12 pt
// de large / +19 pt de haut.
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type TouchEvent } from 'react'
import { haptic } from '@/lib/haptics'

export interface CapsuleItem {
  key: string
  label?: string
  ariaLabel: string
  icon: (color: string) => ReactNode
  onSelect: () => void
  /** Largeur fixe en px (ex. bouton retour) ; sinon l'onglet se partage la place. */
  fixedWidth?: number
  /** Action sans changement de page (ouvrir l'IA) : l'indicateur revient aussitôt. */
  transient?: boolean
}

interface Props {
  items: CapsuleItem[]
  /** Onglet de la page courante (null = aucun). */
  activeIndex: number | null
  /** Change quand le jeu d'onglets change (ex. accueil → sous-pages) : rejoue l'entrée. */
  motionKey: string
  accent: string
  dim: string
  className?: string
}

const BAR_H = 62
const PAD = 4
const INNER_H = BAR_H - PAD * 2
const SLIDE_MS = 230     // durée du glissement de la bulle avant l'action
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

interface Rect { x: number; w: number }

export function TabCapsule({ items, activeIndex, motionKey, accent, dim, className }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const timers = useRef<number[]>([])
  const [rects, setRects] = useState<Rect[]>([])
  const [press, setPress] = useState<number | null>(null)
  const [sel, setSel] = useState<number | null>(null)

  const measure = useCallback(() => {
    const inner = innerRef.current
    if (!inner) return
    const base = inner.getBoundingClientRect().left
    setRects(itemRefs.current.slice(0, items.length).map(b => {
      const r = b?.getBoundingClientRect()
      return r ? { x: r.left - base, w: r.width } : { x: 0, w: 0 }
    }))
  }, [items.length])

  useLayoutEffect(() => { measure() }, [measure, motionKey])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Le jeu d'onglets ou la page changent → la sélection en cours est terminée.
  useEffect(() => { setSel(null) }, [motionKey, activeIndex])
  useEffect(() => () => { timers.current.forEach(window.clearTimeout) }, [])

  const idxAt = (clientX: number): number => {
    const inner = innerRef.current
    if (!inner || rects.length === 0) return 0
    const x = clientX - inner.getBoundingClientRect().left
    let best = 0, bestD = Infinity
    rects.forEach((r, i) => {
      const d = x < r.x ? r.x - x : x > r.x + r.w ? x - (r.x + r.w) : 0
      const c = Math.abs(x - (r.x + r.w / 2))
      if (d < bestD || (d === bestD && c < Math.abs(x - (rects[best].x + rects[best].w / 2)))) { best = i; bestD = d }
    })
    return best
  }

  const commit = (i: number) => {
    const item = items[i]
    if (!item) return
    setSel(i)
    timers.current.push(window.setTimeout(() => {
      item.onSelect()
      if (item.transient) setSel(null)
    }, SLIDE_MS))
    // Filet : si rien ne change (ni page ni onglets), l'indicateur revient.
    timers.current.push(window.setTimeout(() => setSel(null), 1400))
  }

  const down = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    setPress(idxAt(e.clientX))
    haptic('light')
  }
  const move = (e: PointerEvent<HTMLElement>) => {
    if (press === null) return
    const i = idxAt(e.clientX)
    if (i !== press) { setPress(i); haptic('light') }
  }
  const up = (e: PointerEvent<HTMLElement>) => {
    if (press === null) return
    const i = press
    setPress(null)
    const nav = navRef.current?.getBoundingClientRect()
    // Relâché loin de la barre = annulation (comme sur iOS).
    if (nav && (e.clientY < nav.top - 60 || e.clientY > nav.bottom + 60)) return
    commit(i)
  }
  const cancel = () => setPress(null)
  // Le geste sur la barre ne doit jamais armer la sidebar glissante du shell.
  const stop = (e: TouchEvent) => e.stopPropagation()

  const visual = press ?? sel ?? activeIndex
  const r = visual !== null ? rects[visual] : undefined
  const lens = press !== null
  const padX = lens ? -6 : 2
  const ind: CSSProperties = r ? {
    position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0,
    width: r.w - padX * 2,
    height: lens ? INNER_H + 19 : INNER_H,
    transform: `translate(${r.x + padX}px, ${lens ? -9.5 : 0}px)`,
    borderRadius: 999,
    background: lens
      ? 'color-mix(in srgb, var(--text) 16%, var(--bg))'
      : 'color-mix(in srgb, var(--text) 13%, transparent)',
    // Pas de backdrop-filter ici : il force un recalcul du flou à chaque image
    // (saccades sur iPhone). Fond plein + ombre = fluide et sans halo blanc.
    boxShadow: lens ? 'var(--shadow-lens), inset 0 0 0 1px color-mix(in srgb, var(--text) 14%, transparent)' : 'none',
    willChange: 'transform, width, height',
    transition: `transform 320ms ${EASE}, width 320ms ${EASE}, height 240ms ${EASE}, background 160ms ease, box-shadow 160ms ease`,
  } : { display: 'none' }

  return (
    <nav
      ref={navRef}
      className={className}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      style={{
        position: 'fixed', zIndex: 100,
        left: 20, right: 20,
        bottom: 'max(8px, calc(env(safe-area-inset-bottom, 0px) - 14px))',
        height: BAR_H, padding: PAD, boxSizing: 'border-box',
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--text) 9%, var(--bg))',
        boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--text) 10%, transparent), var(--shadow-float)',
        touchAction: 'none', WebkitTransform: 'translateZ(0)', userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <div ref={innerRef} style={{ position: 'relative', display: 'flex', width: '100%', height: INNER_H }}>
        <div key={`ind-${motionKey}`} aria-hidden style={ind} />
        <div key={`items-${motionKey}`} className="thw-capsule-items" style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%', height: '100%' }}>
          {items.map((it, i) => {
            const on = visual === i
            const col = on ? accent : dim
            return (
              <button
                key={it.key}
                ref={el => { itemRefs.current[i] = el }}
                type="button"
                aria-label={it.ariaLabel}
                aria-current={activeIndex === i ? 'page' : undefined}
                // Clavier / lecteur d'écran (detail === 0) ; le tactile passe par les événements pointeur.
                onClick={e => { if (e.detail === 0) commit(i) }}
                style={{
                  flex: it.fixedWidth ? `0 0 ${it.fixedWidth}px` : 1, minWidth: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent', touchAction: 'none',
                }}
              >
                <span style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pointerEvents: 'none',
                  transform: press === i ? 'scale(1.08)' : 'scale(1)', transition: `transform 240ms ${EASE}`,
                }}>
                  {it.icon(col)}
                  {it.label && (
                    <span style={{ fontSize: 12, lineHeight: 1, fontFamily: 'var(--font-body)', fontWeight: 600, color: col, transition: 'color 200ms ease' }}>{it.label}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
