'use client'
// Pull-to-refresh mobile (tactile uniquement). Quand on tire vers le bas alors que
// la page est déjà tout en haut, on déclenche onRefresh. Indicateur = logo shuriken
// qui tourne. Aucune lib. Désactivé sur pointeur fin (souris).

import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 70   // px à tirer pour déclencher
const MAX_PULL = 110

export function PullToRefresh({ onRefresh, children }: {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
}) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const active = useRef(false)

  useEffect(() => {
    // Tactile seulement (pas de souris). On lit le scroll global de la fenêtre.
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    if (!isTouch) return

    function onStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshing) { active.current = false; return }
      startY.current = e.touches[0].clientY
      active.current = true
    }
    function onMove(e: TouchEvent) {
      if (!active.current || startY.current == null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { setPull(0); return }
      if (window.scrollY > 0) { active.current = false; setPull(0); return }
      // résistance : on amortit le déplacement
      const damped = Math.min(MAX_PULL, dy * 0.5)
      setPull(damped)
    }
    async function onEnd() {
      if (!active.current) return
      active.current = false
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true)
        setPull(THRESHOLD)
        try { await onRefresh() } finally {
          setRefreshing(false)
          setPull(0)
        }
      } else {
        setPull(0)
      }
      startY.current = null
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
  }, [pull, refreshing, onRefresh])

  const progress = Math.min(1, pull / THRESHOLD)

  return (
    <div style={{ position: 'relative' }}>
      <style>{`@keyframes ptrSpin{to{transform:rotate(360deg)}}`}</style>
      {/* Indicateur */}
      <div style={{
        position: 'absolute', top: -52, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        transform: `translateY(${pull}px)`, transition: active.current ? 'none' : 'transform 0.25s ease',
        pointerEvents: 'none', opacity: pull > 4 || refreshing ? 1 : 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logos/logo_4bras.png" alt="" style={{
          width: 28, height: 28, objectFit: 'contain',
          transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
          animation: refreshing ? 'ptrSpin 0.8s linear infinite' : undefined,
          opacity: 0.5 + progress * 0.5,
        }} />
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: active.current ? 'none' : 'transform 0.25s ease' }}>
        {children}
      </div>
    </div>
  )
}
