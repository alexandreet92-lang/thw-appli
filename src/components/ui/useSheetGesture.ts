'use client'
// ══════════════════════════════════════════════════════════════════
// Geste natif des feuilles mobiles (façon iOS) — piloté en refs (transform
// direct, 60 fps, aucun setState par frame) :
//  • axis 'y' (feuille du bas) : on tire vers le bas depuis la poignée/en-tête,
//    OU depuis le contenu quand il est déjà en haut de son défilement. Le voile
//    s'estompe avec la progression. Vers le haut : élastique (rubber-band).
//  • axis 'x' (surpage) : glisser depuis le bord gauche pour revenir.
//  • Relâcher : fermeture si distance > seuil OU vitesse (flick) > 0,5 px/ms —
//    la feuille part depuis sa position avec une durée calée sur la vitesse ;
//    sinon retour élastique.
// Seuls transform / opacity sont animés ; jamais backdrop-filter.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useRef, type RefObject } from 'react'
import { IOS_EASE_CSS, prefersReducedMotion, useLatest } from '@/components/ui/motion'

interface Options {
  axis: 'x' | 'y'
  panelRef: RefObject<HTMLElement | null>
  scrimRef?: RefObject<HTMLElement | null>
  /** Zone défilante du contenu (axis y) : le geste n'est pris que si elle est en haut. */
  scrollRef?: RefObject<HTMLElement | null>
  onClose: () => void
  enabled: boolean
  /** Transition « au repos » posée par le composant (restaurée après un retour élastique). */
  restTransition: string
  /** axis x : largeur de la zone de bord qui amorce le geste (px). */
  edge?: number
}

/** Élastique iOS : x → d·(1 − 1/(x·c/d + 1)). */
function rubber(x: number, d: number, c = 0.55): number {
  return (1 - 1 / ((x * c) / d + 1)) * d
}

export function useSheetGesture({ axis, panelRef, scrimRef, scrollRef, onClose, enabled, restTransition, edge = 32 }: Options) {
  const onCloseRef = useLatest(onClose)
  const restRef = useLatest(restTransition)
  const st = useRef({ mode: 'idle' as 'idle' | 'pending' | 'drag', x0: 0, y0: 0, off: 0, v: 0, lp: 0, lt: 0, size: 1, fromBody: false })

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !enabled) return
    const reduce = prefersReducedMotion()
    const s = st.current

    const paint = (off: number) => {
      panel.style.transform = axis === 'y' ? `translate3d(0, ${off}px, 0)` : `translate3d(${off}px, 0, 0)`
      const scrim = scrimRef?.current
      if (scrim) scrim.style.opacity = String(1 - Math.max(0, Math.min(1, off / s.size)) * 0.92)
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { s.mode = 'idle'; return }
      const t = e.touches[0]
      const target = e.target as Node
      // Champs de saisie / zones à swipe horizontal : jamais de geste de feuille.
      const el = target instanceof Element ? target : null
      if (el?.closest('input, textarea, select, [contenteditable="true"], [data-no-sheet-drag]')) { s.mode = 'idle'; return }
      if (axis === 'x' && t.clientX > edge) { s.mode = 'idle'; return }
      const body = scrollRef?.current
      s.fromBody = !!body && body.contains(target)
      if (axis === 'y' && s.fromBody && body && body.scrollTop > 0) { s.mode = 'idle'; return }
      s.mode = 'pending'
      s.x0 = t.clientX; s.y0 = t.clientY; s.off = 0; s.v = 0
      s.lp = axis === 'y' ? t.clientY : t.clientX; s.lt = e.timeStamp
      const r = panel.getBoundingClientRect()
      s.size = Math.max(1, axis === 'y' ? r.height : r.width)
    }

    const onMove = (e: TouchEvent) => {
      if (s.mode === 'idle') return
      const t = e.touches[0]
      const dx = t.clientX - s.x0, dy = t.clientY - s.y0
      const main = axis === 'y' ? dy : dx
      const cross = axis === 'y' ? dx : dy
      if (s.mode === 'pending') {
        // Tirer vers le bas depuis le contenu déjà en haut : on prend la main dès le
        // 1er mouvement (sinon iOS engage le rebond du défilement et ignore
        // preventDefault ensuite).
        const early = axis === 'y' && s.fromBody && main > 0 && Math.abs(main) >= Math.abs(cross)
        if (!early && Math.abs(main) < 6 && Math.abs(cross) < 6) return
        if (early && Math.abs(main) < 1) return
        // Mauvais axe, ou geste vers le haut dans le contenu (= défilement) → on cède.
        if (Math.abs(cross) > Math.abs(main)) { s.mode = 'idle'; return }
        if (main < 0 && (axis === 'x' || s.fromBody)) { s.mode = 'idle'; return }
        const body = scrollRef?.current
        if (axis === 'y' && s.fromBody && body && body.scrollTop > 0) { s.mode = 'idle'; return }
        s.mode = 'drag'
        panel.style.transition = 'none'
        if (scrimRef?.current) scrimRef.current.style.transition = 'none'
      }
      if (e.cancelable) e.preventDefault()   // la feuille prend le geste (pas de rebond du contenu)
      const off = main >= 0 ? main : -rubber(-main, s.size * 0.25)
      const pos = axis === 'y' ? t.clientY : t.clientX
      const dt = e.timeStamp - s.lt
      if (dt > 0) s.v = 0.8 * ((pos - s.lp) / dt) + 0.2 * s.v
      s.lp = pos; s.lt = e.timeStamp
      s.off = off
      paint(off)
    }

    const onEnd = () => {
      if (s.mode !== 'drag') { s.mode = 'idle'; return }
      s.mode = 'idle'
      const scrim = scrimRef?.current
      const threshold = Math.min(axis === 'y' ? 140 : 110, s.size * 0.3)
      const close = s.off > 0 && (s.off > threshold || (s.v > 0.5 && s.off > 12))
      if (close) {
        const remaining = s.size - s.off
        const ms = reduce ? 0 : Math.round(Math.max(160, Math.min(320, remaining / Math.max(Math.abs(s.v), 1.1))))
        panel.style.transition = `transform ${ms}ms ${IOS_EASE_CSS}`
        panel.style.transform = axis === 'y' ? 'translate3d(0, 100%, 0)' : 'translate3d(100%, 0, 0)'
        if (scrim) { scrim.style.transition = `opacity ${ms}ms ease`; scrim.style.opacity = '0' }
        try { navigator.vibrate?.(8) } catch { /* ignore */ }
        onCloseRef.current()
        return
      }
      // Retour à la position (ressort iOS, sans dépassement : jamais de jour sous la feuille).
      const back = reduce ? 'none' : `transform 420ms ${IOS_EASE_CSS}`
      panel.style.transition = back
      panel.style.transform = 'translate3d(0, 0, 0)'
      if (scrim) { scrim.style.transition = reduce ? 'none' : 'opacity 300ms ease'; scrim.style.opacity = '1' }
      window.setTimeout(() => { if (s.mode === 'idle') panel.style.transition = restRef.current }, 440)
    }

    panel.addEventListener('touchstart', onStart, { passive: true })
    panel.addEventListener('touchmove', onMove, { passive: false })
    panel.addEventListener('touchend', onEnd)
    panel.addEventListener('touchcancel', onEnd)
    return () => {
      panel.removeEventListener('touchstart', onStart)
      panel.removeEventListener('touchmove', onMove)
      panel.removeEventListener('touchend', onEnd)
      panel.removeEventListener('touchcancel', onEnd)
    }
  }, [axis, panelRef, scrimRef, scrollRef, enabled, edge, onCloseRef, restRef])
}
