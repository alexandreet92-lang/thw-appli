'use client'

// ══════════════════════════════════════════════════════════════════
// SwipeableTabs — carrousel horizontal de pages de largeur égale.
//  • Suivi du doigt en temps réel (translateX sur le rail)
//  • Navigation en boucle (clones des bords → wrap sans couture)
//  • Animation de glissement au tap (onIndexChange) et au swipe
//  • Hauteur du viewport adaptée à la page active (transition douce)
//  • Lock horizontal/vertical : le scroll vertical natif reste possible
// ══════════════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useCallback, Children } from 'react'
import type { ReactNode, TouchEvent as ReactTouchEvent, TransitionEvent as ReactTransitionEvent } from 'react'

const EASE = 'cubic-bezier(0.32,0.72,0,1)'
const DUR  = 320

interface Props {
  index:         number
  count:         number
  onIndexChange: (i: number) => void
  children:      ReactNode
}

export function SwipeableTabs({ index, count, onIndexChange, children }: Props) {
  const pages = Children.toArray(children)
  // Rail étendu avec clones de bord : [dernière, ...pages, première]
  const slides = count > 1 ? [pages[count - 1], ...pages, pages[0]] : pages

  const viewportRef = useRef<HTMLDivElement>(null)
  const slideRefs   = useRef<Array<HTMLDivElement | null>>([])

  const [pos, setPos]       = useState(index + 1)   // position dans le rail étendu
  const [anim, setAnim]     = useState(true)
  const [dragPx, setDragPx] = useState(0)
  const [vh, setVh]         = useState<number | undefined>(undefined)

  const dragging = useRef(false)
  const startX   = useRef(0)
  const startY   = useRef(0)
  const axis     = useRef<'h' | 'v' | null>(null)
  const widthRef = useRef(1)

  // ── Hauteur adaptée à la page active ──────────────────────────────
  const measure = useCallback(() => {
    const el = slideRefs.current[pos]
    if (el) setVh(el.offsetHeight)
  }, [pos])

  useEffect(() => { measure() }, [measure, pages.length])

  useEffect(() => {
    const el = slideRefs.current[pos]
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [pos, measure])

  // ── Synchro quand l'index externe change (tap onglet) ─────────────
  useEffect(() => {
    const real = ((pos - 1) % count + count) % count
    if (index !== real) { setAnim(true); setPos(index + 1) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // ── Réactive l'animation après un saut instantané (wrap) ──────────
  useEffect(() => {
    if (anim) return
    const id = requestAnimationFrame(() => setAnim(true))
    return () => cancelAnimationFrame(id)
  }, [anim])

  // ── Gestes tactiles ───────────────────────────────────────────────
  function onTouchStart(e: ReactTouchEvent) {
    if (e.touches.length !== 1) return
    dragging.current = true
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    axis.current = null
    widthRef.current = viewportRef.current?.offsetWidth ?? 1
    setAnim(false)
  }
  function onTouchMove(e: ReactTouchEvent) {
    if (!dragging.current) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (axis.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (axis.current === 'v') return   // laisse le scroll vertical natif
    setDragPx(dx)
  }
  function onTouchEnd() {
    if (!dragging.current) return
    dragging.current = false
    const threshold = Math.min(70, widthRef.current * 0.22)
    let next = pos
    if (dragPx <= -threshold) next = pos + 1
    else if (dragPx >= threshold) next = pos - 1
    setAnim(true)
    setDragPx(0)
    setPos(next)
  }

  // ── Fin de transition : wrap sur les clones ───────────────────────
  function onRailTransitionEnd(e: ReactTransitionEvent) {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (count <= 1) return
    if (pos === 0) {
      setAnim(false); setPos(count); onIndexChange(count - 1)
    } else if (pos === count + 1) {
      setAnim(false); setPos(1); onIndexChange(0)
    } else {
      const real = pos - 1
      if (real !== index) onIndexChange(real)
    }
  }

  const basePct = count > 1 ? pos : 0

  return (
    <div
      ref={viewportRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        overflow: 'hidden', width: '100%',
        height: vh,
        transition: anim ? `height ${DUR}ms ${EASE}` : 'none',
        touchAction: 'pan-y',
      }}
    >
      <div
        onTransitionEnd={onRailTransitionEnd}
        style={{
          display: 'flex',
          transform: `translateX(calc(${-basePct * 100}% + ${dragPx}px))`,
          transition: anim ? `transform ${DUR}ms ${EASE}` : 'none',
        }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            ref={el => { slideRefs.current[i] = el }}
            style={{ width: '100%', flexShrink: 0, minWidth: 0, alignSelf: 'flex-start' }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}
