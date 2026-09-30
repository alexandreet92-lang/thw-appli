'use client'
// ══════════════════════════════════════════════════════════════════
// Gestes tactiles « façon iOS » pour les pages / feuilles qui glissent.
//  • useSwipeBack : glisser du bord gauche vers la droite → la page suit le
//    doigt ; relâchée au-delà du seuil, elle revient en arrière (onBack).
//  • useSwipeDown : tirer vers le bas (feuille du bas) → elle suit le doigt ;
//    relâchée au-delà du seuil, elle se ferme.
// Le défilement vertical normal n'est jamais gêné (décision au 1er mouvement).
// ══════════════════════════════════════════════════════════════════
import { useRef, useState, type TouchEvent } from 'react'

interface Gesture { x: number; y: number; active: boolean; decided: boolean }

export function useSwipeBack(onBack: () => void, edge = 40) {
  const [dragX, setDragX] = useState(0)
  const st = useRef<Gesture>({ x: 0, y: 0, active: false, decided: false })
  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0]
      st.current = { x: t.clientX, y: t.clientY, active: t.clientX <= edge, decided: false }
    },
    onTouchMove: (e: TouchEvent) => {
      if (!st.current.active) return
      const t = e.touches[0]
      const dx = t.clientX - st.current.x
      const dy = t.clientY - st.current.y
      if (!st.current.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        st.current.decided = true
        if (Math.abs(dy) > Math.abs(dx)) { st.current.active = false; return }
      }
      setDragX(Math.max(0, Math.min(dx, 320)))
    },
    onTouchEnd: () => {
      if (!st.current.active) { setDragX(0); return }
      st.current.active = false
      setDragX(cur => { if (cur > 68) onBack(); return 0 })
    },
  }
  return { dragX, handlers }
}

export function useSwipeDown(onClose: () => void) {
  const [dragY, setDragY] = useState(0)
  const st = useRef<Gesture>({ x: 0, y: 0, active: false, decided: false })
  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0]
      st.current = { x: t.clientX, y: t.clientY, active: true, decided: false }
    },
    onTouchMove: (e: TouchEvent) => {
      if (!st.current.active) return
      const t = e.touches[0]
      const dx = t.clientX - st.current.x
      const dy = t.clientY - st.current.y
      if (!st.current.decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        st.current.decided = true
        if (Math.abs(dx) > Math.abs(dy)) { st.current.active = false; return }
      }
      setDragY(Math.max(0, Math.min(dy, 600)))
    },
    onTouchEnd: () => {
      if (!st.current.active) { setDragY(0); return }
      st.current.active = false
      setDragY(cur => { if (cur > 110) onClose(); return 0 })
    },
  }
  return { dragY, handlers }
}
