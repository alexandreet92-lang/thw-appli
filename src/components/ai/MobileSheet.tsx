'use client'

// ══════════════════════════════════════════════════════════════
// MobileSheet — bottom sheet draggable (style iOS / Claude / vaul).
//
// Gestes (sur la poignée + en-tête) :
//  · tirer vers le HAUT  → agrandit jusqu'à ~94vh (détente « expanded »)
//  · tirer vers le BAS   → réduit, puis glisse pour fermer
//  · au relâcher         → snap à la détente la plus proche (vélocité
//                          prise en compte) ou dismiss si tiré trop bas
//  · fermeture (✕ / backdrop / Échap / drag) → glisse vers le bas
//
// Tout est piloté impérativement (style DOM direct) pour un suivi du
// doigt fluide, sans re-render par frame. Portail sur document.body.
// ══════════════════════════════════════════════════════════════

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SPRING = 'height 0.34s cubic-bezier(0.32,0.72,0,1), transform 0.34s cubic-bezier(0.32,0.72,0,1)'

type Drag = {
  startY: number
  startH: number   // hauteur du panneau au début du geste
  h: number        // hauteur courante
  ty: number       // translateY courant
  vel: number      // vélocité verticale (px/ms, +bas / -haut)
  lastY: number
  lastT: number
}

export function MobileSheet({
  title,
  onClose,
  children,
}: {
  title?: string
  onClose: () => void
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dimsRef = useRef<{ col: number; exp: number } | null>(null)
  const detentRef = useRef<'col' | 'exp'>('col')
  const dragRef = useRef<Drag | null>(null)
  const closingRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Mesure de la hauteur naturelle puis animation d'entrée (slide-up)
  useLayoutEffect(() => {
    if (!mounted) return
    const el = panelRef.current
    if (!el) return
    const vh = window.innerHeight
    const natural = el.getBoundingClientRect().height
    const exp = Math.round(vh * 0.94)
    const col = Math.min(Math.round(natural), exp)
    dimsRef.current = { col, exp }
    el.style.height = col + 'px'
    el.style.transform = 'translateY(100%)'
    void el.offsetHeight // reflow → point de départ de la transition
    el.style.transition = SPRING
    el.style.transform = 'translateY(0px)'
    if (backdropRef.current) backdropRef.current.style.opacity = '1'
  }, [mounted])

  // Fermeture animée (slide-down) puis démontage réel
  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    const el = panelRef.current
    const bd = backdropRef.current
    if (bd) { bd.style.transition = 'opacity 0.28s ease'; bd.style.opacity = '0' }
    if (el) {
      const h = el.getBoundingClientRect().height
      el.style.transition = 'transform 0.30s cubic-bezier(0.32,0.72,0,1)'
      el.style.transform = `translateY(${h + 48}px)`
    }
    window.setTimeout(onClose, 280)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Gestes de drag (poignée + en-tête) ──────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    const dims = dimsRef.current
    const el = panelRef.current
    if (!dims || !el || closingRef.current) return
    el.style.transition = 'none'
    const h = el.getBoundingClientRect().height
    dragRef.current = { startY: e.clientY, startH: h, h, ty: 0, vel: 0, lastY: e.clientY, lastT: performance.now() }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    const dims = dimsRef.current
    const el = panelRef.current
    if (!d || !dims || !el) return
    const now = performance.now()
    d.vel = (e.clientY - d.lastY) / Math.max(1, now - d.lastT)
    d.lastY = e.clientY
    d.lastT = now

    const dy = e.clientY - d.startY      // +bas / -haut
    let newH = d.startH - dy             // tirer haut → plus grand

    if (newH > dims.exp) {
      // résistance élastique au-dessus de la détente max
      newH = dims.exp + (newH - dims.exp) * 0.14
      d.h = newH; d.ty = 0
      el.style.height = newH + 'px'
      el.style.transform = 'translateY(0px)'
    } else if (newH < dims.col) {
      // sous la détente min → on translate vers le bas (vers la fermeture)
      d.h = dims.col; d.ty = dims.col - newH
      el.style.height = dims.col + 'px'
      el.style.transform = `translateY(${d.ty}px)`
    } else {
      d.h = newH; d.ty = 0
      el.style.height = newH + 'px'
      el.style.transform = 'translateY(0px)'
    }
  }

  const onPointerUp = () => {
    const d = dragRef.current
    const dims = dimsRef.current
    const el = panelRef.current
    dragRef.current = null
    if (!d || !dims || !el) return

    // Dismiss : tiré assez bas, ou geste rapide vers le bas
    if (d.ty > 90 || (d.vel > 0.55 && d.ty > 8)) {
      requestClose()
      return
    }

    el.style.transition = SPRING
    const mid = (dims.col + dims.exp) / 2
    const goExp = d.vel < -0.5 || (d.vel <= 0.5 && d.h > mid)
    detentRef.current = goExp ? 'exp' : 'col'
    el.style.transform = 'translateY(0px)'
    el.style.height = (goExp ? dims.exp : dims.col) + 'px'
  }

  if (!mounted) return null

  return createPortal(
    <>
      <div
        ref={backdropRef}
        onClick={requestClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1400, opacity: 0, transition: 'opacity 0.24s ease' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1401,
          background: 'var(--bg-card)', color: 'var(--text)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          boxShadow: '0 -10px 44px rgba(0,0,0,0.34)',
          height: 'auto', maxHeight: '94vh',
          transform: 'translateY(100%)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Poignée + en-tête — zone de drag */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
        >
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)', margin: '9px auto 2px' }} />
          {title !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 8px' }}>
              <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>{title}</span>
              <button
                onClick={requestClose}
                aria-label="Fermer"
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: 'var(--bg-alt)', color: 'var(--text)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Contenu défilable */}
        <div style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: '2px 8px calc(8px + env(safe-area-inset-bottom, 0px))',
        }}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
