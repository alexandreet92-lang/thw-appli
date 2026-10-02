'use client'
// Pull-to-refresh mobile (tactile uniquement), façon iOS. Quand on tire vers le
// bas alors que la page est déjà tout en haut, on déclenche onRefresh.
//  • Défilement réel : l'app défile dans <main> (MobileShell), pas dans la
//    fenêtre → on lit le scrollTop du VRAI conteneur défilant (ancêtre), sinon
//    le geste se déclenchait au milieu de la page.
//  • Élastique (résistance croissante), vibration légère au seuil, retour ressort.
//  • Peint en refs (transform / opacity, 60 fps) : aucun re-rendu par frame.
// Indicateur = logo shuriken qui tourne. Aucune lib. Désactivé sur souris.

import { useEffect, useRef, useState } from 'react'
import { haptic } from '@/lib/haptics'
import { IOS_EASE_CSS, prefersReducedMotion } from '@/components/ui/motion'

const THRESHOLD = 70   // px (après amortissement) pour déclencher
const MAX_PULL = 120
const REST = 56        // hauteur tenue pendant le rafraîchissement

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null
  while (n && n !== document.body) {
    const oy = getComputedStyle(n).overflowY
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n
    n = n.parentElement
  }
  return null
}

/** Résistance façon iOS : rapide au début, de plus en plus dure. */
function damp(dy: number): number {
  return MAX_PULL * (1 - Math.exp(-dy / (MAX_PULL * 1.6)))
}

export function PullToRefresh({ onRefresh, children }: {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
}) {
  const [refreshing, setRefreshing] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const indRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh
  const busyRef = useRef(false)

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    const root = rootRef.current
    if (!isTouch || !root) return
    const reduce = prefersReducedMotion()
    const st = { startY: 0, active: false, pull: 0, armed: false }

    const scrollTop = () => {
      const sp = scrollParent(root)
      return sp ? sp.scrollTop : window.scrollY
    }
    const paint = (p: number, animate: boolean) => {
      const tr = animate && !reduce ? `transform 420ms ${IOS_EASE_CSS}, opacity 240ms ease` : 'none'
      const c = contentRef.current, ind = indRef.current, logo = logoRef.current
      if (c) { c.style.transition = tr; c.style.transform = p > 0 ? `translate3d(0, ${p}px, 0)` : '' }
      if (ind) {
        const prog = Math.min(1, p / THRESHOLD)
        ind.style.transition = tr
        ind.style.transform = `translate3d(0, ${p}px, 0) scale(${(0.6 + 0.4 * prog).toFixed(3)})`
        ind.style.opacity = p > 4 || busyRef.current ? String(Math.min(1, 0.25 + prog)) : '0'
        if (logo && !busyRef.current) logo.style.transform = `rotate(${Math.round(prog * 270)}deg)`
      }
    }

    function onStart(e: TouchEvent) {
      if (busyRef.current || scrollTop() > 0) { st.active = false; return }
      st.startY = e.touches[0].clientY
      st.active = true; st.pull = 0; st.armed = false
    }
    function onMove(e: TouchEvent) {
      if (!st.active) return
      const dy = e.touches[0].clientY - st.startY
      if (dy <= 0 || scrollTop() > 0) { if (st.pull) paint(0, false); st.pull = 0; if (dy < -4) st.active = false; return }
      st.pull = damp(dy)
      const armed = st.pull >= THRESHOLD
      if (armed !== st.armed) { st.armed = armed; if (armed) haptic('light') }
      paint(st.pull, false)
    }
    async function onEnd() {
      if (!st.active) return
      st.active = false
      if (st.pull >= THRESHOLD && !busyRef.current) {
        busyRef.current = true
        setRefreshing(true)
        paint(REST, true)
        try { await onRefreshRef.current() } finally {
          busyRef.current = false
          setRefreshing(false)
          paint(0, true)
        }
      } else {
        paint(0, true)
      }
      st.pull = 0
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      {/* Indicateur */}
      <div ref={indRef} aria-hidden style={{
        position: 'absolute', top: -44, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        pointerEvents: 'none', opacity: 0, willChange: 'transform, opacity',
      }}>
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--float-bg)', boxShadow: 'var(--shadow-fab)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={logoRef} src="/logos/logo_4bras.png" alt="" className={refreshing ? 'thw-spin' : undefined} style={{ width: 22, height: 22, objectFit: 'contain' }} />
        </span>
      </div>
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  )
}
