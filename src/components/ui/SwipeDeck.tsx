'use client'
// ══════════════════════════════════════════════════════════════
// SwipeDeck — pager horizontal natif (scroll-snap) façon Strava.
// Le doigt fait défiler la page courante vers la gauche pendant que la
// suivante entre par la droite ; au relâcher, ça « snappe » sur l'onglet
// voisin. Le scroll vertical reste celui de la PAGE : la hauteur du deck
// suit le panneau actif (les voisins sont plafonnés à cette hauteur) pour
// éviter tout scroll vertical imbriqué.
// Fenêtrage : on ne monte que les panneaux index-1 … index+1.
// ══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  index: number
  count: number
  onIndexChange: (i: number) => void
  renderPanel: (i: number) => ReactNode
}

export function SwipeDeck({ index, count, onIndexChange, renderPanel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeH, setActiveH] = useState<number | undefined>(undefined)
  const programmatic = useRef(false)
  const didInit = useRef(false)
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Aligne le deck sur l'onglet actif quand `index` change (tap sur une pilule).
  useEffect(() => {
    const el = ref.current; if (!el) return
    const target = index * el.clientWidth
    if (Math.abs(el.scrollLeft - target) < 2) return
    programmatic.current = true
    el.scrollTo({ left: target, behavior: didInit.current ? 'smooth' : 'auto' })
    didInit.current = true
    const t = setTimeout(() => { programmatic.current = false }, 420)
    return () => clearTimeout(t)
  }, [index])

  // Hauteur du panneau actif → plafonne les voisins (scroll vertical = page).
  useEffect(() => {
    const node = panelRefs.current[index]
    if (!node || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setActiveH(node.scrollHeight))
    ro.observe(node)
    setActiveH(node.scrollHeight)
    return () => ro.disconnect()
  }, [index, count])

  const onScroll = () => {
    const el = ref.current; if (!el) return
    if (endTimer.current) clearTimeout(endTimer.current)
    endTimer.current = setTimeout(() => {
      if (programmatic.current) return
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
      if (i !== index && i >= 0 && i < count) onIndexChange(i)
    }, 80)
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="swipe-deck"
      style={{
        // Pas de hauteur fixe ni de clip vertical : le panneau actif (non plafonné)
        // donne sa hauteur naturelle au deck → la PAGE défile normalement (le scroll
        // infini des listes fonctionne). Seuls les voisins sont plafonnés pour ne pas
        // gonfler le deck quand l'onglet actif est court.
        display: 'flex',
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        overscrollBehaviorX: 'contain',
      }}
    >
      <style>{`.swipe-deck{scrollbar-width:none}.swipe-deck::-webkit-scrollbar{display:none}`}</style>
      {Array.from({ length: count }).map((_, i) => {
        const near = Math.abs(i - index) <= 1
        return (
          <div
            key={i}
            ref={el => { panelRefs.current[i] = el }}
            style={{
              flex: '0 0 100%', minWidth: '100%', scrollSnapAlign: 'start',
              maxHeight: i === index ? undefined : activeH,
              overflow: i === index ? 'visible' : 'hidden',
            }}
          >
            {near ? renderPanel(i) : null}
          </div>
        )
      })}
    </div>
  )
}
