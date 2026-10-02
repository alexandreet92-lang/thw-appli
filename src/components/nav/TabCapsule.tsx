'use client'
// ══════════════════════════════════════════════════════════════════
// Barre d'onglets « capsule » façon Strava / iOS (mobile).
//  • Verre : fond translucide + flou (backdrop-filter sur la barre SEULE, jamais
//    animé), liseré 0,5 px, ombre douce — styles dans globals.css (.thw-tabbar).
//  • Une pilule-indicateur derrière l'onglet actif GLISSE d'un onglet à l'autre :
//    transform UNIQUEMENT (translate3d en % de sa propre largeur = 1 onglet),
//    380 ms cubic-bezier(.32,.72,0,1) → animée par le compositeur, 60 fps même
//    pendant le rendu de la nouvelle page. Aucune mesure DOM au rendu (onglets
//    à largeur égale), donc ni re-mesure ni « layout thrash ».
//  • Appui : l'icône + le libellé de l'onglet pressé grossissent légèrement, la
//    pilule s'y place et fonce un peu. Doigt glissé : la pilule suit d'onglet en
//    onglet (vibration légère à chaque changement). Relâché loin = annulé.
//  • prefers-reduced-motion : aucune transition (globals.css).
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type TouchEvent } from 'react'
import { haptic } from '@/lib/haptics'

export interface CapsuleItem {
  key: string
  label?: string
  ariaLabel: string
  /** color = currentColor (la couleur est portée par le parent) ; active = onglet en avant. */
  icon: (color: string, active?: boolean) => ReactNode
  onSelect: () => void
  /** Action sans changement de page (ouvrir l'IA) : l'indicateur ne bouge pas. */
  transient?: boolean
}

interface Props {
  items: CapsuleItem[]
  /** Onglet de la page courante (null = aucun). */
  activeIndex: number | null
  /** Change quand le jeu d'onglets change (ex. athlète → coach) : rejoue l'entrée. */
  motionKey: string
  accent: string
  dim: string
  className?: string
}

export function TabCapsule({ items, activeIndex, motionKey, accent, dim, className }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  // Géométrie lue UNE fois par geste (au pointerdown), jamais pendant le rendu.
  const geo = useRef({ left: 0, width: 1 })
  const timers = useRef<number[]>([])
  const lastIdx = useRef(0)
  const [press, setPress] = useState<number | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const n = Math.max(1, items.length)

  // Le jeu d'onglets ou la page changent → la sélection optimiste est terminée.
  useEffect(() => { setSel(null) }, [motionKey, activeIndex])
  useEffect(() => () => { timers.current.forEach(window.clearTimeout) }, [])

  const idxAt = (clientX: number): number => {
    const { left, width } = geo.current
    return Math.max(0, Math.min(n - 1, Math.floor(((clientX - left) / width) * n)))
  }

  const commit = (i: number) => {
    const item = items[i]
    if (!item) return
    if (item.transient) { item.onSelect(); return }
    if (i !== activeIndex) haptic('light')
    // La pilule part TOUT DE SUITE (animation compositeur), la navigation suit
    // à l'image d'après : le rendu de la page n'interrompt pas le glissement.
    setSel(i)
    requestAnimationFrame(() => requestAnimationFrame(() => item.onSelect()))
    // Filet : si rien ne change (même page), l'indicateur revient sur l'actif.
    timers.current.push(window.setTimeout(() => setSel(null), 1400))
  }

  const down = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const r = innerRef.current?.getBoundingClientRect()
    if (r) geo.current = { left: r.left, width: Math.max(1, r.width) }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    setPress(idxAt(e.clientX))
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
  // Le geste sur la barre ne doit jamais armer le geste « retour » du shell.
  const stop = (e: TouchEvent) => e.stopPropagation()

  // Un onglet « transitoire » (IA) pressé ne déplace pas la pilule.
  const pressIdx = press !== null && !items[press]?.transient ? press : null
  const visual = pressIdx ?? sel ?? activeIndex
  if (visual !== null) lastIdx.current = visual

  return (
    <nav
      ref={navRef}
      className={`thw-tabbar${className ? ` ${className}` : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
    >
      <div ref={innerRef} className="thw-tabbar-inner">
        <span
          key={`ind-${motionKey}`}
          aria-hidden
          className="thw-tabbar-ind"
          data-lens={pressIdx !== null ? '' : undefined}
          data-hidden={visual === null ? '' : undefined}
          style={{ width: `${100 / n}%`, transform: `translate3d(${lastIdx.current * 100}%, 0, 0)` } as CSSProperties}
        />
        <div key={`items-${motionKey}`} className="thw-capsule-items thw-tabbar-items">
          {items.map((it, i) => {
            const on = visual === i
            return (
              <button
                key={it.key}
                type="button"
                className="thw-tab"
                data-no-fx
                data-pressed={press === i ? '' : undefined}
                aria-label={it.ariaLabel}
                aria-current={activeIndex === i ? 'page' : undefined}
                // Clavier / lecteur d'écran (detail === 0) ; le tactile passe par les événements pointeur.
                onClick={e => { if (e.detail === 0) commit(i) }}
                style={{ color: on ? accent : dim }}
              >
                <span className="thw-tab-content">
                  <span className="thw-tab-icon">{it.icon('currentColor', on)}</span>
                  {it.label && <span className="thw-tab-label">{it.label}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
